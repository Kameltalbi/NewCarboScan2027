-- 017 — Factor registry normalization tests (run: psql -f db/tests/017_factor_registry_normalization.test.sql)
\set ON_ERROR_STOP on

DO $$
DECLARE
  v_fail INT := 0;
  v_cnt BIGINT;
BEGIN
  -- ADEME count
  SELECT COUNT(*) INTO v_cnt FROM emission_factors WHERE metadata->>'migration_id' = '016_ademe_bc_v239';
  IF v_cnt <> 7394 THEN
    RAISE WARNING 'FAIL ademe count: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  -- Version draft
  IF (SELECT status FROM emission_factor_versions WHERE version_label = '23.9') <> 'draft' THEN
    RAISE WARNING 'FAIL ADEME version not draft'; v_fail := v_fail + 1;
  END IF;

  -- API exposure (same query as GET /v1/factors)
  SELECT COUNT(*) INTO v_cnt FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  WHERE f.status = 'approved' AND v.status = 'approved';
  IF v_cnt <> 8 THEN
    RAISE WARNING 'FAIL api exposed count: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  -- source_key
  IF NOT EXISTS (SELECT 1 FROM factor_sources WHERE source_key = 'ademe') THEN
    RAISE WARNING 'FAIL missing source_key ademe'; v_fail := v_fail + 1;
  END IF;

  -- provenance fields
  SELECT COUNT(*) INTO v_cnt FROM emission_factors
  WHERE metadata->>'migration_id' = '016_ademe_bc_v239'
    AND metadata->'provenance'->>'original_value' IS NULL;
  IF v_cnt > 0 THEN
    RAISE WARNING 'FAIL missing original_value: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  -- legacy_016 preserved
  SELECT COUNT(*) INTO v_cnt FROM emission_factors
  WHERE metadata->>'migration_id' = '016_ademe_bc_v239'
    AND metadata->'legacy_016' IS NULL;
  IF v_cnt > 0 THEN
    RAISE WARNING 'FAIL missing legacy_016 block: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  -- Nm3 distinct from m3
  IF EXISTS (
    SELECT 1 FROM emission_factors
    WHERE metadata->>'migration_id' = '016_ademe_bc_v239'
      AND metadata->>'original_unit' ~* 'm3\s*\(n\)|m³\s*\(n\)'
      AND unit_denominator = 'm3'
  ) THEN
    RAISE WARNING 'FAIL Nm3 row still labeled m3'; v_fail := v_fail + 1;
  END IF;

  -- negative not classified as avoided_emission
  SELECT COUNT(*) INTO v_cnt FROM emission_factors
  WHERE metadata->>'migration_id' = '016_ademe_bc_v239'
    AND value < 0 AND factor_type = 'avoided_emission';
  IF v_cnt > 0 THEN
    RAISE WARNING 'FAIL negative classified avoided: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  -- factor_type enum
  SELECT COUNT(*) INTO v_cnt FROM emission_factors
  WHERE factor_type NOT IN ('physical','monetary','gwp','lca','supplier','avoided_emission','other','unknown');
  IF v_cnt > 0 THEN
    RAISE WARNING 'FAIL invalid factor_type: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  -- checksum v2 metadata
  SELECT COUNT(*) INTO v_cnt FROM emission_factors
  WHERE metadata->>'migration_id' = '016_ademe_bc_v239'
    AND metadata->>'checksum_version' <> 'v2';
  IF v_cnt > 0 THEN
    RAISE WARNING 'FAIL checksum_version not v2: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  -- geography column not overwritten to country_code only (heat network keeps NULL geography ok)
  -- country_code populated for heat regions
  SELECT COUNT(*) INTO v_cnt FROM emission_factors
  WHERE metadata->>'migration_id' = '016_ademe_bc_v239'
    AND source_category = 'Réseaux de chaleur / froid'
    AND country_code IS NULL;
  IF v_cnt > 0 THEN
    RAISE WARNING 'FAIL heat network missing country_code: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  -- monetary structure
  SELECT COUNT(*) INTO v_cnt FROM emission_factors
  WHERE factor_type = 'monetary' AND metadata->>'migration_id' = '016_ademe_bc_v239'
    AND metadata->'monetary'->>'currency' IS NULL;
  IF v_cnt > 0 THEN
    RAISE WARNING 'FAIL monetary missing currency: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  -- stable_factor_id uniqueness
  SELECT COUNT(*) INTO v_cnt FROM (
    SELECT stable_factor_id, version_number, COUNT(*)
    FROM emission_factors WHERE stable_factor_id IS NOT NULL
    GROUP BY 1,2 HAVING COUNT(*) > 1
  ) d;
  IF v_cnt > 0 THEN
    RAISE WARNING 'FAIL duplicate stable_factor_id: %', v_cnt; v_fail := v_fail + 1;
  END IF;

  IF v_fail > 0 THEN
    RAISE EXCEPTION '017 tests failed: % failures', v_fail;
  END IF;
  RAISE NOTICE '017 tests: ALL PASSED (% checks)', 12;
END $$;

-- Unit function spot checks
DO $$
BEGIN
  IF (SELECT unit_denominator FROM ef_canonical_normalize_unit('kgCO2e/m3 (n)')) <> 'Nm3' THEN
    RAISE EXCEPTION 'unit test fail: Nm3';
  END IF;
  IF (SELECT unit_denominator FROM ef_canonical_normalize_unit('kgCO2e/m3')) <> 'm3' THEN
    RAISE EXCEPTION 'unit test fail: m3';
  END IF;
  IF (SELECT unit_denominator FROM ef_canonical_normalize_unit('kgCO2e/keuro (2023) HT')) <> 'kEUR' THEN
    RAISE EXCEPTION 'unit test fail: kEUR';
  END IF;
  IF EXISTS (
    SELECT 1 FROM ef_canonical_normalize_unit('kgCO2e/GJ PCI') u
    WHERE 'PCI' = ANY(u.qualifiers)
  ) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'unit test fail: PCI qualifier';
  END IF;
  RAISE NOTICE '017 unit function tests: PASSED';
END $$;
