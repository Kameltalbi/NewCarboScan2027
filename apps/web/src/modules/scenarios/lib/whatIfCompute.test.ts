import { describe, expect, it } from "vitest";
import {
  computeWhatIfImpact,
  isHypothesisComplete,
  requestedReductionTco2e,
  type WhatIfHypothesis,
} from "./whatIfCompute";

function base(partial: Partial<WhatIfHypothesis> & Pick<WhatIfHypothesis, "id" | "kind" | "categoryKey">): WhatIfHypothesis {
  return {
    categoryLabel: partial.categoryLabel ?? partial.categoryKey,
    baselineCategoryTco2e: partial.baselineCategoryTco2e ?? 100,
    enabled: partial.enabled ?? true,
    ...partial,
  } as WhatIfHypothesis;
}

describe("whatIfCompute", () => {
  it("réduit une consommation de 20 % sur un poste", () => {
    const h = base({
      id: "1",
      kind: "consumption_reduction",
      categoryKey: "diesel",
      baselineCategoryTco2e: 500,
      reductionPercent: 20,
    });
    expect(requestedReductionTco2e(h)).toBe(100);
    const impact = computeWhatIfImpact(2000, [h]);
    expect(impact.reductionTco2e).toBe(100);
    expect(impact.simulatedTco2e).toBe(1900);
    expect(impact.reductionPercent).toBeCloseTo(5, 5);
  });

  it("combine plusieurs leviers sans double comptage sur le même poste", () => {
    const a = base({
      id: "a",
      kind: "consumption_reduction",
      categoryKey: "elec",
      baselineCategoryTco2e: 1000,
      reductionPercent: 20,
    });
    const b = base({
      id: "b",
      kind: "consumption_reduction",
      categoryKey: "elec",
      baselineCategoryTco2e: 1000,
      reductionPercent: 50,
    });
    const impact = computeWhatIfImpact(5000, [a, b]);
    // 200 + 500 = 700, plafonné à 1000
    expect(impact.reductionTco2e).toBe(700);
    expect(impact.simulatedTco2e).toBe(4300);
  });

  it("exige une hypothèse explicite pour un changement fournisseur", () => {
    const incomplete = base({
      id: "s",
      kind: "supplier_change",
      categoryKey: "purchases",
      baselineCategoryTco2e: 800,
    });
    expect(isHypothesisComplete(incomplete)).toBe(false);
    const complete = base({
      id: "s2",
      kind: "supplier_change",
      categoryKey: "purchases",
      baselineCategoryTco2e: 800,
      simulatedCategoryTco2e: 600,
      hypothesisNote: "FE Europe vs Asie — hypothèse utilisateur",
    });
    expect(isHypothesisComplete(complete)).toBe(true);
    const impact = computeWhatIfImpact(3000, [complete]);
    expect(impact.reductionTco2e).toBe(200);
    expect(impact.levers[0].isHypothesis).toBe(true);
  });

  it("ne calcule le financier que si les prix sont renseignés", () => {
    const without = base({
      id: "1",
      kind: "consumption_reduction",
      categoryKey: "diesel",
      baselineCategoryTco2e: 100,
      reductionPercent: 10,
    });
    expect(computeWhatIfImpact(1000, [without]).financial).toBeNull();

    const withFin = base({
      id: "2",
      kind: "consumption_reduction",
      categoryKey: "diesel",
      baselineCategoryTco2e: 100,
      reductionPercent: 10,
      unitPriceCurrent: 2,
      unitPriceSimulated: 2,
      quantity: 1000,
      investment: 5000,
    });
    const fin = computeWhatIfImpact(1000, [withFin]).financial!;
    expect(fin.costCurrent).toBe(2000);
    expect(fin.costSimulated).toBe(2000);
    expect(fin.investment).toBe(5000);
    expect(fin.totalDelta).toBe(5000);
  });
});
