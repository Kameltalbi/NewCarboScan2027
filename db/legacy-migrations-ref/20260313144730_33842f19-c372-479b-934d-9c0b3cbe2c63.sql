
-- 1. Table des flux intermédiaires (process flows)
CREATE TABLE public.acv_process_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.acv_projects(id) ON DELETE CASCADE,
  source_component_id UUID REFERENCES public.acv_product_components(id) ON DELETE SET NULL,
  target_component_id UUID REFERENCES public.acv_product_components(id) ON DELETE SET NULL,
  flow_name TEXT NOT NULL,
  flow_type TEXT NOT NULL DEFAULT 'intermediate', -- 'intermediate', 'elementary_input', 'elementary_output', 'waste', 'co_product'
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ajouter data_type (primaire/secondaire) aux composants
ALTER TABLE public.acv_product_components 
  ADD COLUMN IF NOT EXISTS data_type TEXT NOT NULL DEFAULT 'secondary',
  ADD COLUMN IF NOT EXISTS data_source_name TEXT,
  ADD COLUMN IF NOT EXISTS data_source_year INTEGER,
  ADD COLUMN IF NOT EXISTS data_source_version TEXT,
  ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT 'medium';

-- 3. Table co-produits pour allocation multi-produits
CREATE TABLE public.acv_co_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.acv_projects(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  mass_kg NUMERIC NOT NULL DEFAULT 0,
  economic_value NUMERIC NOT NULL DEFAULT 0,
  energy_content_mj NUMERIC NOT NULL DEFAULT 0,
  is_main_product BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Ajouter méthode d'allocation au projet
ALTER TABLE public.acv_projects
  ADD COLUMN IF NOT EXISTS allocation_method TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS data_quality_rating TEXT DEFAULT 'medium';

-- 5. Enrichir traçabilité des sources sur matériaux
ALTER TABLE public.acv_materials
  ADD COLUMN IF NOT EXISTS source_version TEXT,
  ADD COLUMN IF NOT EXISTS source_database TEXT DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'secondary';

-- 6. Enrichir traçabilité des sources sur procédés
ALTER TABLE public.acv_processes
  ADD COLUMN IF NOT EXISTS source_version TEXT,
  ADD COLUMN IF NOT EXISTS source_database TEXT DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'secondary';

-- 7. RLS pour process_flows
ALTER TABLE public.acv_process_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own process flows"
  ON public.acv_process_flows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.acv_projects p 
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.acv_projects p 
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

-- 8. RLS pour co_products
ALTER TABLE public.acv_co_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own co-products"
  ON public.acv_co_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.acv_projects p 
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.acv_projects p 
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

-- 9. Index pour performance
CREATE INDEX IF NOT EXISTS idx_acv_process_flows_project ON public.acv_process_flows(project_id);
CREATE INDEX IF NOT EXISTS idx_acv_process_flows_source ON public.acv_process_flows(source_component_id);
CREATE INDEX IF NOT EXISTS idx_acv_process_flows_target ON public.acv_process_flows(target_component_id);
CREATE INDEX IF NOT EXISTS idx_acv_co_products_project ON public.acv_co_products(project_id);
