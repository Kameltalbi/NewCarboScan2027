\set ON_ERROR_STOP on

\echo '=== 019B post-activation state ==='
SELECT status, catalog_status, calculation_status, resolver_status
FROM emission_factor_versions
WHERE dataset_version = '23.9';

\echo '=== Catalog total ==='
SELECT COUNT(*)::int AS catalog_total
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible';

\echo '=== Legacy total ==='
SELECT COUNT(*)::int AS legacy_total
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal';

\echo '=== ADEME calculable (must be 0) ==='
SELECT COUNT(*)::int AS calculable_ademe
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key = 'ademe'
  AND v.calculation_status = 'enabled';
