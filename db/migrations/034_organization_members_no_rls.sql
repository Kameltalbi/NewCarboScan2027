-- 034 — Retire le RLS de organization_members
-- 033 (déjà appliquée) a forcé tenant_isolation sur cette table.
-- Le login interroge les appartenances via le rôle applicatif, sans
-- app.organization_id : avec RLS, la session n'a plus d'organisation.

ALTER TABLE organization_members NO FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON organization_members;
