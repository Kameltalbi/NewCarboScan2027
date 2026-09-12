#!/usr/bin/env npx tsx
/**
 * Generate db/seeds/epa_ghg_emission_factors_hub_2025.sql from official EPA XLSX.
 *
 *   EPA_XLSX=/path/to/ghg-emission-factors-hub-2025.xlsx npm run generate:epa-hub-2025-seed
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEpaSeedSqlFromWorkbook } from "../src/importers/epaHub2025/generateSeed.js";

const workbook =
  process.env.EPA_XLSX ??
  "/Users/kameltalbi/Desktop/ghg-emission-factors-hub-2025.xlsx";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const out = resolve(root, "db/seeds/epa_ghg_emission_factors_hub_2025.sql");

const artifact = buildEpaSeedSqlFromWorkbook(workbook);
writeFileSync(out, artifact.sql, "utf8");
console.log(
  JSON.stringify(
    {
      out,
      factorCount: artifact.factorCount,
      seedSha256: artifact.sha256,
      sourceSha256: artifact.sourceSha256,
      summary: artifact.summary,
      naIgnored: artifact.naIgnored,
      zeros: artifact.zeros,
      negatives: artifact.negatives,
      sourceRows: artifact.sourceRows,
    },
    null,
    2,
  ),
);
