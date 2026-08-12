-- Modifier organization_emission_factors pour permettre base_factor_id nullable
-- (pour les facteurs créés par l'utilisateur sans base)
ALTER TABLE public.organization_emission_factors 
  ALTER COLUMN base_factor_id DROP NOT NULL;

-- Supprimer la policy SELECT publique sur emission_factors
DROP POLICY IF EXISTS "Authenticated users can view emission factors" ON public.emission_factors;

-- Créer une policy restrictive - seuls les superadmins peuvent voir les FE de base
CREATE POLICY "Only superadmins can view base emission factors" 
  ON public.emission_factors 
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Policy pour permettre aux superadmins de gérer les FE
CREATE POLICY "Superadmins can manage emission factors" 
  ON public.emission_factors 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Mettre à jour la policy INSERT pour organization_emission_factors
-- pour permettre l'insertion sans base_factor_id
DROP POLICY IF EXISTS "Organization members can insert custom factors" ON public.organization_emission_factors;
DROP POLICY IF EXISTS "Organization admins can insert custom factors" ON public.organization_emission_factors;

CREATE POLICY "Organization admins can insert custom factors" 
  ON public.organization_emission_factors 
  FOR INSERT 
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );