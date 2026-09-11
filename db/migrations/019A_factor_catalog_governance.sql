-- =============================================================================
-- 019A — Catalog visibility & resolver eligibility governance (version-level)
-- Additive. Does not activate ADEME catalog (020 / 019B is separate).
--
-- Backfill is monotone:
--   - Core TN → always ensure visible + resolver disabled
--   - ADEME draft → catalog hidden + resolver disabled (pre-publication)
--   - ADEME already approved/visible → DO NOT TOUCH (never unpublish)
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

-- ADEME 23.9 pre-publication only: draft → keep/force hidden.
-- Never rewrite approved/visible (post-020) back to hidden on re-run.
UPDATE emission_factor_versions
SET
  catalog_status = 'hidden',
  resolver_status = 'disabled'
WHERE dataset_version = '23.9'
  AND version_label = '23.9'
  AND status = 'draft';

CREATE INDEX IF NOT EXISTS idx_ef_versions_governance
  ON emission_factor_versions (status, catalog_status, resolver_status);

COMMIT;
