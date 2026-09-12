-- =============================================================================
-- 026 — EPA GHG Emission Factors Hub 2025 catalog activation (idempotent)
-- Publishes EPA in catalog only. Calculation and resolver remain disabled.
--
-- Safe Subset V1 (app): EPA_SAFE_SUBSET_V1_2026_09
--   AUTO_US activity may later auto-resolve when calc/resolver are enabled.
--   GLOBAL_GWP never as activity. AUTO_GLOBAL_ACTIVITY = 0 in V1.
--
-- Targets EXCLUSIVELY:
--   factor_sources.source_key = 'epa_ghg_emission_factors_hub'
--   emission_factor_versions.dataset_version = '2025'
--
-- Allowed version states:
--   A) draft / hidden / disabled / disabled  → approved / visible / disabled / disabled
--   B) approved / visible / disabled / disabled → NO-OP
-- Any other combination → FAIL
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_source_count BIGINT;
  v_version_count BIGINT;
  v_version_id UUID;
  v_factor_count BIGINT;
  v_status TEXT;
  v_catalog TEXT;
  v_calc TEXT;
  v_resolver TEXT;
  v_state_a BOOLEAN;
  v_state_b BOOLEAN;
  v_registry BIGINT;
  v_visible BIGINT;
  v_ademe BIGINT;
  v_uk BIGINT;
  v_core BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_source_count
  FROM factor_sources WHERE source_key = 'epa_ghg_emission_factors_hub';
  IF v_source_count <> 1 THEN
    RAISE EXCEPTION '026 preflight failed: expected 1 epa source, got %', v_source_count;
  END IF;

  SELECT COUNT(*) INTO v_version_count
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025';
  IF v_version_count <> 1 THEN
    RAISE EXCEPTION '026 preflight failed: expected 1 EPA version 2025, got %', v_version_count;
  END IF;

  SELECT v.id, v.status, v.catalog_status, v.calculation_status, v.resolver_status
  INTO v_version_id, v_status, v_catalog, v_calc, v_resolver
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025';

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
      '026 preflight failed: disallowed EPA governance state status=% catalog=% calculation=% resolver=%',
      v_status, v_catalog, v_calc, v_resolver;
  END IF;

  IF v_calc <> 'disabled' OR v_resolver <> 'disabled' THEN
    RAISE EXCEPTION '026 abort: calculation/resolver must remain disabled (calc=% resolver=%)',
      v_calc, v_resolver;
  END IF;

  SELECT COUNT(*) INTO v_factor_count
  FROM emission_factors WHERE version_id = v_version_id;
  IF v_factor_count <> 1421 THEN
    RAISE EXCEPTION '026 preflight failed: expected 1421 EPA factors, got %', v_factor_count;
  END IF;

  IF v_state_a THEN
    UPDATE emission_factor_versions
    SET status = 'approved',
        catalog_status = 'visible',
        calculation_status = 'disabled',
        resolver_status = 'disabled',
        approved_at = COALESCE(approved_at, now())
    WHERE id = v_version_id;

    -- Promote factor rows draft → approved (catalog search requires f.status=approved)
    UPDATE emission_factors
    SET status = 'approved',
        approved_at = COALESCE(approved_at, now())
    WHERE version_id = v_version_id
      AND status = 'draft';

    RAISE NOTICE '026: EPA 2025 state A → approved/visible/disabled/disabled';
  ELSE
    RAISE NOTICE '026: EPA 2025 already catalog-activated (NO-OP)';
  END IF;

  -- Post-checks: calc/resolver still disabled; registry unchanged; catalog includes EPA
  SELECT COUNT(*) INTO v_registry FROM emission_factors;
  IF v_registry <> 11445 THEN
    RAISE EXCEPTION '026 post-check failed: registry=% (expected 11445)', v_registry;
  END IF;

  SELECT COUNT(*) INTO v_visible
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible';
  IF v_visible <> 11445 THEN
    RAISE EXCEPTION '026 post-check failed: catalog visible=% (expected 11445)', v_visible;
  END IF;

  SELECT COUNT(*) INTO v_core
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'internal';
  SELECT COUNT(*) INTO v_ademe
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ademe';
  SELECT COUNT(*) INTO v_uk
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg';

  IF v_core <> 8 OR v_ademe <> 7394 OR v_uk <> 2622 THEN
    RAISE EXCEPTION '026 post-check failed: Core/ADEME/UK changed core=% ademe=% uk=%',
      v_core, v_ademe, v_uk;
  END IF;

  IF EXISTS (
    SELECT 1 FROM emission_factor_versions v
    JOIN factor_sources s ON s.id = v.source_id
    WHERE s.source_key = 'epa_ghg_emission_factors_hub'
      AND v.dataset_version = '2025'
      AND (v.calculation_status <> 'disabled' OR v.resolver_status <> 'disabled')
  ) THEN
    RAISE EXCEPTION '026 abort: EPA calculation/resolver must stay disabled';
  END IF;
END $$;

COMMIT;
