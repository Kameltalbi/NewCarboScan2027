-- Migration: DataRoom CSRD pour stockage et organisation des justificatifs

CREATE TABLE IF NOT EXISTS collect_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_data_id UUID REFERENCES activity_data(id) ON DELETE SET NULL, -- Lien vers une donnée
  
  -- Métadonnées du document
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'invoice', -- Facture
    'receipt', -- Reçu
    'certificate', -- Certificat
    'report', -- Rapport
    'contract', -- Contrat
    'measurement', -- Mesure
    'other' -- Autre
  )),
  category TEXT, -- Catégorie CSRD (ex: scope1, scope2, scope3)
  
  -- Stockage
  storage_path TEXT NOT NULL, -- Chemin dans Supabase Storage
  storage_bucket TEXT NOT NULL DEFAULT 'collect-documents',
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  
  -- Organisation
  tags TEXT[], -- Tags pour recherche
  period_start DATE, -- Période couverte
  period_end DATE,
  
  -- Métadonnées supplémentaires
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_collect_documents_org ON collect_documents(organization_id);
CREATE INDEX idx_collect_documents_activity ON collect_documents(activity_data_id);
CREATE INDEX idx_collect_documents_type ON collect_documents(document_type);
CREATE INDEX idx_collect_documents_category ON collect_documents(category);
CREATE INDEX idx_collect_documents_tags ON collect_documents USING GIN(tags);
CREATE INDEX idx_collect_documents_period ON collect_documents(period_start, period_end);

-- RLS
ALTER TABLE collect_documents ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les documents de leur organisation
CREATE POLICY "Users can view documents of their organization"
  ON collect_documents FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Politique: Les utilisateurs peuvent créer des documents
CREATE POLICY "Users can create documents"
  ON collect_documents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Politique: Les utilisateurs peuvent modifier leurs documents
CREATE POLICY "Users can update documents"
  ON collect_documents FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Politique: Les utilisateurs peuvent supprimer leurs documents
CREATE POLICY "Users can delete documents"
  ON collect_documents FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_collect_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collect_documents_updated_at
  BEFORE UPDATE ON collect_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_collect_documents_updated_at();

-- Commentaires
COMMENT ON TABLE collect_documents IS 'DataRoom CSRD - Stockage et organisation des justificatifs pour la collecte de données';
COMMENT ON COLUMN collect_documents.activity_data_id IS 'Lien optionnel vers une donnée d''activité spécifique';
COMMENT ON COLUMN collect_documents.category IS 'Catégorie CSRD (scope1, scope2, scope3, etc.)';
COMMENT ON COLUMN collect_documents.tags IS 'Tags pour faciliter la recherche et l''organisation';
