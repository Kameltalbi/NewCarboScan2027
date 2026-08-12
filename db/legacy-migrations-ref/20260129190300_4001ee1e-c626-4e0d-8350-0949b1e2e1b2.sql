-- Ajouter les colonnes manquantes à la table organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Tunisie',
ADD COLUMN IF NOT EXISTS sector TEXT,
ADD COLUMN IF NOT EXISTS reference_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS energy_unit TEXT DEFAULT 'kWh',
ADD COLUMN IF NOT EXISTS mass_unit TEXT DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS distance_unit TEXT DEFAULT 'km',
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Créer un index pour la recherche par user_id
CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON public.organizations(user_id);

-- Mettre à jour les politiques RLS pour permettre la mise à jour
DROP POLICY IF EXISTS "Users can update their own organization" ON public.organizations;
CREATE POLICY "Users can update their own organization"
ON public.organizations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own organization" ON public.organizations;
CREATE POLICY "Users can insert their own organization"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() = user_id);