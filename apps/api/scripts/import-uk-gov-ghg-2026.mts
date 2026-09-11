#!/usr/bin/env npx tsx
/**
 * LOCAL-ONLY UK GHG 2026 draft import.
 * No push/deploy/catalog activation.
 */
import pg from "pg";
import { importUkGovGhg2026 } from "../src/importers/ukGovGhg/index.js";
import { UK_SOURCE_KEY, UK_DATASET_VERSION } from "../src/importers/ukGovGhg/types.js";

const workbook =
  process.env.UK_GHG_XLSX ??
  "/Users/kameltalbi/Desktop/ghg-conversion-factors-2026-flat-format-revised.xlsx";

const SAMPLE_IDS = [
  "1_100_1000_8_1", // direct fuel litres
  "11_100_1000_15_1", // WTT fuel
  "1_100_1000_6_1", // Gross CV
  "1_100_1000_7_1", // Net CV
  "7_400_4000_5_1", // UK electricity
  "13_402_4000_5_1", // electricity T&D
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  try {
    console.log("=== UK GHG 2026 import (draft only) ===");
    console.log("workbook:", workbook);
    const result = await importUkGovGhg2026(pool, workbook);
    console.log(JSON.stringify(result, null, 2));

    async function oneOf(category: string, extraSql = "", params: unknown[] = []) {
      const q = await pool.query<{ external_code: string }>(
        `SELECT f.external_code FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND f.source_category = $3 ${extraSql}
         ORDER BY f.external_code LIMIT 1`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION, category, ...params],
      );
      return q.rows[0]?.external_code;
    }

    const ids = [
      ...SAMPLE_IDS,
      await oneOf("Passenger vehicles"),
      await oneOf("Business travel- air"),
      await oneOf("Waste disposal"),
      await oneOf("Hotel stay", "AND f.country_code IS DISTINCT FROM 'GB'"),
    ].filter(Boolean) as string[];

    const samples = await pool.query(
      `SELECT f.external_code AS source_id, f.stable_factor_id, f.name, f.value::text AS value,
              f.unit_numerator||'/'||f.unit_denominator AS canonical_unit,
              f.metadata->'provenance'->>'original_uom' AS original_unit,
              f.lifecycle_boundary, f.energy_basis, f.gwp_basis, f.factor_kind, f.country_code,
              jsonb_build_object(
                'level1', f.metadata->'provenance'->>'level_1',
                'level2', f.metadata->'provenance'->>'level_2',
                'level3', f.metadata->'provenance'->>'level_3',
                'level4', f.metadata->'provenance'->>'level_4',
                'column_text', f.metadata->'provenance'->>'column_text'
              ) AS source_taxonomy,
              jsonb_build_object(
                'internal_category', f.internal_category,
                'internal_subcategory', f.internal_subcategory
              ) AS internal_taxonomy,
              f.metadata->'provenance'->>'source_scope' AS source_scope,
              f.metadata->>'normalization_status' AS review_status
       FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND v.dataset_version = $2
         AND f.external_code = ANY($3::text[])
       ORDER BY array_position($3::text[], f.external_code)`,
      [UK_SOURCE_KEY, UK_DATASET_VERSION, ids],
    );
    console.log("=== samples (10) ===");
    console.log(JSON.stringify(samples.rows, null, 2));

    const gov = await pool.query(
      `SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
       FROM emission_factor_versions v
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND v.dataset_version = $2`,
      [UK_SOURCE_KEY, UK_DATASET_VERSION],
    );
    const calcEligible = await pool.query(
      `SELECT COUNT(*)::int AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND v.dataset_version = $2
         AND f.status = 'approved' AND v.status = 'approved'
         AND v.calculation_status = 'enabled'`,
      [UK_SOURCE_KEY, UK_DATASET_VERSION],
    );
    const resolverEligible = await pool.query(
      `SELECT COUNT(*)::int AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND v.dataset_version = $2
         AND v.resolver_status = 'enabled'`,
      [UK_SOURCE_KEY, UK_DATASET_VERSION],
    );
    const legacy = await pool.query(
      `SELECT COUNT(*)::int AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal'`,
    );
    console.log(
      JSON.stringify(
        {
          governance: gov.rows[0],
          ukCalcEligible: calcEligible.rows[0].n,
          ukResolverEligible: resolverEligible.rows[0].n,
          legacyInternal: legacy.rows[0].n,
        },
        null,
        2,
      ),
    );

    console.log("=== idempotent re-run ===");
    const again = await importUkGovGhg2026(pool, workbook);
    console.log(
      JSON.stringify(
        {
          inserted: again.inserted,
          updated: again.updated,
          registryAfter: again.registryAfter,
          ukCount: again.ukCount,
          catalogVisible: again.catalogVisible,
          legacyInternal: again.legacyInternal,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
