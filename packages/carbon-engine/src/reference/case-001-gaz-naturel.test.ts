/**
 * Cas de référence 001 — gaz naturel (location-based simplifié).
 * Entrées figées ; calcul manuel documenté ; tolérance 0.
 *
 * Manuel :
 *   1 200 m³ × 2,05 kgCO2e/m³ = 2 460 kgCO2e
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateEmission } from "../index.js";

export const CASE_001 = {
  id: "001-gaz-naturel",
  validatedBy: ["engineering", "pending-methodology-owner"],
  activity: { value: "1200", unit: "m3" },
  factor: {
    value: "2.05",
    unit: "kgCO2e/m3",
    versionId: "ef-gas-tn-ref-v1",
  },
  methodologyVersion: "ghg-corporate-1.0.0",
  expectedKgCO2e: "2460",
  tolerance: "0",
} as const;

describe("reference case 001 — gaz naturel", () => {
  it("matches manual calculation", () => {
    const r = calculateEmission({
      activity: { ...CASE_001.activity },
      factor: { ...CASE_001.factor },
      methodologyVersion: CASE_001.methodologyVersion,
    });
    assert.equal(r.emissionsKgCO2e, CASE_001.expectedKgCO2e);
  });
});
