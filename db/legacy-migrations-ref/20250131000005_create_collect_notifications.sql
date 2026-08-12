-- Migration: Table de notifications pour le module Collect

CREATE TABLE IF NOT EXISTS collect_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = notification pour tous les membres
  
  -- Type de notification
  type TEXT NOT NULL CHECK (type IN (
    'data_validation_required',
    'data_quality_warning',
    'collection_reminder',
    'collection_completed',
    'duplicate_detected',
    'import_completed',
    'export_ready',
    'team_member_added',
    'team_member_removed'
  )),
  
  -- Contenu
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- URL vers l'action à effectuer
  
  -- Métadonnées
  metadata JSONB, -- Données supplémentaires (ex: activity_data_id, etc.)
  
  -- Statut
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Priorité
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_collect_notifications_org ON collect_notifications(organization_id);
CREATE INDEX idx_collect_notifications_user ON collect_notifications(user_id);
CREATE INDEX idx_collect_notifications_read ON collect_notifications(read, created_at DESC);
CREATE INDEX idx_collect_notifications_type ON collect_notifications(type);
CREATE INDEX idx_collect_notifications_created ON collect_notifications(created_at DESC);

-- RLS
ALTER TABLE collect_notifications ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les notifications de leur organisation
CREATE POLICY "Users can view notifications of their organization"
  ON collect_notifications FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Politique: Les utilisateurs peuvent marquer leurs notifications comme lues
CREATE POLICY "Users can update their notifications"
  ON collect_notifications FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND (user_id IS NULL OR user_id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_collect_notification(
  p_organization_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO collect_notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    action_url,
    metadata,
    priority
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_action_url,
    p_metadata,
    p_priority
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Commentaires
COMMENT ON TABLE collect_notifications IS 'Notifications pour le module Collect de données';
COMMENT ON COLUMN collect_notifications.user_id IS 'NULL = notification pour tous les membres de l''organisation';
COMMENT ON COLUMN collect_notifications.metadata IS 'Données supplémentaires au format JSON (ex: activity_data_id, etc.)';
