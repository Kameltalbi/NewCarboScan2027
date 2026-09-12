-- =============================================================================
-- 027 — EPA AUTO_US controlled activation (idempotent)
-- Enables calculation + resolver at EPA version level ONLY.
-- App safe subset EPA_SAFE_SUBSET_V1_2026_09 limits auto-resolve/calc to
--   258 AUTO_US activity factors (never GWP / ghg_component / REVIEW_REQUIRED).
--
-- Prerequisites: 026 catalog activation (approved/visible).
-- Does NOT change factor values, checksums, UUIDs, or catalog visibility.
-- /v1/calculate remains source_key=internal only (application harden);
--   EPA AUTO_US is used via resolve / resolve-and-calculate.
-- Feature flag FACTOR_RESOLVER_CALCULATION_ENABLED remains the kill switch.
--
-- Rollback (manual): see docs/EPA_SAFE_SUBSET_V1.md § Rollback 027
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_registry BIGINT;
  v_visible BIGINT;
  v_epa_n BIGINT;
  v_status TEXT;
  v_catalog TEXT;
  v_calc TEXT;
  v_resolver TEXT;
  v_state_a BOOLEAN;
  v_state_b BOOLEAN;
  v_auto_us BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_registry FROM emission_factors;
  IF v_registry <> 11445 THEN
    RAISE EXCEPTION '027 abort: expected registry 11445, got %', v_registry;
  END IF;

  SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
  INTO v_status, v_catalog, v_calc, v_resolver
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025';

  IF v_status IS NULL THEN
    RAISE EXCEPTION '027 abort: EPA 2025 version missing';
  END IF;

  -- A: catalog-on, calc/resolver off → activate
  -- B: already fully enabled → NO-OP
  v_state_a := (
    v_status = 'approved'
    AND v_catalog = 'visible'
    AND v_calc = 'disabled'
    AND v_resolver = 'disabled'
  );
  v_state_b := (
    v_status = 'approved'
    AND v_catalog = 'visible'
    AND v_calc = 'enabled'
    AND v_resolver = 'enabled'
  );

  IF NOT (v_state_a OR v_state_b) THEN
    RAISE EXCEPTION
      '027 abort: disallowed EPA governance status=% catalog=% calc=% resolver=%',
      v_status, v_catalog, v_calc, v_resolver;
  END IF;

  SELECT COUNT(*) INTO v_epa_n
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025';
  IF v_epa_n <> 1421 THEN
    RAISE EXCEPTION '027 abort: expected 1421 EPA factors, got %', v_epa_n;
  END IF;

  -- Pin AUTO_US activity count (safe-subset expectation; do not loosen rules to match)
  SELECT COUNT(*) INTO v_auto_us
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub'
    AND coalesce(f.metadata->>'normalization_status', '') <> 'review_required'
    AND f.factor_kind = 'activity_emission_factor'
    AND f.gwp_basis = 'AR5'
    AND f.lifecycle_boundary IN ('direct', 'waste_treatment')
    AND f.country_code = 'US'
    AND f.metadata->'geography'->>'geographic_applicability' = 'US_SPECIFIC';
  IF v_auto_us <> 258 THEN
    RAISE EXCEPTION '027 abort: expected 258 AUTO_US activity factors, got %', v_auto_us;
  END IF;

  IF v_state_a THEN
    UPDATE emission_factor_versions v
    SET calculation_status = 'enabled',
        resolver_status = 'enabled'
    FROM factor_sources s
    WHERE s.id = v.source_id
      AND s.source_key = 'epa_ghg_emission_factors_hub'
      AND v.dataset_version = '2025'
      AND v.status = 'approved'
      AND v.catalog_status = 'visible'
      AND v.calculation_status = 'disabled'
      AND v.resolver_status = 'disabled';
    RAISE NOTICE '027: EPA 2025 calc+resolver enabled (AUTO_US gated in app)';
  ELSE
    RAISE NOTICE '027: EPA 2025 already calc+resolver enabled (NO-OP)';
  END IF;

  -- Post-checks: Core/ADEME/UK unchanged; catalog still 11445; EPA enabled
  SELECT COUNT(*) INTO v_visible
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible';
  IF v_visible <> 11445 THEN
    RAISE EXCEPTION '027 post-check failed: catalog visible=%', v_visible;
  END IF;

  IF EXISTS (
    SELECT 1 FROM emission_factor_versions v
    JOIN factor_sources s ON s.id = v.source_id
    WHERE s.source_key = 'epa_ghg_emission_factors_hub'
      AND v.dataset_version = '2025'
      AND (v.calculation_status <> 'enabled' OR v.resolver_status <> 'enabled'
           OR v.catalog_status <> 'visible' OR v.status <> 'approved')
  ) THEN
    RAISE EXCEPTION '027 post-check failed: EPA not approved/visible/enabled/enabled';
  END IF;

  IF (SELECT COUNT(*) FROM emission_factors) <> 11445 THEN
    RAISE EXCEPTION '027 post-check failed: registry changed';
  END IF;
END $$;

COMMIT;
