\set ON_ERROR_STOP on

\echo '=== 023 UK version governance ==='
SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
FROM emission_factor_versions v
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';

\echo '=== UK factor statuses ==='
SELECT f.status, COUNT(*)::int AS n
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2'
GROUP BY f.status
ORDER BY 1;

\echo '=== Registry / visible / legacy ==='
SELECT COUNT(*)::int AS registry FROM emission_factors;

SELECT COUNT(*)::int AS visible_catalog
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible';

SELECT COUNT(*)::int AS legacy_internal
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal';

\echo '=== UK calculable / resolver (must be 0) ==='
SELECT COUNT(*)::int AS calculable_uk
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key = 'uk_gov_ghg' AND v.calculation_status = 'enabled';

SELECT COUNT(*)::int AS resolver_uk
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key = 'uk_gov_ghg' AND v.resolver_status = 'enabled';

\echo '=== review_required / gwp unknown ==='
SELECT COUNT(*)::int AS review_required
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key = 'uk_gov_ghg'
  AND v.dataset_version = '2026-flat-1.2'
  AND f.metadata->>'normalization_status' = 'review_required';

SELECT COUNT(*)::int AS gwp_unknown
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key = 'uk_gov_ghg'
  AND v.dataset_version = '2026-flat-1.2'
  AND f.gwp_basis = 'unknown';

\echo '=== ADEME / Core TN governance ==='
SELECT s.source_key, COUNT(f.id)::int AS n, v.status, v.catalog_status, v.calculation_status, v.resolver_status
FROM emission_factor_versions v
JOIN factor_sources s ON s.id = v.source_id
LEFT JOIN emission_factors f ON f.version_id = v.id
WHERE s.source_key IN ('ademe', 'internal')
GROUP BY s.source_key, v.status, v.catalog_status, v.calculation_status, v.resolver_status
ORDER BY 1;
