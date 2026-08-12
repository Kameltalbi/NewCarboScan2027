-- Fix: Corriger la fonction pour utiliser la relation organizations -> companies -> collect_sites
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
DECLARE
  v_company_id uuid;
BEGIN
  -- Trouver le company_id lié à l'organization via user_id
  SELECT c.id INTO v_company_id
  FROM organizations o
  JOIN companies c ON c.user_id = o.user_id
  WHERE o.id = org_id
  LIMIT 1;
  
  -- Si pas de company trouvé, essayer directement avec l'org_id comme company_id (fallback)
  IF v_company_id IS NULL THEN
    v_company_id := org_id;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_sites,
    COUNT(*) FILTER (WHERE cs.is_active = true)::bigint AS active_sites,
    COUNT(*) FILTER (WHERE cs.is_active = true)::bigint AS sites_in_scope,
    COALESCE(SUM(cs.surface_m2) FILTER (WHERE cs.is_active = true), 0)::numeric AS total_surface,
    COALESCE(SUM(cs.employees_count) FILTER (WHERE cs.is_active = true), 0)::numeric AS total_employees,
    0::bigint AS sites_with_scope3
  FROM collect_sites cs
  WHERE cs.company_id = v_company_id;
END;
$$;

-- Commentaire mis à jour
COMMENT ON FUNCTION get_organization_sites_summary(uuid) IS 'Retourne le résumé des sites d''une organisation en utilisant la liaison organizations -> companies -> collect_sites';