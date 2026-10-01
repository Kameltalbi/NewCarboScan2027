import { describe, expect, it } from "vitest";
import {
  alignmentLabel,
  buildCompanyTargetSeries,
  computeAlignment,
  mergeTransitionSeries,
  resolveTargetEmissions,
} from "./trajectoryComparison";
import type { ClimateObjective } from "../types";

const baseObjective = (over: Partial<ClimateObjective> = {}): ClimateObjective => ({
  id: "o1",
  organization_id: "org",
  name: "−30 % 2030",
  objective_type: "absolute_reduction",
  origin: "internal",
  validation_status: "company_objective",
  is_primary: true,
  perimeter: "organization",
  scopes: [1, 2],
  category_key: null,
  site_id: null,
  baseline_year: 2025,
  baseline_value: 7864,
  baseline_unit: "tCO2e",
  target_year: 2030,
  target_value: null,
  reduction_percent: 30,
  unit: "tCO2e",
  framework_version_id: null,
  validation_body: null,
  validation_date: null,
  validation_reference: null,
  owner_name: null,
  notes: null,
  status: "active",
  parameters: {},
  created_at: "",
  updated_at: "",
  ...over,
});

describe("trajectoryComparison", () => {
  it("calcule la cible depuis le % de réduction", () => {
    expect(resolveTargetEmissions(baseObjective())).toBeCloseTo(7864 * 0.7, 5);
  });

  it("construit une série linéaire sans inventer d'années hors plage", () => {
    const series = buildCompanyTargetSeries(baseObjective());
    expect(series[0]?.year).toBe(2025);
    expect(series[series.length - 1]?.year).toBe(2030);
    expect(series).toHaveLength(6);
  });

  it("ne marque pas d'écart sans données réelles", () => {
    expect(computeAlignment([], baseObjective()).status).toBe("unknown");
  });

  it("détecte un écart au-dessus de la trajectoire", () => {
    const series = buildCompanyTargetSeries(baseObjective());
    const target2026 = series.find((p) => p.year === 2026)!.value;
    const result = computeAlignment(
      [{ year: 2026, emissionsT: target2026 + 500 }],
      baseObjective(),
    );
    expect(result.status).toBe("above");
    expect(alignmentLabel(result.status)).toMatch(/Écart à réduire/i);
  });

  it("n'émet pas de courbe 1,5 °C si reference15Enabled=false", () => {
    const points = mergeTransitionSeries({
      actuals: [{ year: 2025, emissionsT: 7864 }],
      companyObjective: baseObjective(),
      scenarioByYear: [],
      reference15Enabled: false,
      reference15ByYear: [{ year: 2030, emissionsT: 1000 }],
    });
    expect(points.every((p) => p.reference15 === null)).toBe(true);
    expect(points.some((p) => p.actual === 7864)).toBe(true);
  });
});
