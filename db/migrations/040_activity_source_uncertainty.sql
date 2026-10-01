-- ABC-03 — type de source et incertitude optionnelle sur la ligne.
-- data_quality (real / estimated / default) n'est pas modifié.
-- Aucun pourcentage n'est fabriqué pour les lignes vides.

ALTER TABLE activity_data
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS uncertainty_pct NUMERIC;

ALTER TABLE activity_data
  DROP CONSTRAINT IF EXISTS activity_data_source_type_chk;

ALTER TABLE activity_data
  ADD CONSTRAINT activity_data_source_type_chk
  CHECK (
    source_type IS NULL
    OR source_type IN (
      'measured', 'invoice', 'supplier', 'estimate', 'extrapolation', 'monetary_ratio'
    )
  );

ALTER TABLE activity_data
  DROP CONSTRAINT IF EXISTS activity_data_uncertainty_pct_chk;

ALTER TABLE activity_data
  ADD CONSTRAINT activity_data_uncertainty_pct_chk
  CHECK (uncertainty_pct IS NULL OR (uncertainty_pct >= 0 AND uncertainty_pct <= 100));

COMMENT ON COLUMN activity_data.source_type IS
  'Mesuré, facture, fournisseur, estimation, extrapolation, ratio monétaire. Null = non renseigné.';
COMMENT ON COLUMN activity_data.uncertainty_pct IS
  'Incertitude de la ligne en %, optionnelle. Ne sert pas à inventer un total.';
