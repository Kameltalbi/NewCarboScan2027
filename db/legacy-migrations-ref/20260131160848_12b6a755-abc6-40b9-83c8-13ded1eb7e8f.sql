-- Renforcer les politiques RLS sur la table profiles pour bloquer explicitement l'accès anonyme
-- Supprimer les anciennes politiques qui ne spécifient pas de rôle

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.profiles;

-- Recréer les politiques en spécifiant explicitement le rôle 'authenticated'
-- Cela bloque tout accès anonyme

CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Recréer la politique superadmin avec rôle authenticated explicite
CREATE POLICY "Superadmins can view all profiles"
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

-- Également renforcer la table companies pour les données financières sensibles
DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON public.companies;
DROP POLICY IF EXISTS "Superadmins can view all companies" ON public.companies;

CREATE POLICY "Authenticated users can view their own companies" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own companies" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own companies" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own companies" 
ON public.companies 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all companies"
ON public.companies 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));