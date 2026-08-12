-- Enum pour les stratégies d'allocation des émissions
CREATE TYPE public.allocation_strategy_enum AS ENUM (
  'real_data',        -- Données réelles par site
  'allocation_key',   -- Clé de répartition (%, effectif, CA...)
  'consolidated_only' -- Consolidé uniquement, pas de répartition
);

-- Enum pour le type de clé de répartition
CREATE TYPE public.allocation_key_type_enum AS ENUM (
  'employees',        -- Répartition par effectif
  'revenue',          -- Répartition par chiffre d'affaires
  'surface',          -- Répartition par surface
  'manual'            -- Répartition manuelle (% libres)
);

-- Table de configuration de la stratégie d'allocation par scope
CREATE TABLE public.site_allocation_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope INTEGER NOT NULL CHECK (scope IN (1, 2, 3)),
  strategy public.allocation_strategy_enum NOT NULL DEFAULT 'real_data',
  allocation_key_type public.allocation_key_type_enum DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (organization_id, scope)
);

-- Table des pourcentages d'allocation par site (utilisé quand strategy = 'allocation_key')
CREATE TABLE public.site_allocation_percentages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.collect_sites(id) ON DELETE CASCADE,
  scope INTEGER NOT NULL CHECK (scope IN (1, 2, 3)),
  allocation_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, site_id, scope)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_site_allocation_config_org ON public.site_allocation_config(organization_id);
CREATE INDEX idx_site_allocation_percentages_org ON public.site_allocation_percentages(organization_id);
CREATE INDEX idx_site_allocation_percentages_site ON public.site_allocation_percentages(site_id);

-- Enable RLS
ALTER TABLE public.site_allocation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_allocation_percentages ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour site_allocation_config
CREATE POLICY "Users can view their org allocation config"
  ON public.site_allocation_config
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can manage allocation config"
  ON public.site_allocation_config
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies pour site_allocation_percentages
CREATE POLICY "Users can view their org allocation percentages"
  ON public.site_allocation_percentages
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can manage allocation percentages"
  ON public.site_allocation_percentages
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_site_allocation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_allocation_config_updated_at
  BEFORE UPDATE ON public.site_allocation_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_site_allocation_updated_at();

CREATE TRIGGER update_site_allocation_percentages_updated_at
  BEFORE UPDATE ON public.site_allocation_percentages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_site_allocation_updated_at();

-- Fonction pour valider que les pourcentages totalisent 100%
CREATE OR REPLACE FUNCTION public.validate_allocation_percentages(p_organization_id UUID, p_scope INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(allocation_percentage), 0) INTO v_total
  FROM site_allocation_percentages
  WHERE organization_id = p_organization_id AND scope = p_scope;
  
  RETURN ABS(v_total - 100) < 0.01; -- Tolérance de 0.01%
END;
$$;

-- Fonction pour récupérer la configuration d'allocation d'une organisation
CREATE OR REPLACE FUNCTION public.get_site_allocation_config(p_organization_id UUID)
RETURNS TABLE(
  scope INTEGER,
  strategy public.allocation_strategy_enum,
  allocation_key_type public.allocation_key_type_enum
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier l'accès
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  IF NOT public.is_org_member(auth.uid(), p_organization_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT sac.scope, sac.strategy, sac.allocation_key_type
  FROM site_allocation_config sac
  WHERE sac.organization_id = p_organization_id
  ORDER BY sac.scope;
END;
$$;

-- Fonction pour récupérer les pourcentages d'allocation des sites
CREATE OR REPLACE FUNCTION public.get_site_allocation_percentages(p_organization_id UUID, p_scope INTEGER DEFAULT NULL)
RETURNS TABLE(
  site_id UUID,
  site_name TEXT,
  scope INTEGER,
  allocation_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier l'accès
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  IF NOT public.is_org_member(auth.uid(), p_organization_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    sap.site_id,
    cs.name::TEXT as site_name,
    sap.scope,
    sap.allocation_percentage
  FROM site_allocation_percentages sap
  JOIN collect_sites cs ON cs.id = sap.site_id
  WHERE sap.organization_id = p_organization_id
    AND (p_scope IS NULL OR sap.scope = p_scope)
  ORDER BY cs.name;
END;
$$;

-- Fonction pour sauvegarder la configuration d'allocation
CREATE OR REPLACE FUNCTION public.save_site_allocation_config(
  p_organization_id UUID,
  p_scope INTEGER,
  p_strategy public.allocation_strategy_enum,
  p_allocation_key_type public.allocation_key_type_enum DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config_id UUID;
BEGIN
  -- Vérifier l'accès admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT public.is_org_admin(auth.uid(), p_organization_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  INSERT INTO site_allocation_config (organization_id, scope, strategy, allocation_key_type, created_by)
  VALUES (p_organization_id, p_scope, p_strategy, p_allocation_key_type, auth.uid())
  ON CONFLICT (organization_id, scope) DO UPDATE SET
    strategy = EXCLUDED.strategy,
    allocation_key_type = EXCLUDED.allocation_key_type,
    updated_at = now()
  RETURNING id INTO v_config_id;
  
  RETURN v_config_id;
END;
$$;

-- Fonction pour sauvegarder les pourcentages d'allocation
CREATE OR REPLACE FUNCTION public.save_site_allocation_percentage(
  p_organization_id UUID,
  p_site_id UUID,
  p_scope INTEGER,
  p_percentage NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Vérifier l'accès admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT public.is_org_admin(auth.uid(), p_organization_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  INSERT INTO site_allocation_percentages (organization_id, site_id, scope, allocation_percentage)
  VALUES (p_organization_id, p_site_id, p_scope, p_percentage)
  ON CONFLICT (organization_id, site_id, scope) DO UPDATE SET
    allocation_percentage = EXCLUDED.allocation_percentage,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;