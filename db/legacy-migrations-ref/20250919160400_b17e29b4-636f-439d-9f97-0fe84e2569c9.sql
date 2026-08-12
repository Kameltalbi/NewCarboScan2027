-- Drop all existing ACV tables first
DROP TABLE IF EXISTS public.acv_reports CASCADE;
DROP TABLE IF EXISTS public.acv_results CASCADE;
DROP TABLE IF EXISTS public.acv_inventory CASCADE;
DROP TABLE IF EXISTS public.acv_impact_factors CASCADE;
DROP TABLE IF EXISTS public.acv_projects CASCADE;

-- Create acv_projects table (needed as reference for foreign keys)
CREATE TABLE public.acv_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  functional_unit TEXT NOT NULL,
  scope_definition TEXT NOT NULL,
  goal_definition TEXT NOT NULL,
  system_boundaries TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory table exactly as specified
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.acv_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,   -- Energie, Transport, Matériaux, Déchets
  item TEXT NOT NULL,       -- Diesel, Electricité, Ciment…
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL
);

-- Create impact_factors table exactly as specified
CREATE TABLE public.impact_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,   -- Energie, Transport, etc.
  item TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  climate_co2e NUMERIC,         -- kgCO2e
  acidification_so2e NUMERIC,   -- kgSO2e
  water_m3 NUMERIC              -- m³
);

-- Create results table exactly as specified
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.acv_projects(id) ON DELETE CASCADE,
  impact_category TEXT CHECK (impact_category IN ('climate','acidification','water')),
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.acv_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for acv_projects
CREATE POLICY "Users can manage their own ACV projects" 
ON public.acv_projects 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all ACV projects" 
ON public.acv_projects 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

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
CREATE TRIGGER update_acv_projects_updated_at 
BEFORE UPDATE ON public.acv_projects 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();