-- Drop existing ACV tables if they exist to recreate with new specifications
DROP TABLE IF EXISTS public.acv_reports CASCADE;
DROP TABLE IF EXISTS public.acv_results CASCADE;
DROP TABLE IF EXISTS public.acv_inventory CASCADE;
DROP TABLE IF EXISTS public.acv_impact_factors CASCADE;
DROP TABLE IF EXISTS public.acv_projects CASCADE;

-- Create inventory table for ACV project flows
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.acv_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,   -- Energie, Transport, Matériaux, Déchets
  item TEXT NOT NULL,       -- Diesel, Electricité, Ciment…
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create impact_factors table
CREATE TABLE IF NOT EXISTS public.impact_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,   -- Energie, Transport, etc.
  item TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  climate_co2e NUMERIC,         -- kgCO2e
  acidification_so2e NUMERIC,   -- kgSO2e
  water_m3 NUMERIC,              -- m³
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create results table for calculated ACV results
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.acv_projects(id) ON DELETE CASCADE,
  impact_category TEXT CHECK (impact_category IN ('climate','acidification','water')),
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory
CREATE POLICY "Users can manage inventory for their projects" 
ON public.inventory 
FOR ALL 
USING (project_id IN (
  SELECT id FROM public.acv_projects WHERE user_id = auth.uid()
))
WITH CHECK (project_id IN (
  SELECT id FROM public.acv_projects WHERE user_id = auth.uid()
));

CREATE POLICY "Superadmins can view all inventory" 
ON public.inventory 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for impact_factors
CREATE POLICY "Users can view all impact factors" 
ON public.impact_factors 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmins can manage all impact factors" 
ON public.impact_factors 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for results
CREATE POLICY "Users can manage results for their projects" 
ON public.results 
FOR ALL 
USING (project_id IN (
  SELECT id FROM public.acv_projects WHERE user_id = auth.uid()
))
WITH CHECK (project_id IN (
  SELECT id FROM public.acv_projects WHERE user_id = auth.uid()
));

CREATE POLICY "Superadmins can view all results" 
ON public.results 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_updated_at 
BEFORE UPDATE ON public.inventory 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_impact_factors_updated_at 
BEFORE UPDATE ON public.impact_factors 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();