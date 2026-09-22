/**
 * Offline tests: EPA GHG Emission Factors Hub 2025 adapter + seed.
 * Skips when the official XLSX is absent (CI).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEpaSeedSqlFromWorkbook } from "../importers/epaHub2025/generateSeed.js";
import { normalizeEpaFactors, summarizeEpaDtos } from "../importers/epaHub2025/normalize.js";
import { parseEpaWorkbook } from "../importers/epaHub2025/parseTables.js";
import { assertEpaWorkbookSha256 } from "../importers/epaHub2025/sha256.js";
import {
  EPA_AR5_GWP,
  EPA_EXPECTED_FACTOR_COUNT,
  EPA_EXPECTED_SEED_SHA256,
  EPA_EXPECTED_SHA256,
} from "../importers/epaHub2025/types.js";
import { epaFactorUuid } from "../importers/epaHub2025/fixedIds.js";

const WORKBOOK =
  process.env.EPA_XLSX ??
  "/Users/kameltalbi/Desktop/ghg-emission-factors-hub-2025.xlsx";

const VERSIONED_SEED = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../db/seeds/epa_ghg_emission_factors_hub_2025.sql",
);

describe("epa hub 2025 adapter (offline)", { skip: !existsSync(WORKBOOK) }, () => {
  it("verifies XLSX SHA-256", () => {
    assert.equal(assertEpaWorkbookSha256(WORKBOOK), EPA_EXPECTED_SHA256);
  });

  it("parses 12 tables with NA != 0 and pinned counts", async () => {
    const parsed = await parseEpaWorkbook(WORKBOOK);
    assert.equal(parsed.sourceRows, 591);
    assert.equal(Object.keys(parsed.byTable).length, 12);
    assert.ok(parsed.naIgnored > 0, "expected NA cells ignored");
    assert.equal(parsed.negatives, 0);

    const dtos = normalizeEpaFactors(parsed.factors);
    const summary = summarizeEpaDtos(dtos);
    assert.equal(summary.imported, EPA_EXPECTED_FACTOR_COUNT);
    assert.ok(summary.ghgComponents > 0);
    assert.ok(summary.activityCo2e > 0);
    assert.ok(summary.gwp > 0);
    assert.ok(summary.derived > 0);
    assert.ok(summary.usSpecific > 0);
    assert.ok(summary.requiresReview > 0);
    assert.equal(summary.globalApplicable, summary.gwp);

    // eGRID always US
    for (const d of dtos.filter((x) => x.table === 6)) {
      assert.equal(d.countryCode, "US");
      assert.equal(d.geographicApplicability, "US_SPECIFIC");
    }

    // GWP rows are not activity factors
    for (const d of dtos.filter((x) => x.table === 11 || x.table === 12)) {
      assert.equal(d.factorKind, "gwp");
      assert.equal(d.gwpBasis, "AR5");
    }

    // CH4/N2O typed as components
    for (const d of dtos.filter((x) => x.gas === "CH4" || x.gas === "N2O")) {
      assert.equal(d.factorKind, "ghg_component");
    }

    assert.equal(EPA_AR5_GWP.CH4, 28);
    assert.equal(EPA_AR5_GWP.N2O, 265);
  });

  it("stable IDs and UUIDs are deterministic", async () => {
    const a = normalizeEpaFactors((await parseEpaWorkbook(WORKBOOK)).factors);
    const b = normalizeEpaFactors((await parseEpaWorkbook(WORKBOOK)).factors);
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i++) {
      assert.equal(a[i]!.stableFactorId, b[i]!.stableFactorId);
      assert.equal(epaFactorUuid(a[i]!.stableFactorId), epaFactorUuid(b[i]!.stableFactorId));
    }
  });
});

describe("epa hub 2025 seed generator (offline)", { skip: !existsSync(WORKBOOK) }, () => {
  it("generates identical seed bytes twice and matches versioned seed", async () => {
    const first = await buildEpaSeedSqlFromWorkbook(WORKBOOK);
    const second = await buildEpaSeedSqlFromWorkbook(WORKBOOK);
    assert.equal(first.factorCount, EPA_EXPECTED_FACTOR_COUNT);
    assert.equal(first.sha256, second.sha256);
    assert.equal(first.sql, second.sql);
    assert.equal(first.sha256, EPA_EXPECTED_SEED_SHA256);

    assert.ok(existsSync(VERSIONED_SEED), "versioned seed missing — run generate:epa-hub-2025-seed");
    const versioned = readFileSync(VERSIONED_SEED, "utf8");
    const versionedSha = createHash("sha256").update(versioned, "utf8").digest("hex");
    assert.equal(versionedSha, first.sha256);
  });
});
