import type { Pool } from "pg";
import type { FactorCandidate, ResolveFactorInput } from "./types.js";
import { candidateDenominatorUnits, isMonetaryUnit, normalizeResolverUnit } from "./unitCompatibility.js";

type Queryable = Pick<Pool, "query">;

const CANDIDATE_LIMIT = 50;

/** Lightweight FR/EN activity synonyms for retrieval only — not methodological ranking. */
const ACTIVITY_SYNONYMS: Record<string, string[]> = {
  electricity: ["electricity", "électricité", "electricite", "électri"],
  electricite: ["electricity", "électricité", "electricite"],
  électricité: ["electricity", "électricité", "electricite"],
  "natural gas": ["natural gas", "gaz naturel", "gaz"],
  "gaz naturel": ["natural gas", "gaz naturel", "gaz"],
  gas: ["gas", "gaz", "natural gas", "gaz naturel"],
  gaz: ["gas", "gaz", "natural gas", "gaz naturel"],
  diesel: ["diesel", "gazole"],
  gazole: ["diesel", "gazole"],
  petrol: ["petrol", "essence", "gasoline"],
  essence: ["petrol", "essence", "gasoline"],
  // Exact FR/EN labels for Core TN heat — no fuzzy matching.
  heat: ["heat", "chaleur", "vapeur", "heat_kwh", "district heating"],
  "district heating": ["heat", "chaleur", "vapeur", "heat_kwh", "district heating"],
  chaleur: ["heat", "chaleur", "vapeur", "heat_kwh"],
  vapeur: ["heat", "chaleur", "vapeur", "heat_kwh"],
  flight: ["flight", "avion", "air passenger", "passenger"],
  avion: ["flight", "avion", "air"],
  freight: ["freight", "fret", "tonne.km", "tkm"],
  fret: ["freight", "fret"],
  waste: ["waste", "déchet", "dechet"],
  hotel: ["hotel", "hôtel"],
};

function activitySearchTerms(activity: string): string[] {
  const key = activity.trim().toLowerCase();
  const syn = ACTIVITY_SYNONYMS[key];
  if (syn) return [...new Set(syn)];
  for (const [k, vals] of Object.entries(ACTIVITY_SYNONYMS)) {
    if (key.includes(k) || k.includes(key)) return [...new Set([activity, ...vals])];
  }
  return [activity];
}

/**
 * SQL prefilter — catalog approved+visible.
 * Shadow: resolver_status may be disabled (explicit mode).
 * Production: resolver_status must be enabled.
 * Never includes organization_emission_factors.
 */
export async function retrieveCandidates(
  pool: Queryable,
  input: ResolveFactorInput,
): Promise<FactorCandidate[]> {
  const activity = input.activity.trim();
  if (!activity) return [];

  const unit = normalizeResolverUnit(input.unit);
  const denoms = candidateDenominatorUnits(unit);
  const monetary = input.factorTypeHint === "monetary" || isMonetaryUnit(unit);
  const terms = activitySearchTerms(activity);
  const params: unknown[] = [];

  const push = (v: unknown) => {
    params.push(v);
    return params.length;
  };

  const termsIdx = push(terms);
  const primaryIdx = push(activity);
  const denomsIdx = push(denoms);
  const limitIdx = push(CANDIDATE_LIMIT);

  const clauses: string[] = [
    "f.status = 'approved'",
    "v.status = 'approved'",
    "v.catalog_status = 'visible'",
    `f.unit_denominator = ANY($${denomsIdx}::text[])`,
  ];

  if (input.mode === "production") {
    clauses.push("v.resolver_status = 'enabled'");
    clauses.push("v.calculation_status = 'enabled'");
  }

  if (monetary) {
    clauses.push("f.factor_type = 'monetary'");
  } else {
    clauses.push("(f.factor_type IS NULL OR f.factor_type IN ('physical', 'unknown'))");
  }

  if (input.preferredSource) {
    const i = push(input.preferredSource);
    clauses.push(`s.source_key = $${i}`);
  }

  if (input.internalCategory) {
    const i = push(input.internalCategory);
    clauses.push(`f.internal_category = $${i}`);
  }
  if (input.internalSubcategory) {
    const i = push(input.internalSubcategory);
    clauses.push(`f.internal_subcategory = $${i}`);
  }

  const textClause = `(
    EXISTS (
      SELECT 1 FROM unnest($${termsIdx}::text[]) AS term
      WHERE f.stable_factor_id ILIKE '%' || term || '%'
         OR f.external_code ILIKE '%' || term || '%'
         OR f.name ILIKE '%' || term || '%'
         OR coalesce(f.search_name_text, '') ILIKE '%' || term || '%'
    )
    OR (length($${primaryIdx}) >= 3 AND f.search_vector @@ plainto_tsquery('simple', $${primaryIdx}))
    OR (length($${primaryIdx}) >= 4 AND similarity(coalesce(f.search_name_text, f.name), $${primaryIdx}) > 0.15)
  )`;
  clauses.push(textClause);

  const sql = `
    SELECT
      f.id,
      f.stable_factor_id,
      f.external_code,
      f.name,
      f.value::float8 AS value,
      f.unit_numerator,
      f.unit_denominator,
      s.source_key,
      s.name AS source_name,
      v.dataset_version,
      f.country_code,
      f.region,
      f.factor_type,
      f.factor_kind,
      f.lifecycle_boundary,
      f.energy_basis,
      f.gwp_basis,
      f.factor_year,
      f.internal_category,
      f.internal_subcategory,
      f.checksum,
      coalesce(f.metadata->>'normalization_status' = 'review_required', false) AS review_required,
      v.catalog_status,
      v.calculation_status,
      v.resolver_status,
      f.metadata->'geography'->>'geographic_applicability' AS geographic_applicability,
      NULLIF(f.metadata->'provenance'->>'table_number', '')::int AS epa_table_number,
      coalesce(f.metadata->'epa'->>'derived' = 'true', false) AS epa_derived,
      GREATEST(
        similarity(coalesce(f.search_name_text, f.name), $${primaryIdx}),
        CASE WHEN f.name ILIKE '%' || $${primaryIdx} || '%' THEN 0.55 ELSE 0 END,
        CASE WHEN f.stable_factor_id ILIKE '%' || $${primaryIdx} || '%' THEN 0.85 ELSE 0 END,
        CASE WHEN EXISTS (
          SELECT 1 FROM unnest($${termsIdx}::text[]) AS term
          WHERE f.name ILIKE '%' || term || '%' OR f.stable_factor_id ILIKE '%' || term || '%'
        ) THEN 0.45 ELSE 0 END
      )::float8 AS text_score
    FROM emission_factors f
    JOIN emission_factor_versions v ON v.id = f.version_id
    JOIN factor_sources s ON s.id = v.source_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY text_score DESC, s.source_key ASC, v.dataset_version ASC NULLS LAST, f.stable_factor_id ASC NULLS LAST, f.id ASC
    LIMIT $${limitIdx}
  `;

  const { rows } = await pool.query(sql, params);
  return rows.map(mapRow);
}

function mapRow(row: Record<string, unknown>): FactorCandidate {
  return {
    id: String(row.id),
    stableFactorId: row.stable_factor_id != null ? String(row.stable_factor_id) : null,
    externalCode: row.external_code != null ? String(row.external_code) : null,
    name: String(row.name),
    value: Number(row.value),
    unitNumerator: String(row.unit_numerator),
    unitDenominator: String(row.unit_denominator),
    sourceKey: String(row.source_key),
    sourceName: String(row.source_name),
    datasetVersion: row.dataset_version != null ? String(row.dataset_version) : null,
    countryCode: row.country_code != null ? String(row.country_code) : null,
    region: row.region != null ? String(row.region) : null,
    factorType: row.factor_type != null ? String(row.factor_type) : null,
    factorKind: row.factor_kind != null ? String(row.factor_kind) : null,
    lifecycleBoundary: row.lifecycle_boundary != null ? String(row.lifecycle_boundary) : null,
    energyBasis: row.energy_basis != null ? String(row.energy_basis) : null,
    gwpBasis: row.gwp_basis != null ? String(row.gwp_basis) : null,
    factorYear: row.factor_year != null ? Number(row.factor_year) : null,
    internalCategory: row.internal_category != null ? String(row.internal_category) : null,
    internalSubcategory: row.internal_subcategory != null ? String(row.internal_subcategory) : null,
    checksum: row.checksum != null ? String(row.checksum) : null,
    reviewRequired: Boolean(row.review_required),
    catalogStatus: String(row.catalog_status),
    calculationStatus: String(row.calculation_status),
    resolverStatus: String(row.resolver_status),
    textScore: Number(row.text_score ?? 0),
    geographicApplicability:
      row.geographic_applicability != null ? String(row.geographic_applicability) : null,
    epaTableNumber: row.epa_table_number != null ? Number(row.epa_table_number) : null,
    epaDerived: Boolean(row.epa_derived),
  };
}

export { CANDIDATE_LIMIT };
