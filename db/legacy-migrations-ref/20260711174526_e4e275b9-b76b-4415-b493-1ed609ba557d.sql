
-- 1. Fix mutable search_path on all public functions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
      ))
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- 2. Revoke EXECUTE from anon (and PUBLIC) on all SECURITY DEFINER functions in public schema.
-- These functions perform their own auth.uid() / role checks; anon has no business calling them.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Also revoke internal-only SECURITY DEFINER helpers from authenticated (triggers, logging)
DO $$
DECLARE r RECORD;
  internal_funcs text[] := ARRAY[
    'log_collect_change',
    'collect_responses_insert_history',
    'collect_responses_update_history',
    'collect_responses_delete_history',
    'auto_link_bilan_carbone_on_subscription',
    'trg_update_site_stats_on_response_change',
    'update_overdue_tasks',
    'prevent_locked_data_modification',
    'create_subscription_on_order_validation',
    'revoke_subscription_on_order_cancel',
    'handle_bilan_deletion',
    'record_login_attempt',
    'cleanup_old_login_attempts',
    'unblock_ip'
  ];
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef = true
      AND p.proname = ANY(internal_funcs)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- 3. Tighten wattbim_savings policies: scope explicitly to authenticated + non-null auth.uid()
DROP POLICY IF EXISTS wattbim_savings_select ON public.wattbim_savings;
DROP POLICY IF EXISTS wattbim_savings_insert ON public.wattbim_savings;
DROP POLICY IF EXISTS wattbim_savings_update ON public.wattbim_savings;
DROP POLICY IF EXISTS wattbim_savings_delete ON public.wattbim_savings;

CREATE POLICY wattbim_savings_select ON public.wattbim_savings
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'))
  );

CREATE POLICY wattbim_savings_insert ON public.wattbim_savings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY wattbim_savings_update ON public.wattbim_savings
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY wattbim_savings_delete ON public.wattbim_savings
  FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'))
  );

-- 4. Remove "always true" policies
-- sector_presets: service_role bypasses RLS natively, drop redundant permissive policy
DROP POLICY IF EXISTS "Service role can manage sector presets" ON public.sector_presets;

-- chatbot_feedback: keep public inserts but with size limits
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.chatbot_feedback;
CREATE POLICY "Anyone can insert feedback" ON public.chatbot_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(user_message) BETWEEN 1 AND 10000
    AND length(bot_response) BETWEEN 1 AND 20000
    AND length(coalesce(comment, '')) <= 5000
    AND length(session_id) BETWEEN 1 AND 200
    AND length(message_id) BETWEEN 1 AND 200
    AND feedback_type IN ('positive','negative','neutral','helpful','not_helpful')
  );

-- 5. Prevent public listing on public storage buckets by dropping broad SELECT policies.
-- Files remain accessible through their direct public URL, but LIST returns nothing to clients.
DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Data collection files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for documents-publics" ON storage.objects;
