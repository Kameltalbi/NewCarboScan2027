-- =====================================================
-- CarboScan Collect - Tables de collecte de données
-- =====================================================

-- Table des sessions de collecte
CREATE TABLE IF NOT EXISTS public.collect_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'validated')),
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  completed_sections TEXT[] DEFAULT '{}',
  total_questions INTEGER NOT NULL DEFAULT 0,
  answered_questions INTEGER NOT NULL DEFAULT 0,
  is_offline BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_pending BOOLEAN NOT NULL DEFAULT false,
  bilan_id UUID REFERENCES public.bilans_carbone(id),
  ai_suggestions_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des réponses de collecte
CREATE TABLE IF NOT EXISTS public.collect_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collect_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_category TEXT NOT NULL,
  question_label TEXT,
  scope INTEGER,
  value JSONB,
  unit TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'excel_import', 'ocr', 'ai_suggestion', 'api')),
  confidence_score NUMERIC,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_key)
);

-- Table des fichiers uploadés
CREATE TABLE IF NOT EXISTS public.collect_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collect_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  category TEXT NOT NULL,
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des suggestions IA
CREATE TABLE IF NOT EXISTS public.collect_ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collect_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  suggested_value JSONB NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.collect_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collect_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collect_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collect_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour collect_sessions
CREATE POLICY "Users can view their own collect sessions"
  ON public.collect_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collect sessions"
  ON public.collect_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collect sessions"
  ON public.collect_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collect sessions"
  ON public.collect_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Politiques RLS pour collect_responses
CREATE POLICY "Users can view their collect responses"
  ON public.collect_responses FOR SELECT
  USING (session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their collect responses"
  ON public.collect_responses FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their collect responses"
  ON public.collect_responses FOR UPDATE
  USING (session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their collect responses"
  ON public.collect_responses FOR DELETE
  USING (session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid()));

-- Politiques RLS pour collect_files
CREATE POLICY "Users can view their collect files"
  ON public.collect_files FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their collect files"
  ON public.collect_files FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their collect files"
  ON public.collect_files FOR DELETE
  USING (user_id = auth.uid());

-- Politiques RLS pour collect_ai_suggestions
CREATE POLICY "Users can view their AI suggestions"
  ON public.collect_ai_suggestions FOR SELECT
  USING (session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their AI suggestions"
  ON public.collect_ai_suggestions FOR UPDATE
  USING (session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid()));

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_collect_sessions_user_id ON public.collect_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collect_responses_session_id ON public.collect_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_collect_files_session_id ON public.collect_files(session_id);
CREATE INDEX IF NOT EXISTS idx_collect_ai_suggestions_session_id ON public.collect_ai_suggestions(session_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_collect_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_collect_sessions_updated_at ON public.collect_sessions;
CREATE TRIGGER update_collect_sessions_updated_at
  BEFORE UPDATE ON public.collect_sessions
  FOR EACH ROW EXECUTE FUNCTION update_collect_updated_at();

DROP TRIGGER IF EXISTS update_collect_responses_updated_at ON public.collect_responses;
CREATE TRIGGER update_collect_responses_updated_at
  BEFORE UPDATE ON public.collect_responses
  FOR EACH ROW EXECUTE FUNCTION update_collect_updated_at();