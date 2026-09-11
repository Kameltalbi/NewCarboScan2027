\set ON_ERROR_STOP on

\echo '=== 021 columns present ==='
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'emission_factors'
  AND column_name IN ('lifecycle_boundary', 'energy_basis', 'gwp_basis', 'factor_kind')
ORDER BY column_name;

\echo '=== 021 CHECKs present ==='
SELECT conname
FROM pg_constraint
WHERE conrelid = 'emission_factors'::regclass
  AND conname LIKE 'emission_factors_%_check'
  AND conname IN (
    'emission_factors_lifecycle_boundary_check',
    'emission_factors_energy_basis_check',
    'emission_factors_gwp_basis_check',
    'emission_factors_factor_kind_check'
  )
ORDER BY conname;

\echo '=== registry counts ==='
SELECT 'registry' AS k, COUNT(*)::int AS n FROM emission_factors
UNION ALL
SELECT 'ademe', COUNT(*)::int FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id WHERE s.source_key = 'ademe'
UNION ALL
SELECT 'internal', COUNT(*)::int FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id WHERE s.source_key = 'internal';

\echo '=== all new columns NULL on existing rows ==='
SELECT
  COUNT(*) FILTER (WHERE lifecycle_boundary IS NOT NULL) AS lb_set,
  COUNT(*) FILTER (WHERE energy_basis IS NOT NULL) AS eb_set,
  COUNT(*) FILTER (WHERE gwp_basis IS NOT NULL) AS gb_set,
  COUNT(*) FILTER (WHERE factor_kind IS NOT NULL) AS fk_set
FROM emission_factors;

\echo '=== governance unchanged ==='
SELECT s.source_key, v.status, v.catalog_status, v.calculation_status, v.resolver_status
FROM emission_factor_versions v
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key IN ('ademe', 'internal')
ORDER BY s.source_key;

\echo '=== synthetic UK semantics accepted (ROLLBACK) ==='
BEGIN;
DO $$
DECLARE
  v_vid UUID;
  v_sid UUID;
  v_id UUID;
BEGIN
  SELECT id INTO v_sid FROM factor_sources WHERE source_key = 'internal' LIMIT 1;
  IF v_sid IS NULL THEN
    RAISE EXCEPTION '021 test: internal source missing';
  END IF;

  INSERT INTO emission_factor_versions (
    source_id, version_label, dataset_version, published_year, gwp_set,
    status, catalog_status, calculation_status, resolver_status
  ) VALUES (
    v_sid, '021-test-uk-semantics', '021-test', 2026, 'mixed',
    'draft', 'hidden', 'disabled', 'disabled'
  )
  RETURNING id INTO v_vid;

  INSERT INTO emission_factors (
    version_id, stable_factor_id, external_code, name,
    unit_numerator, unit_denominator, value, status, factor_type,
    lifecycle_boundary, energy_basis, gwp_basis, factor_kind
  ) VALUES (
    v_vid, 'uk-gov:2026:test_wtt_gross', 'TEST_WTT_GROSS',
    '021 synthetic UK WTT fuel Gross CV',
    'kgCO2e', 'kWh', 0.012345, 'draft', 'physical',
    'wtt', 'gross_cv', 'AR5', 'activity_emission_factor'
  )
  RETURNING id INTO v_id;

  IF NOT EXISTS (
    SELECT 1 FROM emission_factors
    WHERE id = v_id
      AND lifecycle_boundary = 'wtt'
      AND energy_basis = 'gross_cv'
      AND gwp_basis = 'AR5'
      AND factor_kind = 'activity_emission_factor'
  ) THEN
    RAISE EXCEPTION '021 FAIL: synthetic UK insert not stored as expected';
  END IF;

  RAISE NOTICE '021 OK: synthetic UK semantics accepted';
END $$;
ROLLBACK;

\echo '=== invalid lifecycle rejected ==='
DO $$
DECLARE
  v_vid UUID;
BEGIN
  SELECT id INTO v_vid FROM emission_factor_versions WHERE source_id IN (
    SELECT id FROM factor_sources WHERE source_key = 'internal'
  ) LIMIT 1;

  BEGIN
    INSERT INTO emission_factors (
      version_id, name, unit_numerator, unit_denominator, value, status, factor_type,
      lifecycle_boundary
    ) VALUES (
      v_vid, '021 bad lifecycle', 'kgCO2e', 'kWh', 1, 'draft', 'physical', 'combustion'
    );
    RAISE EXCEPTION '021 FAIL: invalid lifecycle_boundary combustion was allowed';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '021 OK: invalid lifecycle_boundary rejected';
  END;
END $$;

\echo '=== invalid energy_basis rejected ==='
DO $$
DECLARE
  v_vid UUID;
BEGIN
  SELECT id INTO v_vid FROM emission_factor_versions WHERE source_id IN (
    SELECT id FROM factor_sources WHERE source_key = 'internal'
  ) LIMIT 1;
  BEGIN
    INSERT INTO emission_factors (
      version_id, name, unit_numerator, unit_denominator, value, status, factor_type,
      energy_basis
    ) VALUES (
      v_vid, '021 bad energy', 'kgCO2e', 'kWh', 1, 'draft', 'physical', 'hhv'
    );
    RAISE EXCEPTION '021 FAIL: invalid energy_basis hhv was allowed';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '021 OK: invalid energy_basis rejected';
  END;
END $$;

\echo '=== invalid gwp_basis rejected ==='
DO $$
DECLARE
  v_vid UUID;
BEGIN
  SELECT id INTO v_vid FROM emission_factor_versions WHERE source_id IN (
    SELECT id FROM factor_sources WHERE source_key = 'internal'
  ) LIMIT 1;
  BEGIN
    INSERT INTO emission_factors (
      version_id, name, unit_numerator, unit_denominator, value, status, factor_type,
      gwp_basis
    ) VALUES (
      v_vid, '021 bad gwp', 'kgCO2e', 'kWh', 1, 'draft', 'physical', 'AR7'
    );
    RAISE EXCEPTION '021 FAIL: invalid gwp_basis AR7 was allowed';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '021 OK: invalid gwp_basis rejected';
  END;
END $$;

\echo '=== invalid factor_kind rejected ==='
DO $$
DECLARE
  v_vid UUID;
BEGIN
  SELECT id INTO v_vid FROM emission_factor_versions WHERE source_id IN (
    SELECT id FROM factor_sources WHERE source_key = 'internal'
  ) LIMIT 1;
  BEGIN
    INSERT INTO emission_factors (
      version_id, name, unit_numerator, unit_denominator, value, status, factor_type,
      factor_kind
    ) VALUES (
      v_vid, '021 bad kind', 'kgCO2e', 'kWh', 1, 'draft', 'physical', 'secr_kwh'
    );
    RAISE EXCEPTION '021 FAIL: invalid factor_kind secr_kwh was allowed';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '021 OK: invalid factor_kind rejected';
  END;
END $$;

\echo '=== NULL accepted on all four fields ==='
BEGIN;
DO $$
DECLARE
  v_vid UUID;
  v_id UUID;
BEGIN
  SELECT id INTO v_vid FROM emission_factor_versions WHERE source_id IN (
    SELECT id FROM factor_sources WHERE source_key = 'internal'
  ) LIMIT 1;

  INSERT INTO emission_factors (
    version_id, name, unit_numerator, unit_denominator, value, status, factor_type,
    lifecycle_boundary, energy_basis, gwp_basis, factor_kind
  ) VALUES (
    v_vid, '021 all null semantics', 'kgCO2e', 'kWh', 1, 'draft', 'physical',
    NULL, NULL, NULL, NULL
  )
  RETURNING id INTO v_id;

  IF EXISTS (
    SELECT 1 FROM emission_factors
    WHERE id = v_id
      AND lifecycle_boundary IS NULL
      AND energy_basis IS NULL
      AND gwp_basis IS NULL
      AND factor_kind IS NULL
  ) THEN
    RAISE NOTICE '021 OK: NULL semantics accepted';
  ELSE
    RAISE EXCEPTION '021 FAIL: NULL semantics not stored';
  END IF;
END $$;
ROLLBACK;

\echo '=== final counts unchanged ==='
SELECT COUNT(*)::int AS registry FROM emission_factors;
SELECT COUNT(*)::int AS ademe FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id WHERE s.source_key = 'ademe';
SELECT COUNT(*)::int AS internal FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id WHERE s.source_key = 'internal';

\echo '=== 021 DONE ==='
