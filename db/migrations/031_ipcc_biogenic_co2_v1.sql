-- =============================================================================
-- 031 — IPCC EFDB biogenic CO2 V1 (idempotent)
-- Among 216 AUTO_GLOBAL CO2 stationary factors, 44 biomass/biofuel rows must be
-- identified as biogenic: value conserved, lifecycle=outside_of_scopes, excluded
-- from scope totals via app/engine accountingClass=biogenic_co2.
-- Fossil MSW "non-biomass fraction" stays direct.
-- Does not change scientific EF values.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_bio BIGINT;
  v_fossil_msw BIGINT;
  v_act BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM factor_sources WHERE source_key = 'ipcc_efdb') THEN
    RAISE EXCEPTION '031 abort: ipcc_efdb source missing';
  END IF;

  UPDATE emission_factors f
  SET lifecycle_boundary = 'outside_of_scopes',
      internal_subcategory = 'stationary_combustion_biogenic',
      metadata = jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(f.metadata, '{}'::jsonb),
            '{provenance,biogenicCo2}',
            'true'::jsonb,
            true
          ),
          '{provenance,co2Accounting}',
          '"biogenic_outside_scopes_memo"'::jsonb,
          true
        ),
        '{provenance,co2eRule}',
        '"biogenic_CO2_value_conserved_excluded_from_scope_totals"'::jsonb,
        true
      )
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE f.version_id = v.id
    AND s.source_key = 'ipcc_efdb'
    AND f.factor_kind = 'activity_emission_factor'
    AND f.unit_numerator = 'kgCO2e'
    AND f.unit_denominator = 'TJ'
    AND (
      f.source_subcategory IN (
        'Wood/Wood Waste',
        'Sulphite Lyes (Black Liquor)',
        'Other Primary Solid Biomass',
        'Charcoal',
        'Biogasoline',
        'Biodiesels',
        'Other Liquid Biofuels',
        'Landfill Gas',
        'Sludge Gas',
        'Other Biogas',
        'Municipal Wastes (biomass fraction)'
      )
      OR replace(coalesce(f.source_subcategory, ''), E'\n', ' ') IN (
        'Wood/Wood Waste',
        'Sulphite Lyes (Black Liquor)',
        'Other Primary Solid Biomass',
        'Charcoal',
        'Biogasoline',
        'Biodiesels',
        'Other Liquid Biofuels',
        'Landfill Gas',
        'Sludge Gas',
        'Other Biogas',
        'Municipal Wastes (biomass fraction)'
      )
    );

  -- Ensure non-biomass MSW remains fossil / direct
  UPDATE emission_factors f
  SET lifecycle_boundary = 'direct',
      internal_subcategory = 'stationary_combustion',
      metadata = jsonb_set(
        jsonb_set(
          coalesce(f.metadata, '{}'::jsonb),
          '{provenance,biogenicCo2}',
          'false'::jsonb,
          true
        ),
        '{provenance,co2Accounting}',
        '"fossil_scope"'::jsonb,
        true
      )
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE f.version_id = v.id
    AND s.source_key = 'ipcc_efdb'
    AND f.factor_kind = 'activity_emission_factor'
    AND (
      f.source_subcategory ILIKE '%non-biomass%'
      OR replace(coalesce(f.source_subcategory, ''), E'\n', ' ')
           ILIKE '%Municipal Wastes (non-biomass fraction)%'
    );

  SELECT COUNT(*) INTO v_bio
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb'
    AND f.factor_kind = 'activity_emission_factor'
    AND f.lifecycle_boundary = 'outside_of_scopes'
    AND coalesce(f.metadata->'provenance'->>'biogenicCo2', '') = 'true';
  IF v_bio <> 44 THEN
    RAISE EXCEPTION '031 abort: expected 44 biogenic CO2 activities, got %', v_bio;
  END IF;

  SELECT COUNT(*) INTO v_fossil_msw
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb'
    AND f.factor_kind = 'activity_emission_factor'
    AND f.source_subcategory ILIKE '%non-biomass%'
    AND f.lifecycle_boundary = 'direct';
  IF v_fossil_msw <> 4 THEN
    RAISE EXCEPTION '031 abort: expected 4 fossil non-biomass MSW CO2, got %', v_fossil_msw;
  END IF;

  SELECT COUNT(*) INTO v_act
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'ipcc_efdb'
    AND f.factor_kind = 'activity_emission_factor';
  IF v_act <> 216 THEN
    RAISE EXCEPTION '031 abort: expected 216 CO2 activities, got %', v_act;
  END IF;

  RAISE NOTICE '031: IPCC biogenic CO2 tagged (44 outside_of_scopes; values unchanged)';
END $$;

COMMIT;
