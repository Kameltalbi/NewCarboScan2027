-- Newcarboscan-2027 — schéma consolidé PostgreSQL
-- Remplace les 241 migrations Supabase par une base certifiable.
-- Applique l'audit : chaîne de confiance + multi-tenant + auditabilité.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================================================
-- 0. Identité & multi-tenant
-- =============================================================================

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          CITEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE org_role AS ENUM (
  'owner', 'admin', 'editor', 'viewer', 'financeur', 'auditor'
);

CREATE TABLE organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            org_role NOT NULL DEFAULT 'viewer',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  key_hash        TEXT NOT NULL UNIQUE,
  scopes          TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_rpm  INT NOT NULL DEFAULT 60,
  last_used_at    TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- NOYAU 1 — Registre de données probantes
-- =============================================================================

CREATE TYPE evidence_origin AS ENUM (
  'manual', 'excel_import', 'invoice_ocr', 'api', 'estimated', 'third_party'
);

CREATE TYPE extraction_method AS ENUM (
  'human', 'ocr', 'parser', 'api_sync', 'model_assist'
);

CREATE TYPE validation_status AS ENUM (
  'draft', 'submitted', 'validated', 'rejected', 'superseded'
);

CREATE TABLE evidence_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_file_uri     TEXT,
  source_filename     TEXT,
  author_user_id      UUID REFERENCES users(id),
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_start        DATE,
  period_end          DATE,
  original_unit       TEXT NOT NULL,
  original_quantity   NUMERIC(24, 10) NOT NULL,
  transformed_unit    TEXT,
  transformed_quantity NUMERIC(24, 10),
  transformation_notes TEXT,
  origin              evidence_origin NOT NULL,
  extraction_method   extraction_method NOT NULL DEFAULT 'human',
  validation_status   validation_status NOT NULL DEFAULT 'draft',
  temporal_quality    TEXT,          -- e.g. measured / annualized / extrapolated
  geographic_quality  TEXT,
  technology_representativeness TEXT,
  uncertainty_pct     NUMERIC(8, 4),
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evidence_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id       UUID NOT NULL REFERENCES evidence_records(id) ON DELETE CASCADE,
  changed_by        UUID REFERENCES users(id),
  change_type       TEXT NOT NULL,
  before_state      JSONB,
  after_state       JSONB,
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_org ON evidence_records(organization_id);
CREATE INDEX idx_evidence_period ON evidence_records(period_start, period_end);

-- =============================================================================
-- NOYAU 2 — Registre versionné des facteurs d'émission
-- =============================================================================

CREATE TABLE factor_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,           -- ADEME Base Carbone, ecoinvent, ...
  license     TEXT,
  homepage    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE emission_factor_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       UUID NOT NULL REFERENCES factor_sources(id),
  version_label   TEXT NOT NULL,       -- e.g. Base Carbone 23.4
  published_year  INT,
  valid_from      DATE,
  valid_to        DATE,
  gwp_set         TEXT,               -- IPCC AR5 / AR6
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, version_label)
);

CREATE TABLE emission_factors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id          UUID NOT NULL REFERENCES emission_factor_versions(id),
  external_code       TEXT,
  name                TEXT NOT NULL,
  category            TEXT,
  geography           TEXT,
  technology          TEXT,
  unit_numerator      TEXT NOT NULL DEFAULT 'kgCO2e',
  unit_denominator    TEXT NOT NULL,
  value               NUMERIC(24, 12) NOT NULL,
  uncertainty_pct     NUMERIC(8, 4),
  selection_rule      TEXT,           -- how this factor should be chosen
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_factors_version ON emission_factors(version_id);
CREATE INDEX idx_factors_code ON emission_factors(external_code);

-- =============================================================================
-- NOYAU 3 — Moteur de calcul (métadonnées de runs)
-- Le calcul lui-même vit dans packages/carbon-engine (déterministe, sans IA).
-- =============================================================================

CREATE TABLE calculation_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  engine_version      TEXT NOT NULL,
  method              TEXT NOT NULL,   -- ghg_protocol | bilan_carbone | cbam | pcf
  period_start        DATE,
  period_end          DATE,
  input_hash          TEXT NOT NULL,  -- hash des entrées pour reproductibilité
  result_hash         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'completed',
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- NOYAU 4 — Ledger d'audit immuable
-- =============================================================================

CREATE TABLE calculation_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              UUID NOT NULL REFERENCES calculation_runs(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  line_key            TEXT NOT NULL,
  scope               INT CHECK (scope IN (1, 2, 3)),
  evidence_id         UUID REFERENCES evidence_records(id),
  factor_id           UUID REFERENCES emission_factors(id),
  formula             TEXT NOT NULL,
  activity_quantity   NUMERIC(24, 10) NOT NULL,
  activity_unit       TEXT NOT NULL,
  factor_value        NUMERIC(24, 12) NOT NULL,
  factor_unit         TEXT NOT NULL,
  allocation_factor   NUMERIC(24, 12) NOT NULL DEFAULT 1,
  result_kgco2e       NUMERIC(24, 10) NOT NULL,
  uncertainty_pct     NUMERIC(8, 4),
  engine_version      TEXT NOT NULL,
  provenance          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- immutability: no UPDATE/DELETE via app; enforced by revoke + trigger
  UNIQUE (run_id, line_key)
);

CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'calculation_ledger is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_no_update
  BEFORE UPDATE OR DELETE ON calculation_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE INDEX idx_ledger_org ON calculation_ledger(organization_id);
CREATE INDEX idx_ledger_run ON calculation_ledger(run_id);

-- =============================================================================
-- NOYAU 5 — Couche réglementaire / rapports (faits issus du ledger uniquement)
-- =============================================================================

CREATE TABLE reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id              UUID NOT NULL REFERENCES calculation_runs(id),
  title               TEXT NOT NULL,
  report_type         TEXT NOT NULL DEFAULT 'carbon_balance',
  -- structured_content ne doit contenir QUE des références au ledger + texte non quantitatif
  structured_content  JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_commentary       JSONB,          -- reformulation uniquement ; pas de chiffres nouveaux
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE report_line_links (
  report_id           UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  ledger_line_id      UUID NOT NULL REFERENCES calculation_ledger(id),
  section_key         TEXT NOT NULL,
  PRIMARY KEY (report_id, ledger_line_id, section_key)
);

-- =============================================================================
-- Domaines métier conservés (sous-ensemble consolidé de l'inventaire)
-- =============================================================================

CREATE TABLE activity_data (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  evidence_id         UUID REFERENCES evidence_records(id),
  category            TEXT NOT NULL,
  subcategory         TEXT,
  scope               INT CHECK (scope IN (1, 2, 3)),
  quantity            NUMERIC(24, 10) NOT NULL,
  unit                TEXT NOT NULL,
  period_start        DATE,
  period_end          DATE,
  factor_id           UUID REFERENCES emission_factors(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bilans_carbone (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id              UUID REFERENCES calculation_runs(id),
  name                TEXT NOT NULL,
  year                INT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft',
  total_kgco2e        NUMERIC(24, 10),
  scope1_kgco2e       NUMERIC(24, 10),
  scope2_kgco2e       NUMERIC(24, 10),
  scope3_kgco2e       NUMERIC(24, 10),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blog_posts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                CITEXT UNIQUE NOT NULL,
  title               TEXT NOT NULL,
  -- HTML doit être sanitisé avant insert (app layer) — jamais trust raw
  body_html_sanitized TEXT NOT NULL DEFAULT '',
  published           BOOLEAN NOT NULL DEFAULT false,
  author_user_id      UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Audit / sécurité applicative
-- =============================================================================

CREATE TABLE audit_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id),
  user_id             UUID REFERENCES users(id),
  action              TEXT NOT NULL,
  resource_type       TEXT,
  resource_id         TEXT,
  ip                  INET,
  user_agent          TEXT,
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE login_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               CITEXT,
  ip                  INET,
  success             BOOLEAN NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blocked_ips (
  ip                  INET PRIMARY KEY,
  reason              TEXT,
  blocked_until       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Helper: updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_updated BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_evidence_updated BEFORE UPDATE ON evidence_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_activity_updated BEFORE UPDATE ON activity_data
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bilans_updated BEFORE UPDATE ON bilans_carbone
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blog_updated BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
