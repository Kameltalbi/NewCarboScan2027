\set ON_ERROR_STOP on

\echo '=== 019A columns ==='
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'emission_factor_versions'
  AND column_name IN ('catalog_status', 'resolver_status')
ORDER BY column_name;

\echo '=== Core Pack TN remains visible ==='
SELECT version_label, status, catalog_status, resolver_status
FROM emission_factor_versions
WHERE version_label = 'core-tn-2027.1';

\echo '=== 019A must NOT unpublish approved/visible ADEME (ROLLBACK sim) ==='
BEGIN;

-- Snapshot current ADEME state then force post-020 shape
UPDATE emission_factor_versions
SET status = 'approved', catalog_status = 'visible', resolver_status = 'disabled'
WHERE dataset_version = '23.9' AND version_label = '23.9';

-- Re-apply 019A backfill fragment (same WHERE as migration)
UPDATE emission_factor_versions
SET catalog_status = 'hidden', resolver_status = 'disabled'
WHERE dataset_version = '23.9'
  AND version_label = '23.9'
  AND status = 'draft';

SELECT status, catalog_status, resolver_status
FROM emission_factor_versions
WHERE dataset_version = '23.9';

DO $$
DECLARE
  v_status TEXT;
  v_catalog TEXT;
BEGIN
  SELECT status, catalog_status INTO v_status, v_catalog
  FROM emission_factor_versions
  WHERE dataset_version = '23.9' AND version_label = '23.9';
  IF v_status <> 'approved' OR v_catalog <> 'visible' THEN
    RAISE EXCEPTION '019A regression: unpublished ADEME → %/%', v_status, v_catalog;
  END IF;
  RAISE NOTICE '019A OK: approved/visible preserved';
END $$;

ROLLBACK;

\echo '=== 019A draft ADEME still gets hidden ==='
BEGIN;
UPDATE emission_factor_versions
SET status = 'draft', catalog_status = 'visible'
WHERE dataset_version = '23.9';

UPDATE emission_factor_versions
SET catalog_status = 'hidden', resolver_status = 'disabled'
WHERE dataset_version = '23.9'
  AND version_label = '23.9'
  AND status = 'draft';

DO $$
DECLARE
  v_catalog TEXT;
BEGIN
  SELECT catalog_status INTO v_catalog
  FROM emission_factor_versions WHERE dataset_version = '23.9';
  IF v_catalog <> 'hidden' THEN
    RAISE EXCEPTION '019A failed: draft ADEME should be hidden, got %', v_catalog;
  END IF;
END $$;
ROLLBACK;
