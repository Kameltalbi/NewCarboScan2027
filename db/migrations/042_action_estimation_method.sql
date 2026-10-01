-- ABC-08 — méthode du potentiel estimé. Null = non renseignée.
-- Le potentiel n'est pas soustrait du bilan.

ALTER TABLE climate_actions
  ADD COLUMN IF NOT EXISTS estimation_method TEXT;

ALTER TABLE climate_actions
  DROP CONSTRAINT IF EXISTS climate_actions_estimation_method_chk;

ALTER TABLE climate_actions
  ADD CONSTRAINT climate_actions_estimation_method_chk
  CHECK (
    estimation_method IS NULL
    OR estimation_method IN ('measure', 'invoice', 'supplier_quote', 'internal_estimate')
  );

COMMENT ON COLUMN climate_actions.estimation_method IS
  'Origine du potentiel tCO2e estimé. Null = non renseignée. Ne modifie pas le bilan.';
