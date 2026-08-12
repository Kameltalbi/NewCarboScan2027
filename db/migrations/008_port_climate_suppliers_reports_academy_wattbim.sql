-- =============================================================================
-- 008 — Portage Climate, Suppliers, Reports, Academy, WattBIM, divers
-- =============================================================================

-- Climate enrich
ALTER TABLE climate_roadmaps
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS baseline_year INT,
  ADD COLUMN IF NOT EXISTS target_year INT,
  ADD COLUMN IF NOT EXISTS reduction_target_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_emissions_tco2e NUMERIC,
  ADD COLUMN IF NOT EXISTS target_emissions_tco2e NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE climate_actions
  ADD COLUMN IF NOT EXISTS lever_id UUID,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS site_id UUID,
  ADD COLUMN IF NOT EXISTS business_unit TEXT,
  ADD COLUMN IF NOT EXISTS scope_concerned INT[],
  ADD COLUMN IF NOT EXISTS source_emission_targeted TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS contributors TEXT[],
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS target_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS progress_percent INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_estimated NUMERIC,
  ADD COLUMN IF NOT EXISTS budget_actual NUMERIC,
  ADD COLUMN IF NOT EXISTS expected_reduction_tco2e NUMERIC,
  ADD COLUMN IF NOT EXISTS realized_reduction_tco2e NUMERIC,
  ADD COLUMN IF NOT EXISTS expected_savings NUMERIC,
  ADD COLUMN IF NOT EXISTS realized_savings NUMERIC,
  ADD COLUMN IF NOT EXISTS indicator_name TEXT,
  ADD COLUMN IF NOT EXISTS indicator_target TEXT,
  ADD COLUMN IF NOT EXISTS indicator_actual TEXT,
  ADD COLUMN IF NOT EXISTS dependencies TEXT,
  ADD COLUMN IF NOT EXISTS risks TEXT,
  ADD COLUMN IF NOT EXISTS comments TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS climate_levers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  roadmap_id UUID NOT NULL REFERENCES climate_roadmaps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  scope_concerned INT[],
  site_id UUID,
  business_unit TEXT,
  source_emission_targeted TEXT,
  estimated_potential_reduction_tco2e NUMERIC,
  estimated_cost NUMERIC,
  complexity_level TEXT,
  implementation_duration_months INT,
  maturity_level TEXT,
  owner TEXT,
  status TEXT DEFAULT 'identified',
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link climate_actions.lever_id FK after climate_levers exists
DO $$ BEGIN
  ALTER TABLE climate_actions
    ADD CONSTRAINT climate_actions_lever_id_fkey
    FOREIGN KEY (lever_id) REFERENCES climate_levers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS climate_action_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES climate_actions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  owner TEXT,
  comments TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_priority_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES climate_actions(id) ON DELETE CASCADE,
  carbon_impact INT, cost INT, feasibility INT, speed INT, roi INT, regulatory_score INT,
  overall_score NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  roadmap_id UUID NOT NULL REFERENCES climate_roadmaps(id) ON DELETE CASCADE,
  reporting_period TEXT,
  reporting_date DATE,
  baseline_emissions_tco2e NUMERIC,
  target_emissions_tco2e NUMERIC,
  realized_emissions_tco2e NUMERIC,
  total_actions INT, completed_actions INT, delayed_actions INT,
  total_budget NUMERIC, consumed_budget NUMERIC,
  expected_reduction_tco2e NUMERIC, realized_reduction_tco2e NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  baseline_source_type TEXT,
  baseline_source_id UUID,
  baseline_year INT, start_year INT, target_year INT,
  scenario_type TEXT,
  target_reduction_percent NUMERIC,
  baseline_emissions_tco2e NUMERIC, target_emissions_tco2e NUMERIC,
  net_zero_flag BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  annual_revenue_eur NUMERIC,
  created_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_scenario_levers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES climate_scenarios(id) ON DELETE CASCADE,
  roadmap_lever_id UUID REFERENCES climate_levers(id),
  custom_lever_name TEXT,
  category TEXT,
  description TEXT,
  scope_concerned INT[],
  source_emission_targeted TEXT,
  max_reduction_tco2e NUMERIC,
  estimated_cost NUMERIC,
  maturity_level TEXT,
  confidence_level TEXT,
  enabled BOOLEAN DEFAULT true,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_scenario_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_lever_id UUID NOT NULL REFERENCES climate_scenario_levers(id) ON DELETE CASCADE,
  start_year INT,
  ramp_up_end_year INT,
  yearly_adoption_rate JSONB,
  yearly_reduction_factor NUMERIC,
  max_coverage_percent NUMERIC,
  confidence_level TEXT,
  source_reference TEXT,
  methodological_note TEXT,
  application_mode TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_scenario_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES climate_scenarios(id) ON DELETE CASCADE,
  target_year INT NOT NULL,
  target_emissions_tco2e NUMERIC,
  target_reduction_percent NUMERIC,
  target_type TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_scenario_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES climate_scenarios(id) ON DELETE CASCADE,
  year INT NOT NULL,
  projected_emissions_tco2e NUMERIC,
  annual_reduction_tco2e NUMERIC,
  cumulative_reduction_tco2e NUMERIC,
  residual_emissions_tco2e NUMERIC,
  reduction_percent_vs_baseline NUMERIC,
  projected_revenue_eur NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_scenario_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES climate_scenarios(id) ON DELETE CASCADE,
  scenario_lever_id UUID REFERENCES climate_scenario_levers(id),
  year INT NOT NULL,
  contribution_tco2e NUMERIC,
  contribution_percent NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS net_zero_trajectories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  baseline_year INT,
  target_year INT,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Suppliers enrich + satellites
-- =============================================================================
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS siret TEXT, ADD COLUMN IF NOT EXISTS siren TEXT,
  ADD COLUMN IF NOT EXISTS naf_code TEXT, ADD COLUMN IF NOT EXISTS nace_code TEXT,
  ADD COLUMN IF NOT EXISTS legal_form TEXT, ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'TN',
  ADD COLUMN IF NOT EXISTS city TEXT, ADD COLUMN IF NOT EXISTS address TEXT, ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT, ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT, ADD COLUMN IF NOT EXISTS contact_role TEXT,
  ADD COLUMN IF NOT EXISTS purchase_category TEXT, ADD COLUMN IF NOT EXISTS purchase_subcategory TEXT,
  ADD COLUMN IF NOT EXISTS scope3_ghg_category INT,
  ADD COLUMN IF NOT EXISTS carbon_score TEXT, ADD COLUMN IF NOT EXISTS carbon_intensity_kgco2e NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_index INT, ADD COLUMN IF NOT EXISTS engagement_status TEXT,
  ADD COLUMN IF NOT EXISTS data_method TEXT,
  ADD COLUMN IF NOT EXISTS has_carbon_footprint BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_sbti_target BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_cdp_disclosure BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_iso14001 BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_ecovadis BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sbti_target_year INT, ADD COLUMN IF NOT EXISTS cdp_score TEXT, ADD COLUMN IF NOT EXISTS ecovadis_score INT,
  ADD COLUMN IF NOT EXISTS certifications JSONB,
  ADD COLUMN IF NOT EXISTS annual_spend NUMERIC, ADD COLUMN IF NOT EXISTS annual_spend_currency TEXT,
  ADD COLUMN IF NOT EXISTS annual_spend_year INT, ADD COLUMN IF NOT EXISTS criticality TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT, ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_data_update TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE supplier_purchases
  ADD COLUMN IF NOT EXISTS purchase_date DATE, ADD COLUMN IF NOT EXISTS reference_year INT,
  ADD COLUMN IF NOT EXISTS description TEXT, ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT, ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS quantity_unit TEXT, ADD COLUMN IF NOT EXISTS purchase_category TEXT,
  ADD COLUMN IF NOT EXISTS purchase_subcategory TEXT, ADD COLUMN IF NOT EXISTS naf_code TEXT,
  ADD COLUMN IF NOT EXISTS ghg_scope3_category INT, ADD COLUMN IF NOT EXISTS emission_factor_id UUID,
  ADD COLUMN IF NOT EXISTS emission_factor_value NUMERIC, ADD COLUMN IF NOT EXISTS emission_factor_unit TEXT,
  ADD COLUMN IF NOT EXISTS emission_factor_source TEXT, ADD COLUMN IF NOT EXISTS emission_factor_year INT,
  ADD COLUMN IF NOT EXISTS calculated_emissions_kgco2e NUMERIC, ADD COLUMN IF NOT EXISTS data_method TEXT,
  ADD COLUMN IF NOT EXISTS uncertainty_percent NUMERIC, ADD COLUMN IF NOT EXISTS source_document TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT, ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id), ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT, ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT, phone TEXT, role TEXT,
  is_primary BOOLEAN DEFAULT false,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_monetary_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_category TEXT NOT NULL,
  purchase_subcategory TEXT,
  naf_code TEXT,
  emission_factor NUMERIC NOT NULL,
  unit TEXT,
  source TEXT,
  source_version TEXT,
  source_year INT,
  country TEXT,
  uncertainty_percent NUMERIC,
  is_default BOOLEAN DEFAULT false,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  template_version INT DEFAULT 1,
  questions JSONB DEFAULT '[]'::jsonb,
  is_template BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_questionnaire_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  questionnaire_id UUID NOT NULL REFERENCES supplier_questionnaires(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ, sent_to_email TEXT,
  reminder_count INT DEFAULT 0,
  last_reminder_at TIMESTAMPTZ, next_reminder_at TIMESTAMPTZ,
  responses JSONB, responded_at TIMESTAMPTZ,
  magic_token TEXT, token_expires_at TIMESTAMPTZ,
  due_date DATE, notes TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  invited_email TEXT NOT NULL,
  invited_name TEXT,
  magic_token TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ, opened_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  reminder_count INT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  reference_year INT NOT NULL,
  overall_score TEXT,
  carbon_intensity NUMERIC, engagement NUMERIC, data_quality NUMERIC, trajectory_score NUMERIC,
  total_emissions_kgco2e NUMERIC, total_spend NUMERIC, emission_intensity NUMERIC,
  data_method TEXT, confidence_index INT, calculation_details JSONB,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  calculated_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_reduction_percent NUMERIC,
  target_year INT, baseline_year INT,
  baseline_emissions_kgco2e NUMERIC, current_emissions_kgco2e NUMERIC,
  current_progress_percent NUMERIC,
  status TEXT DEFAULT 'active',
  milestones JSONB,
  start_date DATE, last_review_date DATE, next_review_date DATE,
  notes TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Reports
-- =============================================================================
ALTER TABLE generated_reports
  ADD COLUMN IF NOT EXISTS report_id UUID,
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS report_title TEXT,
  ADD COLUMN IF NOT EXISTS report_type TEXT,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS paragraphs_used JSONB,
  ADD COLUMN IF NOT EXISTS variables_values JSONB,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_size INT,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

UPDATE generated_reports SET report_title = COALESCE(report_title, title) WHERE report_title IS NULL;

CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code TEXT,
  template_name TEXT,
  template_type TEXT,
  description TEXT,
  page_number INT,
  section_key TEXT,
  title TEXT,
  content_template TEXT,
  paragraph_codes TEXT[],
  default_variables JSONB,
  requires_scope3 BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  order_in_page INT,
  min_employees INT, max_employees INT,
  sectors TEXT[],
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID,
  code_paragraph TEXT NOT NULL,
  version INT DEFAULT 1,
  status TEXT DEFAULT 'draft',
  author TEXT, validated_by TEXT, validation_date TIMESTAMPTZ,
  report_section TEXT, subsection TEXT, display_order INT,
  title TEXT, body_text TEXT,
  variables_list JSONB, activation_conditions JSONB,
  report_type TEXT[], regulatory_reference TEXT[],
  methodological_notes TEXT, is_mandatory BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id), updated_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_paragraph_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id UUID,
  paragraph_id UUID REFERENCES report_paragraphs(id) ON DELETE CASCADE,
  version INT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID,
  graph_code TEXT,
  chart_name TEXT,
  report_section TEXT,
  display_order INT,
  chart_type TEXT,
  chart_config JSONB,
  color_palette TEXT[],
  data_source TEXT,
  data_parameters JSONB,
  min_data_points INT,
  activation_conditions JSONB,
  standard_title TEXT,
  legend_enabled BOOLEAN DEFAULT true,
  axis_labels JSONB,
  pdf_size TEXT, pdf_position TEXT,
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_chart_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  report_id UUID REFERENCES generated_reports(id) ON DELETE CASCADE,
  chart_id UUID REFERENCES report_charts(id),
  graph_code TEXT, chart_name TEXT, chart_type TEXT,
  chart_data JSONB, chart_config JSONB,
  figure_number INT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INT NOT NULL,
  tokens_total INT NOT NULL DEFAULT 0,
  tokens_used INT NOT NULL DEFAULT 0,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, year)
);

CREATE TABLE IF NOT EXISTS report_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  year INT NOT NULL,
  generation_type TEXT,
  tokens_consumed INT DEFAULT 0,
  pages_count INT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paragraph_chart_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_code TEXT,
  chart_code TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pro_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Academy
-- =============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT,
  level TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  content TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  order_index INT DEFAULT 0,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- WattBIM
-- =============================================================================
CREATE TABLE IF NOT EXISTS wattbim_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  building_type TEXT,
  surface_m2 NUMERIC,
  employees_count INT,
  year_built INT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wattbim_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES wattbim_buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meter_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  provider TEXT, contract_ref TEXT, external_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wattbim_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES wattbim_meters(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_amount NUMERIC, currency TEXT,
  source TEXT,
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  activity_data_id UUID REFERENCES activity_data(id),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wattbim_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id UUID REFERENCES wattbim_buildings(id),
  meter_id UUID REFERENCES wattbim_meters(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  value_observed NUMERIC, value_expected NUMERIC,
  status TEXT DEFAULT 'open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wattbim_savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id UUID REFERENCES wattbim_buildings(id),
  period_start DATE, period_end DATE,
  baseline_kwh NUMERIC, actual_kwh NUMERIC, savings_kwh NUMERIC,
  savings_amount NUMERIC, currency TEXT,
  calculation_method TEXT, notes TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wattbim_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Modules / API / roles / divers
-- =============================================================================
ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS route TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

ALTER TABLE organization_modules
  ADD COLUMN IF NOT EXISTS org_id UUID,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE organization_modules SET org_id = COALESCE(org_id, organization_id) WHERE org_id IS NULL;

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS app_name TEXT,
  ADD COLUMN IF NOT EXISTS key_prefix TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_legacy JSONB;

UPDATE api_keys SET app_name = COALESCE(app_name, name) WHERE app_name IS NULL;

CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  organization_id UUID REFERENCES organizations(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status INT NOT NULL,
  duration_ms INT,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  name TEXT NOT NULL,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actions_recommandees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  bilan_id UUID REFERENCES bilans_carbone(id),
  title TEXT,
  description TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parametres_emission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  value NUMERIC,
  unit TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC,
  active BOOLEAN DEFAULT true,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  training_name TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chatbot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  rating INT,
  message TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_carbon_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_emission_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sector_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scope3_category_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category_key)
);

CREATE TABLE IF NOT EXISTS site_allocation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_allocation_percentages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES collect_sites(id),
  percentage NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulation économique
CREATE TABLE IF NOT EXISTS sim_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sim_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES sim_scenarios(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sim_run_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  run_id UUID REFERENCES sim_runs(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sim_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sim_barrel_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sim_barrel_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES sim_barrel_scenarios(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_impact_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vue couverture globale du portage
CREATE OR REPLACE VIEW v_schema_table_counts AS
SELECT c.relname AS table_name,
       n.nspname AS schema_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY 1;
