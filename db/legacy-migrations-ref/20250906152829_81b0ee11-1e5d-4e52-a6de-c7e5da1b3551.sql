-- Create emissions totals table for barrel equivalent method
CREATE TABLE public.emissions_totals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  year integer NOT NULL,
  scope1_tco2 numeric NOT NULL DEFAULT 0,
  scope2_tco2 numeric NOT NULL DEFAULT 0,
  total_tco2 numeric GENERATED ALWAYS AS (scope1_tco2 + scope2_tco2) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create simulation parameters table
CREATE TABLE public.sim_parameters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  factor_tco2_per_barrel numeric NOT NULL DEFAULT 0.43,
  default_barrel_price numeric NOT NULL DEFAULT 80,
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz DEFAULT now()
);

-- Create barrel scenarios table
CREATE TABLE public.sim_barrel_scenarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  name text NOT NULL,
  barrel_price_multiplier numeric NOT NULL DEFAULT 1.0,
  apply_carbon_tax boolean NOT NULL DEFAULT false,
  carbon_tax_price_per_tco2 numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create barrel simulation results table
CREATE TABLE public.sim_barrel_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id uuid NOT NULL REFERENCES public.sim_barrel_scenarios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emissions_total_tco2 numeric NOT NULL,
  equivalent_barrels numeric NOT NULL,
  base_cost numeric NOT NULL,
  scenario_cost numeric NOT NULL,
  carbon_tax numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL,
  delta_cost numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emissions_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_barrel_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_barrel_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for emissions_totals
CREATE POLICY "Users can manage their own emissions totals" 
ON public.emissions_totals 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all emissions totals"
ON public.emissions_totals 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create RLS policies for sim_parameters
CREATE POLICY "Authenticated users can view sim parameters"
ON public.sim_parameters 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmins can manage sim parameters"
ON public.sim_parameters 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Create RLS policies for sim_barrel_scenarios
CREATE POLICY "Users can manage their own barrel scenarios"
ON public.sim_barrel_scenarios 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all barrel scenarios"
ON public.sim_barrel_scenarios 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create RLS policies for sim_barrel_results
CREATE POLICY "Users can manage their own barrel results"
ON public.sim_barrel_results 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all barrel results"
ON public.sim_barrel_results 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Insert default parameters
INSERT INTO public.sim_parameters (factor_tco2_per_barrel, default_barrel_price, currency)
VALUES (0.43, 80, 'USD');

-- Create update triggers
CREATE TRIGGER update_emissions_totals_updated_at
  BEFORE UPDATE ON public.emissions_totals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sim_barrel_scenarios_updated_at
  BEFORE UPDATE ON public.sim_barrel_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();