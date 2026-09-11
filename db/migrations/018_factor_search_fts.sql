-- =============================================================================
-- 018 — Full-text + trigram search infrastructure for emission factor catalogue
-- Idempotent. Does not change factor values or statuses.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Immutable wrapper (required for indexes / generated columns)
CREATE OR REPLACE FUNCTION ef_immutable_unaccent(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT unaccent('unaccent', coalesce(p_text, ''));
$$;

CREATE OR REPLACE FUNCTION ef_build_factor_search_name_text(p_name TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT ef_immutable_unaccent(lower(trim(coalesce(p_name, ''))));
$$;

CREATE OR REPLACE FUNCTION ef_build_factor_search_vector(
  p_name TEXT,
  p_external_code TEXT,
  p_stable_factor_id TEXT,
  p_source_category TEXT,
  p_source_subcategory TEXT,
  p_internal_category TEXT,
  p_internal_subcategory TEXT,
  p_technology TEXT,
  p_region TEXT
)
RETURNS tsvector
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT
    setweight(to_tsvector('simple', ef_immutable_unaccent(lower(coalesce(p_name, '')))), 'A') ||
    setweight(to_tsvector('simple', ef_immutable_unaccent(lower(coalesce(p_external_code, '')))), 'A') ||
    setweight(to_tsvector('simple', ef_immutable_unaccent(lower(coalesce(p_stable_factor_id, '')))), 'A') ||
    setweight(to_tsvector('simple', ef_immutable_unaccent(lower(coalesce(p_source_subcategory, '')))), 'B') ||
    setweight(to_tsvector('simple', ef_immutable_unaccent(lower(coalesce(p_internal_subcategory, '')))), 'B') ||
    setweight(to_tsvector('simple', ef_immutable_unaccent(lower(coalesce(p_source_category, '')))), 'C') ||
    setweight(to_tsvector('simple', ef_immutable_unaccent(lower(coalesce(p_internal_category, '')))), 'C') ||
    setweight(
      to_tsvector(
        'simple',
        ef_immutable_unaccent(lower(trim(coalesce(p_technology, '') || ' ' || coalesce(p_region, ''))))
      ),
      'D'
    );
$$;

CREATE OR REPLACE FUNCTION ef_build_factor_search_text(
  p_name TEXT,
  p_external_code TEXT,
  p_stable_factor_id TEXT,
  p_source_category TEXT,
  p_source_subcategory TEXT,
  p_internal_category TEXT,
  p_internal_subcategory TEXT,
  p_technology TEXT,
  p_region TEXT
)
RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT ef_immutable_unaccent(lower(trim(concat_ws(' ',
    coalesce(p_name, ''),
    coalesce(p_external_code, ''),
    coalesce(p_stable_factor_id, ''),
    coalesce(p_source_category, ''),
    coalesce(p_source_subcategory, ''),
    coalesce(p_internal_category, ''),
    coalesce(p_internal_subcategory, ''),
    coalesce(p_technology, ''),
    coalesce(p_region, '')
  ))));
$$;

ALTER TABLE emission_factors
  ADD COLUMN IF NOT EXISTS search_name_text TEXT,
  ADD COLUMN IF NOT EXISTS search_text TEXT,
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE emission_factors f
SET
  search_name_text = ef_build_factor_search_name_text(f.name),
  search_text = ef_build_factor_search_text(
    f.name, f.external_code, f.stable_factor_id,
    f.source_category, f.source_subcategory,
    f.internal_category, f.internal_subcategory,
    f.technology, f.region
  ),
  search_vector = ef_build_factor_search_vector(
    f.name, f.external_code, f.stable_factor_id,
    f.source_category, f.source_subcategory,
    f.internal_category, f.internal_subcategory,
    f.technology, f.region
  );

CREATE OR REPLACE FUNCTION ef_factor_search_text_trigger()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_name_text := ef_build_factor_search_name_text(NEW.name);
  NEW.search_text := ef_build_factor_search_text(
    NEW.name, NEW.external_code, NEW.stable_factor_id,
    NEW.source_category, NEW.source_subcategory,
    NEW.internal_category, NEW.internal_subcategory,
    NEW.technology, NEW.region
  );
  NEW.search_vector := ef_build_factor_search_vector(
    NEW.name, NEW.external_code, NEW.stable_factor_id,
    NEW.source_category, NEW.source_subcategory,
    NEW.internal_category, NEW.internal_subcategory,
    NEW.technology, NEW.region
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_factor_search_text ON emission_factors;
CREATE TRIGGER trg_factor_search_text
  BEFORE INSERT OR UPDATE OF name, external_code, stable_factor_id,
    source_category, source_subcategory, internal_category,
    internal_subcategory, technology, region
  ON emission_factors
  FOR EACH ROW
  EXECUTE FUNCTION ef_factor_search_text_trigger();

CREATE INDEX IF NOT EXISTS idx_factors_search_vector
  ON emission_factors USING GIN (search_vector);

DROP INDEX IF EXISTS idx_factors_search_name_trgm;

CREATE INDEX IF NOT EXISTS idx_factors_search_name_trgm_gist
  ON emission_factors USING GIST (search_name_text gist_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_factors_version_status_catalog
  ON emission_factors (version_id, status);

-- Legacy composite index from first 018 draft — dropped after review (unused at scale)
DROP INDEX IF EXISTS idx_factors_catalog_lookup;
DROP INDEX IF EXISTS idx_factors_search_text_trgm;

COMMIT;
