-- ============================================================
-- Système de quota tokens pour la génération de rapports
-- Chaque organisation a un quota annuel de tokens (défaut: 6)
-- Chaque génération/régénération consomme 1 token
-- ============================================================

-- Table des quotas par organisation et année
CREATE TABLE IF NOT EXISTS report_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  tokens_total INTEGER NOT NULL DEFAULT 20,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, year)
);

-- Log de chaque génération de rapport
CREATE TABLE IF NOT EXISTS report_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  year INTEGER NOT NULL,
  generation_type TEXT NOT NULL DEFAULT 'generation' CHECK (generation_type IN ('generation', 'modification')),
  tokens_consumed INTEGER NOT NULL DEFAULT 1,
  pages_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_report_quota_org_year ON report_quota(organization_id, year);
CREATE INDEX IF NOT EXISTS idx_report_generations_org_year ON report_generations(organization_id, year);

-- RLS
ALTER TABLE report_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generations ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs voient le quota de leur organisation
CREATE POLICY "Users can view their org quota"
  ON report_quota FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT id FROM organizations WHERE id = auth.uid()
  ));

-- Politique : les utilisateurs voient les générations de leur organisation
CREATE POLICY "Users can view their org generations"
  ON report_generations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT id FROM organizations WHERE id = auth.uid()
  ));

-- Politique : insert pour les utilisateurs authentifiés (leur org)
CREATE POLICY "Users can insert generations for their org"
  ON report_generations FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT id FROM organizations WHERE id = auth.uid()
  ));

-- Politique : update quota (via service ou trigger)
CREATE POLICY "Users can update their org quota"
  ON report_quota FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT id FROM organizations WHERE id = auth.uid()
  ));

-- Politique : insert quota (auto-création)
CREATE POLICY "Users can insert quota for their org"
  ON report_quota FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT id FROM organizations WHERE id = auth.uid()
  ));

-- Fonction pour consommer un token et logger la génération
CREATE OR REPLACE FUNCTION consume_report_token(
  p_organization_id UUID,
  p_user_id UUID,
  p_year INTEGER,
  p_generation_type TEXT DEFAULT 'generation',
  p_pages_count INTEGER DEFAULT 0,
  p_tokens_cost INTEGER DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
  v_quota RECORD;
  v_tokens_remaining INTEGER;
BEGIN
  -- Créer le quota s'il n'existe pas encore pour cette année
  INSERT INTO report_quota (organization_id, year, tokens_total, tokens_used)
  VALUES (p_organization_id, p_year, 20, 0)
  ON CONFLICT (organization_id, year) DO NOTHING;

  -- Récupérer le quota actuel
  SELECT * INTO v_quota
  FROM report_quota
  WHERE organization_id = p_organization_id AND year = p_year
  FOR UPDATE;

  v_tokens_remaining := v_quota.tokens_total - v_quota.tokens_used;

  -- Si coût = 0 (génération gratuite), juste logger sans consommer
  IF p_tokens_cost = 0 THEN
    INSERT INTO report_generations (organization_id, user_id, year, generation_type, tokens_consumed, pages_count)
    VALUES (p_organization_id, p_user_id, p_year, p_generation_type, 0, p_pages_count);

    RETURN jsonb_build_object(
      'success', true,
      'tokens_total', v_quota.tokens_total,
      'tokens_used', v_quota.tokens_used,
      'tokens_remaining', v_tokens_remaining
    );
  END IF;

  -- Vérifier s'il reste assez de tokens
  IF v_tokens_remaining < p_tokens_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'quota_exceeded',
      'tokens_total', v_quota.tokens_total,
      'tokens_used', v_quota.tokens_used,
      'tokens_remaining', v_tokens_remaining
    );
  END IF;

  -- Consommer les tokens
  UPDATE report_quota
  SET tokens_used = tokens_used + p_tokens_cost, updated_at = now()
  WHERE id = v_quota.id;

  -- Logger la génération
  INSERT INTO report_generations (organization_id, user_id, year, generation_type, tokens_consumed, pages_count)
  VALUES (p_organization_id, p_user_id, p_year, p_generation_type, p_tokens_cost, p_pages_count);

  RETURN jsonb_build_object(
    'success', true,
    'tokens_total', v_quota.tokens_total,
    'tokens_used', v_quota.tokens_used + p_tokens_cost,
    'tokens_remaining', v_tokens_remaining - p_tokens_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
