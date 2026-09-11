import type { Pool, PoolClient } from "pg";
import { buildUkFactorMetadata } from "./buildMetadata.js";
import {
  UK_DATASET_VERSION,
  UK_REPORTING_YEAR,
  UK_SOURCE_KEY,
  UK_VERSION_LABEL,
  type UkCanonicalDto,
  type UkImportResult,
  type UkReconcileStats,
} from "./types.js";
import { UK_SOURCE_FILE_BASENAME } from "./fixedIds.js";

type Queryable = Pool | PoolClient;

async function q<T extends Record<string, unknown>>(
  db: Queryable,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await db.query<T>(sql, params);
  return res.rows;
}

function assertDraftOnlyGovernance(row: {
  status: string;
  catalog_status: string;
  calculation_status: string;
  resolver_status: string;
}): void {
  if (
    row.status !== "draft" ||
    row.catalog_status !== "hidden" ||
    row.calculation_status !== "disabled" ||
    row.resolver_status !== "disabled"
  ) {
    throw new Error(
      `UK version must be draft/hidden/disabled/disabled, got ${row.status}/${row.catalog_status}/${row.calculation_status}/${row.resolver_status}`,
    );
  }
}

export async function ensureUkSourceAndVersion(
  client: PoolClient,
): Promise<{ sourceId: string; versionId: string }> {
  const sources = await q<{ id: string }>(
    client,
    `INSERT INTO factor_sources (name, license, homepage, source_key, publisher, metadata)
     VALUES (
       'UK Government GHG Conversion Factors',
       'OGL-3.0',
       'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting',
       $1,
       'UK DESNZ / Greenhouse Gas Statistics',
       $2::jsonb
     )
     ON CONFLICT (source_key) WHERE source_key IS NOT NULL
     DO UPDATE SET
       name = EXCLUDED.name,
       license = EXCLUDED.license,
       publisher = EXCLUDED.publisher,
       homepage = EXCLUDED.homepage,
       metadata = factor_sources.metadata || EXCLUDED.metadata
     RETURNING id`,
    [
      UK_SOURCE_KEY,
      JSON.stringify({
        ogl: "3.0",
        collection: "government-conversion-factors-for-company-reporting",
      }),
    ],
  );
  const sourceId = sources[0]?.id;
  if (!sourceId) throw new Error("Failed to upsert uk_gov_ghg source");

  // Upsert version by (source_id, version_label)
  const existing = await q<{
    id: string;
    status: string;
    catalog_status: string;
    calculation_status: string;
    resolver_status: string;
  }>(
    client,
    `SELECT id, status, catalog_status, calculation_status, resolver_status
     FROM emission_factor_versions
     WHERE source_id = $1 AND version_label = $2`,
    [sourceId, UK_VERSION_LABEL],
  );

  let versionId: string;
  if (existing[0]) {
    assertDraftOnlyGovernance(existing[0]);
    // Force draft-only (refuse activation during this importer)
    await client.query(
      `UPDATE emission_factor_versions
       SET dataset_version = $2,
           published_year = $3,
           gwp_set = 'mixed',
           notes = $4,
           status = 'draft',
           catalog_status = 'hidden',
           calculation_status = 'disabled',
           resolver_status = 'disabled'
       WHERE id = $1`,
      [
        existing[0].id,
        UK_DATASET_VERSION,
        UK_REPORTING_YEAR,
        "UK GHG Conversion Factors 2026 flat file v1.2 — draft import only",
      ],
    );
    versionId = existing[0].id;
  } else {
    const inserted = await q<{ id: string }>(
      client,
      `INSERT INTO emission_factor_versions (
         source_id, version_label, dataset_version, published_year, gwp_set, notes,
         status, catalog_status, calculation_status, resolver_status
       ) VALUES (
         $1, $2, $3, $4, 'mixed', $5,
         'draft', 'hidden', 'disabled', 'disabled'
       )
       RETURNING id`,
      [
        sourceId,
        UK_VERSION_LABEL,
        UK_DATASET_VERSION,
        UK_REPORTING_YEAR,
        "UK GHG Conversion Factors 2026 flat file v1.2 — draft import only",
      ],
    );
    versionId = inserted[0]!.id;
  }

  const gov = await q<{
    status: string;
    catalog_status: string;
    calculation_status: string;
    resolver_status: string;
  }>(
    client,
    `SELECT status, catalog_status, calculation_status, resolver_status
     FROM emission_factor_versions WHERE id = $1`,
    [versionId],
  );
  assertDraftOnlyGovernance(gov[0]!);

  return { sourceId, versionId };
}

function buildMetadata(
  dto: UkCanonicalDto,
  fileSha256: string,
  sourceFile: string,
): Record<string, unknown> {
  return buildUkFactorMetadata(dto, fileSha256, sourceFile || UK_SOURCE_FILE_BASENAME);
}

export async function upsertUkFactors(
  client: PoolClient,
  versionId: string,
  dtos: UkCanonicalDto[],
  fileSha256: string,
  sourceFile: string,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const dto of dtos) {
    const metadata = buildMetadata(dto, fileSha256, sourceFile);
    const res = await client.query<{ xmax: string }>(
      `INSERT INTO emission_factors (
         version_id, stable_factor_id, version_number, external_code, name,
         unit_numerator, unit_denominator, value, status, factor_type,
         source_category, source_subcategory, internal_category, internal_subcategory,
         country_code, region, factor_year,
         lifecycle_boundary, energy_basis, gwp_basis, factor_kind,
         checksum, metadata, category, geography
       ) VALUES (
         $1, $2, 1, $3, $4,
         $5, $6, ($7::text)::numeric, 'draft', $8,
         $9, $10, $11, $12,
         $13, NULL, NULL,
         $14, $15, $16, $17,
         ef_factor_checksum_v2($2, $18, $4, ($7::text)::numeric, $5, $6, $13, $9, $8),
         $19::jsonb,
         $9,
         $13
       )
       ON CONFLICT (stable_factor_id, version_number)
         WHERE stable_factor_id IS NOT NULL
       DO UPDATE SET
         external_code = EXCLUDED.external_code,
         name = EXCLUDED.name,
         unit_numerator = EXCLUDED.unit_numerator,
         unit_denominator = EXCLUDED.unit_denominator,
         value = EXCLUDED.value,
         status = 'draft',
         factor_type = EXCLUDED.factor_type,
         source_category = EXCLUDED.source_category,
         source_subcategory = EXCLUDED.source_subcategory,
         internal_category = EXCLUDED.internal_category,
         internal_subcategory = EXCLUDED.internal_subcategory,
         country_code = EXCLUDED.country_code,
         lifecycle_boundary = EXCLUDED.lifecycle_boundary,
         energy_basis = EXCLUDED.energy_basis,
         gwp_basis = EXCLUDED.gwp_basis,
         factor_kind = EXCLUDED.factor_kind,
         checksum = EXCLUDED.checksum,
         metadata = EXCLUDED.metadata,
         category = EXCLUDED.category,
         geography = EXCLUDED.geography
       WHERE emission_factors.version_id = $1
       RETURNING (xmax::text = '0') AS inserted_flag`,
      [
        versionId,
        dto.stableFactorId,
        dto.externalCode,
        dto.name,
        dto.unitNumerator,
        dto.unitDenominator,
        dto.originalValue,
        dto.factorType,
        dto.sourceCategory,
        dto.sourceSubcategory,
        dto.internalCategory,
        dto.internalSubcategory,
        dto.countryCode,
        dto.lifecycleBoundary,
        dto.energyBasis,
        dto.gwpBasis,
        dto.factorKind,
        UK_DATASET_VERSION,
        JSON.stringify(metadata),
      ],
    );

    // xmax trick varies; count via separate check if needed
    const row = res.rows[0] as { inserted_flag?: boolean } | undefined;
    if (row && (row as { inserted_flag?: boolean }).inserted_flag === true) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated };
}

export async function countRegistry(db: Queryable): Promise<{
  registry: number;
  uk: number;
  catalogVisible: number;
  legacyInternal: number;
  ademe: number;
  internal: number;
}> {
  const registry = Number(
    (await q<{ n: string }>(db, `SELECT COUNT(*)::text AS n FROM emission_factors`))[0]?.n ?? 0,
  );
  const uk = Number(
    (
      await q<{ n: string }>(
        db,
        `SELECT COUNT(*)::text AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      )
    )[0]?.n ?? 0,
  );
  const catalogVisible = Number(
    (
      await q<{ n: string }>(
        db,
        `SELECT COUNT(*)::text AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible'`,
      )
    )[0]?.n ?? 0,
  );
  const legacyInternal = Number(
    (
      await q<{ n: string }>(
        db,
        `SELECT COUNT(*)::text AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal'`,
      )
    )[0]?.n ?? 0,
  );
  const ademe = Number(
    (
      await q<{ n: string }>(
        db,
        `SELECT COUNT(*)::text AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = 'ademe'`,
      )
    )[0]?.n ?? 0,
  );
  const internal = Number(
    (
      await q<{ n: string }>(
        db,
        `SELECT COUNT(*)::text AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = 'internal'`,
      )
    )[0]?.n ?? 0,
  );
  return { registry, uk, catalogVisible, legacyInternal, ademe, internal };
}

export async function runUkImport(
  pool: Pool,
  opts: {
    workbookPath: string;
    fileSha256: string;
    dtos: UkCanonicalDto[];
    reconcile: UkReconcileStats;
    skippedNullCo2e: number;
    componentsNotImported: number;
    secrNotImported: number;
    zerosImported: number;
  },
): Promise<UkImportResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const before = await countRegistry(client);
    if (before.registry !== 7402 && before.uk === 0) {
      // Allow only clean 7402 before first import, or re-run with existing UK
      throw new Error(`Unexpected registry before import: ${before.registry} (uk=${before.uk})`);
    }
    if (before.uk === 0 && before.registry !== 7402) {
      throw new Error(`Registry must be 7402 before first UK import, got ${before.registry}`);
    }

    const { versionId } = await ensureUkSourceAndVersion(client);
    const { inserted, updated } = await upsertUkFactors(
      client,
      versionId,
      opts.dtos,
      opts.fileSha256,
      opts.workbookPath,
    );

    // Exact value preservation via PostgreSQL numeric equality (no JS float tolerance)
    const codes = opts.dtos.map((d) => d.externalCode);
    const texts = opts.dtos.map((d) => d.originalValue);
    const mismatches = await q<{
      external_code: string;
      db_value: string;
      source_value: string;
    }>(
      client,
      `WITH expected(external_code, original_value) AS (
         SELECT * FROM UNNEST($3::text[], $4::text[])
       )
       SELECT f.external_code,
              f.value::text AS db_value,
              e.original_value AS source_value
       FROM expected e
       JOIN emission_factors f ON f.external_code = e.external_code
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND v.dataset_version = $2
         AND f.value IS DISTINCT FROM e.original_value::numeric
       LIMIT 20`,
      [UK_SOURCE_KEY, UK_DATASET_VERSION, codes, texts],
    );
    if (mismatches.length > 0) {
      throw new Error(
        `Value mismatch (source vs registry) e.g. ${JSON.stringify(mismatches[0])}`,
      );
    }

    const after = await countRegistry(client);
    if (after.uk !== opts.dtos.length) {
      throw new Error(`UK count ${after.uk} != dto count ${opts.dtos.length}`);
    }
    if (after.catalogVisible !== 7402) {
      throw new Error(`Catalog visible changed: ${after.catalogVisible}`);
    }
    if (after.legacyInternal !== 8) {
      throw new Error(`Legacy internal changed: ${after.legacyInternal}`);
    }
    if (after.ademe !== 7394 || after.internal !== 8) {
      throw new Error(`ADEME/Core TN counts changed: ademe=${after.ademe} internal=${after.internal}`);
    }
    const expectedRegistry = 7402 + opts.dtos.length;
    if (after.registry !== expectedRegistry) {
      throw new Error(`Registry ${after.registry} != expected ${expectedRegistry}`);
    }

    const gov = await q<{
      status: string;
      catalog_status: string;
      calculation_status: string;
      resolver_status: string;
    }>(
      client,
      `SELECT status, catalog_status, calculation_status, resolver_status
       FROM emission_factor_versions WHERE id = $1`,
      [versionId],
    );
    assertDraftOnlyGovernance(gov[0]!);

    await client.query("COMMIT");

    const gwpCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const lifecycleCounts: Record<string, number> = {};
    let reviewRequired = 0;
    const taxonomy = { mapped: 0, ambiguous: 0, unmapped: 0 };
    for (const d of opts.dtos) {
      gwpCounts[d.gwpBasis] = (gwpCounts[d.gwpBasis] ?? 0) + 1;
      const ck = d.countryCode ?? "NULL";
      countryCounts[ck] = (countryCounts[ck] ?? 0) + 1;
      lifecycleCounts[d.lifecycleBoundary] = (lifecycleCounts[d.lifecycleBoundary] ?? 0) + 1;
      if (d.normalizationStatus === "review_required") reviewRequired += 1;
      taxonomy[d.taxonomyStatus === "ambiguous" ? "ambiguous" : d.taxonomyStatus] += 1;
    }

    return {
      inserted,
      updated,
      imported: opts.dtos.length,
      registryBefore: before.registry,
      registryAfter: after.registry,
      ukCount: after.uk,
      catalogVisible: after.catalogVisible,
      legacyInternal: after.legacyInternal,
      reconcile: opts.reconcile,
      gwpCounts,
      countryCounts,
      lifecycleCounts,
      reviewRequired,
      taxonomy,
      skippedNullCo2e: opts.skippedNullCo2e,
      componentsNotImported: opts.componentsNotImported,
      secrNotImported: opts.secrNotImported,
      zerosImported: opts.zerosImported,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
