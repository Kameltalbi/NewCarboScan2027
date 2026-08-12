-- Migration: Création du socle central de collecte de données
-- Toutes les données d'activité carbone passent par cette table unique
-- Les modules (Bilan Carbone, Empreinte Produit, ACV) consomment ces données

-- Enum pour les types d'activités
CREATE TYPE activity_type_enum AS ENUM (
  'energy',           -- Consommation d'énergie (électricité, gaz, etc.)
  'fuel',             -- Carburants (diesel, essence, etc.)
  'transport',        -- Transport (km, t.km)
  'purchase',         -- Achats de biens/services
  'material',         -- Matières premières
  'product_component', -- Composants de produit
  'usage',            -- Utilisation (durée, consommation)
  'waste',            -- Déchets
  'service'           -- Services (cloud, etc.)
);

-- Enum pour les catégories (adaptable selon besoin)
CREATE TYPE activity_category_enum AS ENUM (
  'scope1',           -- Scope 1 direct
  'scope2',           -- Scope 2 énergie
  'scope3_upstream',  -- Scope 3 amont
  'scope3_downstream', -- Scope 3 aval
  'lifecycle_material', -- ACV: matières
  'lifecycle_manufacturing', -- ACV: fabrication
  'lifecycle_transport', -- ACV: transport
  'lifecycle_usage', -- ACV: utilisation
  'lifecycle_eol'    -- ACV: fin de vie
);

-- Enum pour la qualité des données
CREATE TYPE data_quality_enum AS ENUM (
  'real',      -- Donnée réelle mesurée
  'estimated', -- Donnée estimée
  'default'    -- Donnée par défaut (facteur moyen)
);

-- Table centrale: activity_data
CREATE TABLE activity_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organisation et contexte
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID, -- Multi-sites futur (référence à créer si nécessaire)
  product_id UUID, -- Pour empreinte produit (référence à créer si nécessaire)
  supplier_id UUID, -- Pour intégration fournisseurs futur (référence à créer si nécessaire)
  
  -- Type et catégorisation
  activity_type activity_type_enum NOT NULL,
  category activity_category_enum NOT NULL,
  subcategory VARCHAR(100), -- Ex: "électricité", "diesel", "transport routier"
  
  -- Données quantitatives
  quantity DECIMAL(15, 4) NOT NULL CHECK (quantity >= 0),
  unit VARCHAR(50) NOT NULL, -- "kWh", "L", "km", "kg", "t.km", etc.
  
  -- Période
  period_start DATE NOT NULL,
  period_end DATE NOT NULL CHECK (period_end >= period_start),
  
  -- Facteur d'émission utilisé
  emission_factor_id UUID REFERENCES emission_factors(id) ON DELETE SET NULL,
  emission_factor_source VARCHAR(200), -- "Base Carbone ADEME", "IPCC", etc.
  emission_factor_year INTEGER, -- Année du facteur
  emission_factor_region VARCHAR(100), -- "FR", "TN", "EU", etc.
  
  -- Qualité et traçabilité
  data_quality data_quality_enum NOT NULL DEFAULT 'estimated',
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100), -- 0-100
  scope_hint INTEGER CHECK (scope_hint IN (1, 2, 3)), -- Indication du scope (peut être null)
  
  -- Métadonnées
  notes TEXT,
  source_document VARCHAR(500), -- Lien vers facture, fichier, etc.
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT valid_period CHECK (period_end >= period_start)
);

-- Index pour performances
CREATE INDEX idx_activity_data_organization ON activity_data(organization_id);
CREATE INDEX idx_activity_data_product ON activity_data(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_activity_data_period ON activity_data(period_start, period_end);
CREATE INDEX idx_activity_data_type ON activity_data(activity_type);
CREATE INDEX idx_activity_data_category ON activity_data(category);
CREATE INDEX idx_activity_data_quality ON activity_data(data_quality);
CREATE INDEX idx_activity_data_scope ON activity_data(scope_hint) WHERE scope_hint IS NOT NULL;

-- Index composite pour requêtes fréquentes
CREATE INDEX idx_activity_data_org_period ON activity_data(organization_id, period_start, period_end);
CREATE INDEX idx_activity_data_product_period ON activity_data(product_id, period_start, period_end) WHERE product_id IS NOT NULL;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_activity_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activity_data_updated_at
  BEFORE UPDATE ON activity_data
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_data_updated_at();

-- RLS (Row Level Security)
ALTER TABLE activity_data ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les données de leur organisation
CREATE POLICY "Users can view activity data of their organization"
  ON activity_data FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Politique: Les utilisateurs peuvent créer des données pour leur organisation
CREATE POLICY "Users can create activity data for their organization"
  ON activity_data FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Politique: Les utilisateurs peuvent modifier les données de leur organisation
CREATE POLICY "Users can update activity data of their organization"
  ON activity_data FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Politique: Les utilisateurs peuvent supprimer les données de leur organisation
CREATE POLICY "Users can delete activity data of their organization"
  ON activity_data FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Fonction RPC pour calculer les émissions d'une activité
CREATE OR REPLACE FUNCTION calculate_activity_emissions(
  p_activity_id UUID
)
RETURNS DECIMAL(15, 4) AS $$
DECLARE
  v_quantity DECIMAL(15, 4);
  v_emission_factor DECIMAL(15, 6);
  v_emissions DECIMAL(15, 4);
BEGIN
  SELECT 
    ad.quantity,
    COALESCE(ef.emission_factor, 0)
  INTO v_quantity, v_emission_factor
  FROM activity_data ad
  LEFT JOIN emission_factors ef ON ad.emission_factor_id = ef.id
  WHERE ad.id = p_activity_id;
  
  IF v_quantity IS NULL THEN
    RETURN 0;
  END IF;
  
  v_emissions := v_quantity * v_emission_factor;
  RETURN v_emissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction RPC pour obtenir les statistiques de qualité des données
CREATE OR REPLACE FUNCTION get_data_quality_stats(
  p_organization_id UUID,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  total_count BIGINT,
  real_count BIGINT,
  estimated_count BIGINT,
  default_count BIGINT,
  real_percentage DECIMAL(5, 2),
  estimated_percentage DECIMAL(5, 2),
  default_percentage DECIMAL(5, 2),
  avg_confidence_score DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE data_quality = 'real')::BIGINT as real_count,
    COUNT(*) FILTER (WHERE data_quality = 'estimated')::BIGINT as estimated_count,
    COUNT(*) FILTER (WHERE data_quality = 'default')::BIGINT as default_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE data_quality = 'real')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0
    END as real_percentage,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE data_quality = 'estimated')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0
    END as estimated_percentage,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE data_quality = 'default')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0
    END as default_percentage,
    AVG(confidence_score)::DECIMAL(5, 2) as avg_confidence_score
  FROM activity_data
  WHERE organization_id = p_organization_id
    AND (p_period_start IS NULL OR period_start >= p_period_start)
    AND (p_period_end IS NULL OR period_end <= p_period_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires pour documentation
COMMENT ON TABLE activity_data IS 'Table centrale de collecte de données d''activité carbone. Tous les modules consomment cette source unique.';
COMMENT ON COLUMN activity_data.activity_type IS 'Type d''activité (énergie, transport, matière, etc.)';
COMMENT ON COLUMN activity_data.category IS 'Catégorie pour filtrage par module (scope, lifecycle phase, etc.)';
COMMENT ON COLUMN activity_data.data_quality IS 'Qualité de la donnée: réelle, estimée ou par défaut';
COMMENT ON COLUMN activity_data.scope_hint IS 'Indication du scope (1, 2 ou 3) pour faciliter le filtrage';
COMMENT ON COLUMN activity_data.confidence_score IS 'Score de confiance de 0 à 100';

