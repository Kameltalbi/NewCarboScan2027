-- =============================================================================
-- 006 — Portage Collect + Activity + Bilan (schéma métier riche)
-- Enrichit les tables existantes et crée les tables collect manquantes.
-- =============================================================================

-- Organizations: colonnes métier CarboScan
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS reference_year INT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TND',
  ADD COLUMN IF NOT EXISTS energy_unit TEXT,
  ADD COLUMN IF NOT EXISTS mass_unit TEXT,
  ADD COLUMN IF NOT EXISTS distance_unit TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS pilot_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS max_users INT;

-- organization_members: colonnes invitation
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

-- ---------------------------------------------------------------------------
-- Collect sites (enrich)
-- ---------------------------------------------------------------------------
ALTER TABLE collect_sites
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS site_type TEXT,
  ADD COLUMN IF NOT EXISTS surface_m2 NUMERIC,
  ADD COLUMN IF NOT EXISTS employees_count INT,
  ADD COLUMN IF NOT EXISTS is_consolidated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS annual_revenue NUMERIC,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Collect sessions (align CarboScan)
-- ---------------------------------------------------------------------------
ALTER TABLE collect_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS year INT,
  ADD COLUMN IF NOT EXISTS progress_percentage INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_sections TEXT[],
  ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS answered_questions INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_pending BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bilan_id UUID,
  ADD COLUMN IF NOT EXISTS ai_suggestions_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_periodic BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------------
-- Collect responses / files (enrich)
-- ---------------------------------------------------------------------------
ALTER TABLE collect_responses
  ADD COLUMN IF NOT EXISTS question_key TEXT,
  ADD COLUMN IF NOT EXISTS question_category TEXT,
  ADD COLUMN IF NOT EXISTS question_label TEXT,
  ADD COLUMN IF NOT EXISTS scope INT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC,
  ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_suggested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES collect_sites(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Map field_key → question_key if empty
UPDATE collect_responses SET question_key = field_key
WHERE question_key IS NULL AND field_key IS NOT NULL;

ALTER TABLE collect_files
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size INT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS extraction_status TEXT,
  ADD COLUMN IF NOT EXISTS extracted_data JSONB;

UPDATE collect_files SET file_name = COALESCE(file_name, filename),
                       storage_path = COALESCE(storage_path, storage_uri)
WHERE file_name IS NULL OR storage_path IS NULL;

ALTER TABLE collect_documents
  ADD COLUMN IF NOT EXISTS activity_data_id UUID,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE collect_documents SET name = COALESCE(name, title) WHERE name IS NULL;

-- ---------------------------------------------------------------------------
-- Collect satellites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collect_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal',
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collect_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES collect_sessions(id) ON DELETE CASCADE,
  company_id UUID,
  user_id UUID REFERENCES users(id),
  target_type TEXT NOT NULL,
  target_id UUID,
  target_key TEXT,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES collect_comments(id),
  mentioned_user_ids UUID[],
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collect_estimations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES collect_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_category TEXT,
  estimated_value NUMERIC NOT NULL,
  estimated_unit TEXT,
  confidence_score NUMERIC,
  confidence_level TEXT,
  estimation_method TEXT,
  source_data JSONB,
  historical_values JSONB,
  trend_direction TEXT,
  seasonal_factor NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  user_value NUMERIC,
  user_unit TEXT,
  reasoning TEXT,
  accepted_at TIMESTAMPTZ,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collect_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES collect_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  suggested_value JSONB NOT NULL,
  confidence NUMERIC,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collect_periodic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  parent_session_id UUID REFERENCES collect_sessions(id),
  session_id UUID REFERENCES collect_sessions(id),
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collect_historical_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  company_id UUID,
  question_key TEXT NOT NULL,
  question_category TEXT,
  avg_value NUMERIC, min_value NUMERIC, max_value NUMERIC, std_deviation NUMERIC,
  data_points INT, trend_slope NUMERIC, trend_direction TEXT,
  seasonal_factors JSONB,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS periodic_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES collect_sites(id),
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  custom_schedule JSONB,
  target_period_start DATE,
  target_period_end DATE,
  next_collection_date DATE,
  last_collection_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  notify_before_days INT,
  notify_on_due BOOLEAN DEFAULT true,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS periodic_collection_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodic_collection_id UUID NOT NULL REFERENCES periodic_collections(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  data_count INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  poste_code TEXT NOT NULL,
  poste_name TEXT NOT NULL,
  scope INT,
  is_mandatory BOOLEAN DEFAULT false,
  is_csrd_required BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'todo',
  data_count INT DEFAULT 0,
  documents_needed TEXT[],
  method_description TEXT,
  example_text TEXT,
  last_updated_at TIMESTAMPTZ,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Activity enrich
-- ---------------------------------------------------------------------------
ALTER TABLE activity_data
  ADD COLUMN IF NOT EXISTS scope_hint INT,
  ADD COLUMN IF NOT EXISTS scope3_category_id TEXT,
  ADD COLUMN IF NOT EXISTS validation_status TEXT,
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validation_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

ALTER TABLE activity_data_history
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS old_data JSONB,
  ADD COLUMN IF NOT EXISTS new_data JSONB,
  ADD COLUMN IF NOT EXISTS changed_fields TEXT[],
  ADD COLUMN IF NOT EXISTS change_reason TEXT,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE TABLE IF NOT EXISTS activity_energy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  year INT NOT NULL,
  site TEXT,
  scope SMALLINT CHECK (scope IN (1, 2)),
  category TEXT NOT NULL,
  subcategory TEXT,
  energy_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price_baseline NUMERIC,
  currency TEXT DEFAULT 'TND',
  emission_factor_co2 NUMERIC,
  include_in_simulation BOOLEAN DEFAULT true,
  notes TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_data_to_bilan_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  activity_data_id UUID NOT NULL REFERENCES activity_data(id) ON DELETE CASCADE,
  bilan_detail_id UUID NOT NULL REFERENCES bilans_carbone_detail(id) ON DELETE CASCADE,
  emissions_contribution_kg_co2e NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Bilans enrich
-- ---------------------------------------------------------------------------
ALTER TABLE bilans_carbone
  ADD COLUMN IF NOT EXISTS total_emission NUMERIC,
  ADD COLUMN IF NOT EXISTS scope1_emission NUMERIC,
  ADD COLUMN IF NOT EXISTS scope2_emission NUMERIC,
  ADD COLUMN IF NOT EXISTS scope3_emission NUMERIC,
  ADD COLUMN IF NOT EXISTS is_cache_valid BOOLEAN DEFAULT true;

-- sync dual naming
UPDATE bilans_carbone SET total_kgco2e = COALESCE(total_kgco2e, total_emission),
                          scope1_kgco2e = COALESCE(scope1_kgco2e, scope1_emission),
                          scope2_kgco2e = COALESCE(scope2_kgco2e, scope2_emission),
                          scope3_kgco2e = COALESCE(scope3_kgco2e, scope3_emission);

ALTER TABLE bilans_carbone_detail
  ADD COLUMN IF NOT EXISTS scope SMALLINT,
  ADD COLUMN IF NOT EXISTS poste_code TEXT,
  ADD COLUMN IF NOT EXISTS poste_name TEXT,
  ADD COLUMN IF NOT EXISTS category_code TEXT,
  ADD COLUMN IF NOT EXISTS category_name TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS emissions_kg_co2e NUMERIC,
  ADD COLUMN IF NOT EXISTS co2_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS ch4_kg_co2e NUMERIC,
  ADD COLUMN IF NOT EXISTS n2o_kg_co2e NUMERIC,
  ADD COLUMN IF NOT EXISTS other_gases_kg_co2e NUMERIC,
  ADD COLUMN IF NOT EXISTS activity_data_count INT,
  ADD COLUMN IF NOT EXISTS data_quality_score NUMERIC,
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS carbon_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  questionnaire_response_id UUID,
  total_emissions NUMERIC NOT NULL DEFAULT 0,
  scope1_emissions NUMERIC NOT NULL DEFAULT 0,
  scope2_emissions NUMERIC NOT NULL DEFAULT 0,
  scope3_emissions NUMERIC NOT NULL DEFAULT 0,
  category_breakdown JSONB,
  majority_scope INT,
  assessment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  report_generated BOOLEAN DEFAULT false,
  report_url TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emissions_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  year INT NOT NULL,
  scope1_tco2 NUMERIC NOT NULL DEFAULT 0,
  scope2_tco2 NUMERIC NOT NULL DEFAULT 0,
  total_tco2 NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  nom_entreprise TEXT NOT NULL,
  secteur TEXT,
  ca_annuel NUMERIC,
  collaborateurs INT,
  date_creation TIMESTAMPTZ DEFAULT now(),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emission_factors_co2 (
  energy_type TEXT PRIMARY KEY,
  unit TEXT NOT NULL,
  ef_co2_t_per_unit NUMERIC NOT NULL,
  source_reference TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  factor NUMERIC NOT NULL,
  material_type TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_scope3_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope3_category_id TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  default_unit TEXT,
  alternative_units TEXT[],
  input_type TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_validation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recalculation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bilan_id UUID REFERENCES bilans_carbone(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collect_sessions_org_year ON collect_sessions(organization_id, year);
CREATE INDEX IF NOT EXISTS idx_activity_org_period ON activity_data(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_bilans_org ON bilans_carbone(organization_id);
