-- ========================================
-- SCRIPT D'INSTALLATION RAPIDE SCOPE 3
-- À exécuter dans l'éditeur SQL Supabase
-- ========================================

-- 1. Créer l'ENUM des catégories Scope 3
DO $$ BEGIN
  CREATE TYPE scope3_category_enum AS ENUM (
    'cat1_purchased_goods',
    'cat2_capital_goods',
    'cat3_fuel_energy',
    'cat4_upstream_transport',
    'cat5_waste',
    'cat6_business_travel',
    'cat7_commuting',
    'cat8_upstream_leased',
    'cat9_downstream_transport',
    'cat10_processing',
    'cat11_use_of_sold',
    'cat12_end_of_life',
    'cat13_downstream_leased',
    'cat14_franchises',
    'cat15_investments'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Créer la table scope3_category_activations
CREATE TABLE IF NOT EXISTS scope3_category_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id scope3_category_enum NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activation_reason TEXT,
  deactivation_reason TEXT,
  data_quality TEXT CHECK (data_quality IN ('measured', 'estimated', 'not_available')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, category_id)
);

-- 3. Créer les index
CREATE INDEX IF NOT EXISTS idx_scope3_activations_org 
ON scope3_category_activations(organization_id);

CREATE INDEX IF NOT EXISTS idx_scope3_activations_category 
ON scope3_category_activations(category_id);

CREATE INDEX IF NOT EXISTS idx_scope3_activations_active 
ON scope3_category_activations(organization_id, is_active);

-- 4. Ajouter la colonne scope3_category_id à activity_data
ALTER TABLE activity_data 
ADD COLUMN IF NOT EXISTS scope3_category_id scope3_category_enum;

CREATE INDEX IF NOT EXISTS idx_activity_data_scope3_cat 
ON activity_data(scope3_category_id) 
WHERE scope3_category_id IS NOT NULL;

-- 5. Activer Row Level Security
ALTER TABLE scope3_category_activations ENABLE ROW LEVEL SECURITY;

-- 6. Créer les policies RLS
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

-- 7. Accorder les permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON scope3_category_activations TO authenticated;

-- FIN DU SCRIPT
-- La table scope3_category_activations est maintenant créée et sécurisée !
