-- Migration : Hiérarchie normée Bilan Carbone (GHG Protocol)
-- Crée une structure Scope > Poste > Catégorie > Données d'activité
-- Permet drill-down et traçabilité complète

-- ============================================
-- TABLE bilans_carbone_detail
-- ============================================

CREATE TABLE IF NOT EXISTS bilans_carbone_detail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Rattachement au bilan
  bilan_id UUID NOT NULL REFERENCES bilans_carbone(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Hiérarchie GHG Protocol
  scope SMALLINT NOT NULL CHECK (scope IN (1, 2, 3)),
  poste_code TEXT NOT NULL, -- Ex: '1.1', '2.1', '3.6'
  poste_name TEXT NOT NULL, -- Ex: 'Combustion énergies fossiles (sources fixes)'
  category_code TEXT, -- Ex: '1.1.1', '2.1.1'
  category_name TEXT, -- Ex: 'Gaz naturel', 'Électricité (mix réseau)'
  subcategory TEXT, -- Optionnel, pour plus de granularité
  
  -- Émissions
  emissions_kg_co2e NUMERIC NOT NULL DEFAULT 0,
  
  -- Répartition par GES (optionnel, pour reporting détaillé)
  co2_kg NUMERIC DEFAULT 0,
  ch4_kg_co2e NUMERIC DEFAULT 0,
  n2o_kg_co2e NUMERIC DEFAULT 0,
  other_gases_kg_co2e NUMERIC DEFAULT 0,
  
  -- Données sources (traçabilité)
  activity_data_count INTEGER DEFAULT 0, -- Nombre d'activity_data contributeurs
  data_quality_score NUMERIC, -- Score moyen de qualité des données (0-1)
  
  -- Métadonnées
  is_mandatory BOOLEAN DEFAULT FALSE, -- Poste obligatoire selon réglementation
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_bilan_detail_bilan ON bilans_carbone_detail(bilan_id);
CREATE INDEX idx_bilan_detail_org ON bilans_carbone_detail(organization_id);
CREATE INDEX idx_bilan_detail_scope ON bilans_carbone_detail(scope);
CREATE INDEX idx_bilan_detail_poste ON bilans_carbone_detail(poste_code);

-- Trigger updated_at
CREATE TRIGGER update_bilan_detail_updated_at
  BEFORE UPDATE ON bilans_carbone_detail
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE bilans_carbone_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's bilan details"
  ON bilans_carbone_detail
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their organization's bilan details"
  ON bilans_carbone_detail
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's bilan details"
  ON bilans_carbone_detail
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization's bilan details"
  ON bilans_carbone_detail
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- TABLE activity_data_to_bilan_detail (jointure)
-- ============================================

CREATE TABLE IF NOT EXISTS activity_data_to_bilan_detail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_data_id UUID NOT NULL REFERENCES activity_data(id) ON DELETE CASCADE,
  bilan_detail_id UUID NOT NULL REFERENCES bilans_carbone_detail(id) ON DELETE CASCADE,
  emissions_contribution_kg_co2e NUMERIC NOT NULL, -- Contribution de cette activity_data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(activity_data_id, bilan_detail_id)
);

CREATE INDEX idx_activity_bilan_activity ON activity_data_to_bilan_detail(activity_data_id);
CREATE INDEX idx_activity_bilan_detail ON activity_data_to_bilan_detail(bilan_detail_id);

-- RLS
ALTER TABLE activity_data_to_bilan_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their activity_data_to_bilan_detail"
  ON activity_data_to_bilan_detail
  FOR SELECT
  USING (
    activity_data_id IN (
      SELECT id FROM activity_data
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their activity_data_to_bilan_detail"
  ON activity_data_to_bilan_detail
  FOR INSERT
  WITH CHECK (
    activity_data_id IN (
      SELECT id FROM activity_data
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- FONCTION RPC : Calculer le bilan détaillé
-- ============================================

CREATE OR REPLACE FUNCTION calculate_bilan_carbone_detail(
  p_organization_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  scope SMALLINT,
  poste_code TEXT,
  poste_name TEXT,
  category_code TEXT,
  category_name TEXT,
  emissions_kg_co2e NUMERIC,
  activity_data_count INTEGER,
  data_quality_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cette fonction sera enrichie avec la logique de mapping automatique
  -- Pour l'instant, elle retourne les données brutes agrégées
  
  RETURN QUERY
  SELECT
    COALESCE(ad.scope_hint, 3)::SMALLINT AS scope,
    'unknown'::TEXT AS poste_code,
    ad.category AS poste_name,
    ad.subcategory AS category_code,
    ad.subcategory AS category_name,
    SUM(ad.quantity * COALESCE(ef.emission_factor, 0)) AS emissions_kg_co2e,
    COUNT(ad.id)::INTEGER AS activity_data_count,
    AVG(ad.confidence_score) AS data_quality_score
  FROM activity_data ad
  LEFT JOIN emission_factors ef ON ad.emission_factor_id = ef.id
  WHERE ad.organization_id = p_organization_id
    AND ad.period_start >= p_period_start
    AND ad.period_end <= p_period_end
  GROUP BY ad.scope_hint, ad.category, ad.subcategory;
END;
$$;

-- ============================================
-- VUE : Analyse par scope
-- ============================================

CREATE OR REPLACE VIEW bilan_carbone_by_scope AS
SELECT
  bcd.organization_id,
  bcd.bilan_id,
  bcd.scope,
  SUM(bcd.emissions_kg_co2e) AS total_emissions_kg_co2e,
  SUM(bcd.emissions_kg_co2e) / 1000 AS total_emissions_t_co2e,
  COUNT(DISTINCT bcd.poste_code) AS poste_count,
  SUM(bcd.activity_data_count) AS total_activity_data_count,
  AVG(bcd.data_quality_score) AS avg_data_quality
FROM bilans_carbone_detail bcd
GROUP BY bcd.organization_id, bcd.bilan_id, bcd.scope;

-- ============================================
-- VUE : Analyse par poste
-- ============================================

CREATE OR REPLACE VIEW bilan_carbone_by_poste AS
SELECT
  bcd.organization_id,
  bcd.bilan_id,
  bcd.scope,
  bcd.poste_code,
  bcd.poste_name,
  SUM(bcd.emissions_kg_co2e) AS total_emissions_kg_co2e,
  SUM(bcd.emissions_kg_co2e) / 1000 AS total_emissions_t_co2e,
  COUNT(DISTINCT bcd.category_code) AS category_count,
  SUM(bcd.activity_data_count) AS total_activity_data_count,
  AVG(bcd.data_quality_score) AS avg_data_quality
FROM bilans_carbone_detail bcd
GROUP BY bcd.organization_id, bcd.bilan_id, bcd.scope, bcd.poste_code, bcd.poste_name;

COMMENT ON TABLE bilans_carbone_detail IS 'Détail structuré du Bilan Carbone selon hiérarchie GHG Protocol (Scope > Poste > Catégorie)';
COMMENT ON TABLE activity_data_to_bilan_detail IS 'Jointure traçable entre activity_data et bilans_carbone_detail';
COMMENT ON VIEW bilan_carbone_by_scope IS 'Agrégation des émissions par scope';
COMMENT ON VIEW bilan_carbone_by_poste IS 'Agrégation des émissions par poste';
