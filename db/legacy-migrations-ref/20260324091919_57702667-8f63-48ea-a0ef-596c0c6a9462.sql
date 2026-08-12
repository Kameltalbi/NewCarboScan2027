
-- Table simple pour facteurs custom par organisation (V2 évolutive)
CREATE TABLE IF NOT EXISTS public.invoice_emission_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('service', 'materiau', 'transport', 'autre')),
  factor NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, category)
);

ALTER TABLE public.invoice_emission_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage invoice factors"
  ON public.invoice_emission_factors FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
