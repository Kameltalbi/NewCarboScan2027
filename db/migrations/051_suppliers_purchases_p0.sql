-- =============================================================================
-- 051 — Fournisseurs & Achats P0
-- site_id, qualité A–E, historique de calcul, consolidation bilan
-- =============================================================================

ALTER TABLE supplier_purchases
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES collect_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calculation_method TEXT,
  ADD COLUMN IF NOT EXISTS data_quality_grade TEXT,
  ADD COLUMN IF NOT EXISTS product_service TEXT,
  ADD COLUMN IF NOT EXISTS emission_factor_geography TEXT,
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS conversion_source TEXT,
  ADD COLUMN IF NOT EXISTS amount_original NUMERIC,
  ADD COLUMN IF NOT EXISTS currency_original TEXT,
  ADD COLUMN IF NOT EXISTS factor_currency TEXT,
  ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_calculated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS activity_data_id UUID REFERENCES activity_data(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS method_change_note TEXT;

DO $$ BEGIN
  ALTER TABLE supplier_purchases
    DROP CONSTRAINT IF EXISTS supplier_purchases_calculation_method_chk;
  ALTER TABLE supplier_purchases
    ADD CONSTRAINT supplier_purchases_calculation_method_chk
    CHECK (
      calculation_method IS NULL
      OR calculation_method IN ('spend', 'physical', 'supplier_specific', 'hybrid')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE supplier_purchases
    DROP CONSTRAINT IF EXISTS supplier_purchases_data_quality_grade_chk;
  ALTER TABLE supplier_purchases
    ADD CONSTRAINT supplier_purchases_data_quality_grade_chk
    CHECK (
      data_quality_grade IS NULL
      OR data_quality_grade IN ('A', 'B', 'C', 'D', 'E')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN supplier_purchases.calculation_method IS
  'spend | physical | supplier_specific | hybrid — méthode CarboScan (pas un label GHG officiel).';
COMMENT ON COLUMN supplier_purchases.data_quality_grade IS
  'Indice de qualité des données CarboScan A–E (dérivé auto). N''évalue pas la performance carbone.';

CREATE TABLE IF NOT EXISTS supplier_purchase_calculation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES supplier_purchases(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  -- snapshot précédent
  previous_method TEXT,
  previous_data_quality_grade TEXT,
  previous_factor_id UUID,
  previous_factor_value NUMERIC,
  previous_factor_unit TEXT,
  previous_factor_source TEXT,
  previous_factor_year INT,
  previous_emissions_kgco2e NUMERIC,
  previous_quantity NUMERIC,
  previous_quantity_unit TEXT,
  previous_amount NUMERIC,
  previous_currency TEXT,
  -- snapshot nouveau
  new_method TEXT,
  new_data_quality_grade TEXT,
  new_factor_id UUID,
  new_factor_value NUMERIC,
  new_factor_unit TEXT,
  new_factor_source TEXT,
  new_factor_year INT,
  new_emissions_kgco2e NUMERIC,
  new_quantity NUMERIC,
  new_quantity_unit TEXT,
  new_amount NUMERIC,
  new_currency TEXT,
  is_methodological_revaluation BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_spc_history_purchase
  ON supplier_purchase_calculation_history (purchase_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_spc_history_org
  ON supplier_purchase_calculation_history (organization_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_purchases_org_year
  ON supplier_purchases (organization_id, reference_year);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_supplier
  ON supplier_purchases (organization_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_site
  ON supplier_purchases (organization_id, site_id)
  WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_method
  ON supplier_purchases (organization_id, calculation_method);

-- Objectif de couverture données spécifiques (org)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS purchases_primary_data_target_pct NUMERIC DEFAULT 30;

COMMENT ON COLUMN organizations.purchases_primary_data_target_pct IS
  'Objectif % émissions achats couvertes par données physiques ou fournisseur (configurable).';

-- Backfill grades from existing data_method where possible
UPDATE supplier_purchases SET
  calculation_method = CASE
    WHEN data_method IN ('supplier_specific') THEN 'supplier_specific'
    WHEN quantity IS NOT NULL AND quantity_unit IS NOT NULL
         AND quantity_unit NOT IN ('TND','EUR','USD','MAD','DZD','XOF','XAF','EGP','kEUR')
         THEN 'physical'
    WHEN amount IS NOT NULL THEN 'spend'
    ELSE COALESCE(calculation_method, 'spend')
  END,
  data_quality_grade = CASE
    WHEN data_method = 'supplier_specific' AND COALESCE(is_validated, false) THEN 'A'
    WHEN data_method = 'supplier_specific' THEN 'B'
    WHEN quantity IS NOT NULL AND quantity_unit IS NOT NULL
         AND quantity_unit NOT IN ('TND','EUR','USD','MAD','DZD','XOF','XAF','EGP','kEUR')
         AND emission_factor_id IS NOT NULL THEN 'C'
    WHEN amount IS NOT NULL AND emission_factor_id IS NOT NULL THEN 'D'
    WHEN amount IS NOT NULL THEN 'D'
    ELSE 'E'
  END
WHERE calculation_method IS NULL OR data_quality_grade IS NULL;
