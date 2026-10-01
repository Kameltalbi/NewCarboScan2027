-- =============================================================================
-- 046 — Transition & trajectoires : référentiels versionnés + objectifs
-- =============================================================================
-- Architecture préparée pour SBTi / 1,5 °C sans formule de calcul hardcodée.
-- Les versions de référentiel stockent métadonnées + paramètres ; le moteur
-- n'applique une formule que si method_key est explicitement supporté plus tard.

CREATE TABLE IF NOT EXISTS climate_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  publisher TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_framework_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES climate_frameworks(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  method_key TEXT NOT NULL,
  -- method_key examples: 'pending_validation', 'linear_custom' (never imply SBTi-validated)
  effective_from DATE,
  effective_to DATE,
  scopes_applicable INT[] DEFAULT '{1,2}',
  sector TEXT,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_url TEXT,
  source_document TEXT,
  assumptions TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'deprecated')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (framework_id, version_label)
);

CREATE INDEX IF NOT EXISTS idx_climate_framework_versions_framework
  ON climate_framework_versions(framework_id);

-- Seed catalogue only — no reduction formula claimed as SBTi-validated
INSERT INTO climate_frameworks (code, name, publisher, description)
VALUES
  (
    'sbti',
    'Science Based Targets initiative (SBTi)',
    'SBTi',
    'Référentiel externe. Les trajectoires CarboScan basées sur ce code restent des trajectoires de référence calculées tant qu''aucune validation SBTi n''est renseignée par l''organisation.'
  ),
  (
    'custom',
    'Objectif interne entreprise',
    'Organisation',
    'Objectifs définis par l''organisation sans référentiel externe.'
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO climate_framework_versions (
  framework_id, version_label, method_key, effective_from,
  scopes_applicable, parameters, source_url, source_document, assumptions, status, notes
)
SELECT
  f.id,
  'architecture-pending',
  'pending_validation',
  CURRENT_DATE,
  ARRAY[1, 2],
  jsonb_build_object(
    'ambition', '1.5C',
    'formula_status', 'not_implemented',
    'requires_product_validation', true
  ),
  'https://sciencebasedtargets.org/',
  'À préciser après validation méthodologique produit (Near-Term / Absolute Contraction / sectoral pathways).',
  'Aucune courbe 1,5 °C n''est générée automatiquement tant que method_key = pending_validation.',
  'draft',
  'Placeholder catalogue — ne pas utiliser pour afficher « SBTi Validated ».'
FROM climate_frameworks f
WHERE f.code = 'sbti'
ON CONFLICT (framework_id, version_label) DO NOTHING;

CREATE TABLE IF NOT EXISTS climate_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective_type TEXT NOT NULL
    CHECK (objective_type IN (
      'absolute_reduction',
      'intensity_reduction',
      'by_scope',
      'by_category',
      'by_site',
      'energy',
      'other'
    )),
  origin TEXT NOT NULL DEFAULT 'internal'
    CHECK (origin IN ('internal', 'external_framework')),
  validation_status TEXT NOT NULL DEFAULT 'reference_trajectory'
    CHECK (validation_status IN (
      'reference_trajectory', -- courbe / cible calculée ou déclarée sans validation externe
      'company_objective',    -- objectif interne
      'submitted',            -- déclaré soumis à un organisme
      'validated'             -- validation réelle renseignée par l'utilisateur
    )),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  perimeter TEXT DEFAULT 'organization',
  scopes INT[] DEFAULT '{1,2,3}',
  category_key TEXT,
  site_id UUID,
  baseline_year INT NOT NULL,
  baseline_value NUMERIC,
  baseline_unit TEXT DEFAULT 'tCO2e',
  target_year INT NOT NULL,
  target_value NUMERIC,
  reduction_percent NUMERIC,
  unit TEXT DEFAULT 'tCO2e',
  framework_version_id UUID REFERENCES climate_framework_versions(id) ON DELETE SET NULL,
  validation_body TEXT,
  validation_date DATE,
  validation_reference TEXT,
  owner_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (target_year > baseline_year)
);

CREATE INDEX IF NOT EXISTS idx_climate_objectives_org
  ON climate_objectives(organization_id);
CREATE INDEX IF NOT EXISTS idx_climate_objectives_primary
  ON climate_objectives(organization_id) WHERE is_primary = true AND status = 'active';

-- Snapshot of calculation context when an objective is locked to a framework version
-- (keeps historical curves stable if catalogue evolves later)
CREATE TABLE IF NOT EXISTS climate_objective_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES climate_objectives(id) ON DELETE CASCADE,
  framework_version_id UUID REFERENCES climate_framework_versions(id) ON DELETE SET NULL,
  method_key TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  baseline_year INT NOT NULL,
  baseline_value NUMERIC,
  target_year INT NOT NULL,
  target_value NUMERIC,
  reduction_percent NUMERIC,
  scopes INT[],
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_climate_objective_snapshots_obj
  ON climate_objective_snapshots(objective_id);

COMMENT ON TABLE climate_framework_versions IS
  'Versions de référentiels trajectoire. method_key=pending_validation = pas de formule appliquée.';
COMMENT ON TABLE climate_objectives IS
  'Objectifs de réduction organisation. validation_status=validated uniquement si preuve saisie.';
COMMENT ON COLUMN climate_objectives.validation_status IS
  'Ne jamais dériver automatiquement « validated » d''une trajectoire 1,5 °C affichée.';
