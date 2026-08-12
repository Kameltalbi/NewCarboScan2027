-- Permet au financeur de consulter le plan affiché dans les listes d'audit.
CREATE POLICY "Financeurs can read subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (public.has_role(auth.uid(), 'financeur'::public.app_role));
