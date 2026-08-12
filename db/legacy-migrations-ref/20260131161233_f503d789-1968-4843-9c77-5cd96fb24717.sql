-- Sécuriser la table training_registrations contre les accès anonymes
-- Supprimer l'ancienne politique INSERT trop permissive

DROP POLICY IF EXISTS "Users can insert training registrations" ON public.training_registrations;
DROP POLICY IF EXISTS "Users can view their own training registrations" ON public.training_registrations;

-- Recréer les politiques avec authentification obligatoire
-- INSERT: Uniquement les utilisateurs authentifiés peuvent s'inscrire
CREATE POLICY "Authenticated users can insert training registrations" 
ON public.training_registrations 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND email IS NOT NULL 
  AND full_name IS NOT NULL
  AND length(email) >= 5
  AND length(full_name) >= 2
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- SELECT: Les utilisateurs peuvent voir leurs propres inscriptions
CREATE POLICY "Authenticated users can view their own training registrations" 
ON public.training_registrations 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- UPDATE: Les utilisateurs peuvent modifier leurs propres inscriptions
CREATE POLICY "Authenticated users can update their own training registrations" 
ON public.training_registrations 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Les utilisateurs peuvent supprimer leurs propres inscriptions
CREATE POLICY "Authenticated users can delete their own training registrations" 
ON public.training_registrations 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Superadmins peuvent tout gérer
CREATE POLICY "Superadmins can manage all training registrations"
ON public.training_registrations 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));