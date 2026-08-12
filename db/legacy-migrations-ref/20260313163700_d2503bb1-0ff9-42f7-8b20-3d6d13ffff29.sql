
-- ===== MODULE: Modélisation de Scénarios =====

-- Table principale des scénarios
CREATE TABLE public.climate_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  baseline_source_type TEXT NOT NULL DEFAULT 'bilan', -- bilan, pcf, acv, roadmap
  baseline_source_id UUID,
  baseline_year INTEGER NOT NULL,
  start_year INTEGER NOT NULL,
  target_year INTEGER NOT NULL,
  scenario_type TEXT NOT NULL DEFAULT 'custom', -- reference, prudent, intermediate, ambitious, net_zero, custom
  target_reduction_percent NUMERIC(5,2),
  baseline_emissions_tco2e NUMERIC(15,2),
  target_emissions_tco2e NUMERIC(15,2),
  net_zero_flag BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, validated, archived
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leviers associés à un scénario
CREATE TABLE public.climate_scenario_levers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.climate_scenarios(id) ON DELETE CASCADE,
  roadmap_lever_id UUID REFERENCES public.climate_levers(id),
  custom_lever_name TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  scope_concerned INTEGER[] DEFAULT '{1,2,3}',
  source_emission_targeted TEXT,
  max_reduction_tco2e NUMERIC(15,2) DEFAULT 0,
  estimated_cost NUMERIC(15,2) DEFAULT 0,
  maturity_level TEXT DEFAULT 'concept',
  confidence_level TEXT DEFAULT 'medium', -- low, medium, high
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hypothèses de déploiement par levier
CREATE TABLE public.climate_scenario_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_lever_id UUID NOT NULL REFERENCES public.climate_scenario_levers(id) ON DELETE CASCADE,
  start_year INTEGER NOT NULL,
  ramp_up_end_year INTEGER,
  yearly_adoption_rate JSONB DEFAULT '{}', -- { "2026": 0.1, "2027": 0.3, ... }
  yearly_reduction_factor NUMERIC(5,4) DEFAULT 1.0,
  max_coverage_percent NUMERIC(5,2) DEFAULT 100,
  confidence_level TEXT DEFAULT 'medium',
  source_reference TEXT,
  methodological_note TEXT,
  application_mode TEXT DEFAULT 'linear', -- linear, exponential, step, custom
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Résultats de projection par année
CREATE TABLE public.climate_scenario_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.climate_scenarios(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  projected_emissions_tco2e NUMERIC(15,2) DEFAULT 0,
  annual_reduction_tco2e NUMERIC(15,2) DEFAULT 0,
  cumulative_reduction_tco2e NUMERIC(15,2) DEFAULT 0,
  residual_emissions_tco2e NUMERIC(15,2) DEFAULT 0,
  reduction_percent_vs_baseline NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scenario_id, year)
);

-- Contributions de chaque levier par année
CREATE TABLE public.climate_scenario_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.climate_scenarios(id) ON DELETE CASCADE,
  scenario_lever_id UUID REFERENCES public.climate_scenario_levers(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  contribution_tco2e NUMERIC(15,2) DEFAULT 0,
  contribution_percent NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cibles par scénario
CREATE TABLE public.climate_scenario_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.climate_scenarios(id) ON DELETE CASCADE,
  target_year INTEGER NOT NULL,
  target_emissions_tco2e NUMERIC(15,2),
  target_reduction_percent NUMERIC(5,2),
  target_type TEXT DEFAULT 'internal', -- internal, sbti_15, sbti_2, net_zero, custom
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_scenario_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_climate_scenarios_updated_at BEFORE UPDATE ON public.climate_scenarios FOR EACH ROW EXECUTE FUNCTION update_scenario_updated_at();
CREATE TRIGGER trg_climate_scenario_levers_updated_at BEFORE UPDATE ON public.climate_scenario_levers FOR EACH ROW EXECUTE FUNCTION update_scenario_updated_at();
CREATE TRIGGER trg_climate_scenario_assumptions_updated_at BEFORE UPDATE ON public.climate_scenario_assumptions FOR EACH ROW EXECUTE FUNCTION update_scenario_updated_at();
CREATE TRIGGER trg_climate_scenario_results_updated_at BEFORE UPDATE ON public.climate_scenario_results FOR EACH ROW EXECUTE FUNCTION update_scenario_updated_at();

-- RLS
ALTER TABLE public.climate_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_scenario_levers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_scenario_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_scenario_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_scenario_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_scenario_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies: org members can CRUD
CREATE POLICY "Org members can manage scenarios" ON public.climate_scenarios FOR ALL TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage scenario levers" ON public.climate_scenario_levers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.climate_scenarios s WHERE s.id = scenario_id AND public.is_org_member(auth.uid(), s.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.climate_scenarios s WHERE s.id = scenario_id AND public.is_org_member(auth.uid(), s.organization_id)));

CREATE POLICY "Org members can manage scenario assumptions" ON public.climate_scenario_assumptions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.climate_scenario_levers l JOIN public.climate_scenarios s ON s.id = l.scenario_id WHERE l.id = scenario_lever_id AND public.is_org_member(auth.uid(), s.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.climate_scenario_levers l JOIN public.climate_scenarios s ON s.id = l.scenario_id WHERE l.id = scenario_lever_id AND public.is_org_member(auth.uid(), s.organization_id)));

CREATE POLICY "Org members can manage scenario results" ON public.climate_scenario_results FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.climate_scenarios s WHERE s.id = scenario_id AND public.is_org_member(auth.uid(), s.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.climate_scenarios s WHERE s.id = scenario_id AND public.is_org_member(auth.uid(), s.organization_id)));

CREATE POLICY "Org members can manage scenario contributions" ON public.climate_scenario_contributions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.climate_scenarios s WHERE s.id = scenario_id AND public.is_org_member(auth.uid(), s.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.climate_scenarios s WHERE s.id = scenario_id AND public.is_org_member(auth.uid(), s.organization_id)));

CREATE POLICY "Org members can manage scenario targets" ON public.climate_scenario_targets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.climate_scenarios s WHERE s.id = scenario_id AND public.is_org_member(auth.uid(), s.organization_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.climate_scenarios s WHERE s.id = scenario_id AND public.is_org_member(auth.uid(), s.organization_id)));
