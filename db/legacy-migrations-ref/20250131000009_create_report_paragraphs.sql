-- Migration : Bibliothèque centrale de paragraphes pour reporting
-- Permet de générer des rapports PDF professionnels avec textes pré-rédigés
-- Conformité : GHG Protocol, Bilan Carbone®, ISO 14064

-- ============================================
-- Table principale : report_paragraphs
-- ============================================

CREATE TABLE IF NOT EXISTS report_paragraphs (
  -- Identification & gouvernance
  paragraph_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_paragraph TEXT NOT NULL UNIQUE, -- Clé fonctionnelle stable (ex: "METH_GHG_INTRO")
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
  
  -- Auteurs et validation
  author TEXT,
  validated_by TEXT,
  validation_date TIMESTAMPTZ,
  
  -- Positionnement dans le rapport
  report_section TEXT NOT NULL, -- Ex: "methodologie", "resultats_globaux", "scope1", etc.
  subsection TEXT, -- Optionnel, pour sous-sections
  display_order INTEGER NOT NULL DEFAULT 0, -- Ordre d'affichage dans la section
  
  -- Contenu
  title TEXT NOT NULL, -- Titre du paragraphe
  body_text TEXT NOT NULL, -- Texte du paragraphe (peut contenir des variables)
  
  -- Variables dynamiques
  variables_list JSONB DEFAULT '[]'::JSONB, -- Liste des variables utilisées : ["year", "total_emissions", etc.]
  
  -- Règles d'activation
  activation_conditions JSONB DEFAULT '{}'::JSONB, -- Conditions pour afficher ce paragraphe
  report_type TEXT[] DEFAULT ARRAY['standard'], -- Types de rapports : standard, avancé, expert
  
  -- Traçabilité & conformité
  regulatory_reference TEXT[], -- Ex: ["GHG Protocol", "Bilan Carbone®", "ISO 14064"]
  methodological_notes TEXT, -- Notes méthodologiques internes
  is_mandatory BOOLEAN DEFAULT false, -- Si true, toujours inclus
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX idx_report_paragraphs_section ON report_paragraphs(report_section);
CREATE INDEX idx_report_paragraphs_status ON report_paragraphs(status);
CREATE INDEX idx_report_paragraphs_code ON report_paragraphs(code_paragraph);
CREATE INDEX idx_report_paragraphs_order ON report_paragraphs(report_section, display_order);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_report_paragraphs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_paragraphs_updated_at
  BEFORE UPDATE ON report_paragraphs
  FOR EACH ROW
  EXECUTE FUNCTION update_report_paragraphs_updated_at();

-- ============================================
-- Table : report_paragraph_history
-- Historique des versions pour audit
-- ============================================

CREATE TABLE IF NOT EXISTS report_paragraph_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES report_paragraphs(paragraph_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  -- Snapshot complet du paragraphe
  code_paragraph TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  variables_list JSONB,
  activation_conditions JSONB,
  report_type TEXT[],
  regulatory_reference TEXT[],
  
  -- Métadonnées de version
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT
);

CREATE INDEX idx_paragraph_history_paragraph ON report_paragraph_history(paragraph_id);
CREATE INDEX idx_paragraph_history_version ON report_paragraph_history(paragraph_id, version);

-- ============================================
-- Table : report_templates
-- Templates de rapports (assemblage de paragraphes)
-- ============================================

CREATE TABLE IF NOT EXISTS report_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code TEXT NOT NULL UNIQUE, -- Ex: "BILAN_CARBONE_STANDARD"
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- standard, avancé, expert, CSRD, etc.
  description TEXT,
  
  -- Configuration
  paragraph_codes TEXT[] NOT NULL, -- Liste ordonnée des codes de paragraphes
  default_variables JSONB DEFAULT '{}'::JSONB, -- Variables par défaut
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_templates_code ON report_templates(template_code);
CREATE INDEX idx_report_templates_type ON report_templates(template_type);

-- ============================================
-- Table : generated_reports
-- Historique des rapports générés
-- ============================================

CREATE TABLE IF NOT EXISTS generated_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(template_id),
  
  -- Métadonnées du rapport
  report_title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Contenu
  paragraphs_used JSONB NOT NULL, -- Snapshot des paragraphes utilisés avec leurs versions
  variables_values JSONB NOT NULL, -- Valeurs des variables au moment de la génération
  
  -- Fichier généré
  file_url TEXT, -- URL du PDF généré
  file_size INTEGER, -- Taille en bytes
  
  -- Métadonnées
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  
  -- Statut
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived'))
);

CREATE INDEX idx_generated_reports_org ON generated_reports(organization_id);
CREATE INDEX idx_generated_reports_period ON generated_reports(period_start, period_end);
CREATE INDEX idx_generated_reports_status ON generated_reports(status);

-- ============================================
-- RLS Policies
-- ============================================

-- report_paragraphs : Lecture publique (pour tous les utilisateurs), écriture admin
ALTER TABLE report_paragraphs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paragraphs readable by all authenticated users"
  ON report_paragraphs
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Paragraphs writable by admins"
  ON report_paragraphs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'superadmin')
    )
  );

-- generated_reports : Accès par organisation
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports accessible by organization members"
  ON generated_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = generated_reports.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Reports writable by organization members"
  ON generated_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = generated_reports.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- ============================================
-- Fonction : Créer une nouvelle version d'un paragraphe
-- ============================================

CREATE OR REPLACE FUNCTION create_paragraph_version(
  p_paragraph_id UUID,
  p_body_text TEXT,
  p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_version INTEGER;
  v_code_paragraph TEXT;
BEGIN
  -- Récupérer la version actuelle
  SELECT version + 1, code_paragraph
  INTO v_new_version, v_code_paragraph
  FROM report_paragraphs
  WHERE paragraph_id = p_paragraph_id;

  -- Archiver la version actuelle dans l'historique
  INSERT INTO report_paragraph_history (
    paragraph_id, version, code_paragraph, status, title, body_text,
    variables_list, activation_conditions, report_type, regulatory_reference,
    changed_by, change_reason
  )
  SELECT
    paragraph_id, version, code_paragraph, status, title, body_text,
    variables_list, activation_conditions, report_type, regulatory_reference,
    auth.uid(), p_change_reason
  FROM report_paragraphs
  WHERE paragraph_id = p_paragraph_id;

  -- Mettre à jour le paragraphe
  UPDATE report_paragraphs
  SET
    body_text = p_body_text,
    version = v_new_version,
    updated_by = auth.uid()
  WHERE paragraph_id = p_paragraph_id;

  RETURN p_paragraph_id;
END;
$$;

-- ============================================
-- Fonction : Obtenir les paragraphes pour un rapport
-- ============================================

CREATE OR REPLACE FUNCTION get_paragraphs_for_report(
  p_template_code TEXT,
  p_conditions JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  paragraph_id UUID,
  code_paragraph TEXT,
  title TEXT,
  body_text TEXT,
  variables_list JSONB,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rp.paragraph_id,
    rp.code_paragraph,
    rp.title,
    rp.body_text,
    rp.variables_list,
    rp.display_order
  FROM report_paragraphs rp
  JOIN report_templates rt ON rp.code_paragraph = ANY(rt.paragraph_codes)
  WHERE rt.template_code = p_template_code
    AND rp.status = 'active'
    AND (
      rp.is_mandatory = true
      OR rp.activation_conditions <@ p_conditions -- Conditions satisfaites
    )
  ORDER BY rp.display_order;
END;
$$;

-- ============================================
-- Commentaires pour documentation
-- ============================================

COMMENT ON TABLE report_paragraphs IS 'Bibliothèque centrale de paragraphes pré-rédigés pour génération de rapports PDF';
COMMENT ON COLUMN report_paragraphs.code_paragraph IS 'Clé fonctionnelle stable (ex: METH_GHG_INTRO). Ne jamais changer.';
COMMENT ON COLUMN report_paragraphs.body_text IS 'Texte du paragraphe. Peut contenir des variables entre accolades : {year}, {total_emissions}';
COMMENT ON COLUMN report_paragraphs.variables_list IS 'Liste JSON des variables utilisées dans body_text';
COMMENT ON COLUMN report_paragraphs.activation_conditions IS 'Conditions JSON pour afficher ce paragraphe (ex: {"scope3": true})';
COMMENT ON COLUMN report_paragraphs.is_mandatory IS 'Si true, toujours inclus dans le rapport (ex: mentions légales)';

COMMENT ON TABLE report_paragraph_history IS 'Historique complet des versions de paragraphes pour audit et traçabilité';
COMMENT ON TABLE report_templates IS 'Templates de rapports : assemblage ordonné de paragraphes';
COMMENT ON TABLE generated_reports IS 'Historique des rapports générés avec snapshot des paragraphes et variables';
