
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  organization_id uuid,
  endpoint text NOT NULL,
  method text NOT NULL,
  status integer NOT NULL,
  duration_ms integer,
  ip_address text,
  user_agent text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_org ON public.api_request_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_key ON public.api_request_logs(api_key_id, created_at DESC);

GRANT SELECT ON public.api_request_logs TO authenticated;
GRANT ALL ON public.api_request_logs TO service_role;

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view their API logs"
ON public.api_request_logs
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);
