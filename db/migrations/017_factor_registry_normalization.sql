-- =============================================================================
-- 017 — Normalisation registre canonique multi-source (structure + backfill)
--
-- Scope backfill :
--   - ADEME v23.9 (metadata.migration_id = '016_ademe_bc_v239') — 7394 FE
--   - Seed TN core pack (version core-tn-2027.1) — 8 FE
--
-- Garde-fous :
--   - ADEME version reste draft
--   - geography colonne legacy : NON modifiée
--   - value / category scope TN : NON modifiées
--   - Idempotent (normalization_id = '017_factor_registry_normalization')
--
-- Checksum v2 (ef_factor_checksum_v2) — champs concaténés par '|' :
--   stable_factor_id, dataset_version, name, value::text,
--   unit_numerator, unit_denominator,
--   COALESCE(country_code,''), COALESCE(source_category,''), factor_type
-- Algorithme : SHA-256 hex
-- metadata.checksum_algorithm = 'sha256', metadata.checksum_version = 'v2'
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Schema extensions
-- ---------------------------------------------------------------------------

ALTER TABLE factor_sources
  ADD COLUMN IF NOT EXISTS source_key TEXT,
  ADD COLUMN IF NOT EXISTS publisher TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_factor_sources_source_key
  ON factor_sources(source_key) WHERE source_key IS NOT NULL;

ALTER TABLE emission_factor_versions
  ADD COLUMN IF NOT EXISTS dataset_version TEXT;

ALTER TABLE emission_factors
  ADD COLUMN IF NOT EXISTS factor_type TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS source_category TEXT,
  ADD COLUMN IF NOT EXISTS source_subcategory TEXT,
  ADD COLUMN IF NOT EXISTS internal_category TEXT,
  ADD COLUMN IF NOT EXISTS internal_subcategory TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS factor_year INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emission_factors_factor_type_check'
  ) THEN
    ALTER TABLE emission_factors
      ADD CONSTRAINT emission_factors_factor_type_check
      CHECK (factor_type IN (
        'physical', 'monetary', 'gwp', 'lca', 'supplier',
        'avoided_emission', 'other', 'unknown'
      ));
  END IF;
END $$;

COMMENT ON COLUMN emission_factors.category IS
  'Legacy display category (scope1/2/3 for TN seed; ADEME source label). Prefer source_category + internal_category.';

CREATE INDEX IF NOT EXISTS idx_factors_factor_type ON emission_factors(factor_type);
CREATE INDEX IF NOT EXISTS idx_factors_internal_category ON emission_factors(internal_category);
CREATE INDEX IF NOT EXISTS idx_factors_country_code ON emission_factors(country_code);
CREATE INDEX IF NOT EXISTS idx_factors_source_subcategory ON emission_factors(source_subcategory);
CREATE INDEX IF NOT EXISTS idx_factors_factor_year ON emission_factors(factor_year);
CREATE INDEX IF NOT EXISTS idx_factor_versions_dataset_version ON emission_factor_versions(dataset_version);

-- ---------------------------------------------------------------------------
-- Canonical unit normalization (Nm3 ≠ m3; label vs magnitude separated)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ef_canonical_normalize_unit(p_unit TEXT)
RETURNS TABLE (
  unit_numerator         TEXT,
  unit_denominator       TEXT,
  normalization_status   TEXT,
  qualifiers             TEXT[],
  value_multiplier       NUMERIC,
  label_only             BOOLEAN
)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  u TEXT := trim(coalesce(p_unit, ''));
  qual TEXT[] := ARRAY[]::TEXT[];
  num TEXT := NULL;
  den TEXT := NULL;
  mult NUMERIC := 1;
  lbl_only BOOLEAN := true;
  st TEXT := 'ok';
BEGIN
  IF u = '' THEN
    RETURN QUERY SELECT 'kgCO2e'::TEXT, 'unknown'::TEXT, 'review_required'::TEXT,
      ARRAY[]::TEXT[], 1::NUMERIC, true;
    RETURN;
  END IF;

  IF u ~* 'PCI' THEN qual := array_append(qual, 'PCI'); END IF;
  IF u ~* 'PCS' THEN qual := array_append(qual, 'PCS'); END IF;
  IF u ~* 'poids net' THEN qual := array_append(qual, 'poids net'); END IF;
  IF u ~* 'poids vif' THEN qual := array_append(qual, 'poids vif'); END IF;
  IF u ~* ' HT$| HT |\(.*\) HT' THEN qual := array_append(qual, 'HT'); END IF;
  IF u ~* ' TTC$| TTC |\(.*\) TTC' THEN qual := array_append(qual, 'TTC'); END IF;

  IF u ~* 'tCO2e|t CO2e|tco2e' THEN
    num := 'kgCO2e';
  ELSIF u ~* 'kgCO2e|kg CO2e|kg CO₂e|kgco2e' THEN
    num := 'kgCO2e';
  ELSIF u ~* '(^|[^k])gCO2e|g CO2e' THEN
    num := 'kgCO2e';
    mult := 0.001;
    lbl_only := false;
  ELSE
    num := NULL;
  END IF;

  -- Nm3 BEFORE m3 (espace optionnel : « m3 (n) » ou « m3(n) »)
  IF u ~* 'm3\s*\(n\)|m³\s*\(n\)|/nm3\b|\bnm3\b' THEN
    den := 'Nm3';
    IF NOT ('normal_conditions' = ANY (qual)) THEN
      qual := array_append(qual, 'normal_conditions');
    END IF;
  ELSIF u ~* 'keuro|keur|k€' THEN den := 'kEUR';
  ELSIF u ~* '/eur\b|/€|euro' AND u !~* 'keuro' THEN den := 'EUR';
  ELSIF u ~* 'tnd|\bdt\b' THEN den := 'TND';
  ELSIF u ~* 'usd|dollar' THEN den := 'USD';
  ELSIF u ~* 'passager\.km|passager-km|voyageur\.km' THEN den := 'passenger.km';
  ELSIF u ~* 't\.km|tonne\.km|tonnes\.km|/t\.km' THEN den := 't.km';
  ELSIF u ~* 'kg\.km|kg/km' THEN den := 'kg.km';
  ELSIF u ~* 'kwh' THEN den := 'kWh';
  ELSIF u ~* 'mwh' THEN den := 'MWh';
  ELSIF u ~* 'gwh' THEN den := 'GWh';
  ELSIF u ~* 'gj' THEN den := 'GJ';
  ELSIF u ~* 'mj' THEN den := 'MJ';
  ELSIF u ~* 'm3\.km|m³\.km' THEN den := 'm3';
  ELSIF u ~* 'm3|m³' THEN den := 'm3';
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

  IF u ~* 'kg CO₂e/km\.passager' AND den = 'km' THEN
    den := 'passenger.km';
  END IF;

  RETURN QUERY SELECT num, den, st, qual, mult, lbl_only;
END;
$$;

-- ---------------------------------------------------------------------------
-- Geography v2 — country_code + region (geography column untouched)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ef_extract_geography_v2(
  p_factor_name       TEXT,
  p_source_subcategory TEXT,
  p_source_category   TEXT,
  p_existing_geography TEXT
)
RETURNS TABLE (
  country_code     TEXT,
  region           TEXT,
  extraction_rule  TEXT
)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  fr_regions TEXT := '^(Rhône-Alpes|Île-de-France|Lorraine|Alsace|Midi-Pyrénées|Provence-Alpes-Côte d''Azur|Auvergne|Bretagne|Bourgogne|Aquitaine|Nord-Pas-de-Calais|Centre|Pays de la Loire|Franche-Comté|Poitou-Charentes|Haute-Normandie|Languedoc-Roussillon|Basse-Normandie|Picardie|Limousin|Champagne-Ardenne|Corse|Autre)$';
BEGIN
  country_code := NULL;
  region := NULL;
  extraction_rule := NULL;

  IF p_factor_name ~* '/FR U$|/FR$|\(Parc Français\)|\bFrance\b' THEN
    country_code := 'FR';
    extraction_rule := 'name_france_explicit';
    RETURN NEXT;
    RETURN;
  END IF;
  IF p_factor_name ~* '\bTunisie\b|\bTunisia\b' THEN
    country_code := 'TN'; extraction_rule := 'name_tunisia'; RETURN NEXT; RETURN;
  END IF;
  IF p_factor_name ~* '\bMaroc\b|\bMorocco\b' THEN
    country_code := 'MA'; extraction_rule := 'name_morocco'; RETURN NEXT; RETURN;
  END IF;
  IF p_factor_name ~* '\bTurquie\b|\bTurkey\b' THEN
    country_code := 'TR'; extraction_rule := 'name_turkey'; RETURN NEXT; RETURN;
  END IF;
  IF p_factor_name ~* '\bChine\b|\bChina\b' THEN
    country_code := 'CN'; extraction_rule := 'name_china'; RETURN NEXT; RETURN;
  END IF;
  IF p_factor_name ~* '\bMonde\b|\bGlobal\b|\(Monde\)' THEN
    country_code := 'GLOBAL'; extraction_rule := 'name_global'; RETURN NEXT; RETURN;
  END IF;
  IF p_factor_name ~* '\bUSA\b|\bUnited States\b|\bUS\b' THEN
    country_code := 'US'; extraction_rule := 'name_us'; RETURN NEXT; RETURN;
  END IF;
  IF p_factor_name ~* '\bEurope\b' THEN
    country_code := 'EU'; extraction_rule := 'name_europe'; RETURN NEXT; RETURN;
  END IF;
  IF p_source_category = 'Réseaux de chaleur / froid'
     AND p_source_subcategory ~ fr_regions THEN
    country_code := 'FR';
    region := p_source_subcategory;
    extraction_rule := 'heat_network_region_fr';
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- factor_type (negative alone ≠ avoided_emission)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ef_classify_factor_type(
  p_name              TEXT,
  p_unit_denominator  TEXT,
  p_source_category   TEXT,
  p_source_subcategory TEXT,
  p_metadata          JSONB
)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_name ~* 'émission[s]? évitée[s]?|avoided emission|évitement d''émission|evitement d''émission' THEN
    RETURN 'avoided_emission';
  END IF;
  IF p_source_subcategory = 'Ratios monétaires'
     OR p_unit_denominator IN ('EUR', 'kEUR', 'TND', 'USD', 'MEUR')
     OR (p_metadata ? 'monetary' AND p_metadata->'monetary' IS NOT NULL
         AND p_metadata->'monetary' <> 'null'::jsonb) THEN
    RETURN 'monetary';
  END IF;
  IF p_source_subcategory ~* 'PRG à [0-9]+ ans'
     OR p_name ~* 'PRG à [0-9]+ ans|potentiel de réchauffement global' THEN
    RETURN 'gwp';
  END IF;
  IF p_unit_denominator IS NOT NULL AND p_unit_denominator <> 'unknown' THEN
    RETURN 'physical';
  END IF;
  RETURN 'unknown';
END;
$$;

-- ---------------------------------------------------------------------------
-- Internal taxonomy mapping
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ef_map_internal_taxonomy(
  p_source_key        TEXT,
  p_source_category   TEXT,
  p_source_subcategory TEXT
)
RETURNS TABLE (
  internal_category    TEXT,
  internal_subcategory TEXT,
  mapping_status       TEXT,
  mapping_rule         TEXT
)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  internal_category := NULL;
  internal_subcategory := NULL;
  mapping_status := 'unmapped';
  mapping_rule := NULL;

  IF p_source_key = 'internal' THEN
    mapping_status := 'unmapped';
    RETURN NEXT;
    RETURN;
  END IF;

  -- internal_category from source_category (ADEME — deterministic)
  internal_category := CASE p_source_category
    WHEN 'Achats de biens' THEN 'purchased_goods'
    WHEN 'Achats de services' THEN 'purchased_services'
    WHEN 'Electricité' THEN 'energy'
    WHEN 'Combustibles' THEN 'energy'
    WHEN 'Réseaux de chaleur / froid' THEN 'energy'
    WHEN 'Transport de personnes' THEN 'transport'
    WHEN 'Transport de marchandises' THEN 'freight'
    WHEN 'Traitement des déchets' THEN 'waste'
    WHEN 'Process et émissions fugitives' THEN 'process_fugitive'
    WHEN 'UTCF' THEN 'land_use'
    WHEN 'Statistiques territoriales' THEN 'reference'
    ELSE NULL
  END;

  IF internal_category IS NULL THEN
    RETURN NEXT;
    RETURN;
  END IF;

  -- internal_subcategory (deterministic per known ADEME subcategories)
  internal_subcategory := CASE
    WHEN p_source_category = 'Achats de biens' THEN CASE p_source_subcategory
      WHEN 'Produits agro-alimentaires, plats préparés et boissons' THEN 'food_products'
      WHEN 'Produits de l''agriculture et de la pêche' THEN 'agriculture_products'
      WHEN 'Machines et équipements' THEN 'machinery'
      WHEN 'Ratios monétaires' THEN 'monetary_ratio'
      WHEN 'Autres produits manufacturés' THEN 'manufactured_other'
      WHEN 'Plastiques et produits chimiques' THEN 'chemicals_plastics'
      WHEN 'Bâtiments, ouvrages d''art et voirie' THEN 'construction'
      WHEN 'Produits minéraux non métalliques' THEN 'minerals'
      WHEN 'Textile et habillement' THEN 'textile'
      WHEN 'Mobilier' THEN 'furniture'
      WHEN 'Hydrogène' THEN 'hydrogen'
      WHEN 'Métaux et produits métalliques' THEN 'metals'
      WHEN 'Papier, carton' THEN 'paper'
      WHEN 'Véhicules automobiles et autres matériels de transport' THEN 'vehicles'
      WHEN 'Bois' THEN 'wood'
      WHEN 'Minerais, granulats, tourbes' THEN 'minerals_raw'
      WHEN 'Eau,  traitement et distribution d''eau' THEN 'water'
      ELSE NULL END
    WHEN p_source_category = 'Achats de services' THEN CASE p_source_subcategory
      WHEN 'Ratios monétaires' THEN 'monetary_ratio'
      WHEN 'Restauration' THEN 'food_services'
      WHEN 'Autres services' THEN 'services_other'
      ELSE NULL END
    WHEN p_source_category = 'Combustibles' THEN CASE p_source_subcategory
      WHEN 'Fossiles' THEN 'fossil_fuels'
      WHEN 'Organiques' THEN 'biofuels'
      ELSE NULL END
    WHEN p_source_category = 'Electricité' THEN CASE p_source_subcategory
      WHEN 'Mix réseau électrique' THEN 'electricity_grid'
      WHEN 'Moyen de production' THEN 'electricity_generation'
      ELSE NULL END
    WHEN p_source_category = 'Réseaux de chaleur / froid' THEN 'district_heating'
    WHEN p_source_category = 'Process et émissions fugitives' THEN CASE p_source_subcategory
      WHEN 'PRG à 100 ans issus du 6eme rapport du GIEC' THEN 'gwp_factors'
      WHEN 'Agriculture' THEN 'process_agriculture'
      WHEN 'Process industriels' THEN 'process_industrial'
      WHEN 'Déchets' THEN 'process_waste'
      ELSE NULL END
    WHEN p_source_category = 'Statistiques territoriales' THEN CASE p_source_subcategory
      WHEN 'Agriculture' THEN 'reference_agriculture'
      ELSE NULL END
    WHEN p_source_category = 'Traitement des déchets' THEN CASE p_source_subcategory
      WHEN 'Ménages et assimilés' THEN 'waste_household'
      WHEN 'Activités Economiques' THEN 'waste_commercial'
      WHEN 'Eaux usées' THEN 'waste_wastewater'
      ELSE NULL END
    WHEN p_source_category = 'Transport de marchandises' THEN CASE p_source_subcategory
      WHEN 'Aérien' THEN 'freight_air'
      WHEN 'Routier' THEN 'freight_road'
      WHEN 'Ferroviaire' THEN 'freight_rail'
      WHEN 'Fluvial' THEN 'freight_inland_water'
      WHEN 'Maritime' THEN 'freight_sea'
      ELSE NULL END
    WHEN p_source_category = 'Transport de personnes' THEN CASE p_source_subcategory
      WHEN 'Routier' THEN 'passenger_road'
      WHEN 'Ferroviaire' THEN 'passenger_rail'
      WHEN 'Aérien' THEN 'passenger_air'
      WHEN 'Maritime' THEN 'passenger_sea'
      WHEN 'Fluvial' THEN 'passenger_inland_water'
      WHEN 'Transport guidé' THEN 'passenger_guided'
      ELSE NULL END
    WHEN p_source_category = 'UTCF' THEN CASE p_source_subcategory
      WHEN 'Forêts françaises' THEN 'land_use_forest'
      WHEN 'Changement d''affectation des sols' THEN 'land_use_change'
      ELSE NULL END
    ELSE NULL
  END;

  IF internal_subcategory IS NOT NULL THEN
    mapping_status := 'mapped';
    mapping_rule := 'ademe_v239_subcategory:' || coalesce(p_source_subcategory, '');
  ELSE
    mapping_status := 'unmapped';
    mapping_rule := NULL;
  END IF;

  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- Monetary metadata enrichment
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ef_parse_monetary_enriched(p_unit TEXT)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  u TEXT := coalesce(p_unit, '');
  cur TEXT := NULL;
  myear INT := NULL;
  tax TEXT := NULL;
  munit INT := NULL;
BEGIN
  IF u ~* 'keuro|keur|k€' THEN cur := 'EUR'; munit := 1000;
  ELSIF u ~* 'tnd|\bdt\b' THEN cur := 'TND'; munit := 1;
  ELSIF u ~* 'usd|dollar' THEN cur := 'USD'; munit := 1;
  ELSIF u ~* '1m€|m€' THEN cur := 'EUR'; munit := 1000000;
  ELSIF u ~* 'eur|€|euro' AND u !~* 'keuro' THEN cur := 'EUR'; munit := 1;
  END IF;
  IF u ~ '\((\d{4})\)' THEN myear := (substring(u FROM '\((\d{4})\)'))::INT; END IF;
  IF u ~* ' HT$| HT |\(.*\) HT' THEN tax := 'HT';
  ELSIF u ~* ' TTC$| TTC |\(.*\) TTC' THEN tax := 'TTC';
  END IF;
  IF cur IS NULL AND myear IS NULL AND tax IS NULL AND munit IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_strip_nulls(jsonb_build_object(
    'currency', cur,
    'monetary_unit', munit,
    'monetary_year', myear,
    'tax_basis', tax
  ));
END;
$$;

-- ---------------------------------------------------------------------------
-- factor_year extraction
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ef_extract_factor_year_v2(p_name TEXT)
RETURNS TABLE (factor_year INT, factor_year_source TEXT, factor_year_rule TEXT)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    CASE WHEN p_name ~ ' - [0-9]{4} - '
      THEN (substring(p_name FROM ' - ([0-9]{4}) - '))::INT
      ELSE NULL END,
    CASE WHEN p_name ~ ' - [0-9]{4} - ' THEN 'name' ELSE NULL END,
    CASE WHEN p_name ~ ' - [0-9]{4} - ' THEN 'name_pattern_dash_yyyy_dash' ELSE NULL END;
$$;

-- ---------------------------------------------------------------------------
-- GWP metadata from name (only when explicit)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ef_parse_gwp_from_name(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  horizon INT := NULL;
BEGIN
  IF p_name ~* 'PRG à [0-9]+ ans' THEN
    horizon := (substring(p_name FROM 'PRG à ([0-9]+) ans'))::INT;
    RETURN jsonb_build_object(
      'time_horizon', horizon,
      'source_label', substring(p_name FROM 'PRG à [0-9]+ ans[^)]*')
    );
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Checksum v2
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ef_factor_checksum_v2(
  p_stable_factor_id  TEXT,
  p_dataset_version   TEXT,
  p_name              TEXT,
  p_value             NUMERIC,
  p_unit_num          TEXT,
  p_unit_den          TEXT,
  p_country_code      TEXT,
  p_source_category   TEXT,
  p_factor_type       TEXT
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
      coalesce(p_country_code, ''),
      coalesce(p_source_category, ''),
      coalesce(p_factor_type, '')
    ),
    'sha256'
  ), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- Source keys
-- ---------------------------------------------------------------------------

UPDATE factor_sources SET
  source_key = 'ademe',
  publisher = 'ADEME',
  metadata = coalesce(metadata, '{}'::jsonb) || '{"convention":"017"}'::jsonb
WHERE name = 'ADEME Base Carbone' AND (source_key IS NULL OR source_key <> 'ademe');

UPDATE factor_sources SET
  source_key = 'internal',
  publisher = 'NewCarboScan',
  metadata = coalesce(metadata, '{}'::jsonb) || '{"convention":"017"}'::jsonb
WHERE name = 'Newcarboscan Core Pack TN' AND (source_key IS NULL OR source_key <> 'internal');

UPDATE emission_factor_versions SET dataset_version = '23.9'
WHERE id = 'a2000000-0000-4000-8000-000000000002'
  AND (dataset_version IS NULL OR dataset_version <> '23.9');

UPDATE emission_factor_versions SET dataset_version = 'core-tn-2027.1'
WHERE id = 'a1000000-0000-4000-8000-000000000002'
  AND dataset_version IS NULL;

-- ---------------------------------------------------------------------------
-- Backfill ADEME v23.9
-- ---------------------------------------------------------------------------

UPDATE emission_factors f
SET
  source_category = coalesce(f2.category, f2.metadata->>'source_category'),
  source_subcategory = f2.metadata->>'source_subcategory',
  factor_type = ef_classify_factor_type(
    f2.name, norm.unit_denominator,
    coalesce(f2.category, f2.metadata->>'source_category'),
    f2.metadata->>'source_subcategory', f2.metadata
  ),
  internal_category = tax.internal_category,
  internal_subcategory = tax.internal_subcategory,
  country_code = geo.country_code,
  region = geo.region,
  factor_year = fy.factor_year,
  unit_numerator = norm.unit_numerator,
  unit_denominator = norm.unit_denominator,
  value = CASE
    WHEN norm.value_multiplier <> 1 AND NOT norm.label_only
      THEN f2.value * norm.value_multiplier
    ELSE f2.value
  END,
  checksum = ef_factor_checksum_v2(
    f2.stable_factor_id,
    '23.9',
    f2.name,
    CASE WHEN norm.value_multiplier <> 1 AND NOT norm.label_only
      THEN f2.value * norm.value_multiplier ELSE f2.value END,
    norm.unit_numerator,
    norm.unit_denominator,
    geo.country_code,
    coalesce(f2.category, f2.metadata->>'source_category'),
    ef_classify_factor_type(
      f2.name, norm.unit_denominator,
      coalesce(f2.category, f2.metadata->>'source_category'),
      f2.metadata->>'source_subcategory', f2.metadata
    )
  ),
  metadata = (
    jsonb_build_object('legacy_016', f2.metadata)
    || jsonb_build_object(
      'provenance', jsonb_strip_nulls(jsonb_build_object(
        'source_original', coalesce(f2.metadata->>'original_source', 'ADEME Base Carbone v23.9'),
        'legacy_id', f2.metadata->>'legacy_id',
        'legacy_row_id', f2.metadata->>'legacy_row_id',
        'legacy_slug', f2.metadata->>'legacy_slug',
        'original_name', coalesce(f2.metadata->>'factor_name', f2.name),
        'original_value', f2.value::TEXT,
        'original_unit', coalesce(f2.metadata->>'original_unit', f2.unit_numerator || '/' || f2.unit_denominator),
        'legacy_year', f2.metadata->>'legacy_year',
        'migration_id', coalesce(f2.metadata->>'migration_id', '016_ademe_bc_v239'),
        'normalization_id', '017_factor_registry_normalization',
        'transformations', CASE
          WHEN norm.value_multiplier <> 1 AND NOT norm.label_only THEN
            jsonb_build_array(jsonb_build_object(
              'step', 'unit_magnitude',
              'original_value', f2.value::TEXT,
              'original_unit', f2.metadata->>'original_unit',
              'normalized_value', (f2.value * norm.value_multiplier)::TEXT,
              'normalized_unit', norm.unit_numerator || '/' || norm.unit_denominator,
              'numerator_conversion', 'gCO2e→kgCO2e',
              'denominator_conversion', NULL,
              'formula', 'value * ' || norm.value_multiplier::TEXT
            ))
          WHEN norm.unit_denominator IS DISTINCT FROM f2.unit_denominator
            OR norm.unit_numerator IS DISTINCT FROM f2.unit_numerator THEN
            jsonb_build_array(jsonb_build_object(
              'step', 'unit_label',
              'original_value', f2.value::TEXT,
              'original_unit', f2.metadata->>'original_unit',
              'normalized_value', f2.value::TEXT,
              'normalized_unit', norm.unit_numerator || '/' || norm.unit_denominator,
              'numerator_conversion', NULL,
              'denominator_conversion', CASE
                WHEN f2.unit_denominator = 'm3' AND norm.unit_denominator = 'Nm3' THEN 'm3→Nm3'
                ELSE NULL END,
              'formula', 'label_only'
            ))
          ELSE '[]'::jsonb
        END
      )),
      'temporal', jsonb_strip_nulls(jsonb_build_object(
        'legacy_year', f2.metadata->>'legacy_year',
        'dataset_version', '23.9',
        'factor_year', fy.factor_year,
        'factor_year_source', fy.factor_year_source,
        'factor_year_rule', fy.factor_year_rule
      )),
      'taxonomy', jsonb_strip_nulls(jsonb_build_object(
        'mapping_status', tax.mapping_status,
        'mapping_rule', tax.mapping_rule
      )),
      'units', jsonb_strip_nulls(jsonb_build_object(
        'original_unit', f2.metadata->>'original_unit',
        'qualifiers', to_jsonb(norm.qualifiers),
        'normalization_status', norm.normalization_status
      )),
      'geography', jsonb_strip_nulls(jsonb_build_object(
        'original_geography', f2.geography,
        'extraction_rule', geo.extraction_rule,
        'geography_status', CASE WHEN geo.country_code IS NULL THEN 'unknown' ELSE 'extracted' END
      )),
      'monetary', ef_parse_monetary_enriched(f2.metadata->>'original_unit'),
      'gwp', ef_parse_gwp_from_name(f2.name),
      'quality', jsonb_build_object(
        'source_quality', NULL,
        'geography_quality', NULL,
        'temporal_quality', NULL,
        'technology_quality', NULL,
        'data_quality', NULL,
        'uncertainty', NULL
      ),
      'checksum_algorithm', 'sha256',
      'checksum_version', 'v2'
    )
    || jsonb_build_object(
      'migration_id', f2.metadata->>'migration_id',
      'original_source', f2.metadata->>'original_source',
      'original_unit', f2.metadata->>'original_unit',
      'legacy_year', f2.metadata->>'legacy_year',
      'legacy_id', f2.metadata->>'legacy_id',
      'legacy_slug', f2.metadata->>'legacy_slug',
      'legacy_row_id', f2.metadata->>'legacy_row_id',
      'legacy_table', f2.metadata->>'legacy_table',
      'factor_name', f2.metadata->>'factor_name',
      'nom_affiche', f2.metadata->>'nom_affiche',
      'source_category', coalesce(f2.category, f2.metadata->>'source_category'),
      'source_subcategory', f2.metadata->>'source_subcategory',
      'dataset_version', '23.9',
      'normalization_status', norm.normalization_status,
      'geography_status', CASE WHEN geo.country_code IS NULL THEN 'unknown' ELSE 'extracted' END,
      'unit_qualifier', array_to_string(norm.qualifiers, '; ')
    )
  )
FROM emission_factors f2
CROSS JOIN LATERAL ef_canonical_normalize_unit(f2.metadata->>'original_unit') norm
CROSS JOIN LATERAL ef_extract_geography_v2(
  f2.name,
  f2.metadata->>'source_subcategory',
  coalesce(f2.category, f2.metadata->>'source_category'),
  f2.geography
) geo
CROSS JOIN LATERAL ef_map_internal_taxonomy(
  'ademe',
  coalesce(f2.category, f2.metadata->>'source_category'),
  f2.metadata->>'source_subcategory'
) tax
CROSS JOIN LATERAL ef_extract_factor_year_v2(f2.name) fy
WHERE f.id = f2.id
  AND f2.metadata->>'migration_id' = '016_ademe_bc_v239'
  AND coalesce(f2.metadata->'provenance'->>'normalization_id', '') <> '017_factor_registry_normalization';

-- ---------------------------------------------------------------------------
-- Backfill Seed TN (structural fields only — no value/unit/category change)
-- ---------------------------------------------------------------------------

UPDATE emission_factors f
SET
  factor_type = CASE
    WHEN f.unit_denominator IN ('TND', 'EUR', 'kEUR', 'USD') THEN 'monetary'
    ELSE 'physical'
  END,
  source_category = NULL,
  source_subcategory = NULL,
  internal_category = CASE f.stable_factor_id
    WHEN 'gas_m3' THEN 'energy'
    WHEN 'fuel_liters' THEN 'energy'
    WHEN 'fleet_essence' THEN 'transport'
    WHEN 'fleet_diesel' THEN 'transport'
    WHEN 'refrigerant_kg' THEN 'process_fugitive'
    WHEN 'electricity_kwh' THEN 'energy'
    WHEN 'heat_kwh' THEN 'energy'
    WHEN 'purchases_dt' THEN 'purchased_goods'
    ELSE NULL
  END,
  internal_subcategory = CASE f.stable_factor_id
    WHEN 'gas_m3' THEN 'fossil_fuels'
    WHEN 'fuel_liters' THEN 'fossil_fuels'
    WHEN 'fleet_essence' THEN 'passenger_road'
    WHEN 'fleet_diesel' THEN 'passenger_road'
    WHEN 'refrigerant_kg' THEN 'process_industrial'
    WHEN 'electricity_kwh' THEN 'electricity_grid'
    WHEN 'heat_kwh' THEN 'district_heating'
    WHEN 'purchases_dt' THEN 'monetary_ratio'
    ELSE NULL
  END,
  country_code = CASE WHEN f.geography IN ('TN', 'FR', 'GLOBAL', 'EU', 'US') THEN f.geography ELSE NULL END,
  region = NULL,
  factor_year = NULL,
  checksum = ef_factor_checksum_v2(
    f.stable_factor_id,
    'core-tn-2027.1',
    f.name,
    f.value,
    f.unit_numerator,
    f.unit_denominator,
    CASE WHEN f.geography IN ('TN', 'FR', 'GLOBAL', 'EU', 'US') THEN f.geography ELSE NULL END,
    NULL,
    CASE WHEN f.unit_denominator IN ('TND', 'EUR', 'kEUR', 'USD') THEN 'monetary' ELSE 'physical' END
  ),
  metadata = coalesce(f.metadata, '{}'::jsonb) || jsonb_build_object(
    'provenance', jsonb_build_object(
      'source_original', 'Newcarboscan Core Pack TN',
      'original_name', f.name,
      'original_value', f.value::TEXT,
      'original_unit', f.unit_numerator || '/' || f.unit_denominator,
      'normalization_id', '017_factor_registry_normalization',
      'transformations', '[]'::jsonb
    ),
    'taxonomy', jsonb_build_object(
      'mapping_status', 'mapped',
      'mapping_rule', 'internal_seed:' || f.stable_factor_id
    ),
    'temporal', jsonb_build_object('dataset_version', 'core-tn-2027.1'),
    'checksum_algorithm', 'sha256',
    'checksum_version', 'v2'
  )
WHERE f.version_id = 'a1000000-0000-4000-8000-000000000002'
  AND coalesce(f.metadata->'provenance'->>'normalization_id', '') <> '017_factor_registry_normalization';

-- ---------------------------------------------------------------------------
-- Idempotent Nm3 label correction (label-only, value unchanged)
-- ---------------------------------------------------------------------------

UPDATE emission_factors f
SET
  unit_denominator = 'Nm3',
  metadata = f.metadata
    || jsonb_build_object(
      'units', coalesce(f.metadata->'units', '{}'::jsonb) || jsonb_build_object(
        'normalization_status', 'ok',
        'qualifiers', (
          SELECT to_jsonb(
            array(
              SELECT DISTINCT unnest(
                coalesce(
                  ARRAY(SELECT jsonb_array_elements_text(f.metadata->'units'->'qualifiers')),
                  ARRAY[]::TEXT[]
                ) || ARRAY['normal_conditions']
              )
            )
          )
        )
      )
    )
    || jsonb_build_object(
      'provenance', (f.metadata->'provenance') || jsonb_build_object(
        'transformations',
        coalesce(f.metadata->'provenance'->'transformations', '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object(
          'step', 'unit_label',
          'original_value', f.value::TEXT,
          'original_unit', f.metadata->>'original_unit',
          'normalized_value', f.value::TEXT,
          'normalized_unit', 'kgCO2e/Nm3',
          'denominator_conversion', 'm3→Nm3',
          'formula', 'label_only'
        ))
      )
    )
WHERE f.metadata->>'migration_id' = '016_ademe_bc_v239'
  AND f.metadata->>'original_unit' ~* 'm3\s*\(n\)|m³\s*\(n\)'
  AND f.unit_denominator = 'm3';

-- ---------------------------------------------------------------------------
-- Post-migration verification
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_ademe BIGINT;
  v_total BIGINT;
  v_version_status TEXT;
  v_api_exposed BIGINT;
  v_value_mismatch BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_ademe
  FROM emission_factors WHERE metadata->>'migration_id' = '016_ademe_bc_v239';

  SELECT COUNT(*) INTO v_total FROM emission_factors;

  SELECT status INTO v_version_status
  FROM emission_factor_versions WHERE id = 'a2000000-0000-4000-8000-000000000002';

  SELECT COUNT(*) INTO v_api_exposed
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  WHERE f.status = 'approved' AND v.status = 'approved';

  SELECT COUNT(*) INTO v_value_mismatch
  FROM emission_factors f
  JOIN emission_factors_legacy l ON f.metadata->'provenance'->>'legacy_row_id' = l.id::text
  WHERE f.metadata->>'migration_id' = '016_ademe_bc_v239'
    AND f.value <> l.emission_factor
    AND NOT (
      f.metadata->'provenance'->'transformations' IS NOT NULL
      AND jsonb_array_length(coalesce(f.metadata->'provenance'->'transformations', '[]'::jsonb)) > 0
    );

  RAISE NOTICE '017 post: total=% ademe=% version_status=% api_exposed=% value_mismatch=%',
    v_total, v_ademe, v_version_status, v_api_exposed, v_value_mismatch;

  IF v_ademe <> 7394 THEN
    RAISE EXCEPTION '017 failed: expected 7394 ADEME rows, got %', v_ademe;
  END IF;

  IF v_version_status <> 'draft' THEN
    RAISE EXCEPTION '017 failed: ADEME version must stay draft, got %', v_version_status;
  END IF;

  IF v_api_exposed <> 8 THEN
    RAISE EXCEPTION '017 failed: API would expose % factors, expected 8', v_api_exposed;
  END IF;

  IF v_value_mismatch > 0 THEN
    RAISE EXCEPTION '017 failed: % ADEME values changed without documented transformation', v_value_mismatch;
  END IF;
END $$;

COMMIT;
