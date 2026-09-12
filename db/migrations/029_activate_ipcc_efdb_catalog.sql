-- =============================================================================
-- 029 — IPCC EFDB catalog activation (idempotent)
-- approved/visible; calculation+resolver remain disabled until 030.
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
BEGIN
  SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
  INTO v_status, v_catalog, v_calc, v_resolver
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb' AND v.dataset_version = 'efdb_snapshot_2026_09';

  IF v_status IS NULL THEN
    RAISE EXCEPTION '029 abort: IPCC EFDB version missing';
  END IF;

  v_state_a := (
    v_status = 'draft' AND v_catalog = 'hidden'
    AND v_calc = 'disabled' AND v_resolver = 'disabled'
  );
  v_state_b := (
    v_status = 'approved' AND v_catalog = 'visible'
    AND v_calc = 'disabled' AND v_resolver = 'disabled'
  );

  IF NOT (v_state_a OR v_state_b) THEN
    -- Allow already fully enabled (030 applied)
    IF v_status = 'approved' AND v_catalog = 'visible'
       AND v_calc = 'enabled' AND v_resolver = 'enabled' THEN
      RAISE NOTICE '029: IPCC EFDB already activated beyond catalog (NO-OP)';
      RETURN;
    END IF;
    RAISE EXCEPTION
      '029 abort: disallowed IPCC governance status=% catalog=% calc=% resolver=%',
      v_status, v_catalog, v_calc, v_resolver;
  END IF;

  IF v_state_a THEN
    UPDATE emission_factor_versions v
    SET status = 'approved',
        catalog_status = 'visible'
    FROM factor_sources s
    WHERE s.id = v.source_id
      AND s.source_key = 'ipcc_efdb'
      AND v.dataset_version = 'efdb_snapshot_2026_09'
      AND v.status = 'draft'
      AND v.catalog_status = 'hidden';

    UPDATE emission_factors f
    SET status = 'approved'
    FROM emission_factor_versions v
    JOIN factor_sources s ON s.id = v.source_id
    WHERE f.version_id = v.id
      AND s.source_key = 'ipcc_efdb'
      AND v.dataset_version = 'efdb_snapshot_2026_09'
      AND f.status = 'draft';

    RAISE NOTICE '029: IPCC EFDB catalog visible (calc/resolver still disabled)';
  ELSE
    RAISE NOTICE '029: IPCC EFDB catalog already visible (NO-OP)';
  END IF;
END $$;

COMMIT;
