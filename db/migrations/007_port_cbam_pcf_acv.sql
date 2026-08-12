-- =============================================================================
-- 007 — Portage CBAM + PCF + ACV
-- =============================================================================

-- CBAM enrich existing shells
ALTER TABLE cbam_installations
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS annual_capacity NUMERIC,
  ADD COLUMN IF NOT EXISTS reference_year INT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE cbam_installations SET country = COALESCE(country, country_code) WHERE country IS NULL;

ALTER TABLE cbam_products
  ADD COLUMN IF NOT EXISTS cn_code TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT;

ALTER TABLE cbam_production
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES cbam_products(id),
  ADD COLUMN IF NOT EXISTS year INT,
  ADD COLUMN IF NOT EXISTS quarter INT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE cbam_reports
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS period TEXT,
  ADD COLUMN IF NOT EXISTS energy_em NUMERIC,
  ADD COLUMN IF NOT EXISTS materials_em NUMERIC,
  ADD COLUMN IF NOT EXISTS transport_em NUMERIC,
  ADD COLUMN IF NOT EXISTS process_em NUMERIC,
  ADD COLUMN IF NOT EXISTS total_em NUMERIC,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS raw_json JSONB;

CREATE TABLE IF NOT EXISTS cbam_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id UUID REFERENCES cbam_installations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES cbam_products(id),
  client_name TEXT,
  destination_country TEXT,
  quantity_exported NUMERIC,
  export_date DATE,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbam_energy_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id UUID REFERENCES cbam_installations(id) ON DELETE CASCADE,
  energy_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  emission_factor NUMERIC,
  year INT NOT NULL,
  quarter INT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbam_electricity_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id UUID REFERENCES cbam_installations(id) ON DELETE CASCADE,
  electricity_kwh NUMERIC NOT NULL,
  country_emission_factor NUMERIC,
  year INT NOT NULL,
  quarter INT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbam_emission_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id UUID REFERENCES cbam_installations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES cbam_products(id),
  allocation_method TEXT,
  allocated_emissions NUMERIC,
  year INT NOT NULL,
  quarter INT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbam_emissions_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id UUID REFERENCES cbam_installations(id) ON DELETE CASCADE,
  direct_emissions NUMERIC,
  indirect_emissions NUMERIC,
  total_emissions NUMERIC,
  year INT NOT NULL,
  quarter INT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbam_installation_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id UUID NOT NULL REFERENCES cbam_installations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES cbam_products(id) ON DELETE CASCADE,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (installation_id, product_id)
);

CREATE TABLE IF NOT EXISTS cbam_shipment_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  export_id UUID REFERENCES cbam_exports(id) ON DELETE CASCADE,
  emissions_per_ton NUMERIC,
  total_emissions NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- PCF
-- =============================================================================
ALTER TABLE pcf_studies
  ADD COLUMN IF NOT EXISTS product_category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS production_site TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS electricity_mix TEXT,
  ADD COLUMN IF NOT EXISTS functional_unit TEXT,
  ADD COLUMN IF NOT EXISTS perimeter_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS total_emissions NUMERIC,
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS hs_code TEXT,
  ADD COLUMN IF NOT EXISTS cbam_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_mode TEXT,
  ADD COLUMN IF NOT EXISTS total_energy_mj NUMERIC,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE pcf_versions
  ADD COLUMN IF NOT EXISTS version_number INT,
  ADD COLUMN IF NOT EXISTS snapshot JSONB,
  ADD COLUMN IF NOT EXISTS comment TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE pcf_results
  ADD COLUMN IF NOT EXISTS version INT,
  ADD COLUMN IF NOT EXISTS total_emissions NUMERIC,
  ADD COLUMN IF NOT EXISTS breakdown JSONB,
  ADD COLUMN IF NOT EXISTS dominant_phase TEXT,
  ADD COLUMN IF NOT EXISTS data_quality JSONB,
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calculated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS total_energy_mj NUMERIC;

CREATE TABLE IF NOT EXISTS pcf_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  supplier TEXT,
  country_origin TEXT,
  emission_factor_id UUID,
  emission_factor_value NUMERIC,
  is_estimated BOOLEAN DEFAULT false,
  emissions_kg NUMERIC,
  sort_order INT DEFAULT 0,
  scrap_rate NUMERIC,
  energy_factor_value NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_manufacturing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  energy_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  process_type TEXT,
  emission_factor_value NUMERIC,
  is_estimated BOOLEAN DEFAULT false,
  emissions_kg NUMERIC,
  energy_factor_value NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  transport_type TEXT,
  material_ref TEXT,
  mode TEXT NOT NULL,
  distance_km NUMERIC NOT NULL,
  weight_kg NUMERIC NOT NULL,
  emission_factor_value NUMERIC,
  is_estimated BOOLEAN DEFAULT false,
  emissions_kg NUMERIC,
  energy_factor_value NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_packaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  material TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL,
  emission_factor_value NUMERIC,
  is_estimated BOOLEAN DEFAULT false,
  emissions_kg NUMERIC,
  energy_factor_value NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  lifetime_years NUMERIC,
  uses_per_year NUMERIC,
  consumption_per_use NUMERIC,
  consumption_unit TEXT,
  emission_factor_value NUMERIC,
  is_estimated BOOLEAN DEFAULT false,
  emissions_kg NUMERIC,
  energy_factor_value NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_wastes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  waste_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  treatment TEXT NOT NULL,
  emission_factor_value NUMERIC,
  is_estimated BOOLEAN DEFAULT false,
  emissions_kg NUMERIC,
  energy_factor_value NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_end_of_life (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  percentage NUMERIC,
  emission_factor_value NUMERIC,
  is_estimated BOOLEAN DEFAULT false,
  emissions_kg NUMERIC,
  energy_factor_value NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  changes JSONB,
  result_emissions NUMERIC,
  reduction_pct NUMERIC,
  created_by UUID REFERENCES users(id),
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_subcontracting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  process_name TEXT NOT NULL,
  supplier_name TEXT,
  country TEXT,
  quantity NUMERIC,
  unit TEXT,
  emission_factor_value NUMERIC,
  is_estimated BOOLEAN DEFAULT false,
  emissions_kg NUMERIC,
  notes TEXT,
  sort_order INT DEFAULT 0,
  energy_factor_value NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_co_product_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  allocation_method TEXT,
  allocation_value NUMERIC,
  allocation_percentage NUMERIC,
  is_main_product BOOLEAN DEFAULT false,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pcf_collect_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES pcf_studies(id) ON DELETE CASCADE,
  collect_response_id UUID REFERENCES collect_responses(id),
  allocation_percentage NUMERIC,
  allocated_value NUMERIC,
  phase TEXT,
  notes TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- ACV
-- =============================================================================
ALTER TABLE acv_projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS functional_unit TEXT,
  ADD COLUMN IF NOT EXISTS scope_definition TEXT,
  ADD COLUMN IF NOT EXISTS goal_definition TEXT,
  ADD COLUMN IF NOT EXISTS system_boundaries TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS allocation_method TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE acv_inventory
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS item TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS phase TEXT,
  ADD COLUMN IF NOT EXISTS flow_type TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS data_source TEXT,
  ADD COLUMN IF NOT EXISTS data_quality INT,
  ADD COLUMN IF NOT EXISTS custom_factor_id UUID,
  ADD COLUMN IF NOT EXISTS recycled_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS supplier_country TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS acv_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES acv_projects(id) ON DELETE CASCADE,
  impact_category TEXT,
  value NUMERIC NOT NULL,
  unit TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT,
  item TEXT,
  unit TEXT,
  climate_co2e NUMERIC,
  acidification_so2e NUMERIC,
  water_m3 NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_inventory_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES acv_projects(id) ON DELETE CASCADE,
  period_year INT,
  location_default TEXT,
  scope_boundaries TEXT[],
  allocation_rule TEXT,
  cutoff_individual_threshold NUMERIC,
  cutoff_cumulative_threshold NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_impact_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  product_name TEXT,
  calculation_date TIMESTAMPTZ DEFAULT now(),
  impact_category TEXT,
  phase_breakdown JSONB,
  total_impact NUMERIC,
  unit TEXT,
  raw_data JSONB,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  unit TEXT,
  carbon_factor NUMERIC,
  energy_factor NUMERIC,
  water_factor NUMERIC,
  acidification_factor NUMERIC,
  source TEXT,
  source_year INT,
  source_version TEXT,
  is_default BOOLEAN DEFAULT false,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sector TEXT,
  subsector TEXT,
  energy_consumption NUMERIC,
  emission_factor NUMERIC,
  water_consumption NUMERIC,
  unit TEXT,
  source TEXT,
  source_year INT,
  source_version TEXT,
  is_default BOOLEAN DEFAULT false,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_transport_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode_type TEXT,
  emission_factor_tkm NUMERIC,
  energy_factor_tkm NUMERIC,
  description TEXT,
  source TEXT,
  is_default BOOLEAN DEFAULT false,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_product_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES acv_projects(id) ON DELETE CASCADE,
  parent_component_id UUID REFERENCES acv_product_components(id),
  component_name TEXT NOT NULL,
  material_id UUID REFERENCES acv_materials(id),
  process_id UUID REFERENCES acv_processes(id),
  quantity NUMERIC,
  unit TEXT,
  recycled_percentage NUMERIC,
  transport_mode_id UUID REFERENCES acv_transport_modes(id),
  transport_distance_km NUMERIC,
  supplier_country TEXT,
  notes TEXT,
  sort_order INT DEFAULT 0,
  data_type TEXT DEFAULT 'material',
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_lifecycle_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES acv_projects(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  module_name TEXT,
  module_group TEXT,
  is_included BOOLEAN DEFAULT true,
  carbon_impact NUMERIC,
  energy_impact NUMERIC,
  water_impact NUMERIC,
  acidification_impact NUMERIC,
  data_quality_score NUMERIC,
  notes TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES acv_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_baseline BOOLEAN DEFAULT false,
  parameters JSONB,
  total_carbon NUMERIC,
  total_energy NUMERIC,
  total_water NUMERIC,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_co_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES acv_projects(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  mass_kg NUMERIC,
  economic_value NUMERIC,
  energy_content_mj NUMERIC,
  is_main_product BOOLEAN DEFAULT false,
  notes TEXT,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_process_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES acv_projects(id) ON DELETE CASCADE,
  source_component_id UUID REFERENCES acv_product_components(id),
  target_component_id UUID REFERENCES acv_product_components(id),
  flow_name TEXT,
  flow_type TEXT,
  quantity NUMERIC,
  unit TEXT,
  notes TEXT,
  sort_order INT DEFAULT 0,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acv_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  analyses_used INT DEFAULT 0,
  analyses_limit INT DEFAULT 5,
  contact_form_filled BOOLEAN DEFAULT false,
  legacy_source TEXT, legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pcf_studies_org ON pcf_studies(organization_id);
CREATE INDEX IF NOT EXISTS idx_cbam_installations_org ON cbam_installations(organization_id);
CREATE INDEX IF NOT EXISTS idx_acv_projects_org ON acv_projects(organization_id);
