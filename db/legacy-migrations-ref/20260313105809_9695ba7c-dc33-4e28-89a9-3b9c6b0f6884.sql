
-- ============================================================
-- Module PCF (Product Carbon Footprint) - Tables principales
-- ============================================================

-- 1. Table principale des études PCF
CREATE TABLE public.pcf_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_category TEXT NOT NULL DEFAULT 'autre',
  description TEXT,
  sector TEXT,
  production_site TEXT,
  country TEXT DEFAULT 'Tunisie',
  electricity_mix TEXT DEFAULT 'tunisie',
  functional_unit TEXT NOT NULL DEFAULT '1 unité',
  perimeter_type TEXT NOT NULL DEFAULT 'cradle-to-gate' CHECK (perimeter_type IN ('cradle-to-gate', 'cradle-to-grave', 'cradle-to-cradle')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'calculated', 'locked')),
  total_emissions NUMERIC(15, 4),
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Bill of Materials (Composition du produit)
CREATE TABLE public.pcf_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  quantity NUMERIC(15, 4) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  supplier TEXT,
  country_origin TEXT,
  emission_factor_id UUID REFERENCES public.emission_factors(id),
  emission_factor_value NUMERIC(15, 6),
  is_estimated BOOLEAN NOT NULL DEFAULT false,
  emissions_kg NUMERIC(15, 4),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Transport (matières premières + distribution)
CREATE TABLE public.pcf_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  transport_type TEXT NOT NULL DEFAULT 'inbound' CHECK (transport_type IN ('inbound', 'distribution')),
  material_ref TEXT,
  mode TEXT NOT NULL DEFAULT 'road' CHECK (mode IN ('road', 'sea', 'air', 'rail', 'mixed')),
  distance_km NUMERIC(10, 2) NOT NULL,
  weight_kg NUMERIC(15, 4) NOT NULL,
  emission_factor_value NUMERIC(15, 6),
  is_estimated BOOLEAN NOT NULL DEFAULT false,
  emissions_kg NUMERIC(15, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Fabrication (énergie + procédés)
CREATE TABLE public.pcf_manufacturing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  energy_type TEXT NOT NULL,
  quantity NUMERIC(15, 4) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kWh',
  process_type TEXT,
  emission_factor_value NUMERIC(15, 6),
  is_estimated BOOLEAN NOT NULL DEFAULT false,
  emissions_kg NUMERIC(15, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Déchets de production
CREATE TABLE public.pcf_wastes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  waste_type TEXT NOT NULL,
  quantity_kg NUMERIC(15, 4) NOT NULL,
  treatment TEXT NOT NULL DEFAULT 'landfill' CHECK (treatment IN ('recycling', 'incineration', 'landfill')),
  emission_factor_value NUMERIC(15, 6),
  is_estimated BOOLEAN NOT NULL DEFAULT false,
  emissions_kg NUMERIC(15, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Emballage
CREATE TABLE public.pcf_packaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  material TEXT NOT NULL,
  weight_kg NUMERIC(15, 4) NOT NULL,
  emission_factor_value NUMERIC(15, 6),
  is_estimated BOOLEAN NOT NULL DEFAULT false,
  emissions_kg NUMERIC(15, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Phase d'utilisation
CREATE TABLE public.pcf_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  lifetime_years NUMERIC(6, 2),
  uses_per_year NUMERIC(10, 2),
  consumption_per_use NUMERIC(15, 4),
  consumption_unit TEXT DEFAULT 'kWh',
  emission_factor_value NUMERIC(15, 6),
  is_estimated BOOLEAN NOT NULL DEFAULT false,
  emissions_kg NUMERIC(15, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Fin de vie
CREATE TABLE public.pcf_end_of_life (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL DEFAULT 'landfill' CHECK (scenario IN ('recycling', 'incineration', 'landfill', 'reuse')),
  percentage NUMERIC(5, 2) NOT NULL DEFAULT 100,
  emission_factor_value NUMERIC(15, 6),
  is_estimated BOOLEAN NOT NULL DEFAULT false,
  emissions_kg NUMERIC(15, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Résultats calculés (avec versioning)
CREATE TABLE public.pcf_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  total_emissions NUMERIC(15, 4) NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  dominant_phase TEXT,
  data_quality JSONB DEFAULT '{"realData": 0, "estimatedData": 100}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculated_by UUID REFERENCES auth.users(id)
);

-- 10. Scénarios de comparaison
CREATE TABLE public.pcf_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_emissions NUMERIC(15, 4),
  reduction_pct NUMERIC(5, 2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Historique / Versions
CREATE TABLE public.pcf_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  comment TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id, version_number)
);

-- ============================================================
-- Indexes pour performance
-- ============================================================
CREATE INDEX idx_pcf_studies_org ON public.pcf_studies(organization_id);
CREATE INDEX idx_pcf_studies_status ON public.pcf_studies(status);
CREATE INDEX idx_pcf_materials_study ON public.pcf_materials(study_id);
CREATE INDEX idx_pcf_transport_study ON public.pcf_transport(study_id);
CREATE INDEX idx_pcf_manufacturing_study ON public.pcf_manufacturing(study_id);
CREATE INDEX idx_pcf_wastes_study ON public.pcf_wastes(study_id);
CREATE INDEX idx_pcf_packaging_study ON public.pcf_packaging(study_id);
CREATE INDEX idx_pcf_usage_study ON public.pcf_usage(study_id);
CREATE INDEX idx_pcf_end_of_life_study ON public.pcf_end_of_life(study_id);
CREATE INDEX idx_pcf_results_study ON public.pcf_results(study_id);
CREATE INDEX idx_pcf_scenarios_study ON public.pcf_scenarios(study_id);
CREATE INDEX idx_pcf_versions_study ON public.pcf_versions(study_id);

-- ============================================================
-- Triggers updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_pcf_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pcf_studies_updated_at BEFORE UPDATE ON public.pcf_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();
CREATE TRIGGER trg_pcf_materials_updated_at BEFORE UPDATE ON public.pcf_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();
CREATE TRIGGER trg_pcf_transport_updated_at BEFORE UPDATE ON public.pcf_transport
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();
CREATE TRIGGER trg_pcf_manufacturing_updated_at BEFORE UPDATE ON public.pcf_manufacturing
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();
CREATE TRIGGER trg_pcf_wastes_updated_at BEFORE UPDATE ON public.pcf_wastes
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();
CREATE TRIGGER trg_pcf_packaging_updated_at BEFORE UPDATE ON public.pcf_packaging
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();
CREATE TRIGGER trg_pcf_usage_updated_at BEFORE UPDATE ON public.pcf_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();
CREATE TRIGGER trg_pcf_end_of_life_updated_at BEFORE UPDATE ON public.pcf_end_of_life
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();
CREATE TRIGGER trg_pcf_scenarios_updated_at BEFORE UPDATE ON public.pcf_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.pcf_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_manufacturing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_wastes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_packaging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_end_of_life ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcf_versions ENABLE ROW LEVEL SECURITY;

-- pcf_studies: SELECT for org members, ALL for org admins
CREATE POLICY "pcf_studies_select" ON public.pcf_studies
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "pcf_studies_insert" ON public.pcf_studies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "pcf_studies_update" ON public.pcf_studies
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "pcf_studies_delete" ON public.pcf_studies
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Helper function for sub-tables RLS
CREATE OR REPLACE FUNCTION public.pcf_study_org_check(_study_id UUID)
  RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pcf_studies s
    WHERE s.id = _study_id
      AND public.is_org_member(auth.uid(), s.organization_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.pcf_study_admin_check(_study_id UUID)
  RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pcf_studies s
    WHERE s.id = _study_id
      AND public.is_org_admin(auth.uid(), s.organization_id)
  )
$$;

-- Macro pour les sous-tables : SELECT pour membres, INSERT/UPDATE pour membres, DELETE pour admins
-- pcf_materials
CREATE POLICY "pcf_materials_select" ON public.pcf_materials FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_materials_insert" ON public.pcf_materials FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_materials_update" ON public.pcf_materials FOR UPDATE TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_materials_delete" ON public.pcf_materials FOR DELETE TO authenticated USING (public.pcf_study_org_check(study_id));

-- pcf_transport
CREATE POLICY "pcf_transport_select" ON public.pcf_transport FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_transport_insert" ON public.pcf_transport FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_transport_update" ON public.pcf_transport FOR UPDATE TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_transport_delete" ON public.pcf_transport FOR DELETE TO authenticated USING (public.pcf_study_org_check(study_id));

-- pcf_manufacturing
CREATE POLICY "pcf_manufacturing_select" ON public.pcf_manufacturing FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_manufacturing_insert" ON public.pcf_manufacturing FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_manufacturing_update" ON public.pcf_manufacturing FOR UPDATE TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_manufacturing_delete" ON public.pcf_manufacturing FOR DELETE TO authenticated USING (public.pcf_study_org_check(study_id));

-- pcf_wastes
CREATE POLICY "pcf_wastes_select" ON public.pcf_wastes FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_wastes_insert" ON public.pcf_wastes FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_wastes_update" ON public.pcf_wastes FOR UPDATE TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_wastes_delete" ON public.pcf_wastes FOR DELETE TO authenticated USING (public.pcf_study_org_check(study_id));

-- pcf_packaging
CREATE POLICY "pcf_packaging_select" ON public.pcf_packaging FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_packaging_insert" ON public.pcf_packaging FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_packaging_update" ON public.pcf_packaging FOR UPDATE TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_packaging_delete" ON public.pcf_packaging FOR DELETE TO authenticated USING (public.pcf_study_org_check(study_id));

-- pcf_usage
CREATE POLICY "pcf_usage_select" ON public.pcf_usage FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_usage_insert" ON public.pcf_usage FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_usage_update" ON public.pcf_usage FOR UPDATE TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_usage_delete" ON public.pcf_usage FOR DELETE TO authenticated USING (public.pcf_study_org_check(study_id));

-- pcf_end_of_life
CREATE POLICY "pcf_end_of_life_select" ON public.pcf_end_of_life FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_end_of_life_insert" ON public.pcf_end_of_life FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_end_of_life_update" ON public.pcf_end_of_life FOR UPDATE TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_end_of_life_delete" ON public.pcf_end_of_life FOR DELETE TO authenticated USING (public.pcf_study_org_check(study_id));

-- pcf_results
CREATE POLICY "pcf_results_select" ON public.pcf_results FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_results_insert" ON public.pcf_results FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_results_update" ON public.pcf_results FOR UPDATE TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_results_delete" ON public.pcf_results FOR DELETE TO authenticated USING (public.pcf_study_admin_check(study_id));

-- pcf_scenarios
CREATE POLICY "pcf_scenarios_select" ON public.pcf_scenarios FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_scenarios_insert" ON public.pcf_scenarios FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_scenarios_update" ON public.pcf_scenarios FOR UPDATE TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_scenarios_delete" ON public.pcf_scenarios FOR DELETE TO authenticated USING (public.pcf_study_org_check(study_id));

-- pcf_versions
CREATE POLICY "pcf_versions_select" ON public.pcf_versions FOR SELECT TO authenticated USING (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_versions_insert" ON public.pcf_versions FOR INSERT TO authenticated WITH CHECK (public.pcf_study_org_check(study_id));
CREATE POLICY "pcf_versions_delete" ON public.pcf_versions FOR DELETE TO authenticated USING (public.pcf_study_admin_check(study_id));
