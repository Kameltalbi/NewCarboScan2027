CREATE OR REPLACE FUNCTION public.decrement_assessment_usage(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si appelé depuis un trigger, autoriser (cas suppression utilisateur via Supabase Auth Admin)
  IF pg_trigger_depth() > 0 THEN
    UPDATE public.user_subscriptions
    SET assessments_used = GREATEST(assessments_used - 1, 0)
    WHERE user_id = _user_id
      AND status = 'active';
    RETURN;
  END IF;

  -- Appels directs: garder un contrôle strict
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  IF auth.uid() != _user_id
     AND NOT public.has_role(auth.uid(), 'superadmin')
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin', 'supabase_auth_admin') THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify another user''s data';
  END IF;

  UPDATE public.user_subscriptions
  SET assessments_used = GREATEST(assessments_used - 1, 0)
  WHERE user_id = _user_id
    AND status = 'active';
END;
$function$;