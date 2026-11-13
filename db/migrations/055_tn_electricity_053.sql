-- Électricité Tunisie : 0,53 kgCO2e/kWh.
-- Remplace le défaut silencieux 0,56 et la valeur de catalogue 0,523.
-- Année du mix et source officielle : non renseignées. Ne pas les inventer.
-- Ne touche ni le gazole, ni les autres facteurs, ni les sites hors Tunisie,
-- ni une ligne qui a déjà un facteur copié.

ALTER TABLE activity_data
  ADD COLUMN IF NOT EXISTS factor_correction_previous_value NUMERIC(24, 12),
  ADD COLUMN IF NOT EXISTS factor_correction_new_value NUMERIC(24, 12),
  ADD COLUMN IF NOT EXISTS factor_correction_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS factor_correction_reason TEXT,
  ADD COLUMN IF NOT EXISTS factor_correction_previous_notes TEXT,
  ADD COLUMN IF NOT EXISTS factor_correction_previous_source TEXT;

CREATE TABLE IF NOT EXISTS factor_value_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_id UUID NOT NULL,
  previous_value NUMERIC(24, 12) NOT NULL,
  new_value NUMERIC(24, 12) NOT NULL,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL
);

INSERT INTO factor_value_corrections (factor_id, previous_value, new_value, reason)
SELECT f.id, f.value, 0.53, 'correction facteur erroné'
FROM emission_factors f
WHERE f.stable_factor_id = 'electricity_kwh'
  AND f.value IS DISTINCT FROM 0.53
  AND NOT EXISTS (
    SELECT 1 FROM factor_value_corrections c
    WHERE c.factor_id = f.id AND c.reason = 'correction facteur erroné'
  );

UPDATE activity_data a
SET
  factor_correction_previous_notes = a.notes,
  factor_correction_previous_source = a.emission_factor_source,
  factor_correction_previous_value = CASE
    WHEN f.stable_factor_id = 'electricity_kwh' THEN f.value
    ELSE 0.56
  END,
  factor_correction_new_value = 0.53,
  factor_correction_at = now(),
  factor_correction_reason = 'correction facteur erroné',
  emission_factor_source = 'Newcarboscan Core Pack TN — Électricité location-based TN',
  notes = 'FE_SNAPSHOT:' || json_build_object(
    'id', COALESCE(f.id::text, 'tn-grid-electricity'),
    'name', 'Électricité location-based TN',
    'value', 0.53,
    'unit', 'kgCO2e/kWh',
    'sourceKey', 'internal',
    'sourceName', 'Newcarboscan Core Pack TN',
    'datasetVersion', 'core-tn-2027.1',
    'countryCode', 'TN',
    'region', NULL,
    'factorYear', NULL,
    'stableFactorId', 'electricity_kwh',
    'replacementReason', NULL
  )::text || CASE WHEN COALESCE(a.notes, '') = '' THEN '' ELSE E'\n' || a.notes END
FROM organizations o
LEFT JOIN collect_sites s ON s.id = a.site_id
LEFT JOIN emission_factors f ON f.id = a.factor_id
WHERE o.id = a.organization_id
  AND lower(CASE WHEN a.subcategory LIKE '%:%' THEN split_part(a.subcategory, ':', 2) ELSE a.subcategory END)
      IN ('electricite', 'electricity', 'electricity_grid')
  AND lower(a.unit) = 'kwh'
  AND COALESCE(a.notes, '') !~ 'FE_SNAPSHOT:|FE_ADEME:'
  AND a.factor_correction_at IS NULL
  AND (
    upper(COALESCE(s.country_code, '')) IN ('TN', 'TUN')
    OR (
      COALESCE(s.country_code, '') = ''
      AND lower(COALESCE(o.country, '')) IN ('tn', 'tun', 'tunisie', 'tunisia')
    )
  );

UPDATE emission_factors
SET value = 0.53
WHERE stable_factor_id = 'electricity_kwh'
  AND value IS DISTINCT FROM 0.53;
