
-- Table to track which years each organization has access to
CREATE TABLE public.organization_years (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  is_included BOOLEAN NOT NULL DEFAULT false, -- true = included free with subscription, false = paid extra
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, year)
);

-- Enable RLS
ALTER TABLE public.organization_years ENABLE ROW LEVEL SECURITY;

-- Superadmins can do everything
CREATE POLICY "Superadmins full access on organization_years"
ON public.organization_years
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Org members can read their org's years
CREATE POLICY "Org members can read their years"
ON public.organization_years
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

-- Create index for fast lookups
CREATE INDEX idx_organization_years_org_id ON public.organization_years(organization_id);
