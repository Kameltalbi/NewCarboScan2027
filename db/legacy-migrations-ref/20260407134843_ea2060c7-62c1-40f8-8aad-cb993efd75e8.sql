-- Fix report_quota RLS: allow superadmins to manage all quotas

DROP POLICY IF EXISTS "Users can insert quota for their org" ON public.report_quota;
CREATE POLICY "Users can insert quota for their org"
ON public.report_quota
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin')
  OR organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their org quota" ON public.report_quota;
CREATE POLICY "Users can update their org quota"
ON public.report_quota
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin')
  OR organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their org quota" ON public.report_quota;
CREATE POLICY "Users can view their org quota"
ON public.report_quota
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin')
  OR organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);