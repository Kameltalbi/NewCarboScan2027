-- Migration : Système de checklist pour collecte audit-ready
-- Permet de guider l'utilisateur sur quelles données collecter

-- Table de checklist par organisation
CREATE TABLE IF NOT EXISTS collection_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  poste_code TEXT NOT NULL, -- Ex: "1.1", "3.6"
  poste_name TEXT NOT NULL,
  scope INTEGER NOT NULL CHECK (scope IN (1, 2, 3)),
  is_mandatory BOOLEAN DEFAULT false,
  is_csrd_required BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  data_count INTEGER DEFAULT 0,
  documents_needed TEXT[], -- Liste des documents nécessaires
  method_description TEXT, -- Description de la méthode de calcul
  example_text TEXT, -- Exemple de calcul
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, poste_code)
);

-- Index pour performances
CREATE INDEX idx_collection_checklist_org ON collection_checklist(organization_id);
CREATE INDEX idx_collection_checklist_status ON collection_checklist(organization_id, status);

-- Vue agrégée pour la progression globale
CREATE OR REPLACE VIEW collection_progress AS
SELECT 
  organization_id,
  COUNT(*) as total_postes,
  SUM(CASE WHEN is_mandatory THEN 1 ELSE 0 END) as mandatory_postes,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_postes,
  SUM(CASE WHEN status = 'completed' AND is_mandatory THEN 1 ELSE 0 END) as completed_mandatory,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' AND is_mandatory THEN 1 ELSE 0 END) / 
        NULLIF(SUM(CASE WHEN is_mandatory THEN 1 ELSE 0 END), 0), 0) as completion_percentage,
  CASE 
    WHEN SUM(CASE WHEN status = 'completed' AND is_mandatory THEN 1 ELSE 0 END) = 
         SUM(CASE WHEN is_mandatory THEN 1 ELSE 0 END) 
    THEN 'audit_ready'
    WHEN SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) >= 
         SUM(CASE WHEN is_mandatory THEN 1 ELSE 0 END) * 0.7
    THEN 'partial'
    ELSE 'insufficient'
  END as audit_status
FROM collection_checklist
GROUP BY organization_id;

-- Fonction pour initialiser la checklist d'une organisation
CREATE OR REPLACE FUNCTION initialize_collection_checklist(org_id UUID)
RETURNS void AS $$
BEGIN
  -- Supprimer l'ancienne checklist si elle existe
  DELETE FROM collection_checklist WHERE organization_id = org_id;
  
  -- SCOPE 1 : Émissions directes
  INSERT INTO collection_checklist (organization_id, poste_code, poste_name, scope, is_mandatory, is_csrd_required, documents_needed, method_description, example_text)
  VALUES
    (org_id, '1.1', 'Combustion fixe', 1, true, true, 
     ARRAY['Factures de gaz naturel', 'Factures de fioul', 'Factures de charbon'],
     'Convertir les kWh ou litres en kgCO2e avec les facteurs d''émission ADEME',
     'Ex: 10 000 kWh de gaz × 0.227 kgCO2e/kWh = 2,27 tCO2e'),
    
    (org_id, '1.2', 'Combustion mobile', 1, true, true,
     ARRAY['Carnets de bord véhicules', 'Factures de carburant'],
     'Litres de carburant × facteurs d''émission par type de carburant',
     'Ex: 1 000 L de diesel × 2.7 kgCO2e/L = 2,7 tCO2e'),
    
    (org_id, '1.3', 'Procédés industriels', 1, false, false,
     ARRAY['Données de production', 'Quantités de matières premières'],
     'Spécifique au secteur industriel',
     'Ex: Production de ciment, chimie, etc.'),
    
    (org_id, '1.4', 'Émissions fugitives', 1, false, false,
     ARRAY['Registre des recharges de climatisation', 'Quantités de gaz réfrigérants'],
     'Kg de gaz × PRG (Pouvoir de Réchauffement Global)',
     'Ex: 2 kg de R410A × 2088 = 4,18 tCO2e');
  
  -- SCOPE 2 : Émissions indirectes liées à l'énergie
  INSERT INTO collection_checklist (organization_id, poste_code, poste_name, scope, is_mandatory, is_csrd_required, documents_needed, method_description, example_text)
  VALUES
    (org_id, '2.1', 'Électricité', 2, true, true,
     ARRAY['Factures d''électricité'],
     'kWh consommés × facteur d''émission du mix électrique',
     'Ex: 50 000 kWh × 0.052 kgCO2e/kWh = 2,6 tCO2e'),
    
    (org_id, '2.2', 'Chaleur et froid', 2, false, true,
     ARRAY['Factures de réseau de chaleur urbain'],
     'MWh thermiques × facteur d''émission du réseau',
     'Ex: 100 MWh × 0.108 kgCO2e/kWh = 10,8 tCO2e');
  
  -- SCOPE 3 : Autres émissions indirectes
  INSERT INTO collection_checklist (organization_id, poste_code, poste_name, scope, is_mandatory, is_csrd_required, documents_needed, method_description, example_text)
  VALUES
    (org_id, '3.1', 'Achats de biens', 3, true, true,
     ARRAY['Balance comptable (compte 60x)', 'Liste des achats par catégorie'],
     'Méthode monétaire : Montant dépensé × facteur d''émission moyen',
     'Ex: 100 000 € d''achats × 0.3 kgCO2e/€ = 30 tCO2e'),
    
    (org_id, '3.2', 'Achats de services', 3, true, true,
     ARRAY['Balance comptable (compte 61x et 62x)'],
     'Méthode monétaire : Montant dépensé × facteur d''émission par secteur',
     'Ex: 50 000 € de services × 0.15 kgCO2e/€ = 7,5 tCO2e'),
    
    (org_id, '3.3', 'Immobilisations', 3, true, true,
     ARRAY['Bilan comptable', 'Inventaire des immobilisations'],
     'Valeur amortie annuelle × facteur d''émission',
     'Ex: 20 000 € d''ordinateurs / 3 ans × 0.5 kgCO2e/€ = 3,33 tCO2e'),
    
    (org_id, '3.4', 'Transport amont de marchandises', 3, false, true,
     ARRAY['Données logistique', 'Factures transport'],
     'Tonnes.km × facteur d''émission par mode de transport',
     'Ex: 10 tonnes × 500 km × 0.1 kgCO2e/t.km = 0,5 tCO2e'),
    
    (org_id, '3.5', 'Déchets', 3, true, true,
     ARRAY['Factures de gestion des déchets', 'Borderaux de suivi'],
     'Tonnes de déchets × facteur d''émission par type',
     'Ex: 5 tonnes DIB × 0.5 tCO2e/t = 2,5 tCO2e'),
    
    (org_id, '3.6', 'Déplacements professionnels', 3, true, true,
     ARRAY['Notes de frais', 'Billets d''avion/train', 'Justificatifs taxi'],
     'Distance × facteur d''émission par mode',
     'Ex: 10 000 km avion × 0.23 kgCO2e/km = 2,3 tCO2e'),
    
    (org_id, '3.7', 'Déplacements domicile-travail', 3, true, true,
     ARRAY['Enquête mobilité des salariés'],
     'Nombre de salariés × distance moyenne × jours × facteur',
     'Ex: 50 salariés × 20 km × 200 jours × 0.2 kgCO2e/km = 40 tCO2e'),
    
    (org_id, '3.8', 'Actifs loués en amont', 3, false, false,
     ARRAY['Contrats de location', 'Baux'],
     'Selon le type d''actif loué',
     'Ex: Véhicules de location longue durée'),
    
    (org_id, '3.9', 'Transport aval de marchandises', 3, false, false,
     ARRAY['Données logistique clients'],
     'Tonnes.km × facteur d''émission',
     'Ex: Pour entreprises de distribution'),
    
    (org_id, '3.10', 'Utilisation des produits vendus', 3, false, false,
     ARRAY['Données d''usage des produits'],
     'Spécifique aux fabricants de produits',
     'Ex: Consommation électrique des produits'),
    
    (org_id, '3.11', 'Fin de vie des produits vendus', 3, false, false,
     ARRAY['Estimations de recyclage/élimination'],
     'Poids produits × facteur de fin de vie',
     'Ex: Pour fabricants avec responsabilité élargie');
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le statut de la checklist automatiquement
CREATE OR REPLACE FUNCTION update_collection_checklist_status()
RETURNS TRIGGER AS $$
DECLARE
  affected_org_id UUID;
  poste_prefix TEXT;
BEGIN
  -- Déterminer l'organisation affectée
  IF TG_OP = 'DELETE' THEN
    affected_org_id := OLD.organization_id;
  ELSE
    affected_org_id := NEW.organization_id;
  END IF;
  
  -- Mettre à jour les compteurs pour chaque poste
  UPDATE collection_checklist cc
  SET 
    data_count = (
      SELECT COUNT(DISTINCT ad.id)
      FROM activity_data ad
      WHERE ad.organization_id = cc.organization_id
        AND (
          ad.category LIKE cc.poste_code || '%' 
          OR ad.category LIKE cc.poste_code || '.%'
          OR ad.scope::text = cc.poste_code
        )
    ),
    status = CASE 
      WHEN (
        SELECT COUNT(DISTINCT ad.id)
        FROM activity_data ad
        WHERE ad.organization_id = cc.organization_id
          AND (
            ad.category LIKE cc.poste_code || '%' 
            OR ad.category LIKE cc.poste_code || '.%'
            OR ad.scope::text = cc.poste_code
          )
      ) > 0 THEN 'completed'
      ELSE 'not_started'
    END,
    last_updated_at = now()
  WHERE cc.organization_id = affected_org_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur activity_data pour mise à jour automatique
DROP TRIGGER IF EXISTS trigger_update_collection_checklist ON activity_data;
CREATE TRIGGER trigger_update_collection_checklist
AFTER INSERT OR UPDATE OR DELETE ON activity_data
FOR EACH ROW
EXECUTE FUNCTION update_collection_checklist_status();

-- RLS Policies
ALTER TABLE collection_checklist ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir la checklist de leur organisation
CREATE POLICY "Users can view their organization's checklist"
  ON collection_checklist
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent mettre à jour la checklist (manuellement si besoin)
CREATE POLICY "Users can update their organization's checklist"
  ON collection_checklist
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Initialiser la checklist pour toutes les organisations existantes
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    PERFORM initialize_collection_checklist(org_record.id);
  END LOOP;
END $$;

-- Fonction RPC pour obtenir la progression
CREATE OR REPLACE FUNCTION get_collection_progress(org_id UUID)
RETURNS TABLE (
  total_postes BIGINT,
  mandatory_postes BIGINT,
  completed_postes BIGINT,
  completed_mandatory BIGINT,
  completion_percentage NUMERIC,
  audit_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM collection_progress WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction RPC pour obtenir les postes manquants
CREATE OR REPLACE FUNCTION get_missing_mandatory_postes(org_id UUID)
RETURNS TABLE (
  poste_code TEXT,
  poste_name TEXT,
  scope INTEGER,
  documents_needed TEXT[],
  method_description TEXT,
  example_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.poste_code,
    cc.poste_name,
    cc.scope,
    cc.documents_needed,
    cc.method_description,
    cc.example_text
  FROM collection_checklist cc
  WHERE cc.organization_id = org_id
    AND cc.is_mandatory = true
    AND cc.status != 'completed'
  ORDER BY cc.scope, cc.poste_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE collection_checklist IS 'Checklist des données à collecter pour un bilan carbone audit-ready, par organisation';
COMMENT ON VIEW collection_progress IS 'Vue agrégée de la progression de collecte par organisation';
COMMENT ON FUNCTION initialize_collection_checklist IS 'Initialise la checklist GHG Protocol pour une organisation';
COMMENT ON FUNCTION get_collection_progress IS 'Retourne la progression de collecte d''une organisation';
COMMENT ON FUNCTION get_missing_mandatory_postes IS 'Retourne les postes obligatoires manquants pour une organisation';
