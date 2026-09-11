-- Benchmark factor search (018 hardened) — 500k synthetic scale test rolls back
\set ON_ERROR_STOP on
\timing on

\echo '=== Real catalogue EXPLAIN (approved, q=gaz naturel) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT f.id FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved' AND v.status = 'approved'
  AND f.search_vector @@ plainto_tsquery('simple', ef_immutable_unaccent('gaz naturel'))
ORDER BY ts_rank_cd(f.search_vector, plainto_tsquery('simple', ef_immutable_unaccent('gaz naturel')), 32) DESC
LIMIT 20;

\echo '=== Real catalogue EXPLAIN (draft ADEME, q=gaz naturel) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT f.id FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved' AND v.status = 'draft'
  AND (
    f.external_code = 'gaz naturel'
    OR f.search_vector @@ plainto_tsquery('simple', ef_immutable_unaccent('gaz naturel'))
    OR similarity(f.search_name_text, ef_immutable_unaccent(lower('gaz naturel'))) >= 0.35
  )
LIMIT 20;

\echo '=== Synthetic 500k scale (ROLLBACK) ==='
BEGIN;

CREATE TEMP TABLE bench_factors (LIKE emission_factors INCLUDING DEFAULTS) ON COMMIT DROP;

INSERT INTO bench_factors (
  version_id, name, external_code, stable_factor_id, version_number,
  unit_numerator, unit_denominator, value, status, factor_type,
  internal_category, country_code, source_category, search_name_text, search_text, search_vector
)
SELECT
  'a2000000-0000-4000-8000-000000000002'::uuid,
  CASE
    WHEN g = 250000 THEN 'Diesel'
    WHEN g % 997 = 0 THEN 'Electricite mix ' || g
    ELSE 'Bench factor ' || g
  END,
  g::text,
  'bench:' || g,
  1,
  'kgCO2e',
  CASE WHEN g % 3 = 0 THEN 'kWh' WHEN g % 3 = 1 THEN 'kg' ELSE 'km' END,
  random(),
  'approved',
  CASE WHEN g % 5 = 0 THEN 'monetary' ELSE 'physical' END,
  CASE WHEN g % 4 = 0 THEN 'energy' WHEN g % 4 = 1 THEN 'transport' ELSE 'purchased_goods' END,
  CASE WHEN g % 10 = 0 THEN 'FR' ELSE NULL END,
  'Achats de biens',
  ef_immutable_unaccent(lower(
    CASE WHEN g = 250000 THEN 'Diesel' ELSE 'Bench factor ' || g END
  )),
  ef_immutable_unaccent(lower('bench factor ' || g)),
  to_tsvector('simple', ef_immutable_unaccent(lower('bench factor ' || g)))
FROM generate_series(1, 500000) g;

CREATE INDEX bench_factors_search_vector ON bench_factors USING GIN (search_vector);
CREATE INDEX bench_factors_search_name_trgm ON bench_factors USING GIN (search_name_text gin_trgm_ops);
CREATE INDEX bench_factors_external_code ON bench_factors (external_code);
CREATE INDEX bench_factors_filters ON bench_factors (factor_type, internal_category, country_code, unit_denominator);
ANALYZE bench_factors;

\echo '--- A. 500k exact external_code ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id FROM bench_factors WHERE external_code = '250000' LIMIT 20;

\echo '--- B. 500k exact name ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id FROM bench_factors WHERE search_name_text = ef_immutable_unaccent(lower('Diesel')) LIMIT 20;

\echo '--- C. 500k prefix name ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id FROM bench_factors WHERE search_name_text LIKE ef_immutable_unaccent(lower('Bench')) || '%' LIMIT 20;

\echo '--- D. 500k FTS 2 words ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id FROM bench_factors
WHERE search_vector @@ plainto_tsquery('simple', 'bench factor')
LIMIT 20;

\echo '--- E. 500k trigram typo ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id FROM bench_factors
WHERE similarity(search_name_text, ef_immutable_unaccent(lower('electrcite'))) >= 0.25
LIMIT 20;

\echo '--- F. 500k source-like filter combo ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id FROM bench_factors
WHERE factor_type = 'physical' AND internal_category = 'energy' AND unit_denominator = 'kWh'
LIMIT 20;

\echo '--- G. 500k country + category ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id FROM bench_factors
WHERE internal_category = 'energy' AND country_code = 'FR'
LIMIT 20;

\echo '--- H. 500k keyset page 3 ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
WITH ranked AS (
  SELECT id, ROUND((CASE WHEN search_name_text LIKE 'bench%' THEN 95 ELSE 60 END)::numeric, 6) AS rank_score
  FROM bench_factors
  WHERE search_name_text LIKE ef_immutable_unaccent(lower('Bench')) || '%'
)
SELECT id FROM ranked
WHERE rank_score < 95 OR (rank_score = 95 AND id > (
  SELECT id FROM ranked ORDER BY rank_score DESC, id ASC OFFSET 39 LIMIT 1
))
ORDER BY rank_score DESC, id ASC
LIMIT 20;

ROLLBACK;
