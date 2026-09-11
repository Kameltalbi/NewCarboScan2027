\set ON_ERROR_STOP on

\echo '=== 019A governance columns ==='
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'emission_factor_versions'
  AND column_name IN ('catalog_status', 'resolver_status')
ORDER BY column_name;

\echo '=== Core Pack TN governance ==='
SELECT version_label, status, catalog_status, resolver_status
FROM emission_factor_versions
WHERE version_label = 'core-tn-2027.1';

\echo '=== ADEME 23.9 governance (must stay draft/hidden) ==='
SELECT version_label, status, catalog_status, resolver_status
FROM emission_factor_versions
WHERE dataset_version = '23.9';

\echo '=== Legacy list count (internal source only) ==='
SELECT COUNT(*)::int AS legacy_count
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE f.status = 'approved'
  AND v.status = 'approved'
  AND s.source_key = 'internal';

\echo '=== Normal catalog count (approved + visible) ==='
SELECT COUNT(*)::int AS catalog_count
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved'
  AND v.status = 'approved'
  AND v.catalog_status = 'visible';

\echo '=== 019B simulation (ROLLBACK) ==='
BEGIN;

UPDATE emission_factor_versions
SET status = 'approved', catalog_status = 'visible'
WHERE dataset_version = '23.9';

SELECT 'catalog_visible_after_sim' AS check, COUNT(*)::int AS n
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible';

SELECT 'legacy_still_8' AS check, COUNT(*)::int AS n
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal';

ROLLBACK;

\echo '=== ADEME after rollback (draft/hidden) ==='
SELECT status, catalog_status FROM emission_factor_versions WHERE dataset_version = '23.9';
