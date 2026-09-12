-- =============================================================================
-- 028 — Bootstrap IPCC EFDB (post-checks only)
-- DATA applied by migrate runners via db/seeds/ipcc_efdb.sql BEFORE this file.
--
-- Staging: ipcc_efdb_records = 27566 (all EF IDs, raw fields, parse, exclusions)
-- Registry: 778 operational stationary-combustion factors (216 CO2 activity + 562 components)
-- Governance: draft / hidden / disabled / disabled
-- Does NOT activate catalog or Factor Resolver.
-- Does NOT modify Core TN / ADEME / UK / EPA.
-- =============================================================================

DO $$
DECLARE
  v_src BIGINT;
  v_ver BIGINT;
  v_fac BIGINT;
  v_rec BIGINT;
  v_act BIGINT;
  v_gov TEXT;
BEGIN
  SELECT COUNT(*) INTO v_src FROM factor_sources WHERE source_key = 'ipcc_efdb';
  SELECT COUNT(*) INTO v_ver
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb' AND v.dataset_version = 'efdb_snapshot_2026_09';
  SELECT COUNT(*) INTO v_fac
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb' AND v.dataset_version = 'efdb_snapshot_2026_09';
  SELECT COUNT(*) INTO v_rec FROM ipcc_efdb_records;
  SELECT COUNT(*) INTO v_act
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb' AND f.factor_kind = 'activity_emission_factor';

  SELECT v.status || '/' || v.catalog_status || '/' || v.calculation_status || '/' || v.resolver_status
    INTO v_gov
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb' AND v.dataset_version = 'efdb_snapshot_2026_09'
  LIMIT 1;

  IF v_src <> 1 OR v_ver <> 1 OR v_fac <> 778 OR v_rec <> 27566 OR v_act <> 216 THEN
    RAISE EXCEPTION
      'IPCC EFDB 028 bootstrap failed: src=% ver=% fac=% rec=% act=% (expected 1/1/778/27566/216)',
      v_src, v_ver, v_fac, v_rec, v_act;
  END IF;

  IF v_gov IS DISTINCT FROM 'draft/hidden/disabled/disabled' THEN
    RAISE EXCEPTION 'IPCC EFDB 028 unexpected governance: %', v_gov;
  END IF;

  -- Mandatory examples preserved in staging
  IF NOT EXISTS (SELECT 1 FROM ipcc_efdb_records WHERE ef_id = '62801' AND semantic_class = 'auxiliary_parameter') THEN
    RAISE EXCEPTION 'IPCC EFDB 028: EF 62801 must be auxiliary_parameter';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ipcc_efdb_records WHERE ef_id = '14772' AND semantic_class = 'auxiliary_parameter') THEN
    RAISE EXCEPTION 'IPCC EFDB 028: EF 14772 must be auxiliary_parameter';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM emission_factors f
    JOIN emission_factor_versions v ON v.id = f.version_id
    JOIN factor_sources s ON s.id = v.source_id
    WHERE s.source_key = 'ipcc_efdb' AND f.external_code = '117614'
      AND f.factor_kind = 'activity_emission_factor'
      AND f.value = 74100
      AND f.unit_numerator = 'kgCO2e'
      AND f.unit_denominator = 'TJ'
      AND f.energy_basis = 'net_cv'
      AND f.country_code IS NULL
  ) THEN
    RAISE EXCEPTION 'IPCC EFDB 028: EF 117614 CO2 stationary combustion not promoted correctly';
  END IF;
END $$;
