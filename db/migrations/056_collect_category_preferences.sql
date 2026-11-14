-- Préférences d'affichage de la collecte.
-- Une catégorie absente de cette liste est masquée pour les nouvelles saisies.
-- Elle n'est pas marquée non applicable et ses données restent dans les totaux.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS collect_category_ids TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN organizations.collect_category_ids IS
  'Catégories proposées dans Nouvelle saisie. Ne modifie ni l''applicabilité au bilan ni les données existantes.';
