-- =========================
-- 1. TABLES DE RÉFÉRENCE
-- =========================

-- 1.1 Référentiel des facteurs d'émission CO2 (tCO2 par unité)
CREATE TABLE IF NOT EXISTS public.emission_factors_co2 (
  energy_type text PRIMARY KEY,              -- diesel | gasoline | natural_gas | heavy_fuel_oil | coal | electricity
  unit text NOT NULL,                        -- L | kg | m3 | kWh | MWh
  ef_co2_t_per_unit numeric NOT NULL,       -- ex: 0.00268 tCO2/L
  source_reference text,
  updated_at timestamptz DEFAULT now()
);

-- 1.2 Organisations (si multi-tenant)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =========================
-- 2. SAISIE D'ACTIVITÉ
-- =========================

-- 2.1 Données d'activité énergétique (Scope 1 & 2)
CREATE TABLE IF NOT EXISTS public.activity_energy (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  year int NOT NULL,
  site text,
  scope smallint NOT NULL CHECK (scope IN (1,2)),
  category text NOT NULL,                   -- mobile_combustion | stationary_combustion | electricity
  subcategory text,
  energy_type text NOT NULL REFERENCES public.emission_factors_co2(energy_type),
  unit text NOT NULL,                       -- L | kg | m3 | kWh | MWh
  quantity numeric NOT NULL,                -- quantité annuelle
  unit_price_baseline numeric NOT NULL,     -- prix unitaire courant
  currency text NOT NULL DEFAULT 'TND',
  emission_factor_co2 numeric,              -- tCO2/unité (si null, on prendra le référentiel)
  include_in_simulation boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =========================
-- 3. SCÉNARIOS & RUNS
-- =========================

-- 3.1 Scénarios de simulation
CREATE TABLE IF NOT EXISTS public.sim_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  petroleum_price_multiplier numeric NOT NULL DEFAULT 1.0,   -- diesel/gasoline/heavy_fuel_oil
  gas_price_multiplier numeric NOT NULL DEFAULT 1.0,         -- natural_gas
  coal_price_multiplier numeric NOT NULL DEFAULT 1.0,        -- coal
  electricity_price_multiplier numeric NOT NULL DEFAULT 1.0, -- electricity
  apply_carbon_tax boolean NOT NULL DEFAULT false,
  carbon_tax_price_per_tco2 numeric NOT NULL DEFAULT 0,      -- €/tCO2 ou TND/tCO2
  internal_carbon_price_per_tco2 numeric NOT NULL DEFAULT 0, -- prix interne du carbone (base)
  currency text NOT NULL DEFAULT 'TND',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.2 Exécutions (résumés)
CREATE TABLE IF NOT EXISTS public.sim_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  scenario_id uuid NOT NULL REFERENCES public.sim_scenarios(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  year int NOT NULL,
  executed_at timestamptz DEFAULT now(),
  base_energy_cost numeric NOT NULL,
  base_carbon_cost numeric NOT NULL,
  scenario_energy_cost numeric NOT NULL,
  scenario_carbon_cost numeric NOT NULL,
  delta_total_cost numeric NOT NULL,
  total_emissions_tco2 numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3.3 Détail par ligne d'activité (pour graphiques et drilldown)
CREATE TABLE IF NOT EXISTS public.sim_run_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.sim_runs(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activity_energy(id) ON DELETE CASCADE,
  energy_type text NOT NULL,
  baseline_emissions_tco2 numeric NOT NULL,
  baseline_energy_cost numeric NOT NULL,
  scenario_energy_cost numeric NOT NULL,
  scenario_carbon_cost numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =========================
-- 4. INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_activity_user_year ON public.activity_energy(user_id, year);
CREATE INDEX IF NOT EXISTS idx_activity_org_year ON public.activity_energy(organization_id, year);
CREATE INDEX IF NOT EXISTS idx_scenarios_user ON public.sim_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_org ON public.sim_scenarios(organization_id);
CREATE INDEX IF NOT EXISTS idx_runs_user ON public.sim_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_run_lines_run ON public.sim_run_lines(run_id);

-- =========================
-- 5. RLS POLICIES
-- =========================

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_energy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_run_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emission_factors_co2 ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their own organizations" ON public.organizations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own organizations" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own organizations" ON public.organizations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all organizations" ON public.organizations FOR SELECT USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Activity energy policies
CREATE POLICY "Users can view their own activity data" ON public.activity_energy FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activity data" ON public.activity_energy FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own activity data" ON public.activity_energy FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own activity data" ON public.activity_energy FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all activity data" ON public.activity_energy FOR SELECT USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Simulation scenarios policies
CREATE POLICY "Users can view their own scenarios" ON public.sim_scenarios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scenarios" ON public.sim_scenarios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scenarios" ON public.sim_scenarios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scenarios" ON public.sim_scenarios FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all scenarios" ON public.sim_scenarios FOR SELECT USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Simulation runs policies
CREATE POLICY "Users can view their own simulation runs" ON public.sim_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own simulation runs" ON public.sim_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own simulation runs" ON public.sim_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own simulation runs" ON public.sim_runs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all simulation runs" ON public.sim_runs FOR SELECT USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Simulation run lines policies
CREATE POLICY "Users can view their own simulation run lines" ON public.sim_run_lines FOR SELECT USING (
  run_id IN (SELECT id FROM public.sim_runs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert their own simulation run lines" ON public.sim_run_lines FOR INSERT WITH CHECK (
  run_id IN (SELECT id FROM public.sim_runs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update their own simulation run lines" ON public.sim_run_lines FOR UPDATE USING (
  run_id IN (SELECT id FROM public.sim_runs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete their own simulation run lines" ON public.sim_run_lines FOR DELETE USING (
  run_id IN (SELECT id FROM public.sim_runs WHERE user_id = auth.uid())
);
CREATE POLICY "Superadmins can view all simulation run lines" ON public.sim_run_lines FOR SELECT USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Emission factors policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view emission factors" ON public.emission_factors_co2 FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Superadmins can manage emission factors" ON public.emission_factors_co2 FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));

-- =========================
-- 6. TRIGGERS
-- =========================

-- Updated_at triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activity_energy_updated_at
  BEFORE UPDATE ON public.activity_energy
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sim_scenarios_updated_at
  BEFORE UPDATE ON public.sim_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 7. SEED DATA - Facteurs d'émission CO2
-- =========================

INSERT INTO public.emission_factors_co2 (energy_type, unit, ef_co2_t_per_unit, source_reference) VALUES
('diesel', 'L', 0.00268, 'ADEME 2024'),
('gasoline', 'L', 0.00231, 'ADEME 2024'),
('natural_gas', 'm3', 0.00184, 'ADEME 2024'),
('heavy_fuel_oil', 'kg', 0.00318, 'ADEME 2024'),
('coal', 'kg', 0.00354, 'ADEME 2024'),
('electricity', 'kWh', 0.000474, 'Mix électrique France 2024')
ON CONFLICT (energy_type) DO UPDATE SET
  ef_co2_t_per_unit = EXCLUDED.ef_co2_t_per_unit,
  source_reference = EXCLUDED.source_reference,
  updated_at = now();