-- Create collect_sites table linked to companies
CREATE TABLE public.collect_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT, -- Code interne du site (ex: SITE-001)
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Tunisie',
  site_type TEXT, -- usine, bureau, entrepôt, magasin, etc.
  surface_m2 NUMERIC,
  employees_count INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_consolidated BOOLEAN NOT NULL DEFAULT true, -- Inclure dans les consolidations
  contact_name TEXT,
  contact_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collect_sites ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_collect_sites_company_id ON public.collect_sites(company_id);
CREATE INDEX idx_collect_sites_active ON public.collect_sites(is_active) WHERE is_active = true;

-- RLS Policies: Users can manage sites for their own companies
CREATE POLICY "Users can view sites for their companies"
  ON public.collect_sites
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sites for their companies"
  ON public.collect_sites
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sites for their companies"
  ON public.collect_sites
  FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sites for their companies"
  ON public.collect_sites
  FOR DELETE
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- Superadmin policy
CREATE POLICY "Superadmins can manage all sites"
  ON public.collect_sites
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_collect_sites_updated_at
  BEFORE UPDATE ON public.collect_sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add site_id to collect_responses for site-level data
ALTER TABLE public.collect_responses 
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.collect_sites(id) ON DELETE SET NULL;

CREATE INDEX idx_collect_responses_site_id ON public.collect_responses(site_id) WHERE site_id IS NOT NULL;