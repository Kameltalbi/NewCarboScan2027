-- =============================================================================
-- 019A — Catalog visibility & resolver eligibility governance (version-level)
-- Additive. Does not activate ADEME catalog (019B is separate).
-- =============================================================================

BEGIN;

ALTER TABLE emission_factor_versions
  ADD COLUMN IF NOT EXISTS catalog_status TEXT NOT NULL DEFAULT 'hidden',
  ADD COLUMN IF NOT EXISTS resolver_status TEXT NOT NULL DEFAULT 'disabled';

ALTER TABLE emission_factor_versions
  DROP CONSTRAINT IF EXISTS emission_factor_versions_catalog_status_check;

ALTER TABLE emission_factor_versions
  ADD CONSTRAINT emission_factor_versions_catalog_status_check
    CHECK (catalog_status IN ('hidden', 'visible'));

ALTER TABLE emission_factor_versions
  DROP CONSTRAINT IF EXISTS emission_factor_versions_resolver_status_check;

ALTER TABLE emission_factor_versions
  ADD CONSTRAINT emission_factor_versions_resolver_status_check
    CHECK (resolver_status IN ('disabled', 'enabled'));

-- Core Pack TN: visible in catalog, resolver remains disabled (no Resolver in 019)
UPDATE emission_factor_versions
SET
  catalog_status = 'visible',
  resolver_status = 'disabled'
WHERE version_label = 'core-tn-2027.1';

-- ADEME 23.9: explicit defaults (draft + hidden + disabled) — idempotent
UPDATE emission_factor_versions
SET
  catalog_status = 'hidden',
  resolver_status = 'disabled'
WHERE dataset_version = '23.9'
  AND version_label = '23.9';

CREATE INDEX IF NOT EXISTS idx_ef_versions_governance
  ON emission_factor_versions (status, catalog_status, resolver_status);

COMMIT;
