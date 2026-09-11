-- =============================================================================
-- 021 — Canonical factor semantics (lifecycle / energy / GWP / kind)
--
-- Non-destructive schema extension for multi-source registry (ADEME, UK, …).
-- Adds four NULLABLE columns on emission_factors. No backfill. No row churn.
--
-- Audit (existing fields — no conceptual duplicate):
--   lifecycle_boundary : ABSENT (source_category / internal_category are taxonomy)
--   energy_basis       : ABSENT (017 unit qualifiers may live in metadata only)
--   gwp_basis          : PARTIAL — emission_factor_versions.gwp_set is VERSION-level
--                        free text; UK 2026 is mixed AR4/AR5/AR6 → need FACTOR-level
--   factor_kind        : ABSENT — factor_type (physical/monetary/gwp/…) is a different
--                        axis (measurement shape), not semantic role
--
-- Taxonomies (CHECK — extensible later via ALTER for EPA/IPCC if needed):
--
--   lifecycle_boundary (minimal, non-synonym):
--     direct              — combustion / use-phase / TTW-equivalent activity
--     wtt                 — well-to-tank / upstream
--     td                  — transmission & distribution
--     wtw                 — published well-to-wheel only (never auto-derived)
--     cradle_to_gate      — LCA gate boundary
--     material_use        — materials inventory factors
--     waste_treatment     — waste treatment / disposal
--     outside_of_scopes   — outside GHG Protocol scopes (e.g. biogenic)
--     other
--     unknown
--   NOTE: no separate combustion/ttw values (aliases of direct).
--
--   energy_basis: gross_cv | net_cv
--   gwp_basis:    AR4 | AR5 | AR6 | mixed | unknown
--                 NULL = unset (do NOT coerce NULL → unknown)
--   factor_kind:
--     activity_emission_factor — calculable activity FE (UK kg CO2e)
--     ghg_component           — reserved; UK CO2/CH4/N2O shares stay in metadata
--     energy_intensity        — reserved; UK SECR kWh not imported as FE
--     gwp                     — characterization factor (distinct from factor_type)
--     avoided_emission
--     other
--
-- Indexes: none (fields not used in search/ranking yet).
-- Idempotent: ADD COLUMN IF NOT EXISTS + conditional CHECK.
-- =============================================================================

BEGIN;

ALTER TABLE emission_factors
  ADD COLUMN IF NOT EXISTS lifecycle_boundary TEXT,
  ADD COLUMN IF NOT EXISTS energy_basis TEXT,
  ADD COLUMN IF NOT EXISTS gwp_basis TEXT,
  ADD COLUMN IF NOT EXISTS factor_kind TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emission_factors_lifecycle_boundary_check'
  ) THEN
    ALTER TABLE emission_factors
      ADD CONSTRAINT emission_factors_lifecycle_boundary_check
      CHECK (
        lifecycle_boundary IS NULL
        OR lifecycle_boundary IN (
          'direct',
          'wtt',
          'td',
          'wtw',
          'cradle_to_gate',
          'material_use',
          'waste_treatment',
          'outside_of_scopes',
          'other',
          'unknown'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emission_factors_energy_basis_check'
  ) THEN
    ALTER TABLE emission_factors
      ADD CONSTRAINT emission_factors_energy_basis_check
      CHECK (
        energy_basis IS NULL
        OR energy_basis IN ('gross_cv', 'net_cv')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emission_factors_gwp_basis_check'
  ) THEN
    ALTER TABLE emission_factors
      ADD CONSTRAINT emission_factors_gwp_basis_check
      CHECK (
        gwp_basis IS NULL
        OR gwp_basis IN ('AR4', 'AR5', 'AR6', 'mixed', 'unknown')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emission_factors_factor_kind_check'
  ) THEN
    ALTER TABLE emission_factors
      ADD CONSTRAINT emission_factors_factor_kind_check
      CHECK (
        factor_kind IS NULL
        OR factor_kind IN (
          'activity_emission_factor',
          'ghg_component',
          'energy_intensity',
          'gwp',
          'avoided_emission',
          'other'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN emission_factors.lifecycle_boundary IS
  '021 Orthogonal lifecycle boundary (direct/wtt/td/…). NULL = unset. Not derived WTW.';
COMMENT ON COLUMN emission_factors.energy_basis IS
  '021 Calorific basis when unit is energy: gross_cv | net_cv. NULL if N/A.';
COMMENT ON COLUMN emission_factors.gwp_basis IS
  '021 Factor-level GWP basis (AR4/AR5/AR6/mixed/unknown). NULL = unset (≠ unknown). '
  'Complements emission_factor_versions.gwp_set (version-level summary).';
COMMENT ON COLUMN emission_factors.factor_kind IS
  '021 Semantic role of the row (activity_emission_factor, …). Distinct from factor_type '
  '(physical/monetary/…). NULL = unset.';

-- Postcondition: columns present, all NULL on existing rows (no backfill)
DO $$
DECLARE
  v_null_lb BIGINT;
  v_null_eb BIGINT;
  v_null_gb BIGINT;
  v_null_fk BIGINT;
  v_n BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_n FROM emission_factors;
  SELECT COUNT(*) INTO v_null_lb FROM emission_factors WHERE lifecycle_boundary IS NULL;
  SELECT COUNT(*) INTO v_null_eb FROM emission_factors WHERE energy_basis IS NULL;
  SELECT COUNT(*) INTO v_null_gb FROM emission_factors WHERE gwp_basis IS NULL;
  SELECT COUNT(*) INTO v_null_fk FROM emission_factors WHERE factor_kind IS NULL;

  IF v_null_lb <> v_n OR v_null_eb <> v_n OR v_null_gb <> v_n OR v_null_fk <> v_n THEN
    RAISE EXCEPTION
      '021 postcondition failed: expected all new columns NULL on existing rows (n=%, lb_null=%, eb_null=%, gb_null=%, fk_null=%)',
      v_n, v_null_lb, v_null_eb, v_null_gb, v_null_fk;
  END IF;
END $$;

COMMIT;
