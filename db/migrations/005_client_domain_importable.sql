-- =============================================================================
-- 005 — Domaine client importable (tables prêtes à recevoir la data CarboScan)
-- Convention :
--   * id UUID = même id qu'en source quand preserve_uuid=true
--   * organization_id partout (multi-tenant)
--   * legacy_source / legacy_id / import_batch_id / raw_legacy pour traçabilité
--   * payload souple (JSONB) pour colonnes non encore normalisées
-- =============================================================================

-- Helper macro-like comment: every client table gets these columns via pattern

CREATE TABLE IF NOT EXISTS organization_years (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year                INT NOT NULL,
  is_included         BOOLEAN NOT NULL DEFAULT true,
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, year)
);

CREATE TABLE IF NOT EXISTS collect_sites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  code                TEXT,
  country_code        CHAR(2),
  address             TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_collect_sites_legacy
  ON collect_sites(legacy_source, legacy_id) WHERE legacy_id IS NOT NULL;

-- Enrichir activity_data existante pour coller au modèle CarboScan + import
ALTER TABLE activity_data
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES collect_sites(id),
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS supplier_id UUID,
  ADD COLUMN IF NOT EXISTS activity_type TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS data_quality TEXT NOT NULL DEFAULT 'estimated',
  ADD COLUMN IF NOT EXISTS confidence_score INT,
  ADD COLUMN IF NOT EXISTS emission_factor_source TEXT,
  ADD COLUMN IF NOT EXISTS emission_factor_year INT,
  ADD COLUMN IF NOT EXISTS emission_factor_region TEXT,
  ADD COLUMN IF NOT EXISTS source_document TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

-- category was TEXT in 001; keep flexible
ALTER TABLE activity_data ALTER COLUMN category DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_data_legacy
  ON activity_data(legacy_source, legacy_id) WHERE legacy_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS activity_data_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_data_id    UUID NOT NULL REFERENCES activity_data(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  change_type         TEXT NOT NULL,
  before_state        JSONB,
  after_state         JSONB,
  changed_by          UUID REFERENCES users(id),
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrichir bilans
ALTER TABLE bilans_carbone
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS date_bilan TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analyse_commentaire TEXT,
  ADD COLUMN IF NOT EXISTS fichier_pdf TEXT,
  ADD COLUMN IF NOT EXISTS questionnaire_data JSONB,
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bilans_legacy
  ON bilans_carbone(legacy_source, legacy_id) WHERE legacy_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bilans_carbone_detail (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id            UUID NOT NULL REFERENCES bilans_carbone(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_data_id    UUID REFERENCES activity_data(id),
  label               TEXT,
  scope               INT CHECK (scope IN (1, 2, 3)),
  quantity            NUMERIC(24, 10),
  unit                TEXT,
  factor_value        NUMERIC(24, 12),
  result_kgco2e       NUMERIC(24, 10),
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS postes_emission (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id            UUID NOT NULL REFERENCES bilans_carbone(id) ON DELETE CASCADE,
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  poste_nom           TEXT NOT NULL,
  scope               INT NOT NULL CHECK (scope IN (1, 2, 3)),
  emission_valeur     NUMERIC(24, 10) NOT NULL,
  unite               TEXT,
  facteur_utilise     NUMERIC(24, 12),
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collect enrichi
ALTER TABLE collect_sessions
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES collect_sites(id),
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

CREATE TABLE IF NOT EXISTS collect_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES collect_sessions(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field_key           TEXT,
  value               JSONB,
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collect_files (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID REFERENCES collect_sessions(id) ON DELETE SET NULL,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  filename            TEXT,
  storage_uri         TEXT,
  mime_type           TEXT,
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collect_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title               TEXT,
  storage_uri         TEXT,
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Facteurs legacy (miroir souple avant consolidation registre versionné)
CREATE TABLE IF NOT EXISTS emission_factors_legacy (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT,
  factor_name         TEXT,
  nom_affiche         TEXT,
  slug                TEXT,
  emission_factor     NUMERIC(24, 12),
  unit                TEXT,
  category            TEXT,
  subcategory         TEXT,
  source              TEXT,
  year                INT,
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_emission_factors_legacy_id
  ON emission_factors_legacy(legacy_source, legacy_id) WHERE legacy_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS organization_emission_factors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factor_id           UUID REFERENCES emission_factors_legacy(id),
  custom_value        NUMERIC(24, 12),
  legacy_source       TEXT,
  legacy_id           TEXT,
  import_batch_id     UUID REFERENCES import_batches(id),
  imported_at         TIMESTAMPTZ,
  raw_legacy          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Modules CBAM / PCF / ACV / Suppliers / Climate — coquilles JSONB-first
-- (colonnes métier affinées au fil du portage ; raw_legacy garantit zéro perte)

CREATE TABLE IF NOT EXISTS cbam_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cbam_installations
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

CREATE TABLE IF NOT EXISTS cbam_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id UUID REFERENCES cbam_installations(id) ON DELETE CASCADE,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID REFERENCES pcf_studies(id) ON DELETE CASCADE,
  version_label TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID REFERENCES pcf_studies(id) ON DELETE CASCADE,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES acv_projects(id) ON DELETE CASCADE,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  roadmap_id UUID REFERENCES climate_roadmaps(id) ON DELETE CASCADE,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  questionnaire_id UUID REFERENCES questionnaires(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  plan_code TEXT,
  status TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  status TEXT,
  amount NUMERIC(24, 2),
  currency TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrichir profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

-- Vue de contrôle : couverture d'import par org
CREATE OR REPLACE VIEW v_import_org_coverage AS
SELECT
  o.id AS organization_id,
  o.name,
  o.legacy_id AS org_legacy_id,
  (SELECT COUNT(*) FROM activity_data a WHERE a.organization_id = o.id) AS activity_rows,
  (SELECT COUNT(*) FROM bilans_carbone b WHERE b.organization_id = o.id) AS bilan_rows,
  (SELECT COUNT(*) FROM collect_sessions c WHERE c.organization_id = o.id) AS collect_sessions,
  (SELECT COUNT(*) FROM organization_members m WHERE m.organization_id = o.id) AS members,
  o.imported_at,
  o.import_batch_id
FROM organizations o;
