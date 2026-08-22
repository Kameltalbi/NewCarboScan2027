-- Statut d'organisation pour le superadmin (suspendre / réactiver).
-- La suppression reste un DELETE (CASCADE déjà en place sur les tables métier).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

DO $$ BEGIN
  ALTER TABLE organizations
    ADD CONSTRAINT organizations_status_check
    CHECK (status IN ('active', 'suspended'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- FKs sans CASCADE : sinon DELETE d'une organisation échoue.
DO $$ BEGIN
  ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_organization_id_fkey;
  ALTER TABLE audit_events
    ADD CONSTRAINT audit_events_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

  ALTER TABLE api_request_logs DROP CONSTRAINT IF EXISTS api_request_logs_organization_id_fkey;
  ALTER TABLE api_request_logs
    ADD CONSTRAINT api_request_logs_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

  ALTER TABLE training_registrations DROP CONSTRAINT IF EXISTS training_registrations_organization_id_fkey;
  ALTER TABLE training_registrations
    ADD CONSTRAINT training_registrations_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

  ALTER TABLE chatbot_feedback DROP CONSTRAINT IF EXISTS chatbot_feedback_organization_id_fkey;
  ALTER TABLE chatbot_feedback
    ADD CONSTRAINT chatbot_feedback_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
END $$;
