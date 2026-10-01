-- ABC-14 — registre de mobilisation.
-- Les questionnaires fournisseurs restent dans leur module.
-- Ce registre ne modifie pas le bilan. Le fichier joint reste ABC-16.

CREATE TABLE IF NOT EXISTS stakeholder_mobilizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audience TEXT NOT NULL,
  stakeholders TEXT NOT NULL,
  title TEXT NOT NULL,
  occurred_on DATE,
  owner_name TEXT,
  support TEXT,
  action_id UUID REFERENCES climate_actions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stakeholder_mobilizations
  DROP CONSTRAINT IF EXISTS stakeholder_mobilizations_audience_chk;
ALTER TABLE stakeholder_mobilizations
  ADD CONSTRAINT stakeholder_mobilizations_audience_chk
  CHECK (audience IN ('employees', 'management', 'suppliers', 'other'));

CREATE INDEX IF NOT EXISTS stakeholder_mobilizations_org_idx
  ON stakeholder_mobilizations (organization_id);

COMMENT ON TABLE stakeholder_mobilizations IS
  'Mobilisations saisies : public, parties prenantes, action, date, responsable, support. Hors du total du bilan.';
