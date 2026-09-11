#!/usr/bin/env npx tsx
/**
 * Generate deterministic UK GHG 2026 seed SQL from the official XLSX.
 *
 * Usage:
 *   npx tsx apps/api/scripts/generate-uk-gov-ghg-seed.mts [path-to-xlsx] [--out path]
 *
 * Default xlsx: Desktop official revised flat file
 * Default out:  db/seeds/uk_gov_ghg_2026_flat_1_2.sql
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildUkSeedSqlFromWorkbook } from "../src/importers/ukGovGhg/generateSeed.js";
import { UK_EXPECTED_SHA256 } from "../src/importers/ukGovGhg/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

const args = process.argv.slice(2);
let xlsx =
  process.env.UK_GHG_XLSX ??
  "/Users/kameltalbi/Desktop/ghg-conversion-factors-2026-flat-format-revised.xlsx";
let out = resolve(repoRoot, "db/seeds/uk_gov_ghg_2026_flat_1_2.sql");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) {
    out = resolve(args[++i]!);
  } else if (!args[i]!.startsWith("-")) {
    xlsx = resolve(args[i]!);
  }
}

const artifact = buildUkSeedSqlFromWorkbook(xlsx);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, artifact.sql, "utf8");

const written = readFileSync(out);
const writtenSha = createHash("sha256").update(written).digest("hex");

console.log(
  JSON.stringify(
    {
      xlsx,
      sourceSha256: artifact.sourceSha256,
      expectedSourceSha256: UK_EXPECTED_SHA256,
      out,
      factorCount: artifact.factorCount,
      seedSha256: artifact.sha256,
      writtenSha256: writtenSha,
      bytes: written.byteLength,
      match: artifact.sha256 === writtenSha,
    },
    null,
    2,
  ),
);

if (artifact.sha256 !== writtenSha) {
  console.error("FATAL: written seed SHA mismatch");
  process.exit(1);
}
