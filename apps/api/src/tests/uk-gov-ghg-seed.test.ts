/**
 * Offline tests: deterministic UK GHG 2026 seed generation.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildUkSeedSqlFromWorkbook } from "../importers/ukGovGhg/generateSeed.js";
import { UK_EXPECTED_SHA256 } from "../importers/ukGovGhg/types.js";
import { assertUkWorkbookSha256 } from "../importers/ukGovGhg/sha256.js";

const WORKBOOK =
  process.env.UK_GHG_XLSX ??
  "/Users/kameltalbi/Desktop/ghg-conversion-factors-2026-flat-format-revised.xlsx";

const VERSIONED_SEED = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../db/seeds/uk_gov_ghg_2026_flat_1_2.sql",
);

describe("uk gov ghg 2026 seed generator (offline)", { skip: !existsSync(WORKBOOK) }, () => {
  it("verifies official XLSX SHA-256", () => {
    assert.equal(assertUkWorkbookSha256(WORKBOOK), UK_EXPECTED_SHA256);
  });

  it("generates identical seed bytes twice and matches versioned seed", () => {
    const a = buildUkSeedSqlFromWorkbook(WORKBOOK);
    const b = buildUkSeedSqlFromWorkbook(WORKBOOK);
    assert.equal(a.factorCount, 2622);
    assert.equal(a.sha256, b.sha256);
    assert.equal(a.sql, b.sql);

    assert.ok(existsSync(VERSIONED_SEED), "versioned seed missing — run generate:uk-ghg-seed");
    const versioned = readFileSync(VERSIONED_SEED, "utf8");
    const versionedSha = createHash("sha256").update(versioned, "utf8").digest("hex");
    assert.equal(versionedSha, a.sha256);
    assert.equal(
      versionedSha,
      "228c0c2ebbfc4fc189314b8777c074cc8b2c1b0c2227b5718652b7a109b5f52d",
    );
  });
});
