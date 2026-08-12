
-- Table historique
CREATE TABLE public.pro_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  year INTEGER NOT NULL,
  template_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT,
  file_size_bytes BIGINT,
  page_count INTEGER,
  error_message TEXT,
  generated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pro_reports_org_year ON public.pro_reports(organization_id, year DESC);
CREATE INDEX idx_pro_reports_created ON public.pro_reports(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_reports TO authenticated;
GRANT ALL ON public.pro_reports TO service_role;

ALTER TABLE public.pro_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_pro_reports" ON public.pro_reports
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "org_members_insert_pro_reports" ON public.pro_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "org_members_update_pro_reports" ON public.pro_reports
  FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "admins_delete_pro_reports" ON public.pro_reports
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE TRIGGER trg_pro_reports_updated_at
  BEFORE UPDATE ON public.pro_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for bucket 'pro-reports' (files stored as <organization_id>/<report_id>.pdf)
CREATE POLICY "org_members_read_pro_report_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pro-reports'
    AND (
      public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR public.has_role(auth.uid(), 'superadmin'::app_role)
    )
  );

CREATE POLICY "admins_delete_pro_report_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pro-reports'
    AND (
      public.is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR public.has_role(auth.uid(), 'superadmin'::app_role)
    )
  );
