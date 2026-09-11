-- =============================================================================
-- 024 — FE V1 Factor Resolver controlled activation (idempotent)
-- Enables calculation + resolver at version level for:
--   - internal (Core TN): resolver_status enabled (calculation already enabled)
--   - ademe: calculation + resolver enabled (auto-resolve limited by app safe subset ~2570)
--   - uk_gov_ghg: calculation + resolver enabled (auto-resolve limited by app safe subset ~1260)
--
-- Does NOT change factor values, checksums, UUIDs, or catalog visibility.
-- /v1/calculate remains source_key=internal only (application harden).
-- Feature flag FACTOR_RESOLVER_CALCULATION_ENABLED remains the kill switch (default OFF).
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_internal_before TEXT;
  v_ademe_calc TEXT;
  v_ademe_res TEXT;
  v_uk_calc TEXT;
  v_uk_res TEXT;
  v_registry BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_registry FROM emission_factors;
  IF v_registry <> 10024 THEN
    RAISE EXCEPTION '024 abort: expected registry 10024, got %', v_registry;
  END IF;

  -- Core TN: calculation must already be enabled; enable resolver only
  SELECT v.resolver_status INTO v_internal_before
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'internal'
  LIMIT 1;

  IF v_internal_before IS NULL THEN
    RAISE EXCEPTION '024 abort: internal version missing';
  END IF;

  IF v_internal_before NOT IN ('disabled', 'enabled') THEN
    RAISE EXCEPTION '024 abort: unexpected internal resolver_status=%', v_internal_before;
  END IF;

  UPDATE emission_factor_versions v
  SET resolver_status = 'enabled'
  FROM factor_sources s
  WHERE s.id = v.source_id
    AND s.source_key = 'internal'
    AND v.calculation_status = 'enabled'
    AND v.resolver_status = 'disabled';

  -- ADEME: only from approved/visible/disabled/disabled → enable calc+resolver
  SELECT v.calculation_status, v.resolver_status INTO v_ademe_calc, v_ademe_res
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ademe'
  LIMIT 1;

  IF v_ademe_calc IS NULL THEN
    RAISE EXCEPTION '024 abort: ademe version missing';
  END IF;

  IF NOT (
    (v_ademe_calc = 'disabled' AND v_ademe_res = 'disabled')
    OR (v_ademe_calc = 'enabled' AND v_ademe_res = 'enabled')
  ) THEN
    RAISE EXCEPTION
      '024 abort: unexpected ademe governance calc=% resolver=%',
      v_ademe_calc, v_ademe_res;
  END IF;

  UPDATE emission_factor_versions v
  SET calculation_status = 'enabled',
      resolver_status = 'enabled'
  FROM factor_sources s
  WHERE s.id = v.source_id
    AND s.source_key = 'ademe'
    AND v.status = 'approved'
    AND v.catalog_status = 'visible'
    AND v.calculation_status = 'disabled'
    AND v.resolver_status = 'disabled';

  -- UK: same pattern
  SELECT v.calculation_status, v.resolver_status INTO v_uk_calc, v_uk_res
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg'
  LIMIT 1;

  IF v_uk_calc IS NULL THEN
    RAISE EXCEPTION '024 abort: uk_gov_ghg version missing';
  END IF;

  IF NOT (
    (v_uk_calc = 'disabled' AND v_uk_res = 'disabled')
    OR (v_uk_calc = 'enabled' AND v_uk_res = 'enabled')
  ) THEN
    RAISE EXCEPTION
      '024 abort: unexpected uk governance calc=% resolver=%',
      v_uk_calc, v_uk_res;
  END IF;

  UPDATE emission_factor_versions v
  SET calculation_status = 'enabled',
      resolver_status = 'enabled'
  FROM factor_sources s
  WHERE s.id = v.source_id
    AND s.source_key = 'uk_gov_ghg'
    AND v.status = 'approved'
    AND v.catalog_status = 'visible'
    AND v.calculation_status = 'disabled'
    AND v.resolver_status = 'disabled';

  -- Final invariants
  IF (SELECT COUNT(*) FROM emission_factors) <> 10024 THEN
    RAISE EXCEPTION '024 abort: registry changed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM emission_factor_versions v
    JOIN factor_sources s ON s.id = v.source_id
    WHERE s.source_key = 'internal'
      AND (v.calculation_status <> 'enabled' OR v.resolver_status <> 'enabled')
  ) THEN
    RAISE EXCEPTION '024 abort: internal not fully enabled';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM emission_factor_versions v
    JOIN factor_sources s ON s.id = v.source_id
    WHERE s.source_key IN ('ademe', 'uk_gov_ghg')
      AND (v.calculation_status <> 'enabled' OR v.resolver_status <> 'enabled')
  ) THEN
    RAISE EXCEPTION '024 abort: ademe/uk not fully enabled';
  END IF;
END $$;

COMMIT;
