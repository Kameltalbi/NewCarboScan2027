
-- Add CBAM mode toggle to studies
ALTER TABLE public.pcf_studies ADD COLUMN IF NOT EXISTS cbam_mode BOOLEAN NOT NULL DEFAULT false;

-- Create subcontracting table for delegated processes
CREATE TABLE public.pcf_subcontracting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  process_name TEXT NOT NULL,
  supplier_name TEXT,
  country TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  emission_factor_value NUMERIC,
  is_estimated BOOLEAN NOT NULL DEFAULT true,
  emissions_kg NUMERIC,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pcf_subcontracting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcf_subcontracting_select" ON public.pcf_subcontracting
  FOR SELECT TO authenticated
  USING (public.pcf_study_org_check(study_id));

CREATE POLICY "pcf_subcontracting_insert" ON public.pcf_subcontracting
  FOR INSERT TO authenticated
  WITH CHECK (public.pcf_study_org_check(study_id));

CREATE POLICY "pcf_subcontracting_update" ON public.pcf_subcontracting
  FOR UPDATE TO authenticated
  USING (public.pcf_study_org_check(study_id));

CREATE POLICY "pcf_subcontracting_delete" ON public.pcf_subcontracting
  FOR DELETE TO authenticated
  USING (public.pcf_study_org_check(study_id));

CREATE TRIGGER update_pcf_subcontracting_updated_at
  BEFORE UPDATE ON public.pcf_subcontracting
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();

-- Create co-product allocation table
CREATE TABLE public.pcf_co_product_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  allocation_method TEXT NOT NULL DEFAULT 'mass' CHECK (allocation_method IN ('mass', 'economic')),
  allocation_value NUMERIC NOT NULL DEFAULT 0,
  allocation_percentage NUMERIC NOT NULL DEFAULT 0,
  is_main_product BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pcf_co_product_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcf_co_product_select" ON public.pcf_co_product_allocations
  FOR SELECT TO authenticated
  USING (public.pcf_study_org_check(study_id));

CREATE POLICY "pcf_co_product_insert" ON public.pcf_co_product_allocations
  FOR INSERT TO authenticated
  WITH CHECK (public.pcf_study_org_check(study_id));

CREATE POLICY "pcf_co_product_update" ON public.pcf_co_product_allocations
  FOR UPDATE TO authenticated
  USING (public.pcf_study_org_check(study_id));

CREATE POLICY "pcf_co_product_delete" ON public.pcf_co_product_allocations
  FOR DELETE TO authenticated
  USING (public.pcf_study_org_check(study_id));

CREATE TRIGGER update_pcf_co_product_updated_at
  BEFORE UPDATE ON public.pcf_co_product_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();
