-- Migration : Refactorisation professionnelle de collect_sites
-- Objectif : Aligner avec l'architecture audit/cabinet et le rapport Bilan Carbone

-- 1. Ajouter organization_id si pas déjà présent
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collect_sites' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.collect_sites ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Migrer les données existantes : company_id → organization_id
UPDATE public.collect_sites cs
SET organization_id = c.organization_id
FROM public.companies c
WHERE cs.company_id = c.id
  AND cs.organization_id IS NULL;

-- 3. Renommer les colonnes pour cohérence métier
ALTER TABLE public.collect_sites 
  RENAME COLUMN surface_m2 TO surface;

ALTER TABLE public.collect_sites 
  RENAME COLUMN employees_count TO employees;

ALTER TABLE public.collect_sites 
  RENAME COLUMN is_consolidated TO included_in_carbon_scope;

-- 4. Ajouter les champs manquants pour l'audit professionnel
ALTER TABLE public.collect_sites 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS commissioning_year INTEGER,
  ADD COLUMN IF NOT EXISTS scope1_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS scope2_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS scope3_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS governorate TEXT, -- Gouvernorat (Tunisie) ou région
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS deactivation_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- 5. Ajouter des contraintes métier
ALTER TABLE public.collect_sites 
  ADD CONSTRAINT check_surface_positive CHECK (surface IS NULL OR surface > 0),
  ADD CONSTRAINT check_employees_positive CHECK (employees IS NULL OR employees >= 0),
  ADD CONSTRAINT check_commissioning_year_valid CHECK (commissioning_year IS NULL OR (commissioning_year >= 1900 AND commissioning_year <= 2100));

-- 6. Créer des index pour performance
CREATE INDEX IF NOT EXISTS idx_collect_sites_organization_id ON public.collect_sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_collect_sites_active ON public.collect_sites(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_collect_sites_carbon_scope ON public.collect_sites(included_in_carbon_scope) WHERE included_in_carbon_scope = true;
CREATE INDEX IF NOT EXISTS idx_collect_sites_type ON public.collect_sites(site_type);

-- 7. Créer une vue pour le rapport (sites inclus dans le périmètre)
CREATE OR REPLACE VIEW public.report_sites_scope AS
SELECT 
  cs.id,
  cs.organization_id,
  cs.name,
  cs.site_type,
  cs.city,
  cs.governorate,
  cs.country,
  cs.surface,
  cs.employees,
  cs.scope1_enabled,
  cs.scope2_enabled,
  cs.scope3_enabled,
  cs.commissioning_year,
  cs.description
FROM public.collect_sites cs
WHERE cs.is_active = true 
  AND cs.included_in_carbon_scope = true
ORDER BY cs.name;

-- 8. Fonction helper pour obtenir le résumé des sites d'une organisation
CREATE OR REPLACE FUNCTION public.get_organization_sites_summary(org_id uuid)
RETURNS TABLE (
  total_sites bigint,
  active_sites bigint,
  sites_in_scope bigint,
  total_surface numeric,
  total_employees bigint,
  sites_with_scope3 bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_sites,
    COUNT(*) FILTER (WHERE is_active = true)::bigint as active_sites,
    COUNT(*) FILTER (WHERE is_active = true AND included_in_carbon_scope = true)::bigint as sites_in_scope,
    COALESCE(SUM(surface) FILTER (WHERE is_active = true AND included_in_carbon_scope = true), 0) as total_surface,
    COALESCE(SUM(employees) FILTER (WHERE is_active = true AND included_in_carbon_scope = true), 0)::bigint as total_employees,
    COUNT(*) FILTER (WHERE is_active = true AND included_in_carbon_scope = true AND scope3_enabled = true)::bigint as sites_with_scope3
  FROM public.collect_sites
  WHERE organization_id = org_id;
END;
$$;

-- 9. Mettre à jour les RLS (si nécessaire)
DROP POLICY IF EXISTS "Users can view sites from their organization" ON public.collect_sites;
CREATE POLICY "Users can view sites from their organization"
  ON public.collect_sites
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage sites from their organization" ON public.collect_sites;
CREATE POLICY "Users can manage sites from their organization"
  ON public.collect_sites
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 10. Commentaires pour documentation
COMMENT ON TABLE public.collect_sites IS 'Sites physiques ou fonctionnels de l''organisation - Base unique pour bilan carbone, collecte et reporting';
COMMENT ON COLUMN public.collect_sites.organization_id IS 'Organisation propriétaire du site';
COMMENT ON COLUMN public.collect_sites.included_in_carbon_scope IS 'Site inclus dans le périmètre du bilan carbone (remplace is_consolidated)';
COMMENT ON COLUMN public.collect_sites.scope1_enabled IS 'Scope 1 activé pour ce site';
COMMENT ON COLUMN public.collect_sites.scope2_enabled IS 'Scope 2 activé pour ce site';
COMMENT ON COLUMN public.collect_sites.scope3_enabled IS 'Scope 3 activé pour ce site';
COMMENT ON COLUMN public.collect_sites.commissioning_year IS 'Année de mise en service du site';
COMMENT ON COLUMN public.collect_sites.deactivation_date IS 'Date de désactivation (historique, ne pas supprimer)';
COMMENT ON VIEW public.report_sites_scope IS 'Vue des sites inclus dans le périmètre carbone pour génération de rapports';
COMMENT ON FUNCTION public.get_organization_sites_summary IS 'Résumé statistique des sites d''une organisation pour le rapport';
