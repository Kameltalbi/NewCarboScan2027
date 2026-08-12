ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pilot_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT;

COMMENT ON COLUMN public.organizations.pilot_name IS 'Nom du pilote de la démarche Bilan Carbone®, affiché dans la section gouvernance du rapport';
COMMENT ON COLUMN public.organizations.legal_name IS 'Dénomination complète de l''organisation à utiliser dans le rapport (remplace l''acronyme si renseigné)';