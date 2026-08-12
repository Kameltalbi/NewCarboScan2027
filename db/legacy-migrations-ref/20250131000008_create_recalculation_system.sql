-- Migration: Système de recalcul automatique
-- Créé: 2025-01-31
-- Description: Table de queue pour recalculs + fonctions RPC + triggers

-- =========================
-- 1. TABLE DE QUEUE
-- =========================

CREATE TABLE IF NOT EXISTS recalculation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'activity_data_change' | 'manual' | 'scheduled'
  trigger_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0
);

-- Index pour performance
CREATE INDEX idx_recalculation_queue_org ON recalculation_queue(organization_id);
CREATE INDEX idx_recalculation_queue_status ON recalculation_queue(status);
CREATE INDEX idx_recalculation_queue_created ON recalculation_queue(created_at DESC);

-- RLS
ALTER TABLE recalculation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's recalculation queue"
  ON recalculation_queue FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- =========================
-- 2. COLONNE CACHE VALIDITY DANS bilans_carbone
-- =========================

-- Ajouter une colonne pour tracker la validité du cache
ALTER TABLE bilans_carbone 
  ADD COLUMN IF NOT EXISTS is_cache_valid BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS cache_invalidated_at TIMESTAMPTZ;

-- Index
CREATE INDEX IF NOT EXISTS idx_bilans_carbone_cache_valid ON bilans_carbone(is_cache_valid);

-- =========================
-- 3. FONCTION RPC: Calculer Bilan Carbone depuis activity_data
-- =========================

CREATE OR REPLACE FUNCTION calculate_bilan_carbone_from_activity_data(
  p_organization_id UUID,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scope1 NUMERIC := 0;
  v_scope2 NUMERIC := 0;
  v_scope3 NUMERIC := 0;
  v_total NUMERIC := 0;
  v_breakdown JSONB := '[]'::JSONB;
  v_activity RECORD;
  v_emissions NUMERIC;
BEGIN
  -- Parcourir toutes les activity_data pour la période
  FOR v_activity IN
    SELECT 
      ad.*,
      ef.emission_factor,
      ef.unit as ef_unit
    FROM activity_data ad
    LEFT JOIN emission_factors ef ON ad.emission_factor_id = ef.id
    WHERE ad.organization_id = p_organization_id
      AND (p_period_start IS NULL OR ad.period_start >= p_period_start)
      AND (p_period_end IS NULL OR ad.period_end <= p_period_end)
  LOOP
    -- Calculer les émissions pour cette activité
    IF v_activity.emission_factor IS NOT NULL THEN
      v_emissions := v_activity.quantity * v_activity.emission_factor;
    ELSE
      v_emissions := 0;
    END IF;

    -- Agréger par scope
    IF v_activity.scope_hint = 1 THEN
      v_scope1 := v_scope1 + v_emissions;
    ELSIF v_activity.scope_hint = 2 THEN
      v_scope2 := v_scope2 + v_emissions;
    ELSIF v_activity.scope_hint = 3 THEN
      v_scope3 := v_scope3 + v_emissions;
    END IF;

    v_total := v_total + v_emissions;
  END LOOP;

  -- Retourner le résultat
  RETURN jsonb_build_object(
    'scope1', v_scope1,
    'scope2', v_scope2,
    'scope3', v_scope3,
    'total', v_total,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'calculated_at', NOW()
  );
END;
$$;

-- =========================
-- 4. FONCTION RPC: Calculer Empreinte Produit depuis activity_data
-- =========================

CREATE OR REPLACE FUNCTION calculate_product_footprint_from_activity_data(
  p_organization_id UUID,
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_emissions NUMERIC := 0;
  v_breakdown JSONB := '[]'::JSONB;
  v_activity RECORD;
  v_emissions NUMERIC;
  v_phase_totals JSONB := '{}'::JSONB;
BEGIN
  -- Parcourir toutes les activity_data pour ce produit
  FOR v_activity IN
    SELECT 
      ad.*,
      ef.emission_factor,
      ef.unit as ef_unit
    FROM activity_data ad
    LEFT JOIN emission_factors ef ON ad.emission_factor_id = ef.id
    WHERE ad.organization_id = p_organization_id
      AND ad.product_id = p_product_id
  LOOP
    -- Calculer les émissions pour cette activité
    IF v_activity.emission_factor IS NOT NULL THEN
      v_emissions := v_activity.quantity * v_activity.emission_factor;
    ELSE
      v_emissions := 0;
    END IF;

    v_total_emissions := v_total_emissions + v_emissions;

    -- Agréger par phase (category)
    IF v_phase_totals ? v_activity.category THEN
      v_phase_totals := jsonb_set(
        v_phase_totals,
        ARRAY[v_activity.category],
        to_jsonb((v_phase_totals->>v_activity.category)::NUMERIC + v_emissions)
      );
    ELSE
      v_phase_totals := jsonb_set(
        v_phase_totals,
        ARRAY[v_activity.category],
        to_jsonb(v_emissions)
      );
    END IF;
  END LOOP;

  -- Retourner le résultat
  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'total_emissions', v_total_emissions,
    'breakdown_by_phase', v_phase_totals,
    'calculated_at', NOW()
  );
END;
$$;

-- =========================
-- 5. FONCTION RPC: Calculer métriques Dashboard depuis activity_data
-- =========================

CREATE OR REPLACE FUNCTION calculate_dashboard_metrics_from_activity_data(
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_emissions NUMERIC := 0;
  v_total_activities INTEGER := 0;
  v_data_quality_real INTEGER := 0;
  v_data_quality_estimated INTEGER := 0;
  v_data_quality_default INTEGER := 0;
  v_scope_breakdown JSONB;
BEGIN
  -- Compter les activités et calculer les totaux
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE data_quality = 'real'),
    COUNT(*) FILTER (WHERE data_quality = 'estimated'),
    COUNT(*) FILTER (WHERE data_quality = 'default')
  INTO 
    v_total_activities,
    v_data_quality_real,
    v_data_quality_estimated,
    v_data_quality_default
  FROM activity_data
  WHERE organization_id = p_organization_id;

  -- Calculer les émissions totales par scope
  SELECT jsonb_build_object(
    'scope1', COALESCE(SUM(CASE WHEN ad.scope_hint = 1 THEN ad.quantity * COALESCE(ef.emission_factor, 0) ELSE 0 END), 0),
    'scope2', COALESCE(SUM(CASE WHEN ad.scope_hint = 2 THEN ad.quantity * COALESCE(ef.emission_factor, 0) ELSE 0 END), 0),
    'scope3', COALESCE(SUM(CASE WHEN ad.scope_hint = 3 THEN ad.quantity * COALESCE(ef.emission_factor, 0) ELSE 0 END), 0)
  )
  INTO v_scope_breakdown
  FROM activity_data ad
  LEFT JOIN emission_factors ef ON ad.emission_factor_id = ef.id
  WHERE ad.organization_id = p_organization_id;

  v_total_emissions := 
    (v_scope_breakdown->>'scope1')::NUMERIC + 
    (v_scope_breakdown->>'scope2')::NUMERIC + 
    (v_scope_breakdown->>'scope3')::NUMERIC;

  -- Retourner les métriques
  RETURN jsonb_build_object(
    'total_emissions', v_total_emissions,
    'total_activities', v_total_activities,
    'scope_breakdown', v_scope_breakdown,
    'data_quality', jsonb_build_object(
      'real', v_data_quality_real,
      'estimated', v_data_quality_estimated,
      'default', v_data_quality_default
    ),
    'calculated_at', NOW()
  );
END;
$$;

-- =========================
-- 6. TRIGGER: Déclencher recalcul sur modification activity_data
-- =========================

-- Note: Ce trigger appelle une Edge Function via pg_net (extension Supabase)
-- Il faut d'abord activer l'extension pg_net

-- Activer l'extension pg_net si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fonction pour déclencher le webhook
CREATE OR REPLACE FUNCTION trigger_recalculation_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_webhook_url TEXT;
  v_payload JSONB;
BEGIN
  -- URL de la Edge Function (à configurer selon l'environnement)
  v_webhook_url := current_setting('app.settings.recalculation_webhook_url', true);
  
  -- Si pas d'URL configurée, ne rien faire
  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Construire le payload
  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', row_to_json(OLD)
  );

  -- Appeler le webhook de manière asynchrone
  PERFORM net.http_post(
    url := v_webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := v_payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Créer le trigger sur activity_data
DROP TRIGGER IF EXISTS trigger_recalculation_on_activity_change ON activity_data;
CREATE TRIGGER trigger_recalculation_on_activity_change
  AFTER INSERT OR UPDATE OR DELETE ON activity_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculation_webhook();

-- =========================
-- 7. COMMENTAIRES
-- =========================

COMMENT ON TABLE recalculation_queue IS 'Queue pour les tâches de recalcul automatique';
COMMENT ON FUNCTION calculate_bilan_carbone_from_activity_data IS 'Calcule le bilan carbone depuis activity_data';
COMMENT ON FUNCTION calculate_product_footprint_from_activity_data IS 'Calcule l''empreinte produit depuis activity_data';
COMMENT ON FUNCTION calculate_dashboard_metrics_from_activity_data IS 'Calcule les métriques dashboard depuis activity_data';
COMMENT ON FUNCTION trigger_recalculation_webhook IS 'Déclenche le webhook de recalcul automatique';
