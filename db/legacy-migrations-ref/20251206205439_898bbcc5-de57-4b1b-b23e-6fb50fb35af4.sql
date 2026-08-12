-- =====================================================
-- COLLECTE PÉRIODIQUE : Ajout des colonnes manquantes
-- =====================================================

-- Ajouter les colonnes de périodicité à collect_sessions si elles n'existent pas
ALTER TABLE public.collect_sessions
ADD COLUMN IF NOT EXISTS is_periodic BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS periodicity TEXT CHECK (periodicity IN ('monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES public.collect_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS period_start_date DATE,
ADD COLUMN IF NOT EXISTS period_end_date DATE,
ADD COLUMN IF NOT EXISTS next_due_date TIMESTAMP WITH TIME ZONE;

-- Créer l'index pour les sessions périodiques
CREATE INDEX IF NOT EXISTS idx_collect_sessions_periodic ON public.collect_sessions (is_periodic, periodicity) WHERE is_periodic = true;
CREATE INDEX IF NOT EXISTS idx_collect_sessions_parent ON public.collect_sessions (parent_session_id) WHERE parent_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collect_sessions_due_date ON public.collect_sessions (next_due_date) WHERE next_due_date IS NOT NULL;

-- =====================================================
-- TABLE: collect_periodic_history - Historique des périodes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.collect_periodic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_session_id UUID NOT NULL REFERENCES public.collect_sessions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.collect_sessions(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(parent_session_id, period_start_date, period_end_date)
);

-- RLS pour collect_periodic_history
ALTER TABLE public.collect_periodic_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their periodic history" ON public.collect_periodic_history
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their periodic history" ON public.collect_periodic_history
  FOR ALL USING (
    session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid())
  );

-- =====================================================
-- TABLE: collect_estimations - Estimations automatiques IA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.collect_estimations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.collect_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_category TEXT NOT NULL,
  
  -- Valeur estimée
  estimated_value NUMERIC NOT NULL,
  estimated_unit TEXT,
  
  -- Confiance et métadonnées
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  -- Sources de l'estimation
  estimation_method TEXT NOT NULL CHECK (estimation_method IN ('historical_average', 'trend_analysis', 'seasonal_pattern', 'sector_benchmark', 'ai_prediction')),
  source_data JSONB DEFAULT '{}', -- Données utilisées pour l'estimation
  
  -- Données historiques utilisées
  historical_values JSONB DEFAULT '[]', -- [{period, value, unit}]
  trend_direction TEXT CHECK (trend_direction IN ('increasing', 'stable', 'decreasing')),
  seasonal_factor NUMERIC, -- Facteur saisonnier appliqué
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')),
  user_value NUMERIC, -- Valeur finale saisie par l'utilisateur
  user_unit TEXT,
  
  -- Métadonnées
  reasoning TEXT, -- Explication de l'estimation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(session_id, question_key)
);

-- Index pour collect_estimations
CREATE INDEX IF NOT EXISTS idx_collect_estimations_session ON public.collect_estimations (session_id);
CREATE INDEX IF NOT EXISTS idx_collect_estimations_status ON public.collect_estimations (status);
CREATE INDEX IF NOT EXISTS idx_collect_estimations_confidence ON public.collect_estimations (confidence_level);

-- RLS pour collect_estimations
ALTER TABLE public.collect_estimations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their estimations" ON public.collect_estimations
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their estimations" ON public.collect_estimations
  FOR ALL USING (
    session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid())
  );

-- =====================================================
-- TABLE: collect_historical_stats - Stats historiques par question
-- =====================================================
CREATE TABLE IF NOT EXISTS public.collect_historical_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_category TEXT NOT NULL,
  
  -- Statistiques calculées
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  std_deviation NUMERIC,
  data_points INTEGER DEFAULT 0,
  
  -- Tendances
  trend_slope NUMERIC, -- Pente de la tendance
  trend_direction TEXT CHECK (trend_direction IN ('increasing', 'stable', 'decreasing')),
  
  -- Saisonnalité (facteurs par mois)
  seasonal_factors JSONB DEFAULT '{}', -- {1: 1.2, 2: 0.9, ...}
  
  -- Dernière mise à jour
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, question_key)
);

-- RLS pour collect_historical_stats
ALTER TABLE public.collect_historical_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company stats" ON public.collect_historical_stats
  FOR SELECT USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

-- =====================================================
-- FONCTION: Obtenir les sessions périodiques à venir
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_upcoming_periodic_sessions(
  p_user_id UUID DEFAULT auth.uid(),
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  session_id UUID,
  parent_session_id UUID,
  session_name TEXT,
  periodicity TEXT,
  next_due_date TIMESTAMP WITH TIME ZONE,
  days_until_due INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as session_id,
    s.parent_session_id,
    s.name as session_name,
    s.periodicity,
    s.next_due_date,
    EXTRACT(DAY FROM (s.next_due_date - now()))::INTEGER as days_until_due,
    s.status
  FROM public.collect_sessions s
  WHERE s.is_periodic = true
    AND s.next_due_date IS NOT NULL
    AND s.next_due_date <= now() + (p_days_ahead || ' days')::INTERVAL
    AND (p_user_id IS NULL OR s.user_id = p_user_id)
  ORDER BY s.next_due_date ASC;
END;
$$;

-- =====================================================
-- FONCTION: Calculer les statistiques historiques
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_historical_stats(
  p_company_id UUID,
  p_question_key TEXT
)
RETURNS public.collect_historical_stats
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result public.collect_historical_stats%ROWTYPE;
  v_values NUMERIC[];
  v_periods JSONB[];
  v_avg NUMERIC;
  v_min NUMERIC;
  v_max NUMERIC;
  v_std NUMERIC;
  v_count INTEGER;
  v_trend_slope NUMERIC;
  v_trend_direction TEXT;
BEGIN
  -- Récupérer toutes les valeurs historiques
  SELECT 
    ARRAY_AGG((value::TEXT)::NUMERIC ORDER BY cr.created_at),
    COUNT(*)::INTEGER
  INTO v_values, v_count
  FROM public.collect_responses cr
  JOIN public.collect_sessions cs ON cs.id = cr.session_id
  WHERE cs.company_id = p_company_id
    AND cr.question_key = p_question_key
    AND cr.value IS NOT NULL
    AND cr.value::TEXT ~ '^[0-9]+\.?[0-9]*$';
  
  IF v_count < 2 THEN
    -- Pas assez de données
    RETURN NULL;
  END IF;
  
  -- Calculer les statistiques
  SELECT 
    AVG(val),
    MIN(val),
    MAX(val),
    STDDEV(val)
  INTO v_avg, v_min, v_max, v_std
  FROM unnest(v_values) AS val;
  
  -- Calculer la tendance (régression linéaire simple)
  WITH indexed_values AS (
    SELECT 
      ROW_NUMBER() OVER () as idx,
      val
    FROM unnest(v_values) AS val
  )
  SELECT 
    REGR_SLOPE(val, idx)
  INTO v_trend_slope
  FROM indexed_values;
  
  -- Déterminer la direction de la tendance
  IF v_trend_slope > 0.05 * v_avg THEN
    v_trend_direction := 'increasing';
  ELSIF v_trend_slope < -0.05 * v_avg THEN
    v_trend_direction := 'decreasing';
  ELSE
    v_trend_direction := 'stable';
  END IF;
  
  -- Insérer ou mettre à jour les stats
  INSERT INTO public.collect_historical_stats (
    company_id,
    question_key,
    question_category,
    avg_value,
    min_value,
    max_value,
    std_deviation,
    data_points,
    trend_slope,
    trend_direction,
    last_calculated_at
  )
  VALUES (
    p_company_id,
    p_question_key,
    (SELECT question_category FROM public.collect_responses WHERE question_key = p_question_key LIMIT 1),
    v_avg,
    v_min,
    v_max,
    v_std,
    v_count,
    v_trend_slope,
    v_trend_direction,
    now()
  )
  ON CONFLICT (company_id, question_key) DO UPDATE SET
    avg_value = EXCLUDED.avg_value,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    std_deviation = EXCLUDED.std_deviation,
    data_points = EXCLUDED.data_points,
    trend_slope = EXCLUDED.trend_slope,
    trend_direction = EXCLUDED.trend_direction,
    last_calculated_at = now()
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- FONCTION: Obtenir les estimations pour une session
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_session_estimations(
  p_session_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  question_key TEXT,
  question_category TEXT,
  estimated_value NUMERIC,
  estimated_unit TEXT,
  confidence_score NUMERIC,
  confidence_level TEXT,
  estimation_method TEXT,
  trend_direction TEXT,
  reasoning TEXT,
  status TEXT,
  user_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.question_key,
    e.question_category,
    e.estimated_value,
    e.estimated_unit,
    e.confidence_score,
    e.confidence_level,
    e.estimation_method,
    e.trend_direction,
    e.reasoning,
    e.status,
    e.user_value
  FROM public.collect_estimations e
  WHERE e.session_id = p_session_id
    AND (p_status IS NULL OR e.status = p_status)
  ORDER BY e.confidence_score DESC;
END;
$$;

-- =====================================================
-- FONCTION: Accepter une estimation
-- =====================================================
CREATE OR REPLACE FUNCTION public.accept_estimation(
  p_estimation_id UUID,
  p_user_value NUMERIC DEFAULT NULL,
  p_user_unit TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estimation RECORD;
  v_final_value NUMERIC;
  v_final_unit TEXT;
BEGIN
  -- Récupérer l'estimation
  SELECT * INTO v_estimation
  FROM public.collect_estimations
  WHERE id = p_estimation_id;
  
  IF v_estimation IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Déterminer la valeur finale
  v_final_value := COALESCE(p_user_value, v_estimation.estimated_value);
  v_final_unit := COALESCE(p_user_unit, v_estimation.estimated_unit);
  
  -- Mettre à jour l'estimation
  UPDATE public.collect_estimations
  SET 
    status = CASE WHEN p_user_value IS NOT NULL THEN 'modified' ELSE 'accepted' END,
    user_value = p_user_value,
    user_unit = p_user_unit,
    accepted_at = now(),
    updated_at = now()
  WHERE id = p_estimation_id;
  
  -- Créer ou mettre à jour la réponse
  INSERT INTO public.collect_responses (
    session_id,
    question_key,
    question_category,
    value,
    unit,
    source,
    ai_suggested,
    confidence_score,
    is_validated
  )
  VALUES (
    v_estimation.session_id,
    v_estimation.question_key,
    v_estimation.question_category,
    to_jsonb(v_final_value),
    v_final_unit,
    'estimation',
    true,
    v_estimation.confidence_score,
    false
  )
  ON CONFLICT (session_id, question_key) 
  WHERE site_id IS NULL
  DO UPDATE SET
    value = EXCLUDED.value,
    unit = EXCLUDED.unit,
    source = EXCLUDED.source,
    ai_suggested = EXCLUDED.ai_suggested,
    confidence_score = EXCLUDED.confidence_score,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- FONCTION: Rejeter une estimation
-- =====================================================
CREATE OR REPLACE FUNCTION public.reject_estimation(p_estimation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.collect_estimations
  SET 
    status = 'rejected',
    updated_at = now()
  WHERE id = p_estimation_id
    AND session_id IN (SELECT id FROM public.collect_sessions WHERE user_id = auth.uid());
  
  RETURN FOUND;
END;
$$;