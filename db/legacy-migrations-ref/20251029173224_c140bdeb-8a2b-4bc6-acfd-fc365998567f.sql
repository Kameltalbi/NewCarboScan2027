-- 1) Enum pour rôles d'organisation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_member_role') THEN
    CREATE TYPE public.org_member_role AS ENUM ('owner','admin','member');
  END IF;
END $$;

-- 2) Table des appartenances organisationnelles (multi-tenant)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_member_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- Index pour accélérer les filtres
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);

-- 3) RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4) Fonctions utilitaires pour RLS
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org_id AND m.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id AND o.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id AND o.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org_id AND m.user_id = _user_id AND m.role IN ('owner','admin')
  );
$$;

-- 5) Politiques
DROP POLICY IF EXISTS "Superadmins manage all org memberships" ON public.organization_members;
CREATE POLICY "Superadmins manage all org memberships"
ON public.organization_members
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Members can view their org memberships" ON public.organization_members;
CREATE POLICY "Members can view their org memberships"
ON public.organization_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can insert memberships" ON public.organization_members;
CREATE POLICY "Org admins can insert memberships"
ON public.organization_members
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can update memberships" ON public.organization_members;
CREATE POLICY "Org admins can update memberships"
ON public.organization_members
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can delete memberships" ON public.organization_members;
CREATE POLICY "Org admins can delete memberships"
ON public.organization_members
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));