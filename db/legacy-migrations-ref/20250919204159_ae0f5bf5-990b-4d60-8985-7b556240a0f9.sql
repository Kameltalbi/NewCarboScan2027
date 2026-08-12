-- Mise à jour de la table acv_inventory selon les spécifications
ALTER TABLE acv_inventory 
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'production',
ADD COLUMN IF NOT EXISTS flow_type TEXT DEFAULT 'input' CHECK (flow_type IN ('input', 'output')),
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS period_start DATE,
ADD COLUMN IF NOT EXISTS period_end DATE,
ADD COLUMN IF NOT EXISTS data_source TEXT,
ADD COLUMN IF NOT EXISTS data_quality INTEGER DEFAULT 3 CHECK (data_quality BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS custom_factor_id UUID REFERENCES acv_impact_factors(id),
ADD COLUMN IF NOT EXISTS recycled_percentage NUMERIC DEFAULT 0 CHECK (recycled_percentage BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS supplier_country TEXT;

-- Mise à jour des politiques RLS pour permettre aux utilisateurs de gérer leur inventaire
DROP POLICY IF EXISTS "Users can manage inventory for their projects" ON acv_inventory;
DROP POLICY IF EXISTS "Superadmins can view all inventory" ON acv_inventory;

CREATE POLICY "Users can manage inventory for their projects" ON acv_inventory
FOR ALL USING (
  project_id IN (
    SELECT id FROM acv_projects WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM acv_projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Superadmins can view all inventory" ON acv_inventory
FOR SELECT USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Table pour les paramètres d'inventaire par projet
CREATE TABLE IF NOT EXISTS acv_inventory_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES acv_projects(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL DEFAULT 2024,
  location_default TEXT DEFAULT 'Tunisie',
  scope_boundaries TEXT[] DEFAULT ARRAY['A1-A3', 'A4', 'A5', 'B', 'C'],
  allocation_rule TEXT DEFAULT 'mass',
  cutoff_individual_threshold NUMERIC DEFAULT 0.01,
  cutoff_cumulative_threshold NUMERIC DEFAULT 0.05,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS pour les paramètres d'inventaire
ALTER TABLE acv_inventory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage inventory settings for their projects" ON acv_inventory_settings
FOR ALL USING (
  project_id IN (
    SELECT id FROM acv_projects WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM acv_projects WHERE user_id = auth.uid()
  )
);

-- Table pour les conversions d'unités
CREATE TABLE IF NOT EXISTS unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  factor NUMERIC NOT NULL,
  material_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(from_unit, to_unit, material_type)
);

-- Données de base pour les conversions d'unités
INSERT INTO unit_conversions (from_unit, to_unit, factor, material_type) VALUES
('L', 'kg', 0.85, 'diesel'),
('L', 'kg', 0.74, 'gasoline'),
('L', 'kg', 0.54, 'LPG'),
('kg', 't', 0.001, NULL),
('g', 'kg', 0.001, NULL),
('m3', 'L', 1000, NULL)
ON CONFLICT (from_unit, to_unit, material_type) DO NOTHING;

-- RLS pour les conversions d'unités (lecture seule pour tous)
ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view unit conversions" ON unit_conversions
FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage unit conversions" ON unit_conversions
FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_acv_inventory_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_acv_inventory_settings_updated_at
  BEFORE UPDATE ON acv_inventory_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_acv_inventory_settings_updated_at();