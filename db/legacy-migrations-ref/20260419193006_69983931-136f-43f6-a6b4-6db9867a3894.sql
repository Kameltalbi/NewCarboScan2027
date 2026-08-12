-- Ajouter colonnes de versioning aux facteurs d'émission
ALTER TABLE public.emission_factors
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.emission_factors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

-- Index pour requêtes rapides sur les FE actifs
CREATE INDEX IF NOT EXISTS idx_emission_factors_is_active 
  ON public.emission_factors (is_active) 
  WHERE is_active = true;

-- Index unique partiel : empêche les doublons dans ADEME v23.9
CREATE UNIQUE INDEX IF NOT EXISTS emission_factors_unique_ademe_v239 
  ON public.emission_factors (factor_name, year)
  WHERE source = 'ADEME Base Carbone v23.9';

-- Bucket privé pour héberger le JSON d'import (Superadmin only)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

-- Policies RLS : seuls les superadmins peuvent gérer le bucket imports
CREATE POLICY "Superadmins can view imports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'imports' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can upload imports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'imports' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update imports"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'imports' AND public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete imports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'imports' AND public.has_role(auth.uid(), 'superadmin'));