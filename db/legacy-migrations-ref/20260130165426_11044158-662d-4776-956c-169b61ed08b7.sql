-- Table pour les overrides de permissions par utilisateur
CREATE TABLE public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(organization_id, user_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Policies: Org admins can manage permission overrides
CREATE POLICY "Org admins can view permission overrides"
ON public.user_permission_overrides
FOR SELECT
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'superadmin')
  OR user_id = auth.uid()
);

CREATE POLICY "Org admins can insert permission overrides"
ON public.user_permission_overrides
FOR INSERT
WITH CHECK (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Org admins can update permission overrides"
ON public.user_permission_overrides
FOR UPDATE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Org admins can delete permission overrides"
ON public.user_permission_overrides
FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'superadmin')
);

-- Index for fast lookups
CREATE INDEX idx_user_permission_overrides_user ON public.user_permission_overrides(user_id, organization_id);
CREATE INDEX idx_user_permission_overrides_org ON public.user_permission_overrides(organization_id);