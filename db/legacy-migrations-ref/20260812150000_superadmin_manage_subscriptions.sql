-- Allow platform superadmins to manage subscriptions for any user.
-- Tenant policies remain unchanged; financeurs keep read-only access.

DROP POLICY IF EXISTS "Superadmins can view all subscriptions"
  ON public.user_subscriptions;
DROP POLICY IF EXISTS "Superadmins can update all subscriptions"
  ON public.user_subscriptions;
DROP POLICY IF EXISTS "Superadmins can manage all subscriptions"
  ON public.user_subscriptions;

CREATE POLICY "Superadmins can manage all subscriptions"
  ON public.user_subscriptions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::public.app_role));
