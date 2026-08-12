-- Ajouter une colonne pour le chiffre d'affaires par site
ALTER TABLE public.collect_sites 
ADD COLUMN IF NOT EXISTS annual_revenue numeric DEFAULT NULL;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN public.collect_sites.annual_revenue IS 'Chiffre d''affaires annuel du site (dans la devise de l''organisation)';