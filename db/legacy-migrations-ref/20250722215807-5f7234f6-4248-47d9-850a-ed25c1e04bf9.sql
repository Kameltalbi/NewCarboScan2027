-- Ajouter les champs devise et chiffre d'affaires à la table companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS devise text DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS ca_annuel_devise numeric;