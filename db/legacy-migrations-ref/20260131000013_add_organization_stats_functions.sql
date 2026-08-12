-- Migration : Fonctions SQL pour statistiques consolidées de l'organisation
-- Utilisé dans le Dashboard pour afficher les KPIs et intensités carbone

-- Fonction : Résumé des sites de l'organisation
CREATE OR REPLACE FUNCTION get_organization_sites_summary(org_id uuid)
RETURNS TABLE (
  total_sites bigint,
  active_sites bigint,
  sites_in_scope bigint,
  total_surface numeric,
  total_employees numeric,
  sites_with_scope3 bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_sites,
    COUNT(*) FILTER (WHERE is_active = true)::bigint AS active_sites,
    COUNT(*) FILTER (WHERE is_active = true AND in_scope = true)::bigint AS sites_in_scope,
    COALESCE(SUM(surface_m2) FILTER (WHERE is_active = true), 0)::numeric AS total_surface,
    COALESCE(SUM(employees_count) FILTER (WHERE is_active = true), 0)::numeric AS total_employees,
    COUNT(*) FILTER (WHERE is_active = true AND include_scope3 = true)::bigint AS sites_with_scope3
  FROM collect_sites
  WHERE company_id = org_id;
END;
$$;

-- Commentaire
COMMENT ON FUNCTION get_organization_sites_summary(uuid) IS 'Retourne le résumé des sites d''une organisation (nombre de sites, surface totale, employés totaux) pour le Dashboard et les rapports';

-- Permissions
GRANT EXECUTE ON FUNCTION get_organization_sites_summary(uuid) TO authenticated;
