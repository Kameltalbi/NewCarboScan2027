CREATE OR REPLACE FUNCTION public.decrement_assessment_usage(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Autoriser les appels internes Supabase Admin (suppression d'utilisateur) même sans auth.uid()
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  -- Pour les appels applicatifs, garder le contrôle strict
  IF auth.uid() IS NOT NULL
     AND auth.uid() != _user_id
     AND NOT public.has_role(auth.uid(), 'superadmin')
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify another user''s data';
  END IF;

  UPDATE public.user_subscriptions
  SET assessments_used = GREATEST(assessments_used - 1, 0)
  WHERE user_id = _user_id
    AND status = 'active';
END;
$function$;