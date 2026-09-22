#!/usr/bin/env npx tsx
/**
 * Generate db/seeds/ipcc_efdb.sql from data/ipcc_efdb/EFDB_output.xlsx
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildIpccEfdbSeedSqlFromWorkbook } from "../src/importers/ipccEfdb/generateSeed.js";

const root = resolve(import.meta.dirname, "../../..");
const xlsx = resolve(root, "data/ipcc_efdb/EFDB_output.xlsx");
const out = resolve(root, "db/seeds/ipcc_efdb.sql");

const artifact = await buildIpccEfdbSeedSqlFromWorkbook(xlsx);
writeFileSync(out, artifact.sql, "utf8");
console.log(
  JSON.stringify(
    {
      out,
      sourceSha256: artifact.sourceSha256,
      seedSha256: artifact.sha256,
      records: artifact.recordCount,
      factors: artifact.factorCount,
      autoGlobalActivity: artifact.autoGlobalActivity,
      summary: artifact.summary,
      stats: {
        emptyGeo: artifact.stats.emptyGeo,
        emptyUnit: artifact.stats.emptyUnit,
        emptyDescription: artifact.stats.emptyDescription,
        multiGas: artifact.stats.multiGas,
        paramTypeCounts: artifact.stats.paramTypeCounts,
      },
    },
    null,
    2,
  ),
);
