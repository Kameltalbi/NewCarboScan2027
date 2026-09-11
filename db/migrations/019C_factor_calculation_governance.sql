-- =============================================================================
-- 019C — Calculation eligibility governance (version-level)
-- Additive. Does not activate ADEME catalog or calculation (019B is separate).
-- =============================================================================

BEGIN;

ALTER TABLE emission_factor_versions
  ADD COLUMN IF NOT EXISTS calculation_status TEXT NOT NULL DEFAULT 'disabled';

ALTER TABLE emission_factor_versions
  DROP CONSTRAINT IF EXISTS emission_factor_versions_calculation_status_check;

ALTER TABLE emission_factor_versions
  ADD CONSTRAINT emission_factor_versions_calculation_status_check
    CHECK (calculation_status IN ('disabled', 'enabled'));

ALTER TABLE emission_factor_versions
  DROP CONSTRAINT IF EXISTS emission_factor_versions_resolver_requires_calculation;

ALTER TABLE emission_factor_versions
  ADD CONSTRAINT emission_factor_versions_resolver_requires_calculation
    CHECK (resolver_status <> 'enabled' OR calculation_status = 'enabled');

-- Core Pack TN: enabled for legitimate POST /v1/calculate (CoreProofWorkspace)
UPDATE emission_factor_versions
SET calculation_status = 'enabled'
WHERE version_label = 'core-tn-2027.1';

-- ADEME 23.9: calculation remains disabled
UPDATE emission_factor_versions
SET calculation_status = 'disabled'
WHERE dataset_version = '23.9'
  AND version_label = '23.9';

CREATE INDEX IF NOT EXISTS idx_ef_versions_calculation_governance
  ON emission_factor_versions (status, calculation_status, catalog_status, resolver_status);

COMMIT;
