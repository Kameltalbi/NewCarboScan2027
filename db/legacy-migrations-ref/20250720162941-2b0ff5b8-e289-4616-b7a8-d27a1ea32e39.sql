-- Créer la table des organisations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
  max_users INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Créer la table des rôles utilisateur dans les organisations
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Modifier la table profiles pour référencer l'organisation
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id),
DROP COLUMN company_name;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Fonction pour obtenir l'organisation de l'utilisateur
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- Fonction pour vérifier le rôle de l'utilisateur
CREATE OR REPLACE FUNCTION public.has_organization_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = auth.uid() 
    AND (
      role = required_role OR
      (required_role = 'member' AND role IN ('admin', 'owner')) OR
      (required_role = 'admin' AND role = 'owner')
    )
  );
$$;

-- Politiques RLS pour organizations
CREATE POLICY "Users can view their organization" 
ON public.organizations FOR SELECT 
USING (id = public.get_user_organization_id());

CREATE POLICY "Organization owners can update organization" 
ON public.organizations FOR UPDATE 
USING (id = public.get_user_organization_id() AND public.has_organization_role('owner'));

-- Politiques RLS pour organization_members
CREATE POLICY "Members can view organization members" 
ON public.organization_members FOR SELECT 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can manage members" 
ON public.organization_members FOR ALL 
USING (organization_id = public.get_user_organization_id() AND public.has_organization_role('admin'));

-- Mettre à jour les politiques des autres tables pour utiliser l'organisation
DROP POLICY IF EXISTS "Users can view their own questionnaire responses" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Users can create their own questionnaire responses" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "Users can update their own questionnaire responses" ON public.questionnaire_responses;

CREATE POLICY "Organization members can view questionnaire responses" 
ON public.questionnaire_responses FOR SELECT 
USING (user_id IN (
  SELECT user_id FROM public.organization_members 
  WHERE organization_id = public.get_user_organization_id()
));

CREATE POLICY "Users can create questionnaire responses" 
ON public.questionnaire_responses FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own questionnaire responses" 
ON public.questionnaire_responses FOR UPDATE 
USING (user_id = auth.uid());

-- Même chose pour carbon_assessments
DROP POLICY IF EXISTS "Users can view their own carbon assessments" ON public.carbon_assessments;
DROP POLICY IF EXISTS "Users can create their own carbon assessments" ON public.carbon_assessments;
DROP POLICY IF EXISTS "Users can update their own carbon assessments" ON public.carbon_assessments;

CREATE POLICY "Organization members can view carbon assessments" 
ON public.carbon_assessments FOR SELECT 
USING (user_id IN (
  SELECT user_id FROM public.organization_members 
  WHERE organization_id = public.get_user_organization_id()
));

CREATE POLICY "Users can create carbon assessments" 
ON public.carbon_assessments FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own carbon assessments" 
ON public.carbon_assessments FOR UPDATE 
USING (user_id = auth.uid());

-- Triggers pour les timestamps
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();