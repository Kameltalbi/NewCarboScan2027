
-- Table des installations industrielles
CREATE TABLE public.cbam_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  address TEXT,
  sector TEXT NOT NULL,
  annual_capacity NUMERIC,
  reference_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des produits CBAM (catalogue)
CREATE TABLE public.cbam_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cn_code TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'tonnes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table de liaison installation-produit
CREATE TABLE public.cbam_installation_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.cbam_installations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.cbam_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(installation_id, product_id)
);

-- Table production trimestrielle
CREATE TABLE public.cbam_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.cbam_installations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.cbam_products(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'tonnes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(installation_id, product_id, year, quarter)
);

-- Table consommation énergie
CREATE TABLE public.cbam_energy_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.cbam_installations(id) ON DELETE CASCADE,
  energy_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  emission_factor NUMERIC NOT NULL DEFAULT 0,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table consommation électricité
CREATE TABLE public.cbam_electricity_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.cbam_installations(id) ON DELETE CASCADE,
  electricity_kwh NUMERIC NOT NULL DEFAULT 0,
  country_emission_factor NUMERIC NOT NULL DEFAULT 0,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table résumé des émissions
CREATE TABLE public.cbam_emissions_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.cbam_installations(id) ON DELETE CASCADE,
  direct_emissions NUMERIC NOT NULL DEFAULT 0,
  indirect_emissions NUMERIC NOT NULL DEFAULT 0,
  total_emissions NUMERIC NOT NULL DEFAULT 0,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(installation_id, year, quarter)
);

-- Table allocation des émissions aux produits
CREATE TABLE public.cbam_emission_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.cbam_installations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.cbam_products(id) ON DELETE CASCADE,
  allocation_method TEXT NOT NULL DEFAULT 'mass_based' CHECK (allocation_method IN ('mass_based', 'energy_based', 'economic_value')),
  allocated_emissions NUMERIC NOT NULL DEFAULT 0,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des exportations
CREATE TABLE public.cbam_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.cbam_installations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.cbam_products(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  quantity_exported NUMERIC NOT NULL DEFAULT 0,
  export_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table émissions par lot exporté
CREATE TABLE public.cbam_shipment_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID NOT NULL REFERENCES public.cbam_exports(id) ON DELETE CASCADE,
  emissions_per_ton NUMERIC NOT NULL DEFAULT 0,
  total_emissions NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cbam_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbam_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbam_installation_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbam_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbam_energy_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbam_electricity_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbam_emissions_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbam_emission_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbam_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbam_shipment_emissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for cbam_installations (org-based)
CREATE POLICY "org_members_select_installations" ON public.cbam_installations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_admins_insert_installations" ON public.cbam_installations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_admins_update_installations" ON public.cbam_installations
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org_admins_delete_installations" ON public.cbam_installations
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- RLS for cbam_products (read by all authenticated, catalog)
CREATE POLICY "authenticated_select_products" ON public.cbam_products
  FOR SELECT TO authenticated USING (true);

-- RLS for installation_products (via installation org)
CREATE POLICY "org_members_select_inst_products" ON public.cbam_installation_products
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbam_installations i WHERE i.id = installation_id AND public.is_org_member(auth.uid(), i.organization_id)));

CREATE POLICY "org_members_manage_inst_products" ON public.cbam_installation_products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbam_installations i WHERE i.id = installation_id AND public.is_org_member(auth.uid(), i.organization_id)));

-- RLS for production, energy, electricity, emissions_summary, allocation (via installation org)
CREATE POLICY "org_members_all_production" ON public.cbam_production
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbam_installations i WHERE i.id = installation_id AND public.is_org_member(auth.uid(), i.organization_id)));

CREATE POLICY "org_members_all_energy" ON public.cbam_energy_consumption
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbam_installations i WHERE i.id = installation_id AND public.is_org_member(auth.uid(), i.organization_id)));

CREATE POLICY "org_members_all_electricity" ON public.cbam_electricity_consumption
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbam_installations i WHERE i.id = installation_id AND public.is_org_member(auth.uid(), i.organization_id)));

CREATE POLICY "org_members_all_emissions_summary" ON public.cbam_emissions_summary
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbam_installations i WHERE i.id = installation_id AND public.is_org_member(auth.uid(), i.organization_id)));

CREATE POLICY "org_members_all_allocation" ON public.cbam_emission_allocation
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbam_installations i WHERE i.id = installation_id AND public.is_org_member(auth.uid(), i.organization_id)));

CREATE POLICY "org_members_all_exports" ON public.cbam_exports
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbam_installations i WHERE i.id = installation_id AND public.is_org_member(auth.uid(), i.organization_id)));

CREATE POLICY "org_members_all_shipment_emissions" ON public.cbam_shipment_emissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbam_exports e JOIN public.cbam_installations i ON i.id = e.installation_id WHERE e.id = export_id AND public.is_org_member(auth.uid(), i.organization_id)));

-- Seed cbam_products with main CBAM products
INSERT INTO public.cbam_products (cn_code, name, sector, unit) VALUES
  ('7206-7229', 'Acier', 'Fer & Acier', 'tonnes'),
  ('7301-7326', 'Structures métalliques', 'Fer & Acier', 'tonnes'),
  ('7601-7616', 'Aluminium', 'Aluminium', 'tonnes'),
  ('2523', 'Ciment', 'Ciment', 'tonnes'),
  ('3102-3105', 'Engrais', 'Engrais', 'tonnes'),
  ('2804 10 00', 'Hydrogène', 'Hydrogène', 'tonnes'),
  ('2716', 'Électricité', 'Électricité', 'MWh');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_cbam_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER cbam_installations_updated_at BEFORE UPDATE ON public.cbam_installations FOR EACH ROW EXECUTE FUNCTION public.update_cbam_updated_at();
CREATE TRIGGER cbam_production_updated_at BEFORE UPDATE ON public.cbam_production FOR EACH ROW EXECUTE FUNCTION public.update_cbam_updated_at();
CREATE TRIGGER cbam_energy_updated_at BEFORE UPDATE ON public.cbam_energy_consumption FOR EACH ROW EXECUTE FUNCTION public.update_cbam_updated_at();
CREATE TRIGGER cbam_electricity_updated_at BEFORE UPDATE ON public.cbam_electricity_consumption FOR EACH ROW EXECUTE FUNCTION public.update_cbam_updated_at();
CREATE TRIGGER cbam_emissions_summary_updated_at BEFORE UPDATE ON public.cbam_emissions_summary FOR EACH ROW EXECUTE FUNCTION public.update_cbam_updated_at();
CREATE TRIGGER cbam_allocation_updated_at BEFORE UPDATE ON public.cbam_emission_allocation FOR EACH ROW EXECUTE FUNCTION public.update_cbam_updated_at();
CREATE TRIGGER cbam_exports_updated_at BEFORE UPDATE ON public.cbam_exports FOR EACH ROW EXECUTE FUNCTION public.update_cbam_updated_at();
