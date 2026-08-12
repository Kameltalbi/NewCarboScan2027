/**
 * Cas de référence 002 — électricité location-based.
 * Manuel : 12 500 kWh × 0,0569 kgCO2e/kWh = 711,25 kgCO2e
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateEmission } from "../index.js";

export const CASE_002 = {
  id: "002-electricite-location-based",
  validatedBy: ["engineering", "pending-methodology-owner"],
  activity: { value: "12500", unit: "kWh" },
  factor: {
    value: "0.0569",
    unit: "kgCO2e/kWh",
    versionId: "ef-electricity-tn-2025-v2",
  },
  methodologyVersion: "ghg-corporate-1.0.0",
  expectedKgCO2e: "711.25",
  tolerance: "0",
} as const;

describe("reference case 002 — électricité location-based", () => {
  it("matches manual calculation", () => {
    const r = calculateEmission({
      activity: { ...CASE_002.activity },
      factor: { ...CASE_002.factor },
      methodologyVersion: CASE_002.methodologyVersion,
    });
    assert.equal(r.emissionsKgCO2e, CASE_002.expectedKgCO2e);
  });
});
