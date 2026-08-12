-- Migration : Table de correspondance Paragraphes ↔ Graphiques
-- Définit les règles d'assemblage intelligent des rapports PDF CarboScan

-- ============================================
-- Table : paragraph_chart_mapping
-- Correspondance entre paragraphes et graphiques
-- ============================================

CREATE TABLE IF NOT EXISTS paragraph_chart_mapping (
  -- Identification
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Références
  paragraph_code TEXT NOT NULL REFERENCES report_paragraphs(code_paragraph),
  chart_code TEXT NOT NULL REFERENCES report_charts(graph_code),
  
  -- Positionnement
  report_section TEXT NOT NULL,
  priority_order INTEGER NOT NULL DEFAULT 0, -- Ordre d'affichage dans la section
  
  -- Règles d'association
  is_optional BOOLEAN DEFAULT true, -- Le graphique est-il optionnel ?
  activation_rule JSONB DEFAULT '{}'::JSONB, -- Règles pour activer le graphique
  
  -- Affichage
  display_position TEXT DEFAULT 'below_text' CHECK (display_position IN ('below_text', 'inline', 'full_page', 'side_by_side')),
  reference_label TEXT DEFAULT 'Figure {figure_number}', -- Label de référence dans le paragraphe
  
  -- Configuration spécifique pour ce contexte
  chart_override_config JSONB DEFAULT NULL, -- Configuration custom pour ce contexte (ex: top_n différent)
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte unique : Un paragraphe ne peut avoir qu'un seul graphique actif
  UNIQUE(paragraph_code, is_active)
);

-- Index
CREATE INDEX idx_paragraph_chart_mapping_para ON paragraph_chart_mapping(paragraph_code);
CREATE INDEX idx_paragraph_chart_mapping_chart ON paragraph_chart_mapping(chart_code);
CREATE INDEX idx_paragraph_chart_mapping_section ON paragraph_chart_mapping(report_section);
CREATE INDEX idx_paragraph_chart_mapping_active ON paragraph_chart_mapping(is_active);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_paragraph_chart_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_paragraph_chart_mapping_updated_at
  BEFORE UPDATE ON paragraph_chart_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_paragraph_chart_mapping_updated_at();

-- ============================================
-- Insertion des correspondances officielles
-- ============================================

-- 🟦 SECTION : Résultats globaux

INSERT INTO paragraph_chart_mapping (
  paragraph_code, chart_code, report_section, priority_order,
  is_optional, activation_rule, display_position, reference_label
) VALUES
-- PARA_GLOB_01 → GLOB_01
(
  'RESULTATS_GLOBAUX',
  'GLOB_01',
  'resultats_globaux',
  10,
  true, -- Optionnel
  '{"min_scopes": 2}'::JSONB, -- Affiché si ≥ 2 scopes actifs
  'below_text',
  'Figure {figure_number}'
),

-- PARA_GLOB_02 → GLOB_02 (Évolution)
-- Ce mapping sera créé dynamiquement si un paragraphe d'évolution existe
(
  'RESULTATS_EVOLUTION',
  'GLOB_02',
  'resultats_globaux',
  20,
  true,
  '{"min_periods": 2, "has_historical": true}'::JSONB,
  'below_text',
  'Figure {figure_number}'
);

-- 🟦 SECTION : Résultats par scope

INSERT INTO paragraph_chart_mapping (
  paragraph_code, chart_code, report_section, priority_order,
  is_optional, activation_rule, display_position, reference_label
) VALUES
-- PARA_SCOPE_01 → SCOPE_01 (Scope 1)
(
  'RESULTATS_SCOPE1_DETAIL',
  'SCOPE_01',
  'scope_analysis',
  10,
  true,
  '{"min_postes": 2, "scope": 1}'::JSONB,
  'below_text',
  'Figure {figure_number}'
),

-- PARA_SCOPE_02 → SCOPE_02 (Sous-catégories Scope 1)
-- Ce mapping sera créé si un paragraphe de détail existe
(
  'RESULTATS_SCOPE1_SUBCATEGORIES',
  'SCOPE_02',
  'scope_analysis',
  20,
  true,
  '{"min_subcategories": 3, "scope": 1}'::JSONB,
  'below_text',
  'Figure {figure_number}'
);

-- 🟦 SECTION : Analyse des postes (Hotspots)

INSERT INTO paragraph_chart_mapping (
  paragraph_code, chart_code, report_section, priority_order,
  is_optional, activation_rule, display_position, reference_label,
  chart_override_config
) VALUES
-- PARA_HOTSPOT_01 → HOTSPOT_01
(
  'HOTSPOTS_ANALYSE',
  'HOTSPOT_01',
  'hotspots',
  10,
  true,
  '{"min_postes": 3}'::JSONB,
  'below_text',
  'Figure {figure_number}',
  '{"top_n": 5}'::JSONB -- Par défaut 5 postes
);

-- 🟦 SECTION : ACV (si activée)

INSERT INTO paragraph_chart_mapping (
  paragraph_code, chart_code, report_section, priority_order,
  is_optional, activation_rule, display_position, reference_label
) VALUES
-- PARA_ACV_01 → ACV_01
(
  'ACV_ANALYSE_PHASES',
  'ACV_01',
  'acv',
  10,
  true,
  '{"acv_enabled": true, "all_phases_defined": true}'::JSONB,
  'below_text',
  'Figure {figure_number}'
),

-- PARA_ACV_02 → ACV_02
(
  'ACV_COMPARAISON_VARIANTES',
  'ACV_02',
  'acv',
  20,
  true,
  '{"acv_enabled": true, "min_variants": 2}'::JSONB,
  'below_text',
  'Figure {figure_number}'
);

-- 🟦 SECTION : Plan de décarbonation

INSERT INTO paragraph_chart_mapping (
  paragraph_code, chart_code, report_section, priority_order,
  is_optional, activation_rule, display_position, reference_label
) VALUES
-- PARA_DECARB_01 → DECARB_01 (MACC)
(
  'DECARB_PLAN_ACTIONS',
  'DECARB_01',
  'decarbonation',
  10,
  true,
  '{"macc_enabled": true, "min_actions": 2, "has_costs": true}'::JSONB,
  'full_page', -- MACC mérite une pleine page
  'Figure {figure_number}'
),

-- PARA_DECARB_02 → DECARB_02 (Potentiel)
(
  'DECARB_POTENTIEL',
  'DECARB_02',
  'decarbonation',
  20,
  true,
  '{"macc_enabled": true, "min_actions": 2}'::JSONB,
  'below_text',
  'Figure {figure_number}'
);

-- 🟦 SECTION : Trajectoire Net Zero

INSERT INTO paragraph_chart_mapping (
  paragraph_code, chart_code, report_section, priority_order,
  is_optional, activation_rule, display_position, reference_label
) VALUES
-- PARA_TRAJ_01 → TRAJ_01
(
  'TRAJ_NETZERO',
  'TRAJ_01',
  'trajectoire',
  10,
  true,
  '{"trajectory_defined": true, "baseline_set": true, "min_scenarios": 1}'::JSONB,
  'full_page', -- Trajectoire mérite une pleine page
  'Figure {figure_number}'
);

-- ============================================
-- Fonction : Obtenir les correspondances pour un rapport
-- ============================================

CREATE OR REPLACE FUNCTION get_paragraph_chart_mappings(
  p_template_code TEXT,
  p_conditions JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  paragraph_code TEXT,
  chart_code TEXT,
  report_section TEXT,
  priority_order INTEGER,
  display_position TEXT,
  reference_label TEXT,
  chart_override_config JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pcm.paragraph_code,
    pcm.chart_code,
    pcm.report_section,
    pcm.priority_order,
    pcm.display_position,
    pcm.reference_label,
    pcm.chart_override_config
  FROM paragraph_chart_mapping pcm
  WHERE pcm.is_active = true
    AND (
      -- Pas de règle d'activation OU règles satisfaites
      pcm.activation_rule = '{}'::JSONB
      OR pcm.activation_rule <@ p_conditions
    )
  ORDER BY pcm.report_section, pcm.priority_order;
END;
$$;

-- ============================================
-- Fonction : Logique d'assemblage paragraphe + graphique
-- ============================================

CREATE OR REPLACE FUNCTION assemble_paragraph_with_chart(
  p_paragraph_code TEXT,
  p_figure_number INTEGER,
  p_conditions JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_paragraph report_paragraphs%ROWTYPE;
  v_chart report_charts%ROWTYPE;
  v_mapping paragraph_chart_mapping%ROWTYPE;
  v_result JSONB;
  v_has_chart BOOLEAN := false;
BEGIN
  -- Récupérer le paragraphe
  SELECT * INTO v_paragraph
  FROM report_paragraphs
  WHERE code_paragraph = p_paragraph_code
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Récupérer le mapping
  SELECT * INTO v_mapping
  FROM paragraph_chart_mapping
  WHERE paragraph_code = p_paragraph_code
    AND is_active = true;

  -- Si mapping existe, vérifier les conditions d'activation
  IF FOUND THEN
    -- Vérifier si les règles d'activation sont satisfaites
    IF v_mapping.activation_rule = '{}'::JSONB OR v_mapping.activation_rule <@ p_conditions THEN
      -- Récupérer le graphique
      SELECT * INTO v_chart
      FROM report_charts
      WHERE graph_code = v_mapping.chart_code
        AND is_active = true;

      IF FOUND THEN
        v_has_chart := true;
      END IF;
    END IF;
  END IF;

  -- Construire le résultat
  v_result := jsonb_build_object(
    'paragraph', row_to_json(v_paragraph),
    'has_chart', v_has_chart,
    'chart', CASE WHEN v_has_chart THEN row_to_json(v_chart) ELSE NULL END,
    'mapping', CASE WHEN v_has_chart THEN row_to_json(v_mapping) ELSE NULL END,
    'figure_number', CASE WHEN v_has_chart THEN p_figure_number ELSE NULL END
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE paragraph_chart_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mappings readable by all authenticated users"
  ON paragraph_chart_mapping
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Mappings writable by admins"
  ON paragraph_chart_mapping
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'superadmin')
    )
  );

-- ============================================
-- Vue : Correspondances actives avec métadonnées
-- ============================================

CREATE OR REPLACE VIEW v_paragraph_chart_mappings AS
SELECT
  pcm.mapping_id,
  pcm.paragraph_code,
  rp.title AS paragraph_title,
  rp.report_section AS paragraph_section,
  pcm.chart_code,
  rc.chart_name,
  rc.chart_type,
  pcm.report_section,
  pcm.priority_order,
  pcm.is_optional,
  pcm.activation_rule,
  pcm.display_position,
  pcm.reference_label,
  pcm.chart_override_config,
  rc.min_data_points AS chart_min_data_points,
  rc.activation_conditions AS chart_activation_conditions
FROM paragraph_chart_mapping pcm
JOIN report_paragraphs rp ON pcm.paragraph_code = rp.code_paragraph
JOIN report_charts rc ON pcm.chart_code = rc.graph_code
WHERE pcm.is_active = true
  AND rp.status = 'active'
  AND rc.is_active = true
ORDER BY pcm.report_section, pcm.priority_order;

-- ============================================
-- Commentaires pour documentation
-- ============================================

COMMENT ON TABLE paragraph_chart_mapping IS 'Table de correspondance Paragraphes ↔ Graphiques pour assemblage intelligent des rapports PDF';
COMMENT ON COLUMN paragraph_chart_mapping.paragraph_code IS 'Code du paragraphe (ex: RESULTATS_GLOBAUX)';
COMMENT ON COLUMN paragraph_chart_mapping.chart_code IS 'Code du graphique (ex: GLOB_01)';
COMMENT ON COLUMN paragraph_chart_mapping.is_optional IS 'Si true, le graphique peut ne pas être affiché même si conditions satisfaites';
COMMENT ON COLUMN paragraph_chart_mapping.activation_rule IS 'Règles JSON pour activer ce graphique dans ce contexte (ex: {"min_scopes": 2})';
COMMENT ON COLUMN paragraph_chart_mapping.display_position IS 'Position du graphique : below_text, inline, full_page, side_by_side';
COMMENT ON COLUMN paragraph_chart_mapping.reference_label IS 'Label de référence dans le paragraphe (ex: Figure {figure_number})';
COMMENT ON COLUMN paragraph_chart_mapping.chart_override_config IS 'Configuration custom pour ce contexte (surcharge chart_config du graphique)';

COMMENT ON FUNCTION get_paragraph_chart_mappings IS 'Récupère les correspondances paragraphes-graphiques pour un rapport selon les conditions';
COMMENT ON FUNCTION assemble_paragraph_with_chart IS 'Logique d''assemblage intelligent : retourne paragraphe + graphique (si applicable)';
