import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCarbonBalance,
  calculateEmission,
  buildFactualReportCommentary,
  combineUncertaintyPct,
  assertEveryNumberInTextExistsInStructuredFacts,
  ENGINE_VERSION,
} from "./index.js";

describe("carbon-engine", () => {
  it("calculateEmission matches documented example", () => {
    const result = calculateEmission({
      activity: { value: "12500", unit: "kWh" },
      factor: {
        value: "0.0569",
        unit: "kgCO2e/kWh",
        versionId: "ef-electricity-tn-2025-v2",
      },
      methodologyVersion: "ghg-corporate-1.0.0",
    });
    assert.equal(result.emissionsKgCO2e, "711.25");
    assert.equal(result.factorVersionId, "ef-electricity-tn-2025-v2");
    assert.equal(result.engineVersion, ENGINE_VERSION);
    assert.match(result.formula, /12500/);
  });

  it("calculates deterministically", () => {
    const input = [
      {
        lineKey: "elec",
        scope: 2 as const,
        factorId: "f1",
        activityQuantity: "1000",
        activityUnit: "kWh",
        factorValue: "0.052",
        factorUnit: "kgCO2e/kWh",
      },
    ];
    const a = calculateCarbonBalance(input);
    const b = calculateCarbonBalance(input);
    assert.equal(a.resultHash, b.resultHash);
    assert.equal(a.totals.scope2, "52");
    assert.equal(a.engineVersion, ENGINE_VERSION);
  });

  it("does not invent climate claims in commentary", () => {
    const result = calculateCarbonBalance([
      {
        lineKey: "fuel",
        scope: 1,
        factorId: "f2",
        activityQuantity: "10",
        activityUnit: "L",
        factorValue: "2.3",
        factorUnit: "kgCO2e/L",
      },
    ]);
    const text = JSON.stringify(buildFactualReportCommentary(result));
    assert.equal(text.includes("30-50"), false);
    assert.equal(text.includes("SBTi"), false);
    assert.equal(text.includes("ROI"), false);
    assert.equal(text.includes("±15"), false);
    assert.ok(text.includes(result.totals.total));
  });

  it("excludes biogenic CO2 from scope totals but conserves memo", () => {
    const result = calculateCarbonBalance([
      {
        lineKey: "fossil",
        scope: 1,
        factorId: "f-fossil",
        activityQuantity: "1",
        activityUnit: "TJ",
        factorValue: "74100",
        factorUnit: "kgCO2e/TJ",
      },
      {
        lineKey: "bio",
        scope: 1,
        factorId: "f-bio",
        activityQuantity: "1",
        activityUnit: "TJ",
        factorValue: "112000",
        factorUnit: "kgCO2e/TJ",
        accountingClass: "biogenic_co2",
      },
    ]);
    assert.equal(result.totals.scope1, "74100");
    assert.equal(result.totals.total, "74100");
    assert.equal(result.totals.biogenicCo2, "112000");
    assert.equal(result.lines.find((l) => l.lineKey === "bio")?.accountingClass, "biogenic_co2");
  });

  it("combines uncertainty via RSS", () => {
    assert.equal(combineUncertaintyPct("8", "12"), "14.4222");
  });

  it("rejects invented numbers in AI text", () => {
    const check = assertEveryNumberInTextExistsInStructuredFacts(
      "Total 711.25 kgCO2e, économie 42%",
      ["711.25"],
    );
    assert.equal(check.ok, false);
    assert.ok(check.unknownNumbers.some((n) => n.includes("42")));
  });
});
