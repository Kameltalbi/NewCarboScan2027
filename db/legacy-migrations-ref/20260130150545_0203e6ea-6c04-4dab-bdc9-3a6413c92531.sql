-- Table pour stocker les surcharges des facteurs d'émission par organisation
CREATE TABLE IF NOT EXISTS public.organization_emission_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  base_factor_id UUID NOT NULL REFERENCES public.emission_factors(id) ON DELETE CASCADE,
  custom_value DECIMAL(15, 6) NOT NULL,
  custom_unit TEXT,
  custom_source TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, base_factor_id)
);

-- Enable RLS
ALTER TABLE public.organization_emission_factors ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can view their org's custom factors
CREATE POLICY "Users can view their organization custom factors"
  ON public.organization_emission_factors
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Organization admins can insert custom factors
CREATE POLICY "Admins can insert custom factors"
  ON public.organization_emission_factors
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policy: Organization admins can update custom factors
CREATE POLICY "Admins can update custom factors"
  ON public.organization_emission_factors
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policy: Organization admins can delete custom factors
CREATE POLICY "Admins can delete custom factors"
  ON public.organization_emission_factors
  FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_org_emission_factors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_emission_factors_timestamp
  BEFORE UPDATE ON public.organization_emission_factors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_emission_factors_updated_at();

-- Function to get emission factor with custom override
CREATE OR REPLACE FUNCTION public.get_emission_factor_for_org(
  p_organization_id UUID,
  p_factor_id UUID
)
RETURNS TABLE(
  factor_id UUID,
  factor_value DECIMAL(15, 6),
  factor_unit TEXT,
  factor_source TEXT,
  is_custom BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier l'accès à l'organisation
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  IF NOT public.is_org_member(auth.uid(), p_organization_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ef.id as factor_id,
    COALESCE(oef.custom_value, ef.emission_factor) as factor_value,
    COALESCE(oef.custom_unit, ef.unit) as factor_unit,
    COALESCE(oef.custom_source, ef.source) as factor_source,
    (oef.id IS NOT NULL) as is_custom
  FROM emission_factors ef
  LEFT JOIN organization_emission_factors oef 
    ON oef.base_factor_id = ef.id 
    AND oef.organization_id = p_organization_id
  WHERE ef.id = p_factor_id;
END;
$$;