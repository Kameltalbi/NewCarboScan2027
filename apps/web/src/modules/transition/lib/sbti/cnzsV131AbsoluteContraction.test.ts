import { describe, expect, it } from "vitest";
import {
  computeCnzsV131CombinedScope12AbsoluteContraction,
  emissionsAtYear,
  table1DlarrPercent,
} from "./cnzsV131AbsoluteContraction";

/**
 * Tests de reproduction Table 1 — CNZS v1.3.1 Method Appendix.
 * Si ces tests échouent, le moteur ne doit PAS être utilisé en production.
 */
describe("CNZS v1.3.1 ACA — Table 1 (BY 2025)", () => {
  it("Test 1 — 100 % Scope 1 → 4,2 % après plancher", () => {
    const pct = table1DlarrPercent(1, 2025);
    expect(pct).toBeCloseTo(4.2, 2);
  });

  it("Test 2 — 50 % S1 / 50 % S2 → environ 5,13 %", () => {
    const pct = table1DlarrPercent(0.5, 2025);
    expect(pct).toBeCloseTo(5.13, 2);
  });

  it("Test 3 — 100 % Scope 2 → environ 6,67 %", () => {
    const pct = table1DlarrPercent(0, 2025);
    expect(pct).toBeCloseTo(6.67, 2);
  });
});

describe("CNZS v1.3.1 ACA — contrôle numérique (valeurs Atlas de test)", () => {
  const atlas = computeCnzsV131CombinedScope12AbsoluteContraction({
    baselineYear: 2025,
    targetYear: 2030,
    scope1EmissionsT: 912.6,
    scope2EmissionsT: 3547.8,
  });

  it("Test 4 — dLARR ≈ 6,04 %/an", () => {
    expect(atlas.baselineEmissionsT).toBeCloseTo(4460.4, 5);
    expect(atlas.dlarrPercent).toBeCloseTo(6.04, 1);
  });

  it("Test 5 — Equation 8 + points 2025→2030", () => {
    expect(atlas.reductionPercent).toBeCloseTo(30.2, 1);
    expect(atlas.annualPoints).toHaveLength(6);
    expect(atlas.annualPoints[0]).toEqual({ year: 2025, emissionsT: expect.any(Number) });
    expect(atlas.annualPoints[0]!.emissionsT).toBeCloseTo(4460.4, 5);

    for (const p of atlas.annualPoints) {
      const expected = emissionsAtYear(4460.4, 2025, p.year, atlas.dlarr);
      expect(p.emissionsT).toBeCloseTo(expected, 8);
    }

    const y2030 = atlas.annualPoints.find((p) => p.year === 2030)!;
    expect(y2030.emissionsT).toBeCloseTo(atlas.targetEmissionsT, 8);
    expect(atlas.targetEmissionsT).toBeCloseTo(4460.4 * (1 - atlas.dlarr * 5), 8);
  });

  it("documente le statut de pondération comme inféré", () => {
    expect(atlas.weightingStatus).toBe("inferred_from_table1_and_table2");
  });
});
