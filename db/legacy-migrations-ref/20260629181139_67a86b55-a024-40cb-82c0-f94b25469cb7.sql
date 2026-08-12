
-- Add external_id to meters (for mapping physical sensors)
ALTER TABLE public.wattbim_meters ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE INDEX IF NOT EXISTS idx_wattbim_meters_external_id ON public.wattbim_meters(organization_id, external_id);

-- API keys table
CREATE TABLE IF NOT EXISTS public.wattbim_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wattbim_api_keys_org ON public.wattbim_api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_wattbim_api_keys_hash ON public.wattbim_api_keys(key_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wattbim_api_keys TO authenticated;
GRANT ALL ON public.wattbim_api_keys TO service_role;

ALTER TABLE public.wattbim_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins view api keys" ON public.wattbim_api_keys
  FOR SELECT TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Org admins create api keys" ON public.wattbim_api_keys
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Org admins update api keys" ON public.wattbim_api_keys
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Org admins delete api keys" ON public.wattbim_api_keys
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));
