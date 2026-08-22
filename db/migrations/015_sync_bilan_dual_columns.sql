-- Dual naming on bilans_carbone: UI reads total_emission, import wrote total_kgco2e.
-- Also fill date_bilan from year so period filters can match.

UPDATE bilans_carbone SET
  total_emission = COALESCE(total_emission, total_kgco2e),
  scope1_emission = COALESCE(scope1_emission, scope1_kgco2e),
  scope2_emission = COALESCE(scope2_emission, scope2_kgco2e),
  scope3_emission = COALESCE(scope3_emission, scope3_kgco2e)
WHERE total_emission IS NULL AND total_kgco2e IS NOT NULL;

UPDATE bilans_carbone
SET date_bilan = make_timestamptz(year, 12, 31, 12, 0, 0, 'UTC')
WHERE date_bilan IS NULL AND year IS NOT NULL;
