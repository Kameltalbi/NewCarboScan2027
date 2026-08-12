-- =============================================================================
-- 004 — Framework d'import des données clients (CarboScan Supabase → PostgreSQL)
-- Objectif : pouvoir réinjecter TOUTE la data client sans perdre les IDs utiles
--            et sans perdre la chaîne de confiance (provenance + batch + erreurs).
-- =============================================================================

-- Origine d'un enregistrement importé
DO $$ BEGIN
  CREATE TYPE import_source AS ENUM (
    'carboscan_supabase',
    'manual_json',
    'csv',
    'api'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE import_batch_status AS ENUM (
    'draft',
    'staging',
    'validating',
    'importing',
    'completed',
    'completed_with_errors',
    'failed',
    'rolled_back'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE import_item_status AS ENUM (
    'pending',
    'mapped',
    'imported',
    'skipped',
    'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Batch d'import (1 organisation cible OU import global plateforme)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label               TEXT NOT NULL,
  source              import_source NOT NULL DEFAULT 'carboscan_supabase',
  -- Si renseigné : import scoped à une org cible Newcarboscan
  target_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  status              import_batch_status NOT NULL DEFAULT 'draft',
  -- Manifeste : liste ordonnée des entity_type + compteurs
  manifest            JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by          UUID REFERENCES users(id),
  started_at          TIMESTAMPTZ,
  finished_at         TIMESTAMPTZ,
  error_summary       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_org ON import_batches(target_organization_id);

-- -----------------------------------------------------------------------------
-- Staging brut : une ligne JSON = une ligne source (aucune transformation perdue)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_staging (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  entity_type         TEXT NOT NULL,          -- ex: organizations, activity_data
  legacy_id           TEXT,                   -- id source (uuid ou autre)
  payload             JSONB NOT NULL,         -- row complète telle qu'exportée
  payload_hash        TEXT NOT NULL,          -- idempotence
  status              import_item_status NOT NULL DEFAULT 'pending',
  error_message       TEXT,
  imported_record_id  UUID,                   -- id final dans la table cible
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, entity_type, payload_hash)
);

CREATE INDEX IF NOT EXISTS idx_import_staging_batch_entity
  ON import_staging(batch_id, entity_type, status);
CREATE INDEX IF NOT EXISTS idx_import_staging_legacy
  ON import_staging(entity_type, legacy_id);

-- -----------------------------------------------------------------------------
-- Carte d'identifiants legacy → new (indispensable si UUID non préservé)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_id_map (
  entity_type         TEXT NOT NULL,
  legacy_id           TEXT NOT NULL,
  new_id              UUID NOT NULL,
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  batch_id            UUID REFERENCES import_batches(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_import_id_map_new ON import_id_map(entity_type, new_id);
CREATE INDEX IF NOT EXISTS idx_import_id_map_org ON import_id_map(organization_id);

-- -----------------------------------------------------------------------------
-- Catalogue des entités importables (ordre de dépendance)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_entity_catalog (
  entity_type         TEXT PRIMARY KEY,
  target_table        TEXT NOT NULL,
  depends_on          TEXT[] NOT NULL DEFAULT '{}',
  sort_order          INT NOT NULL,
  preserve_uuid       BOOLEAN NOT NULL DEFAULT true,
  org_scoped          BOOLEAN NOT NULL DEFAULT true,
  description         TEXT,
  enabled             BOOLEAN NOT NULL DEFAULT true
);

-- Colonnes d'audit import sur les tables cœur déjà créées
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_legacy
  ON organizations(legacy_source, legacy_id)
  WHERE legacy_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_legacy
  ON users(legacy_source, legacy_id)
  WHERE legacy_id IS NOT NULL;

-- Seed catalogue (ordre = dépendances)
INSERT INTO import_entity_catalog (entity_type, target_table, depends_on, sort_order, preserve_uuid, org_scoped, description)
VALUES
  ('users', 'users', '{}', 10, true, false, 'Comptes (auth.users → users, mot de passe à réinitialiser)'),
  ('profiles', 'profiles', '{users}', 20, true, false, 'Profils utilisateurs'),
  ('organizations', 'organizations', '{users}', 30, true, false, 'Organisations clientes'),
  ('organization_members', 'organization_members', '{organizations,users}', 40, false, true, 'Memberships'),
  ('organization_years', 'organization_years', '{organizations}', 50, true, true, 'Années de reporting'),
  ('organization_modules', 'organization_modules', '{organizations,modules}', 60, false, true, 'Modules activés'),
  ('modules', 'modules', '{}', 15, true, false, 'Catalogue modules'),
  ('collect_sites', 'collect_sites', '{organizations}', 70, true, true, 'Sites de collecte'),
  ('collect_sessions', 'collect_sessions', '{organizations,collect_sites}', 80, true, true, 'Sessions de collecte'),
  ('collect_responses', 'collect_responses', '{collect_sessions}', 90, true, true, 'Réponses collecte'),
  ('collect_files', 'collect_files', '{collect_sessions}', 100, true, true, 'Fichiers collecte'),
  ('collect_documents', 'collect_documents', '{organizations}', 110, true, true, 'Dataroom'),
  ('activity_data', 'activity_data', '{organizations}', 120, true, true, 'Données d''activité carbone'),
  ('activity_data_history', 'activity_data_history', '{activity_data}', 130, true, true, 'Historique activité'),
  ('emission_factors', 'emission_factors_legacy', '{organizations}', 140, true, false, 'Facteurs (global + org)'),
  ('organization_emission_factors', 'organization_emission_factors', '{organizations,emission_factors}', 150, true, true, 'Facteurs custom org'),
  ('bilans_carbone', 'bilans_carbone', '{organizations}', 160, true, true, 'Bilans carbone'),
  ('bilans_carbone_detail', 'bilans_carbone_detail', '{bilans_carbone,activity_data}', 170, true, true, 'Détail bilans'),
  ('postes_emission', 'postes_emission', '{bilans_carbone}', 180, true, true, 'Postes d''émission'),
  ('cbam_installations', 'cbam_installations', '{organizations}', 200, true, true, 'CBAM installations'),
  ('cbam_products', 'cbam_products', '{organizations}', 210, true, true, 'CBAM produits'),
  ('cbam_production', 'cbam_production', '{cbam_installations}', 220, true, true, 'CBAM production'),
  ('cbam_reports', 'cbam_reports', '{organizations}', 230, true, true, 'CBAM reports'),
  ('pcf_studies', 'pcf_studies', '{organizations}', 300, true, true, 'Études PCF'),
  ('pcf_versions', 'pcf_versions', '{pcf_studies}', 310, true, true, 'Versions PCF'),
  ('pcf_results', 'pcf_results', '{pcf_studies}', 320, true, true, 'Résultats PCF'),
  ('acv_projects', 'acv_projects', '{organizations}', 400, true, true, 'Projets ACV'),
  ('inventory', 'acv_inventory', '{acv_projects}', 410, true, true, 'Inventaire ACV'),
  ('suppliers', 'suppliers', '{organizations}', 500, true, true, 'Fournisseurs'),
  ('supplier_purchases', 'supplier_purchases', '{suppliers}', 510, true, true, 'Achats fournisseurs'),
  ('climate_roadmaps', 'climate_roadmaps', '{organizations}', 600, true, true, 'Feuilles de route climat'),
  ('climate_actions', 'climate_actions', '{climate_roadmaps}', 610, true, true, 'Actions climat'),
  ('generated_reports', 'generated_reports', '{organizations}', 700, true, true, 'Rapports générés'),
  ('questionnaires', 'questionnaires', '{organizations}', 800, true, true, 'Questionnaires'),
  ('questionnaire_responses', 'questionnaire_responses', '{questionnaires,users}', 810, true, true, 'Réponses questionnaires'),
  ('user_subscriptions', 'user_subscriptions', '{users,organizations}', 900, true, true, 'Abonnements'),
  ('orders', 'orders', '{users,organizations}', 910, true, true, 'Commandes'),
  ('contact_requests', 'contact_requests', '{}', 920, true, false, 'Leads / demandes'),
  ('blog_posts', 'blog_posts', '{}', 930, true, false, 'Articles blog')
ON CONFLICT (entity_type) DO UPDATE
SET target_table = EXCLUDED.target_table,
    depends_on = EXCLUDED.depends_on,
    sort_order = EXCLUDED.sort_order,
    description = EXCLUDED.description;

CREATE TRIGGER trg_import_batches_updated
  BEFORE UPDATE ON import_batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
