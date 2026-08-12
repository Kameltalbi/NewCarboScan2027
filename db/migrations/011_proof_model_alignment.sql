-- =============================================================================
-- 011 — Alignement modèle de preuve (EvidenceRecord + FactorVersion + publish)
-- Constitution : docs/SYSTEME_DE_PREUVE.md
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Evidence : origine ≠ qualité ≠ validation
-- ---------------------------------------------------------------------------

ALTER TABLE evidence_records
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_document_id UUID,
  ADD COLUMN IF NOT EXISTS source_page INT,
  ADD COLUMN IF NOT EXISTS source_cell TEXT,
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES evidence_records(id),
  ADD COLUMN IF NOT EXISTS data_class TEXT
    CHECK (data_class IS NULL OR data_class IN (
      'measured', 'calculated', 'estimated', 'sector_proxy', 'missing'
    ));

-- Mapper origin historique → source_type si vide
UPDATE evidence_records SET source_type = CASE origin::text
  WHEN 'manual' THEN 'manual'
  WHEN 'excel_import' THEN 'excel'
  WHEN 'invoice_ocr' THEN 'invoice'
  WHEN 'api' THEN 'erp'
  WHEN 'estimated' THEN 'estimate'
  WHEN 'third_party' THEN 'supplier'
  ELSE 'manual'
END
WHERE source_type IS NULL;

COMMENT ON COLUMN evidence_records.source_type IS
  'invoice|excel|erp|manual|supplier|estimate — origine de la donnée';
COMMENT ON COLUMN evidence_records.validation_status IS
  'draft/submitted/validated/rejected/superseded — indépendant de l''origine';
COMMENT ON COLUMN evidence_records.data_class IS
  'Nature épistémique : measured|calculated|estimated|sector_proxy|missing';

-- ---------------------------------------------------------------------------
-- Facteurs : identité stable + version immutable + checksum + statut
-- ---------------------------------------------------------------------------

ALTER TABLE emission_factor_versions
  ADD COLUMN IF NOT EXISTS stable_factor_family TEXT,
  ADD COLUMN IF NOT EXISTS source_dataset TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS checksum TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('draft', 'approved', 'deprecated')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE emission_factors
  ADD COLUMN IF NOT EXISTS stable_factor_id TEXT,
  ADD COLUMN IF NOT EXISTS version_number INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('draft', 'approved', 'deprecated')),
  ADD COLUMN IF NOT EXISTS checksum TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_until DATE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_emission_factors_stable_version
  ON emission_factors (stable_factor_id, version_number)
  WHERE stable_factor_id IS NOT NULL;

-- Interdire la mutation d'un facteur déjà cité dans le ledger
CREATE OR REPLACE FUNCTION prevent_used_factor_mutation()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM calculation_ledger cl WHERE cl.factor_id = OLD.id
  ) THEN
    RAISE EXCEPTION
      'emission_factor % is referenced by calculation_ledger and is immutable; create a new version',
      OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_factor_no_update_if_used ON emission_factors;
CREATE TRIGGER trg_factor_no_update_if_used
  BEFORE UPDATE OR DELETE ON emission_factors
  FOR EACH ROW EXECUTE FUNCTION prevent_used_factor_mutation();

-- ---------------------------------------------------------------------------
-- Runs : méthodologie, publication, pack de facteurs
-- ---------------------------------------------------------------------------

ALTER TABLE calculation_runs
  ADD COLUMN IF NOT EXISTS methodology_version TEXT,
  ADD COLUMN IF NOT EXISTS factor_pack_checksum TEXT,
  ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publish_status IN ('draft', 'published', 'superseded')),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS supersedes_run_id UUID REFERENCES calculation_runs(id),
  ADD COLUMN IF NOT EXISTS scope_notes TEXT,
  ADD COLUMN IF NOT EXISTS exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assumptions JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN calculation_runs.publish_status IS
  'draft = calcul de travail ; published = snapshot officiel ; superseded = remplacé par un nouveau run';

-- ---------------------------------------------------------------------------
-- Ledger : snapshot facteur version + conversions
-- ---------------------------------------------------------------------------

ALTER TABLE calculation_ledger
  ADD COLUMN IF NOT EXISTS factor_version_id UUID REFERENCES emission_factor_versions(id),
  ADD COLUMN IF NOT EXISTS factor_checksum TEXT,
  ADD COLUMN IF NOT EXISTS methodology_version TEXT,
  ADD COLUMN IF NOT EXISTS unit_conversion JSONB,
  ADD COLUMN IF NOT EXISTS data_quality JSONB;

-- ---------------------------------------------------------------------------
-- Rapports : identifiant de preuve / QR
-- ---------------------------------------------------------------------------

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS proof_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_url TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Classification produit (noyau vs hors noyau)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_module_class (
  module_key   TEXT PRIMARY KEY,
  tier         TEXT NOT NULL CHECK (tier IN ('core', 'adjacent', 'service')),
  chain_role   TEXT,
  description  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO product_module_class (module_key, tier, chain_role, description) VALUES
  ('collect', 'core', 'collecte', 'Collecte et preuves d''activité'),
  ('bilan_carbone', 'core', 'calcul', 'Bilan carbone organisationnel certifiable'),
  ('climate_roadmap', 'core', 'analyse', 'Plan de réduction basé sur runs publiés'),
  ('reports', 'core', 'rapport', 'Rapports vérifiables issus du ledger'),
  ('acv', 'adjacent', NULL, 'ACV — hors noyau tant que chaîne de preuve incomplete'),
  ('cbam', 'adjacent', NULL, 'CBAM — hors noyau'),
  ('pcf', 'adjacent', NULL, 'Empreinte produit — hors noyau'),
  ('academy', 'service', NULL, 'Formations'),
  ('wattbim', 'service', NULL, 'WattBIM'),
  ('sim_roi', 'service', NULL, 'Simulations / ROI')
ON CONFLICT (module_key) DO UPDATE
SET tier = EXCLUDED.tier,
    chain_role = EXCLUDED.chain_role,
    description = EXCLUDED.description;
