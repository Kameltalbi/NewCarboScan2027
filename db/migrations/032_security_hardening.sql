-- 032 — Isolation RLS, auth (révocation, reset, MFA), webhooks, paramètres plateforme
-- Rôle applicatif ncs_app : mot de passe posé par scripts/migrate.sh (pas dans Git).

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti          TEXT PRIMARY KEY,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_exp ON revoked_tokens (expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_secret_enc TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES users(id)
);

INSERT INTO platform_settings (key, value) VALUES
  (
    'security',
    jsonb_build_object(
      'require_mfa', false,
      'session_timeout_hours', 8,
      'max_login_attempts', 5,
      'password_min_length', 8,
      'idle_timeout_minutes', 30
    )
  )
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS organization_webhooks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  secret_hash     TEXT NOT NULL,
  secret_prefix   TEXT NOT NULL,
  events          TEXT[] NOT NULL DEFAULT ARRAY['evidence.validated', 'run.published'],
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      UUID NOT NULL REFERENCES organization_webhooks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,
  status_code     INT,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historique activity_data (fail-closed, org-scoped)
CREATE OR REPLACE FUNCTION ncs_log_activity_data_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor UUID;
BEGIN
  BEGIN
    actor := nullif(current_setting('app.user_id', true), '')::uuid;
  EXCEPTION WHEN others THEN
    actor := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_data_history (
      activity_data_id, organization_id, change_type, action,
      after_state, new_data, changed_by
    ) VALUES (
      NEW.id, NEW.organization_id, 'created', 'created',
      to_jsonb(NEW), to_jsonb(NEW), actor
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_data_history (
      activity_data_id, organization_id, change_type, action,
      before_state, after_state, old_data, new_data, changed_by
    ) VALUES (
      NEW.id, NEW.organization_id, 'updated', 'updated',
      to_jsonb(OLD), to_jsonb(NEW), to_jsonb(OLD), to_jsonb(NEW), actor
    );
    RETURN NEW;
  ELSE
    INSERT INTO activity_data_history (
      activity_data_id, organization_id, change_type, action,
      before_state, old_data, changed_by
    ) VALUES (
      OLD.id, OLD.organization_id, 'deleted', 'deleted',
      to_jsonb(OLD), to_jsonb(OLD), actor
    );
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_data_history ON activity_data;
CREATE TRIGGER trg_activity_data_history
  AFTER INSERT OR UPDATE OR DELETE ON activity_data
  FOR EACH ROW EXECUTE FUNCTION ncs_log_activity_data_changes();

-- Rétention (connexion 1 an, reset/révocation expirés)
CREATE OR REPLACE FUNCTION ncs_run_retention()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  n_login INT;
  n_revoked INT;
  n_reset INT;
BEGIN
  DELETE FROM login_attempts WHERE created_at < now() - interval '1 year';
  GET DIAGNOSTICS n_login = ROW_COUNT;
  DELETE FROM revoked_tokens WHERE expires_at < now();
  GET DIAGNOSTICS n_revoked = ROW_COUNT;
  DELETE FROM password_reset_tokens WHERE expires_at < now() OR used_at IS NOT NULL;
  GET DIAGNOSTICS n_reset = ROW_COUNT;
  RETURN jsonb_build_object(
    'login_attempts', n_login,
    'revoked_tokens', n_revoked,
    'password_reset_tokens', n_reset
  );
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ncs_app') THEN
    CREATE ROLE ncs_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO ncs_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ncs_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ncs_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ncs_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ncs_app;

-- RLS : tables métier avec organization_id (hors organisations / membres = bootstrap auth)
DO $$
DECLARE
  r record;
  skip TEXT[] := ARRAY[
    'organizations',
    'organization_members',
    'import_batches',
    'organization_webhooks',
    'webhook_deliveries'
  ];
BEGIN
  FOR r IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
      AND NOT (c.table_name = ANY (skip))
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', r.table_name);
    EXECUTE format(
      $p$
      CREATE POLICY tenant_isolation ON %I
        USING (
          current_setting('app.is_superadmin', true) = 'true'
          OR (
            current_setting('app.organization_id', true) <> ''
            AND organization_id::text = current_setting('app.organization_id', true)
          )
        )
        WITH CHECK (
          current_setting('app.is_superadmin', true) = 'true'
          OR (
            current_setting('app.organization_id', true) <> ''
            AND organization_id::text = current_setting('app.organization_id', true)
          )
        )
      $p$,
      r.table_name
    );
  END LOOP;
END
$$;
