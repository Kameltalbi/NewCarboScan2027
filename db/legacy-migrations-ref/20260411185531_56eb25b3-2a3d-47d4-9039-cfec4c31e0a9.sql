
-- Table linking Collect module responses to PCF studies
CREATE TABLE public.pcf_collect_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID NOT NULL REFERENCES public.pcf_studies(id) ON DELETE CASCADE,
  collect_response_id UUID NOT NULL REFERENCES public.collect_responses(id) ON DELETE CASCADE,
  allocation_percentage NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  allocated_value NUMERIC(15,4),
  phase TEXT NOT NULL DEFAULT 'manufacturing',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(study_id, collect_response_id)
);

ALTER TABLE public.pcf_collect_allocations ENABLE ROW LEVEL SECURITY;

-- RLS: org members of the PCF study can access
CREATE POLICY "Org members can view pcf_collect_allocations"
  ON public.pcf_collect_allocations FOR SELECT
  TO authenticated
  USING (public.pcf_study_org_check(study_id));

CREATE POLICY "Org admins can insert pcf_collect_allocations"
  ON public.pcf_collect_allocations FOR INSERT
  TO authenticated
  WITH CHECK (public.pcf_study_org_check(study_id));

CREATE POLICY "Org admins can update pcf_collect_allocations"
  ON public.pcf_collect_allocations FOR UPDATE
  TO authenticated
  USING (public.pcf_study_org_check(study_id));

CREATE POLICY "Org admins can delete pcf_collect_allocations"
  ON public.pcf_collect_allocations FOR DELETE
  TO authenticated
  USING (public.pcf_study_org_check(study_id));

-- Auto-update timestamp
CREATE TRIGGER update_pcf_collect_allocations_updated_at
  BEFORE UPDATE ON public.pcf_collect_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_pcf_updated_at();

-- Index for performance
CREATE INDEX idx_pcf_collect_allocations_study ON public.pcf_collect_allocations(study_id);
CREATE INDEX idx_pcf_collect_allocations_response ON public.pcf_collect_allocations(collect_response_id);
