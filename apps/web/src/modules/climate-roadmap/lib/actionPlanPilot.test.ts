import { describe, expect, it } from "vitest";
import {
  computeObjectiveCoverage,
  formatReductionT,
  isQuantifiedReduction,
  toPilotStatus,
} from "./actionPlanPilot";

describe("actionPlanPilot", () => {
  it("mappe les statuts DB vers le libellé pilotage", () => {
    expect(toPilotStatus("to_launch")).toBe("studying");
    expect(toPilotStatus("validated")).toBe("validated");
    expect(toPilotStatus("in_progress")).toBe("in_progress");
    expect(toPilotStatus("completed")).toBe("completed");
  });

  it("n'invente pas de réduction", () => {
    expect(formatReductionT(null)).toBe("À évaluer");
    expect(formatReductionT(0)).toBe("À évaluer");
    expect(formatReductionT(12.5)).toMatch(/12,5/);
    expect(isQuantifiedReduction(0)).toBe(false);
    expect(isQuantifiedReduction(5)).toBe(true);
  });

  it("calcule la couverture uniquement si quantifiée", () => {
    expect(
      computeObjectiveCoverage({
        baselineT: 4460.4,
        targetT: 3122.28,
        plannedReductionT: 0,
        quantifiedActionCount: 0,
      }),
    ).toBeNull();

    const c = computeObjectiveCoverage({
      baselineT: 1000,
      targetT: 700,
      plannedReductionT: 150,
      quantifiedActionCount: 2,
    });
    expect(c?.neededT).toBe(300);
    expect(c?.percent).toBe(50);
  });
});
