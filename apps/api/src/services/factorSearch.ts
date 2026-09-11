import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type {
  FactorCatalogFilters,
  FactorSearchCursor,
  FactorSearchQuery,
} from "../schemas/factors.js";

/** Canonical unit aliases (017) — input only; responses use canonical form. */
const UNIT_DENOMINATOR_ALIASES: Record<string, string> = {
  litre: "L",
  litres: "L",
  l: "L",
  tonne: "t",
  tonnes: "t",
  "m³": "m3",
  nm3: "Nm3",
  "passager.km": "passenger.km",
  "passager-km": "passenger.km",
  keuro: "kEUR",
  "k\u20ac": "kEUR",
  euro: "EUR",
  eur: "EUR",
  dt: "TND",
  tnd: "TND",
};

const UNIT_NUMERATOR_ALIASES: Record<string, string> = {
  "kg co2e": "kgCO2e",
  kgco2e: "kgCO2e",
};

/** Trigram thresholds applied after GiST KNN candidate prefilter. */
export const TRIGRAM_THRESHOLD_LONG = 0.25;
export const TRIGRAM_THRESHOLD_SHORT = 0.35;
export const FUZZY_CANDIDATE_LIMIT = 500;

export type QuerySearchMode = "minimal" | "prefix" | "full";

export type RankingReason =
  | "external_code_exact"
  | "stable_factor_id_exact"
  | "name_exact"
  | "name_prefix"
  | "name_all_tokens"
  | "fts_name"
  | "trigram_name"
  | "source_subcategory"
  | "internal_subcategory"
  | "category"
  | "technology_region"
  | "filter_only";

export function normalizeUnitDenominator(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim();
  const alias = UNIT_DENOMINATOR_ALIASES[key.toLowerCase()];
  return alias ?? key;
}

export function normalizeUnitNumerator(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim();
  const alias = UNIT_NUMERATOR_ALIASES[key.toLowerCase()];
  return alias ?? key;
}

export function encodeSearchCursor(cursor: FactorSearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeSearchCursor(raw: string): FactorSearchCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw new Error("INVALID_CURSOR");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as FactorSearchCursor).r !== "number" ||
    typeof (parsed as FactorSearchCursor).id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test((parsed as FactorSearchCursor).id)
  ) {
    throw new Error("INVALID_CURSOR");
  }
  const cursor = parsed as FactorSearchCursor;
  if (cursor.fz !== undefined && cursor.fz !== 0 && cursor.fz !== 1) {
    throw new Error("INVALID_CURSOR");
  }
  return cursor;
}

export function normalizeSearchQuery(q?: string): string | undefined {
  if (!q) return undefined;
  const trimmed = q.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getQuerySearchMode(q: string): QuerySearchMode {
  const len = q.trim().length;
  if (len <= 1) return "minimal";
  if (len === 2) return "prefix";
  return "full";
}

export function getTrigramThreshold(q: string): number | null {
  const mode = getQuerySearchMode(q);
  if (mode !== "full") return null;
  const len = q.trim().length;
  if (len <= 4) return TRIGRAM_THRESHOLD_SHORT;
  return TRIGRAM_THRESHOLD_LONG;
}

export function splitQueryTokens(q: string): string[] {
  return q
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function isNumericCodeQuery(q: string): boolean {
  return /^\d+$/.test(q.trim());
}

export function shouldUseFuzzyPool(q: string | undefined): boolean {
  if (!q) return false;
  if (isNumericCodeQuery(q)) return false;
  return getQuerySearchMode(q) === "full";
}

type SearchRow = {
  id: string;
  stable_factor_id: string | null;
  external_code: string | null;
  name: string;
  value: string;
  unit_numerator: string;
  unit_denominator: string;
  factor_type: string;
  source_key: string | null;
  source_name: string;
  dataset_version: string | null;
  source_category: string | null;
  source_subcategory: string | null;
  internal_category: string | null;
  internal_subcategory: string | null;
  country_code: string | null;
  region: string | null;
  factor_year: number | null;
  status: string;
  rank_score: string;
  ranking_reason: RankingReason;
};

export function mapSearchRow(row: SearchRow, includeDebug = false) {
  const base = {
    id: row.id,
    stableFactorId: row.stable_factor_id,
    externalCode: row.external_code,
    name: row.name,
    value: Number(row.value),
    unitNumerator: row.unit_numerator,
    unitDenominator: row.unit_denominator,
    factorType: row.factor_type,
    source: {
      key: row.source_key,
      name: row.source_name,
    },
    datasetVersion: row.dataset_version,
    sourceCategory: row.source_category,
    sourceSubcategory: row.source_subcategory,
    internalCategory: row.internal_category,
    internalSubcategory: row.internal_subcategory,
    countryCode: row.country_code,
    region: row.region,
    factorYear: row.factor_year,
    status: row.status,
    rankScore: Number(row.rank_score),
  };
  if (includeDebug) {
    return { ...base, rankingReason: row.ranking_reason };
  }
  return base;
}

function buildStatusClause(status: FactorCatalogFilters["status"]): string[] {
  switch (status) {
    case "approved":
      return ["f.status = 'approved'", "v.status = 'approved'"];
    case "draft":
      return ["v.status = 'draft'", "f.status <> 'deprecated'"];
    case "deprecated":
      return ["(f.status = 'deprecated' OR v.status = 'deprecated')"];
    default:
      return ["f.status = 'approved'", "v.status = 'approved'"];
  }
}

function buildFilterClauses(
  query: FactorCatalogFilters,
  params: unknown[],
): string[] {
  const clauses: string[] = [];

  if (query.source) {
    params.push(query.source);
    clauses.push(`s.source_key = $${params.length}`);
  }
  if (query.dataset_version) {
    params.push(query.dataset_version);
    clauses.push(`v.dataset_version = $${params.length}`);
  }
  if (query.factor_type) {
    params.push(query.factor_type);
    clauses.push(`f.factor_type = $${params.length}`);
  }
  if (query.internal_category) {
    params.push(query.internal_category);
    clauses.push(`f.internal_category = $${params.length}`);
  }
  if (query.internal_subcategory) {
    params.push(query.internal_subcategory);
    clauses.push(`f.internal_subcategory = $${params.length}`);
  }
  if (query.country_code) {
    params.push(query.country_code.toUpperCase());
    clauses.push(`f.country_code = $${params.length}`);
  }
  if (query.region) {
    params.push(query.region);
    clauses.push(`f.region = $${params.length}`);
  }
  if (query.unit_numerator) {
    params.push(normalizeUnitNumerator(query.unit_numerator));
    clauses.push(`f.unit_numerator = $${params.length}`);
  }
  if (query.unit_denominator) {
    params.push(normalizeUnitDenominator(query.unit_denominator));
    clauses.push(`f.unit_denominator = $${params.length}`);
  }
  if (query.factor_year !== undefined) {
    params.push(query.factor_year);
    clauses.push(`f.factor_year = $${params.length}`);
  }

  return clauses;
}

function pushQueryParam(params: unknown[], value: string | number): number {
  params.push(value);
  return params.length;
}

function stableIdMatchSql(qIdx: number): string {
  return `(
    f.stable_factor_id = $${qIdx}
    OR lower(f.stable_factor_id) = lower('ademe:' || $${qIdx})
    OR lower(f.stable_factor_id) LIKE '%:' || lower($${qIdx})
  )`;
}

type QueryContext = {
  qIdx: number;
  qNormIdx: number;
  ftsQueryIdx: number;
  numericCode: boolean;
  mode: QuerySearchMode;
  tokens: string[];
  allTokensInName: string;
  nameExact: string;
  namePrefix: string;
  externalExact: string;
  stableExact: string;
  ftsMatch: string;
  ftsRank: string;
  subcatMatch: string;
  internalSubMatch: string;
  categoryMatch: string;
  techRegionMatch: string;
};

function buildQueryContext(q: string, params: unknown[]): QueryContext {
  const qIdx = pushQueryParam(params, q);
  const qNormIdx = pushQueryParam(params, q);
  const numericCode = isNumericCodeQuery(q);
  const mode = numericCode ? "prefix" : getQuerySearchMode(q);
  const tokens = numericCode ? [] : splitQueryTokens(q);

  let allTokensInName = "FALSE";
  if (tokens.length > 1) {
    allTokensInName = tokens
      .map((token) => {
        const tIdx = pushQueryParam(params, token);
        return `ef_immutable_unaccent(lower(f.name)) LIKE '%' || ef_immutable_unaccent(lower($${tIdx})) || '%'`;
      })
      .join(" AND ");
  }

  const ftsQueryIdx = pushQueryParam(params, q);

  return {
    qIdx,
    qNormIdx,
    ftsQueryIdx,
    numericCode,
    mode,
    tokens,
    allTokensInName,
    nameExact: `ef_immutable_unaccent(lower(f.name)) = ef_immutable_unaccent(lower($${qNormIdx}))`,
    namePrefix: `ef_immutable_unaccent(lower(f.name)) LIKE ef_immutable_unaccent(lower($${qNormIdx})) || '%'`,
    externalExact: `f.external_code = $${qIdx}`,
    stableExact: stableIdMatchSql(qIdx),
    ftsMatch: `f.search_vector @@ plainto_tsquery('simple', ef_immutable_unaccent($${ftsQueryIdx}))`,
    ftsRank: `ts_rank_cd(f.search_vector, plainto_tsquery('simple', ef_immutable_unaccent($${ftsQueryIdx})), 32)`,
    subcatMatch: `ef_immutable_unaccent(lower(coalesce(f.source_subcategory, ''))) LIKE '%' || ef_immutable_unaccent(lower($${qNormIdx})) || '%'`,
    internalSubMatch: `ef_immutable_unaccent(lower(coalesce(f.internal_subcategory, ''))) LIKE '%' || ef_immutable_unaccent(lower($${qNormIdx})) || '%'`,
    categoryMatch: `(
      ef_immutable_unaccent(lower(coalesce(f.source_category, ''))) LIKE '%' || ef_immutable_unaccent(lower($${qNormIdx})) || '%'
      OR ef_immutable_unaccent(lower(coalesce(f.internal_category, ''))) LIKE '%' || ef_immutable_unaccent(lower($${qNormIdx})) || '%'
    )`,
    techRegionMatch: `(
      ef_immutable_unaccent(lower(coalesce(f.technology, ''))) LIKE '%' || ef_immutable_unaccent(lower($${qNormIdx})) || '%'
      OR ef_immutable_unaccent(lower(coalesce(f.region, ''))) LIKE '%' || ef_immutable_unaccent(lower($${qNormIdx})) || '%'
    )`,
  };
}

function buildPrimaryMatchClause(ctx: QueryContext): string {
  const parts = [ctx.externalExact, ctx.stableExact];
  if (ctx.numericCode) {
    return parts.join(" OR ");
  }
  if (ctx.mode === "minimal") {
    parts.push(
      `ef_immutable_unaccent(lower(f.name)) LIKE ef_immutable_unaccent(lower($${ctx.qNormIdx})) || '%'`,
    );
  } else if (ctx.mode === "prefix") {
    parts.push(`f.external_code LIKE $${ctx.qIdx} || '%'`, ctx.namePrefix);
  } else {
    parts.push(ctx.namePrefix);
    if (ctx.tokens.length > 1) parts.push(`(${ctx.allTokensInName})`);
    parts.push(ctx.ftsMatch);
    parts.push(ctx.subcatMatch, ctx.internalSubMatch, ctx.categoryMatch, ctx.techRegionMatch);
  }
  return parts.join(" OR ");
}

function buildRankAndReason(
  ctx: QueryContext,
  includeFuzzy: boolean,
  fuzzyThrIdx?: number,
): {
  rankExpr: string;
  reasonExpr: string;
} {
  const fuzzyRank =
    includeFuzzy && fuzzyThrIdx !== undefined
      ? `WHEN fp.fuzzy_score IS NOT NULL AND fp.fuzzy_score >= $${fuzzyThrIdx} THEN 40 + fp.fuzzy_score * 20`
      : "";
  const fuzzyReason =
    includeFuzzy && fuzzyThrIdx !== undefined
      ? `WHEN fp.fuzzy_score IS NOT NULL AND fp.fuzzy_score >= $${fuzzyThrIdx} THEN 'trigram_name'`
      : "";

  const rankExpr = `(
    CASE
      WHEN ${ctx.externalExact} THEN 110
      WHEN ${ctx.stableExact} THEN 105
      WHEN ${ctx.nameExact} THEN 100
      WHEN ${ctx.namePrefix} THEN 95
      WHEN ${ctx.tokens.length > 1 ? ctx.allTokensInName : "FALSE"} THEN 85
      WHEN ${ctx.mode === "full" ? ctx.ftsMatch : "FALSE"} THEN 60 + ${ctx.ftsRank} * 25
      ${fuzzyRank}
      WHEN ${ctx.subcatMatch} THEN 35
      WHEN ${ctx.internalSubMatch} THEN 30
      WHEN ${ctx.categoryMatch} THEN 25
      WHEN ${ctx.techRegionMatch} THEN 20
      ELSE 0
    END
  )::numeric`;

  const reasonExpr = `(
    CASE
      WHEN ${ctx.externalExact} THEN 'external_code_exact'
      WHEN ${ctx.stableExact} THEN 'stable_factor_id_exact'
      WHEN ${ctx.nameExact} THEN 'name_exact'
      WHEN ${ctx.namePrefix} THEN 'name_prefix'
      WHEN ${ctx.tokens.length > 1 ? ctx.allTokensInName : "FALSE"} THEN 'name_all_tokens'
      WHEN ${ctx.mode === "full" ? ctx.ftsMatch : "FALSE"} THEN 'fts_name'
      ${fuzzyReason}
      WHEN ${ctx.subcatMatch} THEN 'source_subcategory'
      WHEN ${ctx.internalSubMatch} THEN 'internal_subcategory'
      WHEN ${ctx.categoryMatch} THEN 'category'
      WHEN ${ctx.techRegionMatch} THEN 'technology_region'
      ELSE 'filter_only'
    END
  )`;

  return { rankExpr, reasonExpr };
}

function buildTextMatchClause(ctx: QueryContext, includeFuzzy: boolean, thrIdx?: number): string {
  const parts = [buildPrimaryMatchClause(ctx)];
  if (includeFuzzy && thrIdx !== undefined) {
    parts.push(`(fp.fuzzy_score IS NOT NULL AND fp.fuzzy_score >= $${thrIdx})`);
  }
  return `(${parts.join(" OR ")})`;
}

async function countPrimaryMatches(
  pool: Pool,
  query: FactorSearchQuery,
  q: string,
  limitPlusOne: number,
): Promise<number> {
  const params: unknown[] = [];
  const statusClauses = buildStatusClause(query.status);
  const filterClauses = buildFilterClauses(query, params);
  const ctx = buildQueryContext(q, params);
  params.push(limitPlusOne);
  const limitIdx = params.length;

  const { rows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM (
       SELECT 1
       FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE ${[...statusClauses, ...filterClauses].join(" AND ")}
         AND (${buildPrimaryMatchClause(ctx)})
       LIMIT $${limitIdx}
     ) primary_sample`,
    params,
  );
  return Number(rows[0]?.n ?? 0);
}

export type SearchFactorsOptions = {
  debug?: boolean;
};

export async function searchFactors(
  pool: Pool,
  query: FactorSearchQuery,
  cursor?: FactorSearchCursor,
  options: SearchFactorsOptions = {},
) {
  const q = normalizeSearchQuery(query.q);
  const limitPlusOne = query.limit + 1;

  let includeFuzzy = false;
  if (shouldUseFuzzyPool(q)) {
    if (cursor?.fz === 1) {
      includeFuzzy = true;
    } else if (cursor?.fz === 0) {
      includeFuzzy = false;
    } else if (q) {
      const primaryCount = await countPrimaryMatches(pool, query, q, limitPlusOne);
      includeFuzzy = primaryCount < limitPlusOne;
    }
  }

  const params: unknown[] = [];
  const statusClauses = buildStatusClause(query.status);
  const filterClauses = buildFilterClauses(query, params);
  const baseWhere = [...statusClauses, ...filterClauses].join(" AND ");

  let rankExpr = "0::numeric";
  let reasonExpr = "'filter_only'";
  let textMatchClause: string | null = null;
  let fuzzyCte = "";
  let fuzzyJoin = "";
  let qNormIdxForKnn: number | null = null;
  let fuzzyThrIdx: number | null = null;

  if (q) {
    const ctx = buildQueryContext(q, params);

    if (includeFuzzy) {
      const threshold = getTrigramThreshold(q);
      if (threshold !== null) {
        fuzzyThrIdx = pushQueryParam(params, threshold);
        qNormIdxForKnn = ctx.qNormIdx;
        params.push(FUZZY_CANDIDATE_LIMIT);
        const fuzzyLimitIdx = params.length;
        ({ rankExpr, reasonExpr } = buildRankAndReason(ctx, true, fuzzyThrIdx));
        fuzzyCte = `,
      fuzzy_pool AS (
        SELECT
          b.id,
          strict_word_similarity(
            ef_immutable_unaccent(lower($${qNormIdxForKnn})),
            b.search_name_text
          ) AS fuzzy_score
        FROM base b
        ORDER BY b.search_name_text <-> ef_immutable_unaccent(lower($${qNormIdxForKnn}))
        LIMIT $${fuzzyLimitIdx}
      )`;
        fuzzyJoin = `LEFT JOIN fuzzy_pool fp ON fp.id = f.id`;
        textMatchClause = buildTextMatchClause(ctx, true, fuzzyThrIdx);
      } else {
        ({ rankExpr, reasonExpr } = buildRankAndReason(ctx, false));
        textMatchClause = buildTextMatchClause(ctx, false);
      }
    } else {
      ({ rankExpr, reasonExpr } = buildRankAndReason(ctx, false));
      textMatchClause = buildTextMatchClause(ctx, false);
    }
  }

  let cursorWhere = "";
  if (cursor) {
    params.push(cursor.r);
    const rIdx = params.length;
    params.push(cursor.id);
    const idIdx = params.length;
    cursorWhere = `WHERE (
      rank_score < $${rIdx}
      OR (rank_score = $${rIdx} AND id > $${idIdx}::uuid)
    )`;
  }

  params.push(limitPlusOne);
  const limitIdx = params.length;

  const rankedWhere = textMatchClause ?? "TRUE";

  const sql = `
    WITH base AS (
      SELECT
        f.id,
        f.stable_factor_id,
        f.external_code,
        f.name,
        f.search_name_text,
        f.search_vector,
        f.technology,
        f.region,
        f.value::text AS value,
        f.unit_numerator,
        f.unit_denominator,
        f.factor_type,
        s.source_key,
        s.name AS source_name,
        v.dataset_version,
        f.source_category,
        f.source_subcategory,
        f.internal_category,
        f.internal_subcategory,
        f.country_code,
        f.factor_year,
        f.status
      FROM emission_factors f
      JOIN emission_factor_versions v ON v.id = f.version_id
      JOIN factor_sources s ON s.id = v.source_id
      WHERE ${baseWhere}
    )${fuzzyCte},
    ranked AS (
      SELECT
        f.id,
        f.stable_factor_id,
        f.external_code,
        f.name,
        f.value,
        f.unit_numerator,
        f.unit_denominator,
        f.factor_type,
        f.source_key,
        f.source_name,
        f.dataset_version,
        f.source_category,
        f.source_subcategory,
        f.internal_category,
        f.internal_subcategory,
        f.country_code,
        f.region,
        f.factor_year,
        f.status,
        ROUND((${rankExpr})::numeric, 6) AS rank_score,
        ${reasonExpr} AS ranking_reason
      FROM base f
      ${fuzzyJoin}
      WHERE ${rankedWhere}
    )
    SELECT * FROM ranked
    ${cursorWhere}
    ORDER BY rank_score DESC, id ASC
    LIMIT $${limitIdx}
  `;

  const { rows } = await pool.query<SearchRow>(sql, params);
  const hasMore = rows.length > query.limit;
  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
  const items = pageRows.map((row) => mapSearchRow(row, options.debug));
  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? encodeSearchCursor({
          r: Number(lastRow.rank_score),
          id: lastRow.id,
          fz: includeFuzzy ? 1 : 0,
        })
      : null;

  return {
    items: items.map((item) => {
      if (options.debug) return item;
      const { rankScore: _rs, rankingReason: _rr, ...rest } = item as typeof item & {
        rankScore: number;
        rankingReason?: RankingReason;
      };
      return rest;
    }),
    nextCursor,
    hasMore,
  };
}

export async function getFactorById(pool: Pool, id: string, allowDraft: boolean) {
  const statusClause = allowDraft
    ? "TRUE"
    : "f.status = 'approved' AND v.status = 'approved'";

  const { rows } = await pool.query(
    `SELECT
       f.id,
       f.stable_factor_id,
       f.version_number,
       f.external_code,
       f.name,
       f.value::text AS value,
       f.unit_numerator,
       f.unit_denominator,
       f.factor_type,
       f.source_category,
       f.source_subcategory,
       f.internal_category,
       f.internal_subcategory,
       f.country_code,
       f.region,
       f.factor_year,
       f.geography,
       f.technology,
       f.category,
       f.uncertainty_pct::text AS uncertainty_pct,
       f.checksum,
       f.status,
       f.valid_from,
       f.valid_until,
       f.metadata,
       v.id AS version_id,
       v.version_label,
       v.dataset_version,
       v.gwp_set,
       v.source_url,
       v.status AS version_status,
       s.source_key,
       s.name AS source_name,
       s.license AS source_license,
       s.homepage AS source_homepage
     FROM emission_factors f
     JOIN emission_factor_versions v ON v.id = f.version_id
     JOIN factor_sources s ON s.id = v.source_id
     WHERE f.id = $1 AND ${statusClause}`,
    [id],
  );

  const row = rows[0];
  if (!row) return null;

  const meta = row.metadata ?? {};
  const provenance = meta.provenance ?? {};
  const units = meta.units ?? {};
  const temporal = meta.temporal ?? {};
  const monetary = meta.monetary ?? null;
  const gwp = meta.gwp ?? null;

  return {
    id: row.id,
    stableFactorId: row.stable_factor_id,
    versionNumber: row.version_number,
    externalCode: row.external_code,
    name: row.name,
    value: Number(row.value),
    unitNumerator: row.unit_numerator,
    unitDenominator: row.unit_denominator,
    factorType: row.factor_type,
    source: {
      key: row.source_key,
      name: row.source_name,
      license: row.source_license,
      homepage: row.source_homepage,
    },
    version: {
      id: row.version_id,
      label: row.version_label,
      datasetVersion: row.dataset_version,
      gwpSet: row.gwp_set,
      sourceUrl: row.source_url,
      status: row.version_status,
    },
    sourceCategory: row.source_category,
    sourceSubcategory: row.source_subcategory,
    internalCategory: row.internal_category,
    internalSubcategory: row.internal_subcategory,
    countryCode: row.country_code,
    region: row.region,
    factorYear: row.factor_year,
    geography: row.geography,
    technology: row.technology,
    legacyCategory: row.category,
    uncertaintyPct: row.uncertainty_pct ? Number(row.uncertainty_pct) : null,
    checksum: row.checksum,
    checksumVersion: meta.checksum_version ?? null,
    status: row.status,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    provenance: {
      sourceOriginal: provenance.source_original ?? null,
      legacyId: provenance.legacy_id ?? null,
      legacyRowId: provenance.legacy_row_id ?? null,
      legacySlug: provenance.legacy_slug ?? null,
      originalName: provenance.original_name ?? null,
      originalValue: provenance.original_value ?? null,
      originalUnit: provenance.original_unit ?? null,
      legacyYear: provenance.legacy_year ?? temporal.legacy_year ?? null,
      transformations: provenance.transformations ?? [],
    },
    units: {
      originalUnit: units.original_unit ?? meta.original_unit ?? null,
      qualifiers: units.qualifiers ?? null,
      normalizationStatus: units.normalization_status ?? null,
    },
    monetary,
    gwp,
    temporal,
  };
}

type FacetRow = { value: string | null; count: string };

function buildFacetWhere(query: FactorCatalogFilters, params: unknown[]): string {
  const statusClauses = buildStatusClause(query.status);
  const filterClauses = buildFilterClauses(query, params);
  const q = normalizeSearchQuery(query.q);
  const whereParts = [...statusClauses, ...filterClauses];
  if (q) {
    const ctx = buildQueryContext(q, params);
    whereParts.push(`(${buildPrimaryMatchClause(ctx)})`);
  }
  return whereParts.join(" AND ");
}

async function facetGroup(
  pool: Pool,
  column: string,
  baseWhere: string,
  params: unknown[],
  limit = 50,
): Promise<Array<{ value: string; count: number }>> {
  params.push(limit);
  const limitIdx = params.length;
  const { rows } = await pool.query<FacetRow>(
    `SELECT ${column} AS value, COUNT(*)::text AS count
     FROM emission_factors f
     JOIN emission_factor_versions v ON v.id = f.version_id
     JOIN factor_sources s ON s.id = v.source_id
     WHERE ${baseWhere} AND ${column} IS NOT NULL
     GROUP BY ${column}
     ORDER BY COUNT(*) DESC, ${column} ASC
     LIMIT $${limitIdx}`,
    params,
  );
  return rows.map((r) => ({
    value: r.value as string,
    count: Number(r.count),
  }));
}

export async function getFactorFacets(pool: Pool, query: FactorCatalogFilters) {
  const params: unknown[] = [];
  const baseWhere = buildFacetWhere(query, params);

  const [sources, factorTypes, internalCategories, countryCodes, unitDenominators, factorYears] =
    await Promise.all([
      pool.query<FacetRow>(
        `SELECT coalesce(s.source_key, s.name) AS value, COUNT(*)::text AS count
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE ${baseWhere}
         GROUP BY coalesce(s.source_key, s.name)
         ORDER BY COUNT(*) DESC
         LIMIT 50`,
        [...params],
      ).then((r) =>
        r.rows.map((row) => ({ value: row.value as string, count: Number(row.count) })),
      ),
      facetGroup(pool, "f.factor_type", baseWhere, [...params]),
      facetGroup(pool, "f.internal_category", baseWhere, [...params]),
      facetGroup(pool, "f.country_code", baseWhere, [...params]),
      facetGroup(pool, "f.unit_denominator", baseWhere, [...params]),
      facetGroup(pool, "f.factor_year::text", baseWhere, [...params], 30),
    ]);

  return {
    sources,
    factorTypes,
    internalCategories,
    countryCodes,
    unitDenominators,
    factorYears,
  };
}

export function facetsCacheKey(query: FactorCatalogFilters): string {
  return createHash("sha256")
    .update(JSON.stringify(query))
    .digest("hex")
    .slice(0, 16);
}
