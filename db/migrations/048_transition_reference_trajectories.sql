-- =============================================================================
-- 048 — Trajectoires de référence versionnées (Transition Phase 2)
-- =============================================================================
-- Snapshot immuable des paramètres + points calculés.
-- Une nouvelle version du moteur ne doit PAS altérer silencieusement les lignes
-- déjà enregistrées.

CREATE TABLE IF NOT EXISTS climate_reference_trajectories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Trajectoire de référence 1,5 °C',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  framework_version_id UUID REFERENCES climate_framework_versions(id) ON DELETE SET NULL,
  -- Snapshot figé (ne pas dériver d'une jointure live)
  framework TEXT NOT NULL,
  framework_version TEXT NOT NULL,
  methodology TEXT NOT NULL,
  method_key TEXT NOT NULL,
  ambition TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'Near-Term',
  base_year INT NOT NULL,
  target_year INT NOT NULL,
  baseline_emissions NUMERIC NOT NULL,
  scope1_emissions NUMERIC,
  scope2_emissions NUMERIC,
  scope3_emissions NUMERIC,
  scope_boundary INT[] NOT NULL DEFAULT '{1,2}',
  dlarr_percent NUMERIC NOT NULL,
  reduction_percent NUMERIC NOT NULL,
  target_emissions NUMERIC NOT NULL,
  annual_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  assumptions TEXT,
  source_url TEXT,
  source_document TEXT,
  weighting_status TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (target_year > base_year)
);

CREATE INDEX IF NOT EXISTS idx_climate_ref_traj_org
  ON climate_reference_trajectories(organization_id);
CREATE INDEX IF NOT EXISTS idx_climate_ref_traj_org_status
  ON climate_reference_trajectories(organization_id, status);

COMMENT ON TABLE climate_reference_trajectories IS
  'Trajectoires climatiques de référence calculées (ex. ACA SBTi). Snapshot versionné — pas une validation SBTi.';

COMMENT ON COLUMN climate_reference_trajectories.weighting_status IS
  'inferred_from_table1_and_table2 | official — statut de la pondération S1/S2.';

-- Remplacer le placeholder pending_validation par la version méthodologique active
INSERT INTO climate_framework_versions (
  framework_id, version_label, method_key, effective_from,
  scopes_applicable, parameters, source_url, source_document, assumptions, status,
  ambition, methodology, scope_boundary, notes
)
SELECT
  f.id,
  'Corporate Net-Zero Standard v1.3.1',
  'aca_near_term_1_5c_cnzs_v1_3_1',
  DATE '2026-04-14',
  ARRAY[1, 2],
  jsonb_build_object(
    'ambition', '1.5C',
    'target_type', 'Near-Term',
    'methodology', 'Absolute Contraction Approach',
    'larr_min_scope12', 0.042,
    'scope1_nza', 0.9,
    'scope1_nzy', 2050,
    'scope2_nza', 1.0,
    'scope2_nzy', 2040,
    'weighting_status', 'inferred_from_table1_and_table2',
    'formula', 'E(y) = E_BY - [E_BY × dLARR × (y - BY)]'
  ),
  'https://sciencebasedtargets.org/corporate-net-zero-v1',
  'SBTi Corporate Net-Zero Standard V1.3.1 Method Appendix v1.0 (April 2026)',
  'Pondération S1/S2 reconstruite pour reproduire Table 1. Trajectoire de référence ≠ validation SBTi. Scope 3 non couvert par ce method_key.',
  'active',
  '1.5C',
  'Absolute Contraction Approach',
  ARRAY[1, 2],
  'Moteur CarboScan Phase 2 — ne jamais afficher « SBTi Validated ».'
FROM climate_frameworks f
WHERE f.code = 'sbti'
ON CONFLICT (framework_id, version_label) DO UPDATE SET
  method_key = EXCLUDED.method_key,
  parameters = EXCLUDED.parameters,
  source_url = EXCLUDED.source_url,
  source_document = EXCLUDED.source_document,
  assumptions = EXCLUDED.assumptions,
  status = EXCLUDED.status,
  ambition = EXCLUDED.ambition,
  methodology = EXCLUDED.methodology,
  scope_boundary = EXCLUDED.scope_boundary,
  notes = EXCLUDED.notes;
