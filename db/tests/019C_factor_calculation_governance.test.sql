\set ON_ERROR_STOP on

\echo '=== 019C calculation_status column ==='
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'emission_factor_versions'
  AND column_name = 'calculation_status';

\echo '=== Core TN governance ==='
SELECT status, catalog_status, calculation_status, resolver_status
FROM emission_factor_versions
WHERE version_label = 'core-tn-2027.1';

\echo '=== ADEME 23.9 governance ==='
SELECT status, catalog_status, calculation_status, resolver_status
FROM emission_factor_versions
WHERE dataset_version = '23.9';

\echo '=== resolver enabled + calculation disabled must FAIL ==='
DO $$
BEGIN
  UPDATE emission_factor_versions
  SET resolver_status = 'enabled', calculation_status = 'disabled'
  WHERE version_label = 'core-tn-2027.1';
  RAISE EXCEPTION '019C FAIL: resolver enabled + calculation disabled was allowed';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE '019C OK: resolver enabled + calculation disabled rejected';
END $$;

\echo '=== resolver enabled + calculation enabled is structurally valid (rollback) ==='
BEGIN;
UPDATE emission_factor_versions
SET resolver_status = 'enabled', calculation_status = 'enabled'
WHERE version_label = 'core-tn-2027.1';
SELECT resolver_status, calculation_status
FROM emission_factor_versions WHERE version_label = 'core-tn-2027.1';
ROLLBACK;

\echo '=== calculable registry count (approved + calculation enabled) ==='
SELECT COUNT(*)::int AS calculable_count
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved'
  AND v.status = 'approved'
  AND v.calculation_status = 'enabled';

\echo '=== 019B simulation: ADEME visible but not calculable (ROLLBACK) ==='
BEGIN;
UPDATE emission_factor_versions
SET status = 'approved', catalog_status = 'visible', calculation_status = 'disabled'
WHERE dataset_version = '23.9';

SELECT 'catalog_visible' AS check, COUNT(*)::int AS n
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible';

SELECT 'calculable_ademe' AS check, COUNT(*)::int AS n
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved' AND v.status = 'approved' AND v.calculation_status = 'enabled'
  AND v.dataset_version = '23.9';

SELECT 'legacy_still_8' AS check, COUNT(*)::int AS n
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal';

ROLLBACK;

\echo '=== ADEME after rollback ==='
SELECT status, catalog_status, calculation_status FROM emission_factor_versions WHERE dataset_version = '23.9';
