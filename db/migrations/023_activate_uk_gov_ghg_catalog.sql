-- =============================================================================
-- 023 — UK Government GHG 2026 catalog activation (idempotent)
-- Publishes UK in catalog only. Calculation and resolver remain disabled.
--
-- Targets EXCLUSIVELY:
--   factor_sources.source_key = 'uk_gov_ghg'
--   emission_factor_versions.dataset_version = '2026-flat-1.2'
--
-- Allowed version states:
--   A) draft / hidden / disabled / disabled  → approved / visible / disabled / disabled
--   B) approved / visible / disabled / disabled → NO-OP
-- Any other combination → FAIL
--
-- Factor-row governance:
--   UK bootstrap (022) inserts factors as status=draft. Catalog search requires
--   f.status='approved'. This migration therefore promotes factor status
--   draft → approved for this version only (no value/checksum/UUID/taxonomy change).
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_source_count BIGINT;
  v_version_count BIGINT;
  v_version_id UUID;
  v_factor_count BIGINT;
  v_distinct_stable BIGINT;
  v_distinct_external BIGINT;
  v_null_value BIGINT;
  v_ledger BIGINT;
  v_status TEXT;
  v_catalog TEXT;
  v_calc TEXT;
  v_resolver TEXT;
  v_state_a BOOLEAN;
  v_state_b BOOLEAN;
  v_checksum_before TEXT;
BEGIN
  SELECT COUNT(*) INTO v_source_count
  FROM factor_sources WHERE source_key = 'uk_gov_ghg';
  IF v_source_count <> 1 THEN
    RAISE EXCEPTION '023 preflight failed: expected 1 uk_gov_ghg source, got %', v_source_count;
  END IF;

  SELECT COUNT(*) INTO v_version_count
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';
  IF v_version_count <> 1 THEN
    RAISE EXCEPTION '023 preflight failed: expected 1 UK version 2026-flat-1.2, got %', v_version_count;
  END IF;

  SELECT v.id, v.status, v.catalog_status, v.calculation_status, v.resolver_status
  INTO v_version_id, v_status, v_catalog, v_calc, v_resolver
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';

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
      '023 preflight failed: disallowed UK governance state status=% catalog=% calculation=% resolver=% (expected A draft/hidden/disabled/disabled or B approved/visible/disabled/disabled)',
      v_status, v_catalog, v_calc, v_resolver;
  END IF;

  IF v_calc <> 'disabled' THEN
    RAISE EXCEPTION '023 preflight failed: calculation_status must be disabled, got %', v_calc;
  END IF;

  IF v_resolver <> 'disabled' THEN
    RAISE EXCEPTION '023 preflight failed: resolver_status must be disabled, got %', v_resolver;
  END IF;

  SELECT COUNT(*) INTO v_factor_count
  FROM emission_factors WHERE version_id = v_version_id;
  IF v_factor_count <> 2622 THEN
    RAISE EXCEPTION '023 preflight failed: expected 2622 UK factors, got %', v_factor_count;
  END IF;

  SELECT COUNT(DISTINCT stable_factor_id) INTO v_distinct_stable
  FROM emission_factors WHERE version_id = v_version_id;
  IF v_distinct_stable <> 2622 THEN
    RAISE EXCEPTION '023 preflight failed: distinct stable_factor_id=%', v_distinct_stable;
  END IF;

  SELECT COUNT(DISTINCT external_code) INTO v_distinct_external
  FROM emission_factors
  WHERE version_id = v_version_id AND external_code IS NOT NULL;
  IF v_distinct_external <> 2622 THEN
    RAISE EXCEPTION '023 preflight failed: distinct external_code=%', v_distinct_external;
  END IF;

  SELECT COUNT(*) INTO v_null_value
  FROM emission_factors WHERE version_id = v_version_id AND value IS NULL;
  IF v_null_value > 0 THEN
    RAISE EXCEPTION '023 preflight failed: % UK factors with NULL value', v_null_value;
  END IF;

  SELECT COUNT(*) INTO v_ledger
  FROM calculation_ledger cl
  JOIN emission_factors f ON f.id = cl.factor_id
  WHERE f.version_id = v_version_id;
  IF v_ledger > 0 THEN
    RAISE EXCEPTION '023 preflight failed: % calculation_ledger rows reference UK factors', v_ledger;
  END IF;

  -- Snapshot for immutability (data fields — not governance status)
  SELECT md5(string_agg(
           f.stable_factor_id || '|' || coalesce(f.external_code, '') || '|' ||
           f.value::text || '|' || coalesce(f.checksum, ''),
           ',' ORDER BY f.stable_factor_id
         ))
  INTO v_checksum_before
  FROM emission_factors f
  WHERE f.version_id = v_version_id;

  PERFORM set_config('app.uk_023_data_fingerprint', coalesce(v_checksum_before, ''), true);
  PERFORM set_config('app.uk_023_version_id', v_version_id::text, true);

  IF v_state_b THEN
    RAISE NOTICE '023: UK 2026-flat-1.2 already activated (state B) — NO-OP';
  ELSE
    RAISE NOTICE '023: UK 2026-flat-1.2 state A detected — activating catalog';
  END IF;
END $$;

-- Version governance only (state A → B; state B matches 0 rows)
UPDATE emission_factor_versions v
SET
  status = 'approved',
  catalog_status = 'visible',
  calculation_status = 'disabled',
  resolver_status = 'disabled',
  approved_at = COALESCE(v.approved_at, now())
FROM factor_sources s
WHERE s.id = v.source_id
  AND s.source_key = 'uk_gov_ghg'
  AND v.dataset_version = '2026-flat-1.2'
  AND v.status = 'draft'
  AND v.catalog_status = 'hidden'
  AND v.calculation_status = 'disabled'
  AND v.resolver_status = 'disabled';

-- Factor-row catalog governance (draft → approved). Does not touch value/checksum/UUID.
UPDATE emission_factors f
SET
  status = 'approved',
  approved_at = COALESCE(f.approved_at, now())
FROM emission_factor_versions v
JOIN factor_sources s ON s.id = v.source_id
WHERE f.version_id = v.id
  AND s.source_key = 'uk_gov_ghg'
  AND v.dataset_version = '2026-flat-1.2'
  AND f.status = 'draft';

DO $$
DECLARE
  v_version_id UUID;
  v_status TEXT;
  v_catalog TEXT;
  v_calc TEXT;
  v_resolver TEXT;
  v_uk BIGINT;
  v_uk_approved BIGINT;
  v_registry BIGINT;
  v_visible BIGINT;
  v_ademe BIGINT;
  v_core BIGINT;
  v_calculable_uk BIGINT;
  v_resolver_uk BIGINT;
  v_review BIGINT;
  v_gwp_unknown BIGINT;
  v_fingerprint_before TEXT;
  v_fingerprint_after TEXT;
BEGIN
  v_version_id := current_setting('app.uk_023_version_id')::uuid;
  v_fingerprint_before := current_setting('app.uk_023_data_fingerprint');

  SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
  INTO v_status, v_catalog, v_calc, v_resolver
  FROM emission_factor_versions v
  WHERE v.id = v_version_id;

  IF v_status <> 'approved' OR v_catalog <> 'visible' OR v_calc <> 'disabled' OR v_resolver <> 'disabled' THEN
    RAISE EXCEPTION '023 post-check failed: UK governance=%/%/%/%',
      v_status, v_catalog, v_calc, v_resolver;
  END IF;

  SELECT COUNT(*) INTO v_uk FROM emission_factors WHERE version_id = v_version_id;
  IF v_uk <> 2622 THEN
    RAISE EXCEPTION '023 post-check failed: UK count=%', v_uk;
  END IF;

  SELECT COUNT(*) INTO v_uk_approved
  FROM emission_factors WHERE version_id = v_version_id AND status = 'approved';
  IF v_uk_approved <> 2622 THEN
    RAISE EXCEPTION '023 post-check failed: UK approved factors=% (expected 2622)', v_uk_approved;
  END IF;

  SELECT COUNT(*) INTO v_registry FROM emission_factors;
  IF v_registry <> 10024 THEN
    RAISE EXCEPTION '023 post-check failed: registry=% (expected 10024)', v_registry;
  END IF;

  SELECT COUNT(*) INTO v_visible
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible';
  IF v_visible <> 10024 THEN
    RAISE EXCEPTION '023 post-check failed: visible catalog=% (expected 10024)', v_visible;
  END IF;

  SELECT COUNT(*) INTO v_ademe
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ademe';
  IF v_ademe <> 7394 THEN
    RAISE EXCEPTION '023 post-check failed: ADEME count=%', v_ademe;
  END IF;

  SELECT COUNT(*) INTO v_core
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'internal'
    AND f.status = 'approved' AND v.status = 'approved';
  IF v_core <> 8 THEN
    RAISE EXCEPTION '023 post-check failed: Core TN count=%', v_core;
  END IF;

  SELECT COUNT(*) INTO v_calculable_uk
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg'
    AND f.status = 'approved'
    AND v.status = 'approved'
    AND v.calculation_status = 'enabled';
  IF v_calculable_uk > 0 THEN
    RAISE EXCEPTION '023 post-check failed: % UK factors calculation-eligible', v_calculable_uk;
  END IF;

  SELECT COUNT(*) INTO v_resolver_uk
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.resolver_status = 'enabled';
  IF v_resolver_uk > 0 THEN
    RAISE EXCEPTION '023 post-check failed: % UK factors resolver-enabled', v_resolver_uk;
  END IF;

  SELECT COUNT(*) INTO v_review
  FROM emission_factors f
  WHERE f.version_id = v_version_id
    AND f.metadata->>'normalization_status' = 'review_required';
  IF v_review <> 363 THEN
    RAISE EXCEPTION '023 post-check failed: review_required=% (expected 363)', v_review;
  END IF;

  SELECT COUNT(*) INTO v_gwp_unknown
  FROM emission_factors f
  WHERE f.version_id = v_version_id AND f.gwp_basis = 'unknown';
  IF v_gwp_unknown <> 359 THEN
    RAISE EXCEPTION '023 post-check failed: gwp unknown=% (expected 359)', v_gwp_unknown;
  END IF;

  SELECT md5(string_agg(
           f.stable_factor_id || '|' || coalesce(f.external_code, '') || '|' ||
           f.value::text || '|' || coalesce(f.checksum, ''),
           ',' ORDER BY f.stable_factor_id
         ))
  INTO v_fingerprint_after
  FROM emission_factors f
  WHERE f.version_id = v_version_id;

  IF v_fingerprint_after IS DISTINCT FROM v_fingerprint_before THEN
    RAISE EXCEPTION '023 post-check failed: UK data fingerprint changed (value/checksum/ids mutated)';
  END IF;

  RAISE NOTICE '023 post-check: registry=10024 visible=10024 uk=2622 calculable=0 resolver=0 fingerprint_ok';
END $$;

COMMIT;
