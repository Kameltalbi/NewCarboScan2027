-- ABC-13 — registre simple de risques climatiques.
-- Le niveau est la qualification saisie. Il ne modifie pas le bilan.
-- Aucun scénario climatique n'est stocké ici.

CREATE TABLE IF NOT EXISTS climate_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  probability TEXT NOT NULL,
  impact TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  measure TEXT,
  action_id UUID REFERENCES climate_actions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE climate_risks
  DROP CONSTRAINT IF EXISTS climate_risks_category_chk;
ALTER TABLE climate_risks
  ADD CONSTRAINT climate_risks_category_chk
  CHECK (category IN ('physical', 'transition', 'other'));

ALTER TABLE climate_risks
  DROP CONSTRAINT IF EXISTS climate_risks_probability_chk;
ALTER TABLE climate_risks
  ADD CONSTRAINT climate_risks_probability_chk
  CHECK (probability IN ('low', 'medium', 'high'));

ALTER TABLE climate_risks
  DROP CONSTRAINT IF EXISTS climate_risks_impact_chk;
ALTER TABLE climate_risks
  ADD CONSTRAINT climate_risks_impact_chk
  CHECK (impact IN ('low', 'medium', 'high'));

ALTER TABLE climate_risks
  DROP CONSTRAINT IF EXISTS climate_risks_level_chk;
ALTER TABLE climate_risks
  ADD CONSTRAINT climate_risks_level_chk
  CHECK (risk_level IN ('low', 'medium', 'high'));

CREATE INDEX IF NOT EXISTS climate_risks_org_idx ON climate_risks (organization_id);

COMMENT ON TABLE climate_risks IS
  'Risques qualifiés par l''organisation. Le niveau est saisi, pas calculé. Hors du total du bilan.';
