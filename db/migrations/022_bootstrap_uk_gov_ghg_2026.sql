-- =============================================================================
-- 022 — Bootstrap UK Government GHG Conversion Factors 2026 (DATA)
--
-- Loads db/seeds/uk_gov_ghg_2026_flat_1_2.sql via migrate runners (like ADEME
-- legacy seed before 016). This SQL file is the SCHEMA-JOURNAL identity for
-- the bootstrap step and runs POST-CHECKS only after the runner applied/skipped
-- the DATA seed.
--
-- Journal distinction:
--   - SCHEMA: 021_canonical_factor_semantics.sql (and earlier 0*.sql)
--   - DATA:   db/seeds/uk_gov_ghg_2026_flat_1_2.sql (applied by runner for 022)
--   - JOURNAL: schema_migrations.filename = '022_bootstrap_uk_gov_ghg_2026.sql'
--
-- Does NOT activate catalog (stays draft/hidden/disabled/disabled).
-- Does NOT modify ADEME / Core TN.
-- =============================================================================

DO $$
DECLARE
  v_src_count BIGINT;
  v_ver_count BIGINT;
  v_uk BIGINT;
  v_status TEXT;
  v_catalog TEXT;
  v_calc TEXT;
  v_resolver TEXT;
  v_null_value BIGINT;
  v_dup_stable BIGINT;
  v_gwp_unknown BIGINT;
  v_review BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_src_count FROM factor_sources WHERE source_key = 'uk_gov_ghg';
  IF v_src_count <> 1 THEN
    RAISE EXCEPTION '022 post-check failed: expected 1 uk_gov_ghg source, got %', v_src_count;
  END IF;

  SELECT COUNT(*) INTO v_ver_count
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';
  IF v_ver_count <> 1 THEN
    RAISE EXCEPTION '022 post-check failed: expected 1 UK version 2026-flat-1.2, got %', v_ver_count;
  END IF;

  SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
  INTO v_status, v_catalog, v_calc, v_resolver
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';

  IF NOT (
    v_status = 'draft'
    AND v_catalog = 'hidden'
    AND v_calc = 'disabled'
    AND v_resolver = 'disabled'
  ) THEN
    RAISE EXCEPTION
      '022 post-check failed: UK governance must be draft/hidden/disabled/disabled, got %/%/%/%',
      v_status, v_catalog, v_calc, v_resolver;
  END IF;

  SELECT COUNT(*) INTO v_uk
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';

  IF v_uk <> 2622 THEN
    RAISE EXCEPTION '022 post-check failed: expected 2622 UK factors, got %', v_uk;
  END IF;

  SELECT COUNT(*) INTO v_null_value
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2'
    AND f.value IS NULL;
  IF v_null_value > 0 THEN
    RAISE EXCEPTION '022 post-check failed: % UK factors with NULL value', v_null_value;
  END IF;

  SELECT COUNT(*) INTO v_dup_stable FROM (
    SELECT f.stable_factor_id
    FROM emission_factors f
    JOIN emission_factor_versions v ON v.id = f.version_id
    JOIN factor_sources s ON s.id = v.source_id
    WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2'
    GROUP BY f.stable_factor_id
    HAVING COUNT(*) > 1
  ) d;
  IF v_dup_stable > 0 THEN
    RAISE EXCEPTION '022 post-check failed: duplicate stable_factor_id rows=%', v_dup_stable;
  END IF;

  SELECT COUNT(*) INTO v_gwp_unknown
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2'
    AND f.gwp_basis = 'unknown';
  IF v_gwp_unknown <> 359 THEN
    RAISE EXCEPTION '022 post-check failed: gwp unknown expected 359 got %', v_gwp_unknown;
  END IF;

  SELECT COUNT(*) INTO v_review
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2'
    AND f.metadata->>'normalization_status' = 'review_required';
  IF v_review <> 363 THEN
    RAISE EXCEPTION '022 post-check failed: review_required expected 363 got %', v_review;
  END IF;

  RAISE NOTICE '022 UK bootstrap OK: uk=2622 governance=draft/hidden/disabled/disabled';
END $$;
