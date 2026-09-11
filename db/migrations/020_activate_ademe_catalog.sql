-- =============================================================================
-- 020 / 019B — ADEME Base Carbone v23.9 catalog activation (idempotent)
-- Publishes ADEME in catalog only. Calculation and resolver remain disabled.
-- Does NOT modify emission_factors rows — version governance only.
--
-- Allowed initial states (ADEME 23.9 version row only):
--   A) draft / hidden / disabled / disabled  → activate to approved / visible
--   B) approved / visible / disabled / disabled → NO-OP
-- Any other governance combination → FAIL
--
-- Performance debt (018 Search, not 020):
--   PERF-SEARCH-01 — fuzzy search on production catalog (~7402 FE) ~1–1.4s
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_version_id UUID;
  v_factor_count BIGINT;
  v_distinct_stable BIGINT;
  v_distinct_external BIGINT;
  v_null_value BIGINT;
  v_null_name BIGINT;
  v_value_mismatch BIGINT;
  v_activity_links BIGINT;
  v_status TEXT;
  v_catalog TEXT;
  v_calc TEXT;
  v_resolver TEXT;
  v_state_a BOOLEAN;
  v_state_b BOOLEAN;
BEGIN
  SELECT id, status, catalog_status, calculation_status, resolver_status
  INTO v_version_id, v_status, v_catalog, v_calc, v_resolver
  FROM emission_factor_versions
  WHERE dataset_version = '23.9' AND version_label = '23.9';

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION '020 preflight failed: ADEME version 23.9 not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM factor_sources
    WHERE source_key = 'ademe' AND name = 'ADEME Base Carbone'
  ) THEN
    RAISE EXCEPTION '020 preflight failed: ADEME Base Carbone source missing';
  END IF;

  v_state_a := (
    v_status = 'draft'
    AND v_catalog = 'hidden'
    AND v_calc = 'disabled'
    AND v_resolver = 'disabled'
  );
  v_state_b := (
    v_status = 'approved'
    AND v_catalog = 'visible'
    AND v_calc = 'disabled'
    AND v_resolver = 'disabled'
  );

  IF NOT (v_state_a OR v_state_b) THEN
    RAISE EXCEPTION
      '020 preflight failed: disallowed ADEME governance state status=% catalog=% calculation=% resolver=% (expected state A draft/hidden/disabled/disabled or state B approved/visible/disabled/disabled)',
      v_status, v_catalog, v_calc, v_resolver;
  END IF;

  IF v_calc <> 'disabled' THEN
    RAISE EXCEPTION '020 preflight failed: calculation_status must be disabled, got %', v_calc;
  END IF;

  IF v_resolver <> 'disabled' THEN
    RAISE EXCEPTION '020 preflight failed: resolver_status must be disabled, got %', v_resolver;
  END IF;

  SELECT COUNT(*) INTO v_factor_count
  FROM emission_factors
  WHERE version_id = v_version_id
    AND metadata->>'migration_id' = '016_ademe_bc_v239';

  IF v_factor_count <> 7394 THEN
    RAISE EXCEPTION '020 preflight failed: expected 7394 ADEME factors, got %', v_factor_count;
  END IF;

  SELECT COUNT(DISTINCT stable_factor_id) INTO v_distinct_stable
  FROM emission_factors WHERE version_id = v_version_id;

  IF v_distinct_stable <> 7394 THEN
    RAISE EXCEPTION '020 preflight failed: distinct stable_factor_id=%', v_distinct_stable;
  END IF;

  SELECT COUNT(DISTINCT external_code) INTO v_distinct_external
  FROM emission_factors WHERE version_id = v_version_id AND external_code IS NOT NULL;

  IF v_distinct_external <> 7394 THEN
    RAISE EXCEPTION '020 preflight failed: distinct external_code=%', v_distinct_external;
  END IF;

  SELECT COUNT(*) INTO v_null_value
  FROM emission_factors WHERE version_id = v_version_id AND value IS NULL;

  IF v_null_value > 0 THEN
    RAISE EXCEPTION '020 preflight failed: % factors with NULL value', v_null_value;
  END IF;

  SELECT COUNT(*) INTO v_null_name
  FROM emission_factors WHERE version_id = v_version_id AND name IS NULL;

  IF v_null_name > 0 THEN
    RAISE EXCEPTION '020 preflight failed: % factors with NULL name', v_null_name;
  END IF;

  SELECT COUNT(*) INTO v_value_mismatch
  FROM emission_factors f
  JOIN emission_factors_legacy l ON f.metadata->'provenance'->>'legacy_row_id' = l.id::text
  WHERE f.version_id = v_version_id
    AND f.metadata->>'migration_id' = '016_ademe_bc_v239'
    AND f.value <> l.emission_factor
    AND NOT (
      f.metadata->'provenance'->'transformations' IS NOT NULL
      AND jsonb_array_length(coalesce(f.metadata->'provenance'->'transformations', '[]'::jsonb)) > 0
    );

  IF v_value_mismatch > 0 THEN
    RAISE EXCEPTION '020 preflight failed: % legacy/registry value mismatches', v_value_mismatch;
  END IF;

  SELECT COUNT(*) INTO v_activity_links
  FROM activity_data ad
  JOIN emission_factors f ON f.id = ad.factor_id
  WHERE f.version_id = v_version_id;

  IF v_activity_links > 0 THEN
    RAISE EXCEPTION '020 preflight failed: % activity_data rows linked to ADEME factors', v_activity_links;
  END IF;

  IF v_state_b THEN
    RAISE NOTICE '020: ADEME 23.9 already activated (state B) — NO-OP';
  ELSE
    RAISE NOTICE '020: ADEME 23.9 state A detected — activating catalog';
  END IF;
END $$;

UPDATE emission_factor_versions
SET
  status = 'approved',
  catalog_status = 'visible',
  calculation_status = 'disabled',
  resolver_status = 'disabled',
  approved_at = COALESCE(approved_at, now())
WHERE dataset_version = '23.9'
  AND version_label = '23.9'
  AND status = 'draft'
  AND catalog_status = 'hidden'
  AND calculation_status = 'disabled'
  AND resolver_status = 'disabled';

DO $$
DECLARE
  v_status TEXT;
  v_catalog TEXT;
  v_calc TEXT;
  v_resolver TEXT;
  v_catalog_total BIGINT;
  v_legacy_total BIGINT;
  v_calculable_ademe BIGINT;
  v_activity_links BIGINT;
BEGIN
  SELECT status, catalog_status, calculation_status, resolver_status
  INTO v_status, v_catalog, v_calc, v_resolver
  FROM emission_factor_versions
  WHERE dataset_version = '23.9' AND version_label = '23.9';

  IF v_status <> 'approved' OR v_catalog <> 'visible' OR v_calc <> 'disabled' OR v_resolver <> 'disabled' THEN
    RAISE EXCEPTION '020 post-check failed: ADEME governance=%/%/%/%',
      v_status, v_catalog, v_calc, v_resolver;
  END IF;

  SELECT COUNT(*) INTO v_catalog_total
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible';

  IF v_catalog_total <> 7402 THEN
    RAISE EXCEPTION '020 post-check failed: catalog total=% (expected 7402)', v_catalog_total;
  END IF;

  SELECT COUNT(*) INTO v_legacy_total
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal';

  IF v_legacy_total <> 8 THEN
    RAISE EXCEPTION '020 post-check failed: legacy total=% (expected 8)', v_legacy_total;
  END IF;

  SELECT COUNT(*) INTO v_calculable_ademe
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ademe'
    AND f.status = 'approved'
    AND v.status = 'approved'
    AND v.calculation_status = 'enabled';

  IF v_calculable_ademe > 0 THEN
    RAISE EXCEPTION '020 post-check failed: % ADEME factors calculation-eligible', v_calculable_ademe;
  END IF;

  SELECT COUNT(*) INTO v_activity_links
  FROM activity_data ad
  JOIN emission_factors f ON f.id = ad.factor_id
  JOIN emission_factor_versions v ON v.id = f.version_id
  WHERE v.dataset_version = '23.9';

  IF v_activity_links > 0 THEN
    RAISE EXCEPTION '020 post-check failed: % activity_data rows linked to ADEME', v_activity_links;
  END IF;

  RAISE NOTICE '020 post-check: catalog=7402 legacy=8 ADEME calculable=0 activity_links=0';
END $$;

COMMIT;
