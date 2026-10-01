-- What-If scenarios: ensure one result row per scenario/year and store calculation metadata.
-- Isolates tenants via existing organization_id columns + RLS / API org filters.

ALTER TABLE climate_scenario_results
  ADD COLUMN IF NOT EXISTS calculation_version TEXT,
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_climate_scenario_results_scenario_year
  ON climate_scenario_results (scenario_id, year);

COMMENT ON COLUMN climate_scenario_results.calculation_version IS
  'Version du calcul What-If (ex. whatif-v1). Projection — ne modifie jamais activity_data.';

-- Traçabilité Plan d'actions ← levier de scénario
ALTER TABLE climate_actions
  DROP CONSTRAINT IF EXISTS climate_actions_estimation_method_chk;

ALTER TABLE climate_actions
  ADD CONSTRAINT climate_actions_estimation_method_chk
  CHECK (
    estimation_method IS NULL
    OR estimation_method IN (
      'measure',
      'invoice',
      'supplier_quote',
      'internal_estimate',
      'scenario_whatif'
    )
  );
