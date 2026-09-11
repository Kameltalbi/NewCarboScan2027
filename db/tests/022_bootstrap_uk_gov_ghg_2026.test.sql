-- 022 UK bootstrap post-conditions (run against a DB after migrate through 022)
SELECT 'uk_count' AS check, COUNT(*)::int AS n
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';

SELECT 'uk_governance' AS check,
       v.status, v.catalog_status, v.calculation_status, v.resolver_status
FROM emission_factor_versions v
JOIN factor_sources s ON s.id = v.source_id
WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';

SELECT 'visible_catalog' AS check, COUNT(*)::int AS n
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible';

SELECT 'registry' AS check, COUNT(*)::int AS n FROM emission_factors;

SELECT 'legacy_internal' AS check, COUNT(*)::int AS n
FROM emission_factors f
JOIN emission_factor_versions v ON v.id = f.version_id
JOIN factor_sources s ON s.id = v.source_id
WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal';
