-- Sécuriser les fonctions SECURITY DEFINER avec vérification d'autorisation

-- 1. can_create_assessment - Vérifier que l'utilisateur demande pour lui-même
CREATE OR REPLACE FUNCTION public.can_create_assessment(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Vérifier que le caller demande pour son propre compte
    CASE WHEN auth.uid() IS NULL OR auth.uid() != _user_id THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_subscriptions us
      JOIN public.orders o ON o.user_id = us.user_id
      WHERE us.user_id = _user_id
        AND us.status = 'active'
        AND o.status = 'validated'
        AND us.assessments_used < us.assessments_limit
        AND (us.expires_at IS NULL OR us.expires_at > now())
    )
    END
$$;

-- 2. increment_assessment_usage - Vérifier que l'utilisateur modifie son propre compte
CREATE OR REPLACE FUNCTION public.increment_assessment_usage(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que le caller modifie son propre compte
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify another user''s data';
  END IF;
  
  UPDATE public.user_subscriptions 
  SET assessments_used = assessments_used + 1,
      updated_at = now()
  WHERE user_id = _user_id 
    AND status = 'active';
END;
$$;

-- 3. get_assessment_usage - Vérifier que l'utilisateur accède à ses propres données
CREATE OR REPLACE FUNCTION public.get_assessment_usage(_user_id uuid)
RETURNS TABLE(assessments_used integer, assessments_limit integer, assessments_remaining integer, can_create_new boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record RECORD;
  has_valid_subscription BOOLEAN := FALSE;
BEGIN
  -- Vérifier que le caller accède à ses propres données
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RETURN QUERY SELECT 0::integer, 0::integer, 0::integer, FALSE::boolean;
    RETURN;
  END IF;

  SELECT 
    us.assessments_used,
    us.assessments_limit,
    us.status
  INTO subscription_record
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    has_valid_subscription := TRUE;
  ELSE
    SELECT TRUE INTO has_valid_subscription
    FROM public.orders o
    WHERE o.user_id = _user_id
      AND o.status = 'validated'
    LIMIT 1;
    
    IF FOUND THEN
      subscription_record.assessments_used := 0;
      subscription_record.assessments_limit := 3;
    END IF;
  END IF;

  IF has_valid_subscription THEN
    RETURN QUERY SELECT 
      COALESCE(subscription_record.assessments_used, 0)::integer,
      COALESCE(subscription_record.assessments_limit, 3)::integer,
      GREATEST(COALESCE(subscription_record.assessments_limit, 3) - COALESCE(subscription_record.assessments_used, 0), 0)::integer,
      (COALESCE(subscription_record.assessments_used, 0) < COALESCE(subscription_record.assessments_limit, 3))::boolean;
  ELSE
    RETURN QUERY SELECT 0::integer, 0::integer, 0::integer, FALSE::boolean;
  END IF;
END;
$$;

-- 4. get_organization_modules - Vérifier que l'utilisateur est membre de l'organisation
CREATE OR REPLACE FUNCTION public.get_organization_modules(p_org_id uuid)
RETURNS TABLE(module_id uuid, slug text, name text, description text, icon text, route text, category text, started_at timestamp with time zone, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que le caller est membre de l'organisation ou superadmin
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  IF NOT public.is_org_member(auth.uid(), p_org_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    m.id AS module_id,
    m.slug,
    m.name,
    m.description,
    m.icon,
    m.route,
    m.category,
    om.started_at,
    om.expires_at
  FROM modules m
  INNER JOIN organization_modules om ON om.module_id = m.id
  WHERE om.org_id = p_org_id
    AND om.active = true
    AND m.is_active = true
    AND (om.expires_at IS NULL OR om.expires_at > NOW())
  ORDER BY m.name;
END;
$$;

-- 5. activate_module_for_organization - Vérifier que l'utilisateur est admin de l'organisation
CREATE OR REPLACE FUNCTION public.activate_module_for_organization(p_org_id uuid, p_module_slug text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_id UUID;
  v_org_module_id UUID;
BEGIN
  -- Vérifier que le caller est admin de l'organisation ou superadmin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;
  
  IF NOT public.is_org_admin(auth.uid(), p_org_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Valider le slug du module
  IF p_module_slug IS NULL OR length(trim(p_module_slug)) = 0 THEN
    RAISE EXCEPTION 'Invalid module slug';
  END IF;

  SELECT id INTO v_module_id
  FROM modules
  WHERE slug = p_module_slug AND is_active = true;
  
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Module % not found or inactive', p_module_slug;
  END IF;
  
  INSERT INTO organization_modules (org_id, module_id, active, expires_at)
  VALUES (p_org_id, v_module_id, true, p_expires_at)
  ON CONFLICT (org_id, module_id)
  DO UPDATE SET
    active = true,
    expires_at = COALESCE(p_expires_at, organization_modules.expires_at),
    updated_at = NOW()
  RETURNING id INTO v_org_module_id;
  
  RETURN v_org_module_id;
END;
$$;

-- 6. deactivate_module_for_organization - Vérifier que l'utilisateur est admin de l'organisation
CREATE OR REPLACE FUNCTION public.deactivate_module_for_organization(p_org_id uuid, p_module_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Vérifier que le caller est admin de l'organisation ou superadmin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;
  
  IF NOT public.is_org_admin(auth.uid(), p_org_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Valider le slug du module
  IF p_module_slug IS NULL OR length(trim(p_module_slug)) = 0 THEN
    RAISE EXCEPTION 'Invalid module slug';
  END IF;

  SELECT id INTO v_module_id
  FROM modules
  WHERE slug = p_module_slug;
  
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Module % not found', p_module_slug;
  END IF;
  
  UPDATE organization_modules
  SET active = false, updated_at = NOW()
  WHERE org_id = p_org_id AND module_id = v_module_id;
  
  RETURN FOUND;
END;
$$;

-- 7. calculate_activity_emissions - Vérifier que l'utilisateur a accès à l'activité
CREATE OR REPLACE FUNCTION public.calculate_activity_emissions(p_activity_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity DECIMAL(15, 4);
  v_emission_factor DECIMAL(15, 6);
  v_emissions DECIMAL(15, 4);
  v_org_id UUID;
BEGIN
  -- Récupérer l'organization_id de l'activité
  SELECT organization_id INTO v_org_id
  FROM activity_data
  WHERE id = p_activity_id;
  
  -- Vérifier que le caller a accès à cette organisation
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  
  IF v_org_id IS NOT NULL AND NOT public.is_org_member(auth.uid(), v_org_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RETURN 0;
  END IF;

  SELECT 
    ad.quantity,
    COALESCE(ef.emission_factor, 0)
  INTO v_quantity, v_emission_factor
  FROM activity_data ad
  LEFT JOIN emission_factors ef ON ad.emission_factor_id = ef.id
  WHERE ad.id = p_activity_id;
  
  IF v_quantity IS NULL THEN
    RETURN 0;
  END IF;
  
  v_emissions := v_quantity * v_emission_factor;
  RETURN v_emissions;
END;
$$;

-- 8. get_data_quality_stats - Vérifier que l'utilisateur a accès à l'organisation
CREATE OR REPLACE FUNCTION public.get_data_quality_stats(p_organization_id uuid, p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date)
RETURNS TABLE(total_count bigint, real_count bigint, estimated_count bigint, default_count bigint, real_percentage numeric, estimated_percentage numeric, default_percentage numeric, avg_confidence_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que le caller a accès à cette organisation
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  IF NOT public.is_org_member(auth.uid(), p_organization_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE data_quality = 'real')::BIGINT as real_count,
    COUNT(*) FILTER (WHERE data_quality = 'estimated')::BIGINT as estimated_count,
    COUNT(*) FILTER (WHERE data_quality = 'default')::BIGINT as default_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE data_quality = 'real')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0
    END as real_percentage,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE data_quality = 'estimated')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0
    END as estimated_percentage,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE data_quality = 'default')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0
    END as default_percentage,
    AVG(confidence_score)::DECIMAL(5, 2) as avg_confidence_score
  FROM activity_data
  WHERE organization_id = p_organization_id
    AND (p_period_start IS NULL OR period_start >= p_period_start)
    AND (p_period_end IS NULL OR period_end <= p_period_end);
END;
$$;

-- 9. decrement_assessment_usage - Vérifier que l'utilisateur modifie son propre compte
CREATE OR REPLACE FUNCTION public.decrement_assessment_usage(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que le caller modifie son propre compte ou est superadmin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;
  
  IF auth.uid() != _user_id AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify another user''s data';
  END IF;

  UPDATE public.user_subscriptions 
  SET assessments_used = GREATEST(assessments_used - 1, 0)
  WHERE user_id = _user_id 
    AND status = 'active';
END;
$$;