-- Migration: Table d'historique pour activity_data (audit trail)
-- Track toutes les modifications des données d'activité

CREATE TABLE IF NOT EXISTS activity_data_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_data_id UUID NOT NULL REFERENCES activity_data(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Type d'action
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  
  -- Données avant (pour updated/deleted)
  old_data JSONB,
  
  -- Données après (pour created/updated)
  new_data JSONB,
  
  -- Métadonnées
  changed_fields TEXT[], -- Liste des champs modifiés
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT, -- Raison du changement (optionnel)
  ip_address INET, -- Adresse IP (optionnel, pour audit)
  user_agent TEXT, -- User agent (optionnel)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_activity_data_history_activity ON activity_data_history(activity_data_id);
CREATE INDEX idx_activity_data_history_org ON activity_data_history(organization_id);
CREATE INDEX idx_activity_data_history_action ON activity_data_history(action);
CREATE INDEX idx_activity_data_history_created ON activity_data_history(created_at DESC);
CREATE INDEX idx_activity_data_history_user ON activity_data_history(changed_by);

-- RLS
ALTER TABLE activity_data_history ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir l'historique de leur organisation
CREATE POLICY "Users can view history of their organization"
  ON activity_data_history FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Trigger pour enregistrer automatiquement les modifications
CREATE OR REPLACE FUNCTION log_activity_data_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_list TEXT[] := ARRAY[]::TEXT[];
  old_json JSONB;
  new_json JSONB;
BEGIN
  -- Construire le JSON des données
  IF TG_OP = 'DELETE' THEN
    old_json := row_to_json(OLD)::JSONB;
    new_json := NULL;
    
    INSERT INTO activity_data_history (
      activity_data_id,
      organization_id,
      action,
      old_data,
      new_data,
      changed_by
    ) VALUES (
      OLD.id,
      OLD.organization_id,
      'deleted',
      old_json,
      NULL,
      auth.uid()
    );
    
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := row_to_json(OLD)::JSONB;
    new_json := row_to_json(NEW)::JSONB;
    
    -- Détecter les champs modifiés
    SELECT array_agg(key)
    INTO changed_fields_list
    FROM jsonb_each(old_json)
    WHERE value IS DISTINCT FROM new_json->key;
    
    INSERT INTO activity_data_history (
      activity_data_id,
      organization_id,
      action,
      old_data,
      new_data,
      changed_fields,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      'updated',
      old_json,
      new_json,
      changed_fields_list,
      auth.uid()
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    new_json := row_to_json(NEW)::JSONB;
    
    INSERT INTO activity_data_history (
      activity_data_id,
      organization_id,
      action,
      old_data,
      new_data,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      'created',
      NULL,
      new_json,
      auth.uid()
    );
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer les triggers
DROP TRIGGER IF EXISTS trigger_log_activity_data_changes ON activity_data;
CREATE TRIGGER trigger_log_activity_data_changes
  AFTER INSERT OR UPDATE OR DELETE ON activity_data
  FOR EACH ROW
  EXECUTE FUNCTION log_activity_data_changes();

-- Commentaires
COMMENT ON TABLE activity_data_history IS 'Historique complet des modifications de activity_data (audit trail)';
COMMENT ON COLUMN activity_data_history.action IS 'Type d''action: created, updated, deleted';
COMMENT ON COLUMN activity_data_history.old_data IS 'Données avant modification (JSON)';
COMMENT ON COLUMN activity_data_history.new_data IS 'Données après modification (JSON)';
COMMENT ON COLUMN activity_data_history.changed_fields IS 'Liste des champs modifiés (pour updated)';
