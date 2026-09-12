-- =============================================================================
-- 025 — Bootstrap US EPA GHG Emission Factors Hub 2025 (post-checks only)
-- DATA is applied by migrate runners via db/seeds/epa_ghg_emission_factors_hub_2025.sql
-- BEFORE this file is journalized.
--
-- Governance: draft / hidden / disabled / disabled
-- Does NOT activate catalog or Factor Resolver.
-- Does NOT modify Core TN / ADEME / UK.
-- =============================================================================

DO $$
DECLARE
  v_src BIGINT;
  v_ver BIGINT;
  v_fac BIGINT;
  v_gov TEXT;
  v_calc BIGINT;
  v_res BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_src FROM factor_sources WHERE source_key = 'epa_ghg_emission_factors_hub';
  SELECT COUNT(*) INTO v_ver
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025';
  SELECT COUNT(*) INTO v_fac
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025';

  SELECT v.status || '/' || v.catalog_status || '/' || v.calculation_status || '/' || v.resolver_status
    INTO v_gov
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025'
  LIMIT 1;

  IF v_src <> 1 OR v_ver <> 1 OR v_fac <> 1421 THEN
    RAISE EXCEPTION 'EPA 025 bootstrap counts failed: src=% ver=% fac=% (expected 1/1/1421)', v_src, v_ver, v_fac;
  END IF;

  IF v_gov IS DISTINCT FROM 'draft/hidden/disabled/disabled' THEN
    RAISE EXCEPTION 'EPA 025 unexpected governance: %', v_gov;
  END IF;

  SELECT COUNT(*) INTO v_calc
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub'
    AND v.calculation_status = 'enabled';
  SELECT COUNT(*) INTO v_res
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'epa_ghg_emission_factors_hub'
    AND v.resolver_status = 'enabled';

  IF v_calc <> 0 OR v_res <> 0 THEN
    RAISE EXCEPTION 'EPA must not be calculation/resolver enabled at bootstrap (calc=% res=%)', v_calc, v_res;
  END IF;

  -- Non-regression: UK / ADEME / Core TN still present if previously bootstrapped
  -- (soft check — environments may differ; only assert EPA isolation here)
END $$;
