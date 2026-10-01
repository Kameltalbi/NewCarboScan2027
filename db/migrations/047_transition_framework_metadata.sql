-- =============================================================================
-- 047 — Transition : colonnes explicites pour futures trajectoires référentielles
-- =============================================================================
-- Prépare le stockage méthodologique (SBTi / 1,5 °C) SANS aucune formule.
-- Les champs restent NULL / documentaires jusqu'à validation produit.

ALTER TABLE climate_framework_versions
  ADD COLUMN IF NOT EXISTS ambition TEXT,
  ADD COLUMN IF NOT EXISTS methodology TEXT,
  ADD COLUMN IF NOT EXISTS base_year INT,
  ADD COLUMN IF NOT EXISTS target_year INT,
  ADD COLUMN IF NOT EXISTS scope_boundary INT[],
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ;

COMMENT ON COLUMN climate_framework_versions.ambition IS
  'Ex. 1.5C — informatif ; ne déclenche aucun calcul.';
COMMENT ON COLUMN climate_framework_versions.methodology IS
  'Libellé méthodologique (ex. Absolute Contraction). method_key reste la clé machine.';
COMMENT ON COLUMN climate_framework_versions.calculated_at IS
  'Horodatage du dernier calcul appliqué pour cette version (null = jamais calculé).';

-- Aligner le seed SBTi existant (toujours pending, toujours sans formule)
UPDATE climate_framework_versions v
SET
  ambition = COALESCE(v.ambition, '1.5C'),
  methodology = COALESCE(v.methodology, 'pending_product_validation'),
  scope_boundary = COALESCE(v.scope_boundary, v.scopes_applicable)
FROM climate_frameworks f
WHERE f.id = v.framework_id
  AND f.code = 'sbti'
  AND v.method_key = 'pending_validation';
