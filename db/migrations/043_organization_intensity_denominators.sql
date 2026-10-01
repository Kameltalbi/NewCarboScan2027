-- ABC-12 — dénominateurs d'intensité déjà prévus par le formulaire.
-- Null = non renseigné. Une intensité n'est pas calculée sans dénominateur.
-- Ces colonnes ne modifient pas le total du bilan.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS employees INT,
  ADD COLUMN IF NOT EXISTS annual_revenue NUMERIC,
  ADD COLUMN IF NOT EXISTS total_surface NUMERIC,
  ADD COLUMN IF NOT EXISTS production_unit_label TEXT,
  ADD COLUMN IF NOT EXISTS production_unit_quantity NUMERIC;

COMMENT ON COLUMN organizations.employees IS
  'Effectif de l''organisation pour l''intensité. Null = non renseigné.';
COMMENT ON COLUMN organizations.annual_revenue IS
  'Chiffre d''affaires annuel, dans la devise de l''organisation. Null = non renseigné.';
COMMENT ON COLUMN organizations.total_surface IS
  'Surface en m2. Null = non renseigné.';
COMMENT ON COLUMN organizations.production_unit_label IS
  'Nom de l''unité produite ou du KPI métier. Null = pas d''intensité métier.';
COMMENT ON COLUMN organizations.production_unit_quantity IS
  'Quantité du dénominateur métier. Null = pas d''intensité métier.';
