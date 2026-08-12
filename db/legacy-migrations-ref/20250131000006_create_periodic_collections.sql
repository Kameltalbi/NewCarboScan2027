-- Migration: Table pour les collectes périodiques

CREATE TABLE IF NOT EXISTS periodic_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES collect_sites(id) ON DELETE SET NULL,
  
  -- Configuration
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly', 'custom')),
  custom_schedule JSONB, -- Pour les fréquences personnalisées
  
  -- Période cible
  target_period_start DATE NOT NULL,
  target_period_end DATE NOT NULL,
  
  -- Dates
  next_collection_date DATE NOT NULL,
  last_collection_date DATE,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  
  -- Métadonnées
  metadata JSONB, -- Données supplémentaires (ex: types de données à collecter)
  
  -- Notifications
  notify_before_days INTEGER DEFAULT 7, -- Nombre de jours avant pour envoyer un rappel
  notify_on_due BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_periodic_collections_org ON periodic_collections(organization_id);
CREATE INDEX idx_periodic_collections_status ON periodic_collections(status);
CREATE INDEX idx_periodic_collections_next_date ON periodic_collections(next_collection_date);
CREATE INDEX idx_periodic_collections_site ON periodic_collections(site_id);

-- RLS
ALTER TABLE periodic_collections ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les collectes de leur organisation
CREATE POLICY "Users can view periodic collections of their organization"
  ON periodic_collections FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Politique: Les admins peuvent gérer les collectes
CREATE POLICY "Admins can manage periodic collections"
  ON periodic_collections FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Table pour l'historique des collectes périodiques
CREATE TABLE IF NOT EXISTS periodic_collection_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodic_collection_id UUID NOT NULL REFERENCES periodic_collections(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Période collectée
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Résultats
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  data_count INTEGER DEFAULT 0, -- Nombre de données collectées
  
  -- Métadonnées
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_periodic_executions_collection ON periodic_collection_executions(periodic_collection_id);
CREATE INDEX idx_periodic_executions_org ON periodic_collection_executions(organization_id);
CREATE INDEX idx_periodic_executions_status ON periodic_collection_executions(status);

-- RLS
ALTER TABLE periodic_collection_executions ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les exécutions de leur organisation
CREATE POLICY "Users can view executions of their organization"
  ON periodic_collection_executions FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Fonction pour calculer la prochaine date de collecte
CREATE OR REPLACE FUNCTION calculate_next_collection_date(
  p_frequency TEXT,
  p_last_date DATE,
  p_custom_schedule JSONB DEFAULT NULL
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  next_date DATE;
BEGIN
  IF p_last_date IS NULL THEN
    RETURN CURRENT_DATE;
  END IF;
  
  CASE p_frequency
    WHEN 'monthly' THEN
      next_date := p_last_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      next_date := p_last_date + INTERVAL '3 months';
    WHEN 'yearly' THEN
      next_date := p_last_date + INTERVAL '1 year';
    WHEN 'custom' THEN
      -- Logique personnalisée basée sur custom_schedule
      -- Pour l'instant, on retourne +1 mois par défaut
      next_date := p_last_date + INTERVAL '1 month';
    ELSE
      next_date := p_last_date + INTERVAL '1 month';
  END CASE;
  
  RETURN next_date;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_periodic_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_periodic_collections_updated_at
  BEFORE UPDATE ON periodic_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_periodic_collections_updated_at();

-- Commentaires
COMMENT ON TABLE periodic_collections IS 'Planification des collectes périodiques de données';
COMMENT ON COLUMN periodic_collections.frequency IS 'Fréquence: monthly, quarterly, yearly, custom';
COMMENT ON COLUMN periodic_collections.custom_schedule IS 'Planification personnalisée au format JSON';
COMMENT ON COLUMN periodic_collections.next_collection_date IS 'Prochaine date de collecte prévue';
COMMENT ON COLUMN periodic_collections.notify_before_days IS 'Nombre de jours avant la collecte pour envoyer un rappel';
