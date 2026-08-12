-- Migration : Bibliothèque de graphiques pour reporting PDF
-- Définit les graphiques officiels CarboScan (factuels, normés, reproductibles)

-- ============================================
-- Table : report_charts
-- Bibliothèque officielle des graphiques
-- ============================================

CREATE TABLE IF NOT EXISTS report_charts (
  -- Identification
  chart_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_code TEXT NOT NULL UNIQUE, -- Ex: "GLOB_01", "SCOPE_01"
  chart_name TEXT NOT NULL,
  
  -- Positionnement
  report_section TEXT NOT NULL, -- Ex: "resultats_globaux", "scope_analysis"
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Type de graphique
  chart_type TEXT NOT NULL, -- pie, bar, stacked_bar, line, histogram, macc
  
  -- Configuration visuelle
  chart_config JSONB NOT NULL DEFAULT '{}'::JSONB, -- Configuration Recharts
  color_palette TEXT[] DEFAULT ARRAY['#0F172A', '#1ABC9C', '#F59E0B', '#EF4444', '#8B5CF6'],
  
  -- Données sources
  data_source TEXT NOT NULL, -- Nom de la fonction ou requête pour récupérer les données
  data_parameters JSONB DEFAULT '[]'::JSONB, -- Paramètres requis pour data_source
  
  -- Règles d'affichage
  min_data_points INTEGER DEFAULT 1, -- Nombre minimum de points pour afficher
  activation_conditions JSONB DEFAULT '{}'::JSONB, -- Conditions pour afficher ce graphique
  
  -- Titre et légende
  standard_title TEXT NOT NULL, -- Titre standard du graphique
  legend_enabled BOOLEAN DEFAULT true,
  axis_labels JSONB DEFAULT '{}'::JSONB, -- Labels des axes {"x": "...", "y": "..."}
  
  -- Mise en page PDF
  pdf_size TEXT DEFAULT 'full' CHECK (pdf_size IN ('full', 'half', 'third')), -- Taille dans le PDF
  pdf_position TEXT DEFAULT 'below_text' CHECK (pdf_position IN ('below_text', 'inline', 'full_page')),
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_report_charts_code ON report_charts(graph_code);
CREATE INDEX idx_report_charts_section ON report_charts(report_section);
CREATE INDEX idx_report_charts_active ON report_charts(is_active);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_report_charts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_charts_updated_at
  BEFORE UPDATE ON report_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_report_charts_updated_at();

-- ============================================
-- Table : report_chart_instances
-- Instances de graphiques dans les rapports générés
-- ============================================

CREATE TABLE IF NOT EXISTS report_chart_instances (
  instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES generated_reports(report_id) ON DELETE CASCADE,
  chart_id UUID NOT NULL REFERENCES report_charts(chart_id),
  
  -- Snapshot du graphique
  graph_code TEXT NOT NULL,
  chart_name TEXT NOT NULL,
  chart_type TEXT NOT NULL,
  
  -- Données du graphique au moment de génération
  chart_data JSONB NOT NULL, -- Données utilisées pour générer le graphique
  chart_config JSONB NOT NULL, -- Configuration visuelle
  
  -- Numérotation dans le rapport
  figure_number INTEGER NOT NULL, -- Ex: Figure 1, Figure 2, etc.
  
  -- Métadonnées
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chart_instances_report ON report_chart_instances(report_id);
CREATE INDEX idx_chart_instances_code ON report_chart_instances(graph_code);

-- ============================================
-- Insertion des graphiques officiels CarboScan
-- ============================================

-- 1️⃣ RÉSULTATS GLOBAUX

INSERT INTO report_charts (
  graph_code, chart_name, report_section, display_order, chart_type,
  chart_config, data_source, data_parameters,
  min_data_points, activation_conditions,
  standard_title, legend_enabled, axis_labels,
  pdf_size, pdf_position
) VALUES
-- GLOB_01 : Répartition par scope
(
  'GLOB_01',
  'Répartition des émissions par scope',
  'resultats_globaux',
  10,
  'pie',
  '{"innerRadius": 0, "outerRadius": 80, "paddingAngle": 2}'::JSONB,
  'get_emissions_by_scope',
  '["organization_id", "period_start", "period_end"]'::JSONB,
  2,
  '{"min_scopes": 2}'::JSONB,
  'Figure {figure_number} – Répartition des émissions par scope',
  true,
  '{}'::JSONB,
  'half',
  'below_text'
),

-- GLOB_02 : Évolution des émissions
(
  'GLOB_02',
  'Évolution des émissions',
  'resultats_globaux',
  20,
  'line',
  '{"dot": true, "strokeWidth": 2}'::JSONB,
  'get_emissions_evolution',
  '["organization_id", "start_year", "end_year"]'::JSONB,
  2,
  '{"min_periods": 2, "has_historical": true}'::JSONB,
  'Figure {figure_number} – Évolution des émissions sur la période analysée',
  true,
  '{"x": "Année", "y": "Émissions (tCO₂e)"}'::JSONB,
  'full',
  'below_text'
);

-- 2️⃣ RÉSULTATS PAR SCOPE

INSERT INTO report_charts (
  graph_code, chart_name, report_section, display_order, chart_type,
  chart_config, data_source, data_parameters,
  min_data_points, activation_conditions,
  standard_title, legend_enabled, axis_labels,
  pdf_size, pdf_position
) VALUES
-- SCOPE_01 : Répartition par poste
(
  'SCOPE_01',
  'Répartition des émissions par poste',
  'scope_analysis',
  10,
  'stacked_bar',
  '{"layout": "vertical"}'::JSONB,
  'get_emissions_by_poste',
  '["organization_id", "period_start", "period_end", "scope"]'::JSONB,
  2,
  '{"min_postes": 2}'::JSONB,
  'Figure {figure_number} – Répartition des émissions par poste (Scope {scope})',
  true,
  '{"x": "Émissions (tCO₂e)", "y": "Poste"}'::JSONB,
  'full',
  'below_text'
),

-- SCOPE_02 : Contribution des sous-catégories
(
  'SCOPE_02',
  'Contribution des sous-catégories',
  'scope_analysis',
  20,
  'histogram',
  '{"layout": "horizontal"}'::JSONB,
  'get_emissions_by_subcategory',
  '["organization_id", "period_start", "period_end", "scope"]'::JSONB,
  3,
  '{"min_subcategories": 3}'::JSONB,
  'Figure {figure_number} – Contribution des principales sous-catégories (Scope {scope})',
  true,
  '{"x": "Sous-catégorie", "y": "Émissions (tCO₂e)"}'::JSONB,
  'full',
  'below_text'
);

-- 3️⃣ HOTSPOTS

INSERT INTO report_charts (
  graph_code, chart_name, report_section, display_order, chart_type,
  chart_config, data_source, data_parameters,
  min_data_points, activation_conditions,
  standard_title, legend_enabled, axis_labels,
  pdf_size, pdf_position
) VALUES
-- HOTSPOT_01 : Top postes émetteurs
(
  'HOTSPOT_01',
  'Top postes émetteurs',
  'hotspots',
  10,
  'histogram',
  '{"layout": "horizontal", "top_n": 10}'::JSONB,
  'get_top_emission_postes',
  '["organization_id", "period_start", "period_end", "limit"]'::JSONB,
  3,
  '{"min_postes": 3}'::JSONB,
  'Figure {figure_number} – Principaux postes d''émissions',
  false,
  '{"x": "Poste", "y": "Émissions (tCO₂e)"}'::JSONB,
  'full',
  'below_text'
);

-- 4️⃣ ACV (Analyse du Cycle de Vie)

INSERT INTO report_charts (
  graph_code, chart_name, report_section, display_order, chart_type,
  chart_config, data_source, data_parameters,
  min_data_points, activation_conditions,
  standard_title, legend_enabled, axis_labels,
  pdf_size, pdf_position
) VALUES
-- ACV_01 : Répartition par phase
(
  'ACV_01',
  'Répartition par phase du cycle de vie',
  'acv',
  10,
  'stacked_bar',
  '{"layout": "horizontal"}'::JSONB,
  'get_acv_by_phase',
  '["organization_id", "product_id", "period_start", "period_end"]'::JSONB,
  1,
  '{"acv_enabled": true}'::JSONB,
  'Figure {figure_number} – Répartition des émissions par phase du cycle de vie',
  true,
  '{"x": "Phase", "y": "Émissions (kgCO₂e)"}'::JSONB,
  'full',
  'below_text'
),

-- ACV_02 : Comparaison de variantes
(
  'ACV_02',
  'Comparaison de variantes',
  'acv',
  20,
  'histogram',
  '{"layout": "horizontal"}'::JSONB,
  'get_acv_variants_comparison',
  '["organization_id", "product_ids", "period_start", "period_end"]'::JSONB,
  2,
  '{"acv_enabled": true, "min_variants": 2}'::JSONB,
  'Figure {figure_number} – Comparaison des variantes analysées',
  true,
  '{"x": "Variante", "y": "Émissions (kgCO₂e)"}'::JSONB,
  'full',
  'below_text'
);

-- 5️⃣ PLAN DE DÉCARBONATION

INSERT INTO report_charts (
  graph_code, chart_name, report_section, display_order, chart_type,
  chart_config, data_source, data_parameters,
  min_data_points, activation_conditions,
  standard_title, legend_enabled, axis_labels,
  pdf_size, pdf_position
) VALUES
-- DECARB_01 : Courbe MACC
(
  'DECARB_01',
  'Courbe des coûts marginaux',
  'decarbonation',
  10,
  'macc',
  '{"showQuickWins": true, "showNoRegret": true}'::JSONB,
  'get_macc_curve',
  '["organization_id"]'::JSONB,
  2,
  '{"macc_enabled": true, "min_actions": 2}'::JSONB,
  'Figure {figure_number} – Courbe des coûts marginaux de réduction (MACC)',
  true,
  '{"x": "Réduction cumulée (tCO₂e)", "y": "Coût marginal (€/tCO₂e)"}'::JSONB,
  'full',
  'full_page'
),

-- DECARB_02 : Potentiel de réduction
(
  'DECARB_02',
  'Potentiel de réduction par action',
  'decarbonation',
  20,
  'histogram',
  '{"layout": "horizontal", "sort": "desc"}'::JSONB,
  'get_reduction_potential_by_action',
  '["organization_id"]'::JSONB,
  2,
  '{"macc_enabled": true, "min_actions": 2}'::JSONB,
  'Figure {figure_number} – Potentiel de réduction par action',
  false,
  '{"x": "Action", "y": "Réduction (tCO₂e/an)"}'::JSONB,
  'full',
  'below_text'
);

-- 6️⃣ TRAJECTOIRE NET ZERO

INSERT INTO report_charts (
  graph_code, chart_name, report_section, display_order, chart_type,
  chart_config, data_source, data_parameters,
  min_data_points, activation_conditions,
  standard_title, legend_enabled, axis_labels,
  pdf_size, pdf_position
) VALUES
-- TRAJ_01 : Trajectoire des émissions
(
  'TRAJ_01',
  'Trajectoire des émissions projetées',
  'trajectoire',
  10,
  'line',
  '{"dot": true, "strokeWidth": 2, "showBaseline": true, "showTarget": true}'::JSONB,
  'get_net_zero_trajectory',
  '["organization_id", "start_year", "target_year"]'::JSONB,
  2,
  '{"trajectory_defined": true}'::JSONB,
  'Figure {figure_number} – Trajectoire des émissions projetées',
  true,
  '{"x": "Année", "y": "Émissions (tCO₂e)"}'::JSONB,
  'full',
  'full_page'
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE report_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Charts readable by all authenticated users"
  ON report_charts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

ALTER TABLE report_chart_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chart instances accessible by organization members"
  ON report_chart_instances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM generated_reports gr
      JOIN organization_members om ON gr.organization_id = om.organization_id
      WHERE gr.report_id = report_chart_instances.report_id
      AND om.user_id = auth.uid()
    )
  );

-- ============================================
-- Fonction : Obtenir les graphiques pour un rapport
-- ============================================

CREATE OR REPLACE FUNCTION get_charts_for_report(
  p_report_section TEXT DEFAULT NULL,
  p_conditions JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  chart_id UUID,
  graph_code TEXT,
  chart_name TEXT,
  chart_type TEXT,
  standard_title TEXT,
  data_source TEXT,
  data_parameters JSONB,
  chart_config JSONB,
  color_palette TEXT[],
  axis_labels JSONB,
  pdf_size TEXT,
  pdf_position TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.chart_id,
    rc.graph_code,
    rc.chart_name,
    rc.chart_type,
    rc.standard_title,
    rc.data_source,
    rc.data_parameters,
    rc.chart_config,
    rc.color_palette,
    rc.axis_labels,
    rc.pdf_size,
    rc.pdf_position
  FROM report_charts rc
  WHERE rc.is_active = true
    AND (p_report_section IS NULL OR rc.report_section = p_report_section)
    AND (
      rc.activation_conditions = '{}'::JSONB
      OR rc.activation_conditions <@ p_conditions
    )
  ORDER BY rc.display_order;
END;
$$;

-- ============================================
-- Commentaires pour documentation
-- ============================================

COMMENT ON TABLE report_charts IS 'Bibliothèque officielle des graphiques CarboScan pour génération de rapports PDF';
COMMENT ON COLUMN report_charts.graph_code IS 'Clé fonctionnelle stable (ex: GLOB_01, SCOPE_01). Ne jamais changer.';
COMMENT ON COLUMN report_charts.chart_type IS 'Type de graphique : pie, bar, stacked_bar, line, histogram, macc';
COMMENT ON COLUMN report_charts.data_source IS 'Nom de la fonction pour récupérer les données du graphique';
COMMENT ON COLUMN report_charts.activation_conditions IS 'Conditions JSON pour afficher ce graphique';
COMMENT ON COLUMN report_charts.standard_title IS 'Titre standard du graphique (peut contenir {figure_number}, {scope}, etc.)';
COMMENT ON COLUMN report_charts.pdf_size IS 'Taille dans le PDF : full (pleine page), half (demi-page), third (tiers)';
COMMENT ON COLUMN report_charts.pdf_position IS 'Position : below_text, inline, full_page';

COMMENT ON TABLE report_chart_instances IS 'Instances de graphiques dans les rapports générés (snapshot pour reproductibilité)';
