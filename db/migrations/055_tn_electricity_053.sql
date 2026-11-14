-- Électricité Tunisie : 0,53 kgCO2e/kWh.
-- Remplace le défaut silencieux 0,56 et la valeur de catalogue 0,523.
-- Année du mix et source officielle : non renseignées. Ne pas les inventer.
-- Ne touche ni le gazole, ni les autres facteurs, ni les sites hors Tunisie,
-- ni une ligne qui a déjà un facteur copié.

-- Inventaire production du 13 nov 2026 : 63 lignes d'électricité, toutes en kWh.
-- Aucune ligne MWh, GWh ou autre unité. Pas de conversion appliquée.
-- 0,53 kgCO2e/kWh = 530 kgCO2e/MWh resterait la conversion si une telle ligne apparaissait.

ALTER TABLE activity_data
  ADD COLUMN IF NOT EXISTS factor_correction_previous_value NUMERIC(24, 12),
  ADD COLUMN IF NOT EXISTS factor_correction_new_value NUMERIC(24, 12),
  ADD COLUMN IF NOT EXISTS factor_correction_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS factor_correction_reason TEXT,
  ADD COLUMN IF NOT EXISTS factor_correction_previous_notes TEXT,
  ADD COLUMN IF NOT EXISTS factor_correction_previous_source TEXT,
  ADD COLUMN IF NOT EXISTS factor_correction_country_basis TEXT;

ALTER TABLE emission_factors
  ADD COLUMN IF NOT EXISTS official_source TEXT,
  ADD COLUMN IF NOT EXISTS official_year INT;

ALTER TABLE bilans_carbone
  ADD COLUMN IF NOT EXISTS supersedes_bilan_id UUID REFERENCES bilans_carbone(id);

CREATE TABLE IF NOT EXISTS bilan_electricity_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id UUID NOT NULL REFERENCES bilans_carbone(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  factor_used NUMERIC(24, 12) NOT NULL,
  factor_correct NUMERIC(24, 12) NOT NULL,
  electricity_kwh NUMERIC(24, 6) NOT NULL,
  current_total_kg NUMERIC(24, 6) NOT NULL,
  recalculated_total_kg NUMERIC(24, 6) NOT NULL,
  delta_kg NUMERIC(24, 6) NOT NULL,
  delta_pct NUMERIC(12, 4),
  marker TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bilan_id)
);

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
    WHEN src.stable_factor_id = 'electricity_kwh' THEN src.factor_value
    ELSE 0.56
  END,
  factor_correction_new_value = 0.53,
  factor_correction_at = now(),
  factor_correction_reason = 'correction facteur erroné',
  factor_correction_country_basis = src.country_basis,
  emission_factor_source = 'Newcarboscan Core Pack TN — Électricité location-based TN',
  notes = 'FE_SNAPSHOT:' || json_build_object(
    'id', COALESCE(src.factor_row_id, 'tn-grid-electricity'),
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
    'replacementReason', NULL,
    'countryBasis', src.country_basis,
    'officialSource', NULL,
    'officialYear', NULL
  )::text || CASE WHEN COALESCE(a.notes, '') = '' THEN '' ELSE E'\n' || a.notes END
FROM (
  SELECT
    a2.id,
    f.stable_factor_id,
    f.value AS factor_value,
    f.id::text AS factor_row_id,
    CASE
      WHEN upper(btrim(COALESCE(s.country_code, ''))) IN ('TN', 'TUN') THEN 'site'
      ELSE 'pays déduit de l''organisation'
    END AS country_basis
  FROM activity_data a2
  JOIN organizations o ON o.id = a2.organization_id
  LEFT JOIN collect_sites s ON s.id = a2.site_id
  LEFT JOIN emission_factors f ON f.id = a2.factor_id
  WHERE lower(CASE WHEN a2.subcategory LIKE '%:%' THEN split_part(a2.subcategory, ':', 2) ELSE a2.subcategory END)
        IN ('electricite', 'electricity', 'electricity_grid')
    AND lower(a2.unit) = 'kwh'
    AND COALESCE(a2.notes, '') !~ 'FE_SNAPSHOT:|FE_ADEME:'
    AND a2.factor_correction_at IS NULL
    AND (
      upper(COALESCE(s.country_code, '')) IN ('TN', 'TUN')
      OR (
        COALESCE(s.country_code, '') = ''
        AND lower(COALESCE(o.country, '')) IN ('tn', 'tun', 'tunisie', 'tunisia')
      )
    )
) src
WHERE a.id = src.id;

UPDATE emission_factors
SET value = 0.53
WHERE stable_factor_id = 'electricity_kwh'
  AND value IS DISTINCT FROM 0.53;

-- Marqueur sur les bilans validés. Les totaux figés ne sont pas réécrits.
INSERT INTO bilan_electricity_notices (
  bilan_id, organization_id, factor_used, factor_correct, electricity_kwh,
  current_total_kg, recalculated_total_kg, delta_kg, delta_pct, marker
)
SELECT
  b.id,
  b.organization_id,
  chosen.factor_used,
  0.53,
  elec.kwh,
  COALESCE(b.total_kgco2e, b.total_emission * 1000),
  COALESCE(b.total_kgco2e, b.total_emission * 1000) + elec.kwh * (0.53 - chosen.factor_used),
  elec.kwh * (0.53 - chosen.factor_used),
  CASE
    WHEN COALESCE(b.total_kgco2e, b.total_emission * 1000) = 0 THEN NULL
    ELSE elec.kwh * (0.53 - chosen.factor_used) / COALESCE(b.total_kgco2e, b.total_emission * 1000) * 100
  END,
  'Facteur électricité corrigé depuis la validation'
FROM bilans_carbone b
JOIN (
  SELECT a.organization_id,
         EXTRACT(YEAR FROM a.period_start)::int AS year,
         SUM(a.quantity) AS kwh
  FROM activity_data a
  JOIN organizations o ON o.id = a.organization_id
  LEFT JOIN collect_sites s ON s.id = a.site_id
  WHERE lower(CASE WHEN a.subcategory LIKE '%:%' THEN split_part(a.subcategory, ':', 2) ELSE a.subcategory END)
        IN ('electricite', 'electricity', 'electricity_grid')
    AND lower(a.unit) = 'kwh'
    AND (
      upper(COALESCE(s.country_code, '')) IN ('TN', 'TUN')
      OR (
        COALESCE(s.country_code, '') = ''
        AND lower(COALESCE(o.country, '')) IN ('tn', 'tun', 'tunisie', 'tunisia')
      )
    )
  GROUP BY 1, 2
) elec ON elec.organization_id = b.organization_id AND elec.year = b.year
JOIN LATERAL (
  SELECT CASE
    WHEN ledger.factor_value IS NOT NULL THEN ledger.factor_value
    WHEN abs(COALESCE(b.scope2_kgco2e, b.scope2_emission * 1000) - elec.kwh * 0.56)
       <= abs(COALESCE(b.scope2_kgco2e, b.scope2_emission * 1000) - elec.kwh * 0.523)
      THEN 0.56
    ELSE 0.523
  END AS factor_used
  FROM (SELECT 1) AS anchor
  LEFT JOIN LATERAL (
    SELECT MIN(l.factor_value) AS factor_value
    FROM calculation_ledger l
    WHERE l.run_id = b.run_id
      AND lower(l.activity_unit) = 'kwh'
      AND l.factor_value IN (0.56, 0.523)
    HAVING COUNT(DISTINCT l.factor_value) = 1
  ) ledger ON true
) chosen ON chosen.factor_used IN (0.56, 0.523)
WHERE b.status IN ('validated', 'submitted')
  AND (
    EXISTS (
      SELECT 1 FROM calculation_ledger l
      WHERE l.run_id = b.run_id
        AND lower(l.activity_unit) = 'kwh'
        AND l.factor_value = chosen.factor_used
    )
    OR abs(COALESCE(b.scope2_kgco2e, b.scope2_emission * 1000) - elec.kwh * chosen.factor_used)
       <= GREATEST(abs(COALESCE(b.scope2_kgco2e, b.scope2_emission * 1000)) * 0.01, 1)
  )
  AND NOT EXISTS (
    SELECT 1 FROM bilan_electricity_notices n WHERE n.bilan_id = b.id
  );
