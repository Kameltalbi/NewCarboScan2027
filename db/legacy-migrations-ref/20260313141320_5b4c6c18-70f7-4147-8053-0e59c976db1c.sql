
-- =============================================
-- PHASE 1: BIBLIOTHÈQUE ACV - SCHÉMA DE BASE
-- =============================================

-- 1. Table des matériaux (bibliothèque centralisée)
CREATE TABLE IF NOT EXISTS public.acv_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- ex: 'metals', 'plastics', 'minerals', 'wood', 'chemicals'
  subcategory TEXT,
  unit TEXT NOT NULL DEFAULT 'kg',
  carbon_factor NUMERIC(12,6) NOT NULL DEFAULT 0, -- kgCO2e par unité
  energy_factor NUMERIC(12,6) NOT NULL DEFAULT 0, -- MJ par unité
  water_factor NUMERIC(12,6) NOT NULL DEFAULT 0, -- m³ par unité
  acidification_factor NUMERIC(12,6) NOT NULL DEFAULT 0, -- kgSO2e par unité
  source TEXT DEFAULT 'ADEME Base Carbone',
  source_year INTEGER DEFAULT 2024,
  is_default BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des procédés industriels
CREATE TABLE IF NOT EXISTS public.acv_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector TEXT NOT NULL, -- ex: 'steel', 'cement', 'aluminum', 'chemicals', 'food'
  subsector TEXT,
  energy_consumption NUMERIC(12,6) NOT NULL DEFAULT 0, -- MJ par unité produite
  emission_factor NUMERIC(12,6) NOT NULL DEFAULT 0, -- kgCO2e par unité produite
  water_consumption NUMERIC(12,6) NOT NULL DEFAULT 0, -- m³ par unité produite
  unit TEXT NOT NULL DEFAULT 'kg',
  source TEXT DEFAULT 'ADEME Base Carbone',
  source_year INTEGER DEFAULT 2024,
  is_default BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des modes de transport
CREATE TABLE IF NOT EXISTS public.acv_transport_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode_type TEXT NOT NULL, -- 'road', 'rail', 'sea', 'air', 'inland_waterway'
  emission_factor_tkm NUMERIC(12,6) NOT NULL DEFAULT 0, -- kgCO2e par t.km
  energy_factor_tkm NUMERIC(12,6) NOT NULL DEFAULT 0, -- MJ par t.km
  description TEXT,
  source TEXT DEFAULT 'ADEME Base Carbone',
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des composants produit (modélisation hiérarchique)
CREATE TABLE IF NOT EXISTS public.acv_product_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.acv_projects(id) ON DELETE CASCADE,
  parent_component_id UUID REFERENCES public.acv_product_components(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  material_id UUID REFERENCES public.acv_materials(id),
  process_id UUID REFERENCES public.acv_processes(id),
  quantity NUMERIC(15,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  recycled_percentage NUMERIC(5,2) DEFAULT 0,
  transport_mode_id UUID REFERENCES public.acv_transport_modes(id),
  transport_distance_km NUMERIC(10,2) DEFAULT 0,
  supplier_country TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Table des modules du cycle de vie (EN 15804)
CREATE TABLE IF NOT EXISTS public.acv_lifecycle_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.acv_projects(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL, -- 'A1', 'A2', 'A3', 'A4', 'A5', 'B1'-'B7', 'C1'-'C4', 'D'
  module_name TEXT NOT NULL,
  module_group TEXT NOT NULL, -- 'production', 'construction', 'use', 'end_of_life', 'beyond'
  is_included BOOLEAN DEFAULT true,
  carbon_impact NUMERIC(15,6) DEFAULT 0, -- kgCO2e
  energy_impact NUMERIC(15,6) DEFAULT 0, -- MJ
  water_impact NUMERIC(15,6) DEFAULT 0, -- m³
  acidification_impact NUMERIC(15,6) DEFAULT 0, -- kgSO2e
  data_quality_score NUMERIC(3,1) DEFAULT 3.0, -- 1 (meilleur) à 5 (pire)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, module_code)
);

-- 6. Table des scénarios ACV
CREATE TABLE IF NOT EXISTS public.acv_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.acv_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_baseline BOOLEAN DEFAULT false,
  parameters JSONB DEFAULT '{}', -- modifications par rapport au scénario de base
  total_carbon NUMERIC(15,6) DEFAULT 0,
  total_energy NUMERIC(15,6) DEFAULT 0,
  total_water NUMERIC(15,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.acv_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acv_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acv_transport_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acv_product_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acv_lifecycle_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acv_scenarios ENABLE ROW LEVEL SECURITY;

-- Matériaux: lecture pour tous les authentifiés (bibliothèque partagée), écriture pour les customs
CREATE POLICY "Authenticated users can read default materials" ON public.acv_materials
  FOR SELECT TO authenticated USING (is_default = true OR organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage custom materials" ON public.acv_materials
  FOR ALL TO authenticated USING (
    is_default = false AND organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    is_default = false AND organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );

-- Procédés: même logique
CREATE POLICY "Authenticated users can read default processes" ON public.acv_processes
  FOR SELECT TO authenticated USING (is_default = true OR organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can manage custom processes" ON public.acv_processes
  FOR ALL TO authenticated USING (
    is_default = false AND organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    is_default = false AND organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );

-- Transport: lecture pour tous
CREATE POLICY "Authenticated users can read transport modes" ON public.acv_transport_modes
  FOR SELECT TO authenticated USING (true);

-- Composants produit: via le projet
CREATE POLICY "Users can manage their project components" ON public.acv_product_components
  FOR ALL TO authenticated USING (
    project_id IN (SELECT id FROM public.acv_projects WHERE user_id = auth.uid())
  ) WITH CHECK (
    project_id IN (SELECT id FROM public.acv_projects WHERE user_id = auth.uid())
  );

-- Modules cycle de vie: via le projet
CREATE POLICY "Users can manage their lifecycle modules" ON public.acv_lifecycle_modules
  FOR ALL TO authenticated USING (
    project_id IN (SELECT id FROM public.acv_projects WHERE user_id = auth.uid())
  ) WITH CHECK (
    project_id IN (SELECT id FROM public.acv_projects WHERE user_id = auth.uid())
  );

-- Scénarios: via le projet
CREATE POLICY "Users can manage their scenarios" ON public.acv_scenarios
  FOR ALL TO authenticated USING (
    project_id IN (SELECT id FROM public.acv_projects WHERE user_id = auth.uid())
  ) WITH CHECK (
    project_id IN (SELECT id FROM public.acv_projects WHERE user_id = auth.uid())
  );

-- =============================================
-- TRIGGERS updated_at
-- =============================================

CREATE TRIGGER update_acv_materials_updated_at BEFORE UPDATE ON public.acv_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();

CREATE TRIGGER update_acv_processes_updated_at BEFORE UPDATE ON public.acv_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();

CREATE TRIGGER update_acv_transport_modes_updated_at BEFORE UPDATE ON public.acv_transport_modes
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();

CREATE TRIGGER update_acv_product_components_updated_at BEFORE UPDATE ON public.acv_product_components
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();

CREATE TRIGGER update_acv_lifecycle_modules_updated_at BEFORE UPDATE ON public.acv_lifecycle_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();

CREATE TRIGGER update_acv_scenarios_updated_at BEFORE UPDATE ON public.acv_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();

-- =============================================
-- DONNÉES INITIALES - MATÉRIAUX
-- =============================================

INSERT INTO public.acv_materials (name, category, subcategory, unit, carbon_factor, energy_factor, water_factor, acidification_factor, source) VALUES
-- Métaux
('Acier primaire', 'metals', 'steel', 'kg', 2.340, 25.00, 0.018, 0.0087, 'ADEME Base Carbone'),
('Acier recyclé', 'metals', 'steel', 'kg', 0.620, 9.50, 0.008, 0.0032, 'ADEME Base Carbone'),
('Aluminium primaire', 'metals', 'aluminum', 'kg', 8.240, 155.00, 0.065, 0.0410, 'ADEME Base Carbone'),
('Aluminium recyclé', 'metals', 'aluminum', 'kg', 0.520, 8.10, 0.005, 0.0025, 'ADEME Base Carbone'),
('Cuivre primaire', 'metals', 'copper', 'kg', 3.500, 42.00, 0.070, 0.0240, 'ADEME Base Carbone'),
('Fonte', 'metals', 'iron', 'kg', 1.910, 18.50, 0.015, 0.0072, 'ADEME Base Carbone'),
('Zinc', 'metals', 'zinc', 'kg', 3.100, 38.00, 0.025, 0.0150, 'ADEME Base Carbone'),
-- Plastiques
('Polyéthylène (PE)', 'plastics', 'PE', 'kg', 2.530, 80.00, 0.012, 0.0045, 'ADEME Base Carbone'),
('Polypropylène (PP)', 'plastics', 'PP', 'kg', 2.400, 77.00, 0.010, 0.0042, 'ADEME Base Carbone'),
('PVC', 'plastics', 'PVC', 'kg', 2.410, 57.00, 0.015, 0.0065, 'ADEME Base Carbone'),
('PET', 'plastics', 'PET', 'kg', 3.140, 82.00, 0.022, 0.0058, 'ADEME Base Carbone'),
('Polystyrène (PS)', 'plastics', 'PS', 'kg', 3.430, 95.00, 0.014, 0.0055, 'ADEME Base Carbone'),
-- Minéraux / Construction
('Ciment Portland', 'minerals', 'cement', 'kg', 0.890, 4.50, 0.003, 0.0012, 'ADEME Base Carbone'),
('Béton C25/30', 'minerals', 'concrete', 'kg', 0.130, 0.95, 0.008, 0.0004, 'ADEME Base Carbone'),
('Verre plat', 'minerals', 'glass', 'kg', 1.250, 15.00, 0.010, 0.0048, 'ADEME Base Carbone'),
('Brique', 'minerals', 'brick', 'kg', 0.230, 3.00, 0.005, 0.0008, 'ADEME Base Carbone'),
('Céramique', 'minerals', 'ceramic', 'kg', 0.700, 10.50, 0.012, 0.0025, 'ADEME Base Carbone'),
-- Bois
('Bois massif résineux', 'wood', 'softwood', 'kg', -1.400, 3.50, 0.002, 0.0003, 'ADEME Base Carbone'),
('Bois massif feuillu', 'wood', 'hardwood', 'kg', -1.500, 4.20, 0.003, 0.0004, 'ADEME Base Carbone'),
('Contreplaqué', 'wood', 'plywood', 'kg', -0.800, 12.00, 0.008, 0.0015, 'ADEME Base Carbone'),
('Carton', 'wood', 'cardboard', 'kg', 0.960, 18.50, 0.025, 0.0035, 'ADEME Base Carbone'),
-- Chimie
('Engrais azoté (urée)', 'chemicals', 'fertilizer', 'kg', 3.300, 45.00, 0.035, 0.0120, 'ADEME Base Carbone'),
('Peinture', 'chemicals', 'paint', 'kg', 2.800, 55.00, 0.015, 0.0065, 'ADEME Base Carbone'),
('Résine époxy', 'chemicals', 'resin', 'kg', 5.900, 120.00, 0.028, 0.0180, 'ADEME Base Carbone'),
-- Textiles
('Coton', 'textiles', 'cotton', 'kg', 5.350, 55.00, 10.000, 0.0250, 'ADEME Base Carbone'),
('Polyester', 'textiles', 'polyester', 'kg', 5.550, 98.00, 0.060, 0.0180, 'ADEME Base Carbone'),
('Laine', 'textiles', 'wool', 'kg', 7.800, 42.00, 6.100, 0.0950, 'ADEME Base Carbone');

-- =============================================
-- DONNÉES INITIALES - PROCÉDÉS
-- =============================================

INSERT INTO public.acv_processes (name, sector, subsector, energy_consumption, emission_factor, water_consumption, unit, source) VALUES
('Laminage à chaud', 'steel', 'forming', 2.50, 0.180, 0.005, 'kg', 'ADEME Base Carbone'),
('Laminage à froid', 'steel', 'forming', 1.80, 0.120, 0.003, 'kg', 'ADEME Base Carbone'),
('Galvanisation', 'steel', 'coating', 3.20, 0.250, 0.008, 'kg', 'ADEME Base Carbone'),
('Soudage', 'steel', 'assembly', 1.50, 0.095, 0.001, 'kg', 'ADEME Base Carbone'),
('Extrusion aluminium', 'aluminum', 'forming', 6.80, 0.450, 0.010, 'kg', 'ADEME Base Carbone'),
('Anodisation', 'aluminum', 'coating', 4.50, 0.320, 0.025, 'kg', 'ADEME Base Carbone'),
('Injection plastique', 'plastics', 'forming', 3.50, 0.230, 0.002, 'kg', 'ADEME Base Carbone'),
('Extrusion plastique', 'plastics', 'forming', 2.80, 0.190, 0.002, 'kg', 'ADEME Base Carbone'),
('Thermoformage', 'plastics', 'forming', 2.20, 0.150, 0.001, 'kg', 'ADEME Base Carbone'),
('Cuisson ciment', 'cement', 'production', 3.40, 0.620, 0.003, 'kg', 'ADEME Base Carbone'),
('Broyage ciment', 'cement', 'production', 0.45, 0.030, 0.001, 'kg', 'ADEME Base Carbone'),
('Tissage', 'textiles', 'forming', 1.80, 0.120, 0.050, 'kg', 'ADEME Base Carbone'),
('Teinture', 'textiles', 'finishing', 3.50, 0.250, 0.150, 'kg', 'ADEME Base Carbone'),
('Usinage CNC', 'general', 'machining', 2.50, 0.165, 0.003, 'kg', 'ADEME Base Carbone'),
('Assemblage manuel', 'general', 'assembly', 0.10, 0.007, 0.000, 'kg', 'ADEME Base Carbone'),
('Peinture industrielle', 'general', 'coating', 4.20, 0.280, 0.008, 'kg', 'ADEME Base Carbone');

-- =============================================
-- DONNÉES INITIALES - TRANSPORT
-- =============================================

INSERT INTO public.acv_transport_modes (name, mode_type, emission_factor_tkm, energy_factor_tkm, description, source) VALUES
('Camion articulé 40t (diesel)', 'road', 0.0620, 0.85, 'Poids lourd longue distance', 'ADEME Base Carbone'),
('Camion porteur 12t', 'road', 0.1100, 1.50, 'Livraison régionale', 'ADEME Base Carbone'),
('Camionnette 3.5t', 'road', 0.2700, 3.60, 'Dernier kilomètre', 'ADEME Base Carbone'),
('Train fret électrique', 'rail', 0.0048, 0.12, 'Fret ferroviaire électrifié', 'ADEME Base Carbone'),
('Train fret diesel', 'rail', 0.0250, 0.35, 'Fret ferroviaire diesel', 'ADEME Base Carbone'),
('Porte-conteneurs >8000 EVP', 'sea', 0.0080, 0.08, 'Transport maritime intercontinental', 'ADEME Base Carbone'),
('Porte-conteneurs 2000-8000 EVP', 'sea', 0.0120, 0.12, 'Transport maritime moyen courrier', 'ADEME Base Carbone'),
('Vraquier', 'sea', 0.0040, 0.05, 'Transport vrac maritime', 'ADEME Base Carbone'),
('Avion cargo long-courrier', 'air', 0.6020, 8.50, 'Fret aérien intercontinental', 'ADEME Base Carbone'),
('Avion cargo court-courrier', 'air', 1.1200, 15.00, 'Fret aérien continental', 'ADEME Base Carbone'),
('Péniche fluviale', 'inland_waterway', 0.0320, 0.40, 'Transport fluvial', 'ADEME Base Carbone');
