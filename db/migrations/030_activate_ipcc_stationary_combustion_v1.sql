-- =============================================================================
-- 030 — IPCC EFDB stationary combustion V1 activation (idempotent)
-- Enables calculation + resolver at version level.
-- App safe subset IPCC_STATIONARY_COMBUSTION_V1 limits auto-resolve/calc to
--   216 CO2 activity factors (AUTO_GLOBAL_ACTIVITY). Components stay non-activity.
-- Empty region ≠ WORLD (country_code NULL + IPCC_DEFAULT_UNSPECIFIED).
-- Rollback: set calculation_status/resolver_status back to disabled.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_status TEXT;
  v_catalog TEXT;
  v_calc TEXT;
  v_resolver TEXT;
  v_state_a BOOLEAN;
  v_state_b BOOLEAN;
  v_act BIGINT;
  v_reg BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_reg FROM emission_factors;
  -- Registry grows by +778 vs pre-IPCC; do not pin absolute total here (EPA/UK/etc.).

  SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
  INTO v_status, v_catalog, v_calc, v_resolver
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb' AND v.dataset_version = 'efdb_snapshot_2026_09';

  IF v_status IS NULL THEN
    RAISE EXCEPTION '030 abort: IPCC EFDB version missing';
  END IF;

  v_state_a := (
    v_status = 'approved' AND v_catalog = 'visible'
    AND v_calc = 'disabled' AND v_resolver = 'disabled'
  );
  v_state_b := (
    v_status = 'approved' AND v_catalog = 'visible'
    AND v_calc = 'enabled' AND v_resolver = 'enabled'
  );

  IF NOT (v_state_a OR v_state_b) THEN
    RAISE EXCEPTION
      '030 abort: disallowed IPCC governance status=% catalog=% calc=% resolver=%',
      v_status, v_catalog, v_calc, v_resolver;
  END IF;

  SELECT COUNT(*) INTO v_act
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb'
    AND f.factor_kind = 'activity_emission_factor'
    AND f.unit_numerator = 'kgCO2e'
    AND f.unit_denominator = 'TJ'
    AND f.energy_basis = 'net_cv'
    AND f.lifecycle_boundary = 'direct'
    AND f.country_code IS NULL
    AND coalesce(f.metadata->'provenance'->>'geographicApplicability', '') = 'IPCC_DEFAULT_UNSPECIFIED';
  IF v_act <> 216 THEN
    RAISE EXCEPTION '030 abort: expected 216 AUTO_GLOBAL_ACTIVITY CO2 factors, got %', v_act;
  END IF;

  IF v_state_a THEN
    UPDATE emission_factor_versions v
    SET calculation_status = 'enabled',
        resolver_status = 'enabled'
    FROM factor_sources s
    WHERE s.id = v.source_id
      AND s.source_key = 'ipcc_efdb'
      AND v.dataset_version = 'efdb_snapshot_2026_09'
      AND v.calculation_status = 'disabled'
      AND v.resolver_status = 'disabled';
    RAISE NOTICE '030: IPCC EFDB calc+resolver enabled (216 AUTO_GLOBAL_ACTIVITY gated in app)';
  ELSE
    RAISE NOTICE '030: IPCC EFDB already calc+resolver enabled (NO-OP)';
  END IF;
END $$;

COMMIT;
