-- Migration: Système de validation des données par Admin/Auditeur
-- Date: 2026-01-31
-- Description: Ajout de statuts de validation et rôles pour la collecte de données

-- =============================================================================
-- ENUM: Statuts de validation des données
-- =============================================================================

CREATE TYPE data_validation_status AS ENUM (
  'draft',           -- Brouillon (en cours de saisie)
  'pending_review',  -- En attente de validation
  'validated',       -- Validé par Admin/Auditeur (verrouillé)
  'rejected'         -- Rejeté (à corriger)
);

COMMENT ON TYPE data_validation_status IS 'Statuts de validation des données collectées';

-- =============================================================================
-- ENUM: Rôles utilisateurs pour la validation
-- =============================================================================

CREATE TYPE user_validation_role AS ENUM (
  'collector',       -- Peut saisir uniquement
  'admin',          -- Peut saisir + valider
  'auditor'         -- Peut valider uniquement (lecture + validation)
);

COMMENT ON TYPE user_validation_role IS 'Rôles pour la validation des données (collector, admin, auditor)';

-- =============================================================================
-- TABLE: data_validation_periods
-- Périodes de collecte avec statut de validation global
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_validation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiants
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Période
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label TEXT, -- Ex: "Bilan 2025", "T1 2026"
  
  -- Statut global de la période
  status data_validation_status NOT NULL DEFAULT 'draft',
  
  -- Validation
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  validation_notes TEXT,
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contrainte d'unicité
  UNIQUE(organization_id, period_start, period_end)
);

CREATE INDEX idx_validation_periods_org ON data_validation_periods(organization_id);
CREATE INDEX idx_validation_periods_status ON data_validation_periods(status);
CREATE INDEX idx_validation_periods_dates ON data_validation_periods(period_start, period_end);

COMMENT ON TABLE data_validation_periods IS 'Périodes de collecte avec statut de validation global';
COMMENT ON COLUMN data_validation_periods.status IS 'Statut global : draft, pending_review, validated, rejected';
COMMENT ON COLUMN data_validation_periods.validated_by IS 'Admin ou Auditeur qui a validé';

-- =============================================================================
-- EXTENSION: activity_data - Ajout de colonnes de validation
-- =============================================================================

ALTER TABLE activity_data 
ADD COLUMN IF NOT EXISTS validation_status data_validation_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validation_notes TEXT,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_activity_data_validation_status 
ON activity_data(validation_status);

CREATE INDEX IF NOT EXISTS idx_activity_data_is_locked 
ON activity_data(is_locked);

COMMENT ON COLUMN activity_data.validation_status IS 'Statut de validation : draft, pending_review, validated, rejected';
COMMENT ON COLUMN activity_data.validated_by IS 'Admin ou Auditeur qui a validé cette donnée';
COMMENT ON COLUMN activity_data.is_locked IS 'TRUE = donnée verrouillée (non modifiable après validation)';

-- =============================================================================
-- TABLE: profiles - Ajout du rôle de validation
-- =============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS validation_role user_validation_role DEFAULT 'collector';

COMMENT ON COLUMN profiles.validation_role IS 'Rôle pour la validation : collector, admin, auditor';

-- =============================================================================
-- FONCTION: Valider une période complète
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_collection_period(
  p_organization_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_validated_by UUID,
  p_validation_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role user_validation_role;
BEGIN
  -- Vérifier le rôle de l'utilisateur
  SELECT validation_role INTO v_user_role
  FROM profiles
  WHERE id = p_validated_by;
  
  IF v_user_role NOT IN ('admin', 'auditor') THEN
    RAISE EXCEPTION 'Seuls les Admin et Auditeurs peuvent valider les données';
  END IF;
  
  -- Mettre à jour toutes les données de la période
  UPDATE activity_data
  SET 
    validation_status = 'validated',
    validated_by = p_validated_by,
    validated_at = NOW(),
    validation_notes = p_validation_notes,
    is_locked = true,
    updated_at = NOW()
  WHERE 
    organization_id = p_organization_id
    AND period_start >= p_period_start
    AND period_end <= p_period_end
    AND validation_status != 'validated'; -- Ne pas revalider ce qui est déjà validé
  
  -- Créer ou mettre à jour la période de validation
  INSERT INTO data_validation_periods (
    organization_id,
    period_start,
    period_end,
    status,
    validated_by,
    validated_at,
    validation_notes
  )
  VALUES (
    p_organization_id,
    p_period_start,
    p_period_end,
    'validated',
    p_validated_by,
    NOW(),
    p_validation_notes
  )
  ON CONFLICT (organization_id, period_start, period_end)
  DO UPDATE SET
    status = 'validated',
    validated_by = p_validated_by,
    validated_at = NOW(),
    validation_notes = p_validation_notes,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION validate_collection_period IS 'Valide toutes les données d''une période (réservé Admin/Auditeur)';

-- =============================================================================
-- FONCTION: Déverrouiller une période (Admin uniquement)
-- =============================================================================

CREATE OR REPLACE FUNCTION unlock_collection_period(
  p_organization_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_unlocked_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role user_validation_role;
BEGIN
  -- Vérifier le rôle de l'utilisateur (ADMIN uniquement)
  SELECT validation_role INTO v_user_role
  FROM profiles
  WHERE id = p_unlocked_by;
  
  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Seuls les Admins peuvent déverrouiller les données';
  END IF;
  
  -- Déverrouiller toutes les données de la période
  UPDATE activity_data
  SET 
    validation_status = 'draft',
    validated_by = NULL,
    validated_at = NULL,
    is_locked = false,
    updated_at = NOW()
  WHERE 
    organization_id = p_organization_id
    AND period_start >= p_period_start
    AND period_end <= p_period_end;
  
  -- Mettre à jour la période
  UPDATE data_validation_periods
  SET 
    status = 'draft',
    validated_by = NULL,
    validated_at = NULL,
    updated_at = NOW()
  WHERE 
    organization_id = p_organization_id
    AND period_start = p_period_start
    AND period_end = p_period_end;
END;
$$;

COMMENT ON FUNCTION unlock_collection_period IS 'Déverrouille une période validée (réservé Admin uniquement)';

-- =============================================================================
-- FONCTION: Récupérer les statistiques de validation
-- =============================================================================

CREATE OR REPLACE FUNCTION get_validation_stats(org_id UUID, p_start DATE, p_end DATE)
RETURNS TABLE (
  total_data BIGINT,
  draft_data BIGINT,
  pending_data BIGINT,
  validated_data BIGINT,
  rejected_data BIGINT,
  locked_data BIGINT,
  can_validate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_data,
    COUNT(*) FILTER (WHERE validation_status = 'draft')::BIGINT AS draft_data,
    COUNT(*) FILTER (WHERE validation_status = 'pending_review')::BIGINT AS pending_data,
    COUNT(*) FILTER (WHERE validation_status = 'validated')::BIGINT AS validated_data,
    COUNT(*) FILTER (WHERE validation_status = 'rejected')::BIGINT AS rejected_data,
    COUNT(*) FILTER (WHERE is_locked = true)::BIGINT AS locked_data,
    (COUNT(*) > 0 AND COUNT(*) FILTER (WHERE validation_status = 'draft') = 0)::BOOLEAN AS can_validate
  FROM activity_data
  WHERE 
    organization_id = org_id
    AND period_start >= p_start
    AND period_end <= p_end;
END;
$$;

COMMENT ON FUNCTION get_validation_stats IS 'Retourne les statistiques de validation pour une période';

-- =============================================================================
-- TRIGGER: Empêcher la modification des données verrouillées
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_locked_data_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_locked = true AND NEW.is_locked = true THEN
    -- Autoriser uniquement les admins à déverrouiller
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND validation_role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Cette donnée est verrouillée et ne peut pas être modifiée. Contactez un administrateur.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_locked_modification ON activity_data;
CREATE TRIGGER trigger_prevent_locked_modification
  BEFORE UPDATE ON activity_data
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_data_modification();

COMMENT ON FUNCTION prevent_locked_data_modification() IS 'Empêche la modification des données verrouillées (sauf Admin)';

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================

ALTER TABLE data_validation_periods ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture pour les membres de l'organisation
DROP POLICY IF EXISTS "Users can view their org validation periods" ON data_validation_periods;
CREATE POLICY "Users can view their org validation periods"
  ON data_validation_periods
  FOR SELECT
  USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      INNER JOIN profiles p ON o.user_id = p.id
      WHERE p.id = auth.uid()
    )
  );

-- Policy: Seuls Admin/Auditeur peuvent valider
DROP POLICY IF EXISTS "Admin and Auditor can validate periods" ON data_validation_periods;
CREATE POLICY "Admin and Auditor can validate periods"
  ON data_validation_periods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND validation_role IN ('admin', 'auditor')
    )
  );

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON data_validation_periods TO authenticated;
GRANT EXECUTE ON FUNCTION validate_collection_period TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_collection_period TO authenticated;
GRANT EXECUTE ON FUNCTION get_validation_stats TO authenticated;
