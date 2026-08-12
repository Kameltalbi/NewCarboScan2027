-- Migration: Support des 15 catégories Scope 3 du GHG Protocol
-- Date: 2026-01-31
-- Description: Création des tables pour gérer l'activation et les données des catégories Scope 3

-- =============================================================================
-- ENUM: Catégories Scope 3 (15 catégories officielles GHG Protocol)
-- =============================================================================

CREATE TYPE scope3_category_enum AS ENUM (
  'cat1_purchased_goods',          -- Catégorie 1: Biens et services achetés
  'cat2_capital_goods',            -- Catégorie 2: Biens d'équipement
  'cat3_fuel_energy',              -- Catégorie 3: Énergie (non Scope 1 & 2)
  'cat4_upstream_transport',       -- Catégorie 4: Transport amont
  'cat5_waste',                    -- Catégorie 5: Déchets générés
  'cat6_business_travel',          -- Catégorie 6: Déplacements professionnels
  'cat7_commuting',                -- Catégorie 7: Déplacements domicile-travail
  'cat8_upstream_leased',          -- Catégorie 8: Actifs loués en amont
  'cat9_downstream_transport',     -- Catégorie 9: Transport aval
  'cat10_processing',              -- Catégorie 10: Transformation des produits vendus
  'cat11_use_of_products',         -- Catégorie 11: Utilisation des produits vendus
  'cat12_end_of_life',             -- Catégorie 12: Fin de vie des produits vendus
  'cat13_downstream_leased',       -- Catégorie 13: Actifs loués en aval
  'cat14_franchises',              -- Catégorie 14: Franchises
  'cat15_investments'              -- Catégorie 15: Investissements
);

COMMENT ON TYPE scope3_category_enum IS 'Les 15 catégories officielles du GHG Protocol Scope 3 Standard';

-- =============================================================================
-- TABLE: scope3_category_activations
-- Gestion de l'activation des catégories Scope 3 par organisation
-- =============================================================================

CREATE TABLE IF NOT EXISTS scope3_category_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiants
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id scope3_category_enum NOT NULL,
  
  -- État d'activation
  is_active BOOLEAN NOT NULL DEFAULT false,
  activation_reason TEXT,
  deactivation_reason TEXT,
  
  -- Qualité des données
  data_quality data_quality_enum DEFAULT 'estimated',
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contrainte d'unicité
  UNIQUE(organization_id, category_id)
);

CREATE INDEX idx_scope3_activations_org ON scope3_category_activations(organization_id);
CREATE INDEX idx_scope3_activations_active ON scope3_category_activations(organization_id, is_active);

COMMENT ON TABLE scope3_category_activations IS 'Gestion de l''activation des 15 catégories Scope 3 par organisation';
COMMENT ON COLUMN scope3_category_activations.category_id IS 'ID de la catégorie GHG Protocol (cat1_purchased_goods, cat2_capital_goods, etc.)';
COMMENT ON COLUMN scope3_category_activations.is_active IS 'TRUE = catégorie activée et calculable, FALSE = catégorie exclue';
COMMENT ON COLUMN scope3_category_activations.data_quality IS 'Qualité des données : measured (mesurée), estimated (estimée), not_available (non disponible)';

-- =============================================================================
-- EXTENSION: activity_data pour supporter les sous-catégories Scope 3
-- Ajout d'une colonne scope3_category_id pour lier les données aux catégories GHG
-- =============================================================================

ALTER TABLE activity_data 
ADD COLUMN IF NOT EXISTS scope3_category_id scope3_category_enum;

CREATE INDEX IF NOT EXISTS idx_activity_data_scope3_cat 
ON activity_data(scope3_category_id) 
WHERE scope3_category_id IS NOT NULL;

COMMENT ON COLUMN activity_data.scope3_category_id IS 'Catégorie Scope 3 GHG Protocol (si applicable)';

-- =============================================================================
-- FONCTION: Initialiser les activations par défaut pour une organisation
-- =============================================================================

CREATE OR REPLACE FUNCTION initialize_scope3_defaults(org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Activer les 7 catégories communes par défaut
  INSERT INTO scope3_category_activations (organization_id, category_id, is_active, activation_reason, data_quality)
  VALUES 
    (org_id, 'cat1_purchased_goods', true, 'Activation par défaut (catégorie commune)', 'estimated'),
    (org_id, 'cat2_capital_goods', true, 'Activation par défaut (catégorie commune)', 'estimated'),
    (org_id, 'cat3_fuel_energy', true, 'Activation automatique (calculée depuis Scope 1 & 2)', 'estimated'),
    (org_id, 'cat4_upstream_transport', true, 'Activation par défaut (catégorie commune)', 'estimated'),
    (org_id, 'cat5_waste', true, 'Activation par défaut (catégorie commune)', 'estimated'),
    (org_id, 'cat6_business_travel', true, 'Activation par défaut (catégorie commune)', 'estimated'),
    (org_id, 'cat7_commuting', true, 'Activation par défaut (catégorie commune)', 'estimated')
  ON CONFLICT (organization_id, category_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION initialize_scope3_defaults(UUID) IS 'Initialise les 7 catégories Scope 3 communes lors de la création d''une organisation';

-- =============================================================================
-- TRIGGER: Initialiser automatiquement les catégories Scope 3 pour les nouvelles orgs
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_initialize_scope3()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM initialize_scope3_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created_init_scope3 ON organizations;
CREATE TRIGGER on_organization_created_init_scope3
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_scope3();

COMMENT ON FUNCTION trigger_initialize_scope3() IS 'Trigger pour initialiser les catégories Scope 3 automatiquement';

-- =============================================================================
-- FONCTION: Récupérer les statistiques d'activation Scope 3
-- =============================================================================

CREATE OR REPLACE FUNCTION get_scope3_activation_stats(org_id UUID)
RETURNS TABLE (
  total_categories BIGINT,
  active_categories BIGINT,
  inactive_categories BIGINT,
  upstream_active BIGINT,
  downstream_active BIGINT,
  measured_data_categories BIGINT,
  estimated_data_categories BIGINT,
  missing_data_categories BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_categories,
    COUNT(*) FILTER (WHERE is_active = true)::BIGINT AS active_categories,
    COUNT(*) FILTER (WHERE is_active = false)::BIGINT AS inactive_categories,
    COUNT(*) FILTER (WHERE is_active = true AND category_id IN (
      'cat1_purchased_goods', 'cat2_capital_goods', 'cat3_fuel_energy', 
      'cat4_upstream_transport', 'cat5_waste', 'cat6_business_travel', 
      'cat7_commuting', 'cat8_upstream_leased'
    ))::BIGINT AS upstream_active,
    COUNT(*) FILTER (WHERE is_active = true AND category_id IN (
      'cat9_downstream_transport', 'cat10_processing', 'cat11_use_of_products',
      'cat12_end_of_life', 'cat13_downstream_leased', 'cat14_franchises', 'cat15_investments'
    ))::BIGINT AS downstream_active,
    COUNT(*) FILTER (WHERE is_active = true AND data_quality = 'measured')::BIGINT AS measured_data_categories,
    COUNT(*) FILTER (WHERE is_active = true AND data_quality = 'estimated')::BIGINT AS estimated_data_categories,
    COUNT(*) FILTER (WHERE is_active = true AND data_quality = 'not_available')::BIGINT AS missing_data_categories
  FROM scope3_category_activations
  WHERE organization_id = org_id;
END;
$$;

COMMENT ON FUNCTION get_scope3_activation_stats(UUID) IS 'Retourne les statistiques d''activation des catégories Scope 3 pour une organisation';

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================

ALTER TABLE scope3_category_activations ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir les activations de leur organisation
DROP POLICY IF EXISTS "Users can view their org scope3 activations" ON scope3_category_activations;
CREATE POLICY "Users can view their org scope3 activations"
  ON scope3_category_activations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      INNER JOIN profiles p ON o.user_id = p.id
      WHERE p.id = auth.uid()
    )
  );

-- Policy: Les utilisateurs peuvent gérer les activations de leur organisation
DROP POLICY IF EXISTS "Users can manage their org scope3 activations" ON scope3_category_activations;
CREATE POLICY "Users can manage their org scope3 activations"
  ON scope3_category_activations
  FOR ALL
  USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      INNER JOIN profiles p ON o.user_id = p.id
      WHERE p.id = auth.uid()
    )
  );

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON scope3_category_activations TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_scope3_defaults(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scope3_activation_stats(UUID) TO authenticated;
