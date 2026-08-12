
-- Table de commentaires pour le module Collect
CREATE TABLE IF NOT EXISTS public.collect_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.collect_sessions(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'question', -- 'question', 'section', 'session'
  target_id UUID,
  target_key TEXT, -- question_key pour les commentaires sur questions
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.collect_comments(id) ON DELETE CASCADE,
  mentioned_user_ids UUID[] DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_collect_comments_session ON public.collect_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_collect_comments_target ON public.collect_comments(target_key);
CREATE INDEX IF NOT EXISTS idx_collect_comments_parent ON public.collect_comments(parent_comment_id);

-- RLS
ALTER TABLE public.collect_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments of their sessions"
  ON public.collect_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collect_sessions cs
      WHERE cs.id = session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert comments on their sessions"
  ON public.collect_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.collect_sessions cs
      WHERE cs.id = session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.collect_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.collect_comments FOR DELETE
  USING (user_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER update_collect_comments_timestamp
  BEFORE UPDATE ON public.collect_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_collect_comments_updated_at();
