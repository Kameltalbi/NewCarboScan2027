/**
 * IPCC EFDB import — SHA, parse controls, classification examples, operational subset.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  IPCC_EFDB_EXPECTED_AUTO_GLOBAL_ACTIVITY,
  IPCC_EFDB_EXPECTED_OPERATIONAL_FACTOR_COUNT,
  IPCC_EFDB_EXPECTED_RECORD_COUNT,
  IPCC_EFDB_EXPECTED_SEED_SHA256,
  IPCC_EFDB_EXPECTED_SHA256,
  IPCC_EFDB_PARAM_TYPE_COUNTS,
  parseEfdbValue,
  parseIpccEfdbWorkbook,
  classifyAll,
  promoteOperationalFactors,
  summarizeClassification,
} from "../importers/ipccEfdb/index.js";

const root = resolve(import.meta.dirname, "../../../..");
const xlsxPath = resolve(root, "data/ipcc_efdb/EFDB_output.xlsx");
const seedPath = resolve(root, "db/seeds/ipcc_efdb.sql");
const hasXlsx = existsSync(xlsxPath);

describe("IPCC EFDB importer (offline)", { skip: !hasXlsx }, () => {
  it("pins workbook SHA-256 and structural counts", () => {
    const sha = createHash("sha256").update(readFileSync(xlsxPath)).digest("hex");
    assert.equal(sha, IPCC_EFDB_EXPECTED_SHA256);
    const { records, stats } = parseIpccEfdbWorkbook(xlsxPath);
    assert.equal(records.length, IPCC_EFDB_EXPECTED_RECORD_COUNT);
    assert.equal(stats.distinctEfIds, IPCC_EFDB_EXPECTED_RECORD_COUNT);
    assert.equal(stats.emptyGeo, 10450);
    assert.equal(stats.emptyUnit, 77);
    assert.equal(stats.emptyDescription, 2909);
    assert.equal(stats.multiGas, 1807);
    for (const [k, n] of Object.entries(IPCC_EFDB_PARAM_TYPE_COUNTS)) {
      assert.equal(stats.paramTypeCounts[k], n, k);
    }
  });

  it("parses values without partial parseFloat", () => {
    assert.equal(parseEfdbValue(null).class, "missing");
    assert.equal(parseEfdbValue("").class, "missing");
    assert.equal(parseEfdbValue("74100").number, 74100);
    assert.equal(parseEfdbValue("0").number, 0);
    assert.ok(parseEfdbValue("0").notes.includes("true_zero"));
    assert.equal(parseEfdbValue("-1.5").number, -1.5);
    assert.equal(parseEfdbValue("0.18-0.21").class, "simple_interval");
    assert.equal(parseEfdbValue("0.18-0.21").number, null);
    assert.equal(parseEfdbValue("24 (16-32)").class, "central_with_bounds");
    assert.equal(parseEfdbValue("24 (16-32)").number, null);
    assert.equal(parseEfdbValue("<2").class, "inequality");
    assert.equal(parseEfdbValue("12abc").class, "other_text");
    assert.equal(parseEfdbValue("12abc").number, null);
  });

  it("classifies mandatory examples and operational subset", () => {
    const { records } = parseIpccEfdbWorkbook(xlsxPath);
    const classified = classifyAll(records);
    const byId = Object.fromEntries(classified.map((c) => [c.efId, c]));

    assert.equal(byId["62801"]!.semanticClass, "auxiliary_parameter");
    assert.equal(byId["62801"]!.region, "Tunisia");
    assert.equal(byId["14772"]!.semanticClass, "auxiliary_parameter");
    assert.equal(byId["14772"]!.unitRaw, "TJ/kt");
    assert.equal(byId["117614"]!.operationalPromote, true);
    assert.equal(byId["117614"]!.operationalRole, "activity_co2");
    assert.equal(byId["117614"]!.geographicApplicability, "IPCC_DEFAULT_UNSPECIFIED");
    assert.equal(byId["117614"]!.valueParse.number, 74100);

    const summary = summarizeClassification(classified);
    assert.equal(summary.operational, IPCC_EFDB_EXPECTED_OPERATIONAL_FACTOR_COUNT);
    assert.equal(summary.autoGlobalActivity, IPCC_EFDB_EXPECTED_AUTO_GLOBAL_ACTIVITY);

    const dtos = promoteOperationalFactors(classified);
    assert.equal(dtos.length, 778);
    const co2 = dtos.filter((d) => d.factorKind === "activity_emission_factor");
    assert.equal(co2.length, 216);
    assert.ok(co2.every((d) => d.countryCode === null));
    assert.ok(co2.every((d) => d.unitNumerator === "kgCO2e"));
    const diesel = co2.find((d) => d.efId === "117614");
    assert.ok(diesel);
    assert.equal(diesel!.value, 74100);
    assert.equal(diesel!.energyBasis, "net_cv");
  });

  it("pins generated seed SHA when present", () => {
    if (!existsSync(seedPath)) return;
    const sha = createHash("sha256").update(readFileSync(seedPath)).digest("hex");
    assert.equal(sha, IPCC_EFDB_EXPECTED_SEED_SHA256);
  });
});
