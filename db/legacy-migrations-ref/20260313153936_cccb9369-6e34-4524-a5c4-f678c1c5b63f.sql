
-- ============================================
-- Module Feuille de route climat - Schema
-- ============================================

-- Table principale: Feuilles de route climat
CREATE TABLE public.climate_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  baseline_year INTEGER NOT NULL,
  target_year INTEGER NOT NULL,
  reduction_target_percent NUMERIC(5,2),
  baseline_emissions_tco2e NUMERIC(15,2),
  target_emissions_tco2e NUMERIC(15,2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leviers de réduction
CREATE TABLE public.climate_levers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.climate_roadmaps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  scope_concerned INTEGER[],
  site_id UUID,
  business_unit TEXT,
  source_emission_targeted TEXT,
  estimated_potential_reduction_tco2e NUMERIC(15,2) DEFAULT 0,
  estimated_cost NUMERIC(15,2) DEFAULT 0,
  complexity_level TEXT DEFAULT 'medium' CHECK (complexity_level IN ('low','medium','high','very_high')),
  implementation_duration_months INTEGER,
  maturity_level TEXT DEFAULT 'concept' CHECK (maturity_level IN ('concept','study','pilot','deployment','mature')),
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified','validated','in_progress','completed','abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Actions climat
CREATE TABLE public.climate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lever_id UUID NOT NULL REFERENCES public.climate_levers(id) ON DELETE CASCADE,
  roadmap_id UUID NOT NULL REFERENCES public.climate_roadmaps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  action_type TEXT DEFAULT 'reduction' CHECK (action_type IN ('reduction','substitution','efficiency','sobriety','compensation','other')),
  site_id UUID,
  business_unit TEXT,
  scope_concerned INTEGER[],
  source_emission_targeted TEXT,
  owner_user_id UUID REFERENCES auth.users(id),
  owner_name TEXT,
  contributors TEXT[],
  start_date DATE,
  target_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'to_launch' CHECK (status IN ('to_launch','studying','validated','in_progress','suspended','completed','abandoned')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  budget_estimated NUMERIC(15,2) DEFAULT 0,
  budget_actual NUMERIC(15,2) DEFAULT 0,
  expected_reduction_tco2e NUMERIC(15,2) DEFAULT 0,
  realized_reduction_tco2e NUMERIC(15,2) DEFAULT 0,
  expected_savings NUMERIC(15,2),
  realized_savings NUMERIC(15,2),
  indicator_name TEXT,
  indicator_target TEXT,
  indicator_actual TEXT,
  dependencies TEXT,
  risks TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jalons d'actions
CREATE TABLE public.climate_action_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.climate_actions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','overdue')),
  owner TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scores de priorisation
CREATE TABLE public.climate_priority_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.climate_actions(id) ON DELETE CASCADE UNIQUE,
  carbon_impact_score INTEGER DEFAULT 0 CHECK (carbon_impact_score >= 0 AND carbon_impact_score <= 5),
  cost_score INTEGER DEFAULT 0 CHECK (cost_score >= 0 AND cost_score <= 5),
  feasibility_score INTEGER DEFAULT 0 CHECK (feasibility_score >= 0 AND feasibility_score <= 5),
  speed_score INTEGER DEFAULT 0 CHECK (speed_score >= 0 AND speed_score <= 5),
  roi_score INTEGER DEFAULT 0 CHECK (roi_score >= 0 AND roi_score <= 5),
  regulatory_score INTEGER DEFAULT 0 CHECK (regulatory_score >= 0 AND regulatory_score <= 5),
  overall_score NUMERIC(4,2) GENERATED ALWAYS AS (
    (carbon_impact_score + cost_score + feasibility_score + speed_score + roi_score + regulatory_score)::NUMERIC / 6.0
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KPIs de suivi
CREATE TABLE public.climate_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.climate_roadmaps(id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  reporting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  baseline_emissions_tco2e NUMERIC(15,2) DEFAULT 0,
  target_emissions_tco2e NUMERIC(15,2) DEFAULT 0,
  realized_emissions_tco2e NUMERIC(15,2) DEFAULT 0,
  total_actions INTEGER DEFAULT 0,
  completed_actions INTEGER DEFAULT 0,
  delayed_actions INTEGER DEFAULT 0,
  total_budget NUMERIC(15,2) DEFAULT 0,
  consumed_budget NUMERIC(15,2) DEFAULT 0,
  expected_reduction_tco2e NUMERIC(15,2) DEFAULT 0,
  realized_reduction_tco2e NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_climate_roadmaps_org ON public.climate_roadmaps(organization_id);
CREATE INDEX idx_climate_levers_roadmap ON public.climate_levers(roadmap_id);
CREATE INDEX idx_climate_actions_roadmap ON public.climate_actions(roadmap_id);
CREATE INDEX idx_climate_actions_lever ON public.climate_actions(lever_id);
CREATE INDEX idx_climate_actions_status ON public.climate_actions(status);
CREATE INDEX idx_climate_milestones_action ON public.climate_action_milestones(action_id);
CREATE INDEX idx_climate_kpis_roadmap ON public.climate_kpis(roadmap_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_climate_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_climate_roadmaps_updated BEFORE UPDATE ON public.climate_roadmaps FOR EACH ROW EXECUTE FUNCTION public.update_climate_updated_at();
CREATE TRIGGER trg_climate_levers_updated BEFORE UPDATE ON public.climate_levers FOR EACH ROW EXECUTE FUNCTION public.update_climate_updated_at();
CREATE TRIGGER trg_climate_actions_updated BEFORE UPDATE ON public.climate_actions FOR EACH ROW EXECUTE FUNCTION public.update_climate_updated_at();
CREATE TRIGGER trg_climate_milestones_updated BEFORE UPDATE ON public.climate_action_milestones FOR EACH ROW EXECUTE FUNCTION public.update_climate_updated_at();
CREATE TRIGGER trg_climate_priority_updated BEFORE UPDATE ON public.climate_priority_scores FOR EACH ROW EXECUTE FUNCTION public.update_climate_updated_at();
CREATE TRIGGER trg_climate_kpis_updated BEFORE UPDATE ON public.climate_kpis FOR EACH ROW EXECUTE FUNCTION public.update_climate_updated_at();

-- RLS
ALTER TABLE public.climate_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_levers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_action_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_priority_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_kpis ENABLE ROW LEVEL SECURITY;

-- RLS Policies - based on organization membership
CREATE POLICY "Members can view roadmaps" ON public.climate_roadmaps FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins can manage roadmaps" ON public.climate_roadmaps FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members can view levers" ON public.climate_levers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_roadmaps r WHERE r.id = roadmap_id AND public.is_org_member(auth.uid(), r.organization_id)));
CREATE POLICY "Admins can manage levers" ON public.climate_levers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_roadmaps r WHERE r.id = roadmap_id AND public.is_org_admin(auth.uid(), r.organization_id)));

CREATE POLICY "Members can view actions" ON public.climate_actions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_roadmaps r WHERE r.id = roadmap_id AND public.is_org_member(auth.uid(), r.organization_id)));
CREATE POLICY "Admins can manage actions" ON public.climate_actions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_roadmaps r WHERE r.id = roadmap_id AND public.is_org_admin(auth.uid(), r.organization_id)));

CREATE POLICY "Members can view milestones" ON public.climate_action_milestones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_actions a JOIN public.climate_roadmaps r ON r.id = a.roadmap_id WHERE a.id = action_id AND public.is_org_member(auth.uid(), r.organization_id)));
CREATE POLICY "Admins can manage milestones" ON public.climate_action_milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_actions a JOIN public.climate_roadmaps r ON r.id = a.roadmap_id WHERE a.id = action_id AND public.is_org_admin(auth.uid(), r.organization_id)));

CREATE POLICY "Members can view priority scores" ON public.climate_priority_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_actions a JOIN public.climate_roadmaps r ON r.id = a.roadmap_id WHERE a.id = action_id AND public.is_org_member(auth.uid(), r.organization_id)));
CREATE POLICY "Admins can manage priority scores" ON public.climate_priority_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_actions a JOIN public.climate_roadmaps r ON r.id = a.roadmap_id WHERE a.id = action_id AND public.is_org_admin(auth.uid(), r.organization_id)));

CREATE POLICY "Members can view kpis" ON public.climate_kpis FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_roadmaps r WHERE r.id = roadmap_id AND public.is_org_member(auth.uid(), r.organization_id)));
CREATE POLICY "Admins can manage kpis" ON public.climate_kpis FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.climate_roadmaps r WHERE r.id = roadmap_id AND public.is_org_admin(auth.uid(), r.organization_id)));
