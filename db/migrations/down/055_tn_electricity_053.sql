-- Annule 055. Ne pas exécuter avec les migrations montantes.

UPDATE activity_data
SET
  notes = factor_correction_previous_notes,
  emission_factor_source = factor_correction_previous_source,
  factor_correction_previous_value = NULL,
  factor_correction_new_value = NULL,
  factor_correction_at = NULL,
  factor_correction_reason = NULL,
  factor_correction_previous_notes = NULL,
  factor_correction_previous_source = NULL
WHERE factor_correction_reason = 'correction facteur erroné';

UPDATE emission_factors f
SET value = c.previous_value
FROM factor_value_corrections c
WHERE c.factor_id = f.id
  AND c.reason = 'correction facteur erroné'
  AND c.new_value = 0.53
  AND f.stable_factor_id = 'electricity_kwh';

DELETE FROM factor_value_corrections
WHERE reason = 'correction facteur erroné'
  AND new_value = 0.53;
