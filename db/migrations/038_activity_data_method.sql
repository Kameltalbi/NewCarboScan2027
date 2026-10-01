-- ABC-04 — méthode de donnée sur la ligne d'activité.
-- Null = ligne ancienne ou import : ce n'est pas une donnée physique par défaut.
-- Les ratios monétaires existants ne sont pas modifiés.

ALTER TABLE activity_data
  ADD COLUMN IF NOT EXISTS data_method TEXT;

ALTER TABLE activity_data
  DROP CONSTRAINT IF EXISTS activity_data_data_method_chk;

ALTER TABLE activity_data
  ADD CONSTRAINT activity_data_data_method_chk
  CHECK (
    data_method IS NULL
    OR data_method IN ('physical', 'monetary', 'direct_emission', 'supplier_specific', 'other')
  );

COMMENT ON COLUMN activity_data.data_method IS
  'physical, monetary, direct_emission, supplier_specific, other. Null = non renseigné, pas physique par défaut.';
