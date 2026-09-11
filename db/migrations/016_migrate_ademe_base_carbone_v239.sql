-- =============================================================================
-- 016 — Migration contrôlée ADEME Base Carbone v23.9
--   emission_factors_legacy  →  factor_sources / emission_factor_versions / emission_factors
--
-- Scope : source = 'ADEME Base Carbone v23.9' uniquement (~7394 lignes)
-- Legacy : INTACT (aucune suppression)
-- Idempotent : ON CONFLICT (stable_factor_id, version_number)
--
-- Checksum (ef_migrate_factor_checksum) — champs concaténés par '|' :
--   stable_factor_id, dataset_version, name, value, unit_numerator, unit_denominator,
--   COALESCE(geography,''), COALESCE(category,'')
-- Algorithme : SHA-256 hex
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helpers (conservés pour audit / migrations futures — voir rollback doc)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ef_migrate_extract_factor_year(p_name TEXT)
RETURNS INT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_name ~ ' - [0-9]{4} - '
      THEN (substring(p_name FROM ' - ([0-9]{4}) - '))::INT
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION ef_migrate_extract_geography(
  p_factor_name TEXT,
  p_subcategory TEXT,
  p_category    TEXT
)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  t TEXT := coalesce(p_factor_name, '') || ' ' || coalesce(p_subcategory, '');
BEGIN
  -- Règles explicites uniquement — jamais de FR par défaut sur source ADEME
  IF p_factor_name ~* '/FR U$|/FR$|\(Parc Français\)|\bFrance\b' THEN
    RETURN 'FR';
  END IF;
  IF p_factor_name ~* '\bTunisie\b|\bTunisia\b' THEN RETURN 'TN'; END IF;
  IF p_factor_name ~* '\bMaroc\b|\bMorocco\b' THEN RETURN 'MA'; END IF;
  IF p_factor_name ~* '\bTurquie\b|\bTurkey\b' THEN RETURN 'TR'; END IF;
  IF p_factor_name ~* '\bChine\b|\bChina\b' THEN RETURN 'CN'; END IF;
  IF p_factor_name ~* '\bMonde\b|\bGlobal\b|\(Monde\)' THEN RETURN 'GLOBAL'; END IF;
  IF p_factor_name ~* '\bUSA\b|\bUnited States\b|\bUS\b' THEN RETURN 'US'; END IF;
  IF p_factor_name ~* '\bEurope\b' THEN RETURN 'EU'; END IF;
  -- Réseaux chaleur : région française explicite dans subcategory
  IF p_category = 'Réseaux de chaleur / froid'
     AND p_subcategory ~ '^(Rhône-Alpes|Île-de-France|Lorraine|Alsace|Midi-Pyrénées|Provence-Alpes-Côte d''Azur|Auvergne|Bretagne|Bourgogne|Aquitaine|Nord-Pas-de-Calais|Centre|Pays de la Loire|Franche-Comté|Poitou-Charentes|Haute-Normandie|Languedoc-Roussillon|Basse-Normandie|Picardie|Limousin|Champagne-Ardenne)$'
  THEN
    RETURN 'FR';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION ef_migrate_normalize_unit(p_unit TEXT)
RETURNS TABLE (
  unit_numerator         TEXT,
  unit_denominator       TEXT,
  normalization_status   TEXT,
  unit_qualifier         TEXT,
  value_multiplier       NUMERIC,
  value_conversion       JSONB
)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  u TEXT := trim(coalesce(p_unit, ''));
  u_lower TEXT;
  qual TEXT := NULL;
  num TEXT := NULL;
  den TEXT := NULL;
  mult NUMERIC := 1;
  conv JSONB := NULL;
  st TEXT := 'ok';
BEGIN
  IF u = '' THEN
    RETURN QUERY SELECT 'kgCO2e'::TEXT, 'unknown'::TEXT, 'review_required'::TEXT,
      NULL::TEXT, 1::NUMERIC, NULL::JSONB;
    RETURN;
  END IF;

  u_lower := lower(replace(replace(replace(u, '³', '3'), '²', '2'), ' ', ''));

  -- Qualificatifs
  IF u ~* 'PCI' THEN qual := concat_ws('; ', qual, 'PCI'); END IF;
  IF u ~* 'PCS' THEN qual := concat_ws('; ', qual, 'PCS'); END IF;
  IF u ~* 'poids net' THEN qual := concat_ws('; ', qual, 'poids net'); END IF;
  IF u ~* 'poids vif' THEN qual := concat_ws('; ', qual, 'poids vif'); END IF;
  IF u ~* '\(n\)' THEN qual := concat_ws('; ', qual, 'n'); END IF;
  IF u ~* ' HT$| HT |\(.*\) HT' THEN qual := concat_ws('; ', qual, 'HT'); END IF;
  IF u ~* ' TTC$| TTC |\(.*\) TTC' THEN qual := concat_ws('; ', qual, 'TTC'); END IF;

  -- Numérateur (kgCO2e AVANT gCO2e — sinon « gCO2e » matche dans « kgCO2e »)
  IF u ~* 'tCO2e|t CO2e|tco2e' THEN
    num := 'kgCO2e';
    conv := jsonb_build_object('note', 'tCO2e numerator normalized to kgCO2e; rate magnitude unchanged (t/MWh = kg/kWh)');
  ELSIF u ~* 'kgCO2e|kg CO2e|kg CO₂e|kgco2e' THEN
    num := 'kgCO2e';
  ELSIF u ~* '(^|[^k])gCO2e|g CO2e' THEN
    num := 'kgCO2e';
    mult := 0.001;
    conv := jsonb_build_object('note', 'gCO2e → kgCO2e', 'multiplier', 0.001);
  ELSE
    num := NULL;
  END IF;

  -- Dénominateur (ordre important)
  IF u ~* 'keuro|keur|k€' THEN den := 'kEUR';
  ELSIF u ~* '/eur\b|/€|euro' AND u !~* 'keuro' THEN den := 'EUR';
  ELSIF u ~* 'tnd|\bdt\b' THEN den := 'TND';
  ELSIF u ~* 'usd|dollar' THEN den := 'USD';
  ELSIF u ~* 'passager\.km|passager-km|voyageur\.km' THEN den := 'passager.km';
  ELSIF u ~* 't\.km|tonne\.km|tonnes\.km|/t\.km' THEN den := 't.km';
  ELSIF u ~* 'kg\.km|kg/km' THEN den := 'kg.km';
  ELSIF u ~* 'kwh' THEN den := 'kWh';
  ELSIF u ~* 'mwh' THEN den := 'MWh';
  ELSIF u ~* 'gwh' THEN den := 'GWh';
  ELSIF u ~* 'gj' THEN den := 'GJ';
  ELSIF u ~* 'mj' THEN den := 'MJ';
  ELSIF u ~* 'm3\(n\)|m³\(n\)|nm3|m3|m³' THEN den := 'm3';
  ELSIF u ~* 'litre|litres|/l\b|/ litre' THEN den := 'L';
  ELSIF u ~* 'ha\.an|ha/an|/ha\.an' THEN den := 'ha.an';
  ELSIF u ~* 'm2\.an|m²\.an|m2/an' THEN den := 'm2.an';
  ELSIF u ~* 'm2\b|m²' AND u !~* '\.an' THEN den := 'm2';
  ELSIF u ~* '\bha\b' AND u !~* '\.an' THEN den := 'ha';
  ELSIF u ~* 'tonne de déchets|/tonne de déchets' THEN den := 't';
  ELSIF u ~* 'tonne produites|/tonne produites' THEN den := 't';
  ELSIF u ~* 'kgh2|kg h2' THEN den := 'kgH2';
  ELSIF u ~* 'kgCO2e/kg|kg CO2e/kg|kg CO₂e/kg' THEN den := 'kg';
  ELSIF u ~* 'kg d''azote|kg azote|kg ntk|kg de cuir|kg textile|kg produit|kg de dattes|kg de soudure|kg de tôle|kg de vapeur|kg explosif|kg traité|kg de matière|kg dco|kg de poids' THEN den := 'kg';
  ELSIF u ~* '/kg$' AND u !~* 'kg\.km|kgh2' THEN den := 'kg';
  ELSIF u ~* 'kgco2e/tonne$|kg CO2e/tonne$|/tonne$' THEN den := 't';
  ELSIF u ~* 'tonne de déchets|tonne produites|tonne de clinker' THEN den := 't';
  ELSIF u ~* 'personne\.mois' THEN den := 'personne.mois';
  ELSIF u ~* '/km\.passager|km/passager|km\.passager' THEN den := 'passenger.km';
  ELSIF u ~* 'kgco2e/km$|kg CO2e/km$|/km$' AND u !~* 't\.km|passager|kg\.km' THEN den := 'km';
  ELSIF u ~* 'kgco2e/ha$|kg CO2e/ha$|/ha$' THEN den := 'ha';
  ELSIF u ~* 'kgco2e/plant$|kg CO2e/plant$|/plant$' THEN den := 'plant';
  ELSIF u ~* 'kgco2e/ml$|kg CO2e/ml$|/ml$' THEN den := 'mL';
  ELSIF u ~* 'kgco2e/m$|kg CO2e/m$|/m$' THEN den := 'm';
  ELSIF u ~* 'unité|unite|unit$|appareil|livre$|repas$|pneu|page|colis|dossier|bain|douche|rame|paire|prestation|opération|operation|utilisation|véhicule|veicule|email|employé|employe|salarié|pers|place\.an|100 feuilles|feuilles a4' THEN den := 'unit';
  ELSIF u ~* 'personne\.an|collaborateur\.an|tête\.an|tete\.an|tête/an|logement\.an|serveur\.an|unité/an|unit/an|go\.an|arbre\.an|m\.linéaire\.an|pers\.an' THEN den := 'unit.an';
  ELSIF u ~* 'tep' THEN den := 'tep';
  ELSIF u ~* '/m de route' THEN den := 'm';
  ELSIF u ~* 'mètre\b|metre\b' THEN den := 'm';
  ELSIF u ~* 'm2 shon|m² shon|/m2$|/m²$' AND u !~* '\.an' THEN den := 'm2';
  ELSIF u ~* 'kgco2e/livre$|/livre$' THEN den := 'livre';
  ELSIF u ~* 'kgco2e/repas$|/repas$' THEN den := 'repas';
  ELSIF u ~* '\ban\b' AND u !~* '\.an' THEN den := 'an';
  ELSIF u ~* 'heure|\bh\b' THEN den := 'hour';
  ELSIF u ~* 'tx\b' THEN den := 'tx';
  ELSIF u ~* 'go\b' THEN den := 'Go';
  ELSIF u ~* 'kwc' THEN den := 'kWc';
  ELSIF u ~* '1m€|m€' THEN den := 'MEUR';
  ELSE den := NULL;
  END IF;

  IF num IS NULL OR den IS NULL THEN
    st := 'review_required';
    num := coalesce(num, 'kgCO2e');
    den := coalesce(den, 'unknown');
  END IF;

  -- Cas ambigus explicites
  IF u ~* 'kg CO₂e/km\.passager' AND den = 'km' THEN
    den := 'passenger.km';
  END IF;

  RETURN QUERY SELECT num, den, st, qual, mult, conv;
END;
$$;

CREATE OR REPLACE FUNCTION ef_migrate_factor_checksum(
  p_stable_factor_id TEXT,
  p_dataset_version  TEXT,
  p_name             TEXT,
  p_value            NUMERIC,
  p_unit_num         TEXT,
  p_unit_den         TEXT,
  p_geography        TEXT,
  p_category         TEXT
)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(digest(
    concat_ws('|',
      coalesce(p_stable_factor_id, ''),
      coalesce(p_dataset_version, ''),
      coalesce(p_name, ''),
      coalesce(p_value::TEXT, ''),
      coalesce(p_unit_num, ''),
      coalesce(p_unit_den, ''),
      coalesce(p_geography, ''),
      coalesce(p_category, '')
    ),
    'sha256'
  ), 'hex');
$$;

CREATE OR REPLACE FUNCTION ef_migrate_monetary_meta(p_unit TEXT)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  u TEXT := coalesce(p_unit, '');
  cur TEXT := NULL;
  myear TEXT := NULL;
  tax TEXT := NULL;
BEGIN
  IF u ~* 'keuro|keur|k€' THEN cur := 'EUR';
  ELSIF u ~* 'tnd|\bdt\b' THEN cur := 'TND';
  ELSIF u ~* 'usd|dollar' THEN cur := 'USD';
  ELSIF u ~* 'eur|€|euro' THEN cur := 'EUR';
  END IF;
  IF u ~ '\((\d{4})\)' THEN myear := substring(u FROM '\((\d{4})\)'); END IF;
  IF u ~* ' HT$| HT |\(.*\) HT' THEN tax := 'HT';
  ELSIF u ~* ' TTC$| TTC |\(.*\) TTC' THEN tax := 'TTC';
  END IF;
  IF cur IS NULL AND myear IS NULL AND tax IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_strip_nulls(jsonb_build_object(
    'currency', cur,
    'monetary_year', myear,
    'tax_basis', tax
  ));
END;
$$;

-- ---------------------------------------------------------------------------
-- Source & version (UUID fixes — idempotents)
-- ---------------------------------------------------------------------------

-- Réutiliser la source si le nom existe déjà (pas de doublon)
INSERT INTO factor_sources (id, name, license, homepage)
SELECT
  'a2000000-0000-4000-8000-000000000001',
  'ADEME Base Carbone',
  NULL,
  'https://base-empreinte.ademe.fr/'
WHERE NOT EXISTS (
  SELECT 1 FROM factor_sources WHERE name = 'ADEME Base Carbone'
);

INSERT INTO emission_factor_versions (
  id, source_id, version_label, published_year, valid_from,
  source_dataset, status, approved_at, notes
)
SELECT
  'a2000000-0000-4000-8000-000000000002',
  s.id,
  '23.9',
  NULL,
  NULL,
  'Base Carbone v23.9',
  'draft',
  now(),
  'Migrated from emission_factors_legacy where source = ADEME Base Carbone v23.9. dataset_version=23.9. legacy year column preserved in metadata.legacy_year — not used as version_label. Version status=draft until explicit activation (keeps GET /v1/factors at 8 seed FE; no CarboScan behavior change).'
FROM (SELECT id FROM factor_sources WHERE name = 'ADEME Base Carbone' LIMIT 1) s
ON CONFLICT (source_id, version_label) DO UPDATE SET
  source_dataset = EXCLUDED.source_dataset,
  notes = EXCLUDED.notes,
  status = EXCLUDED.status;

-- ---------------------------------------------------------------------------
-- Pre-count
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_legacy_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_legacy_count
  FROM emission_factors_legacy
  WHERE source = 'ADEME Base Carbone v23.9';

  RAISE NOTICE '016 pre-migration: legacy ADEME Base Carbone v23.9 count = %', v_legacy_count;

  IF v_legacy_count = 0 THEN
    RAISE EXCEPTION '016 aborted: no legacy rows for ADEME Base Carbone v23.9';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Migration INSERT (idempotent)
-- ---------------------------------------------------------------------------

INSERT INTO emission_factors (
  version_id,
  external_code,
  stable_factor_id,
  version_number,
  name,
  category,
  geography,
  technology,
  unit_numerator,
  unit_denominator,
  value,
  status,
  checksum,
  approved_at,
  metadata
)
SELECT
  'a2000000-0000-4000-8000-000000000002'::UUID AS version_id,
  ext.ademe_num AS external_code,
  'ademe:' || ext.ademe_num AS stable_factor_id,
  1 AS version_number,
  coalesce(nullif(trim(l.factor_name), ''), nullif(trim(l.nom_affiche), ''), l.slug) AS name,
  l.category,
  ef_migrate_extract_geography(l.factor_name, l.subcategory, l.category) AS geography,
  NULL::TEXT AS technology,
  norm.unit_numerator,
  norm.unit_denominator,
  (l.emission_factor * norm.value_multiplier) AS value,
  CASE
    WHEN coalesce(l.raw_legacy->>'is_active', 'true') = 'false' THEN 'deprecated'
    WHEN l.raw_legacy->>'superseded_by' IS NOT NULL
         AND l.raw_legacy->>'superseded_by' NOT IN ('', 'null') THEN 'deprecated'
    ELSE 'approved'
  END AS status,
  ef_migrate_factor_checksum(
    'ademe:' || ext.ademe_num,
    '23.9',
    coalesce(nullif(trim(l.factor_name), ''), nullif(trim(l.nom_affiche), ''), l.slug),
    l.emission_factor * norm.value_multiplier,
    norm.unit_numerator,
    norm.unit_denominator,
    ef_migrate_extract_geography(l.factor_name, l.subcategory, l.category),
    l.category
  ) AS checksum,
  now() AS approved_at,
  jsonb_strip_nulls(jsonb_build_object(
    'migration_id', '016_ademe_bc_v239',
    'legacy_table', 'emission_factors_legacy',
    'legacy_row_id', l.id::TEXT,
    'legacy_id', l.legacy_id,
    'legacy_slug', l.slug,
    'original_source', l.source,
    'original_unit', l.unit,
    'normalization_status', norm.normalization_status,
    'unit_qualifier', norm.unit_qualifier,
    'value_conversion', norm.value_conversion,
    'geography_status', CASE
      WHEN ef_migrate_extract_geography(l.factor_name, l.subcategory, l.category) IS NULL
      THEN 'unknown'
      ELSE 'extracted'
    END,
    'dataset_version', '23.9',
    'legacy_year', l.year,
    'factor_year', ef_migrate_extract_factor_year(l.factor_name),
    'source_category', l.category,
    'source_subcategory', l.subcategory,
    'nom_affiche', l.nom_affiche,
    'factor_name', l.factor_name,
    'raw_legacy_is_active', l.raw_legacy->>'is_active',
    'raw_legacy_superseded_by', l.raw_legacy->>'superseded_by',
    'monetary', ef_migrate_monetary_meta(l.unit)
  )) AS metadata
FROM emission_factors_legacy l
CROSS JOIN LATERAL (
  SELECT substring(l.slug FROM '^ademe-v239-([0-9]+)') AS ademe_num
) ext
CROSS JOIN LATERAL ef_migrate_normalize_unit(l.unit) norm
WHERE l.source = 'ADEME Base Carbone v23.9'
  AND ext.ademe_num IS NOT NULL
ON CONFLICT (stable_factor_id, version_number)
  WHERE stable_factor_id IS NOT NULL
DO UPDATE SET
  external_code = EXCLUDED.external_code,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  geography = EXCLUDED.geography,
  unit_numerator = EXCLUDED.unit_numerator,
  unit_denominator = EXCLUDED.unit_denominator,
  value = EXCLUDED.value,
  status = EXCLUDED.status,
  checksum = EXCLUDED.checksum,
  metadata = EXCLUDED.metadata;

-- Rows without ademe slug (should be 0 for this source — log if any)
DO $$
DECLARE
  v_skipped BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_skipped
  FROM emission_factors_legacy l
  WHERE l.source = 'ADEME Base Carbone v23.9'
    AND substring(l.slug FROM '^ademe-v239-([0-9]+)') IS NULL;

  IF v_skipped > 0 THEN
    RAISE WARNING '016: % legacy rows skipped (missing ademe-v239-N slug)', v_skipped;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Post-migration verification (raises on failure)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_legacy BIGINT;
  v_migrated BIGINT;
  v_distinct_ext BIGINT;
  v_distinct_stable BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_legacy
  FROM emission_factors_legacy WHERE source = 'ADEME Base Carbone v23.9';

  SELECT COUNT(*) INTO v_migrated
  FROM emission_factors
  WHERE version_id = 'a2000000-0000-4000-8000-000000000002';

  SELECT COUNT(DISTINCT external_code) INTO v_distinct_ext
  FROM emission_factors
  WHERE version_id = 'a2000000-0000-4000-8000-000000000002';

  SELECT COUNT(DISTINCT stable_factor_id) INTO v_distinct_stable
  FROM emission_factors
  WHERE version_id = 'a2000000-0000-4000-8000-000000000002';

  RAISE NOTICE '016 post-migration: legacy=% migrated=% distinct_external_code=% distinct_stable_factor_id=%',
    v_legacy, v_migrated, v_distinct_ext, v_distinct_stable;

  IF v_migrated <> 7394 THEN
    RAISE EXCEPTION '016 verification failed: expected 7394 migrated rows, got %', v_migrated;
  END IF;

  IF v_distinct_ext <> v_migrated OR v_distinct_stable <> v_migrated THEN
    RAISE EXCEPTION '016 verification failed: duplicate external_code or stable_factor_id';
  END IF;
END $$;

COMMIT;
