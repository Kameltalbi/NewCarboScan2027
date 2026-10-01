-- ABC-07 — jalons et type de trajectoire sur la feuille de route existante.
-- Aucun pourcentage n'est écrit par défaut.

ALTER TABLE climate_roadmaps
  ADD COLUMN IF NOT EXISTS trajectory_kind TEXT,
  ADD COLUMN IF NOT EXISTS intermediate_targets JSONB;

ALTER TABLE climate_roadmaps
  DROP CONSTRAINT IF EXISTS climate_roadmaps_trajectory_kind_chk;

ALTER TABLE climate_roadmaps
  ADD CONSTRAINT climate_roadmaps_trajectory_kind_chk
  CHECK (trajectory_kind IS NULL OR trajectory_kind IN ('reference', 'personalized'));

COMMENT ON COLUMN climate_roadmaps.trajectory_kind IS
  'reference = droite référence-cible. personalized = jalons enregistrés. Null = non choisi.';
COMMENT ON COLUMN climate_roadmaps.intermediate_targets IS
  'Jalons [{year, reduction_percent}] entre l''année de référence et l''année cible.';
