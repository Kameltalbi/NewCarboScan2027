-- 033 — FORCE RLS sur tables tenant + politiques webhooks / enfants evidence
-- Complète 032 : le owner Postgres ne contourne plus les policies.
-- organization_members est exclu : /auth/login lit les appartenances
-- avant de poser app.organization_id (bootstrap de session).

DO $$
DECLARE
  r record;
  skip TEXT[] := ARRAY['organization_members'];
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
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.table_name);
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

-- evidence_history : pas de organization_id → via parent evidence_records
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'evidence_history'
  ) THEN
    ALTER TABLE evidence_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE evidence_history FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS evidence_history_via_parent ON evidence_history;
    CREATE POLICY evidence_history_via_parent ON evidence_history
      USING (
        current_setting('app.is_superadmin', true) = 'true'
        OR EXISTS (
          SELECT 1 FROM evidence_records er
          WHERE er.id = evidence_history.evidence_id
            AND er.organization_id::text = current_setting('app.organization_id', true)
        )
      )
      WITH CHECK (
        current_setting('app.is_superadmin', true) = 'true'
        OR EXISTS (
          SELECT 1 FROM evidence_records er
          WHERE er.id = evidence_history.evidence_id
            AND er.organization_id::text = current_setting('app.organization_id', true)
        )
      );
  END IF;
END
$$;
