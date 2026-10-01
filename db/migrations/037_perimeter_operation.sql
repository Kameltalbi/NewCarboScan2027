-- ABC-02 — méthode de consolidation et statut d'exploitation.
-- Le défaut reprend la phrase déjà imprimée dans les rapports.
-- Il ne reclasse aucune ligne d'activité.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS consolidation_method TEXT NOT NULL DEFAULT 'operational_control';

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_consolidation_method_chk;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_consolidation_method_chk
  CHECK (consolidation_method IN ('operational_control', 'financial_control'));

COMMENT ON COLUMN organizations.consolidation_method IS
  'Méthode de périmètre enregistrée. Défaut : contrôle opérationnel, phrase déjà utilisée dans les rapports. Non validé ABC.';

ALTER TABLE collect_sites
  ADD COLUMN IF NOT EXISTS operation_status TEXT;

ALTER TABLE collect_sites
  DROP CONSTRAINT IF EXISTS collect_sites_operation_status_chk;

ALTER TABLE collect_sites
  ADD CONSTRAINT collect_sites_operation_status_chk
  CHECK (operation_status IS NULL OR operation_status IN ('operated', 'not_operated'));

COMMENT ON COLUMN collect_sites.operation_status IS
  'Opéré ou non opéré. N''écrit pas le scope de la ligne d''activité.';
