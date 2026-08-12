-- Fix: prevent anonymous auth users from accessing wattbim_savings
DROP POLICY IF EXISTS wattbim_savings_select ON public.wattbim_savings;
DROP POLICY IF EXISTS wattbim_savings_insert ON public.wattbim_savings;
DROP POLICY IF EXISTS wattbim_savings_update ON public.wattbim_savings;
DROP POLICY IF EXISTS wattbim_savings_delete ON public.wattbim_savings;

CREATE POLICY wattbim_savings_select ON public.wattbim_savings
FOR SELECT TO authenticated
USING (
  coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  AND auth.uid() IS NOT NULL
  AND (is_org_member(auth.uid(), organization_id) OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY wattbim_savings_insert ON public.wattbim_savings
FOR INSERT TO authenticated
WITH CHECK (
  coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), organization_id)
);

CREATE POLICY wattbim_savings_update ON public.wattbim_savings
FOR UPDATE TO authenticated
USING (
  coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), organization_id)
)
WITH CHECK (
  coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), organization_id)
);

CREATE POLICY wattbim_savings_delete ON public.wattbim_savings
FOR DELETE TO authenticated
USING (
  coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  AND auth.uid() IS NOT NULL
  AND (is_org_admin(auth.uid(), organization_id) OR has_role(auth.uid(), 'superadmin'::app_role))
);