import { describe, expect, it } from "vitest";
import { isClosedBilanStatus, resultFromFrozenBilan } from "./frozenBilan";

describe("bilan clôturé", () => {
  it("relit le facteur figé quand le catalogue a changé", () => {
    const catalog = { value: 2.04 };
    const row = {
      status: "validated",
      published_snapshot: {
        frozenAt: "2026-09-29T15:00:00.000Z",
        lines: [
          {
            lineKey: "gaz",
            name: "Gaz naturel",
            category: "scope1",
            scope: 1,
            quantity: 1000,
            activityUnit: "m³",
            factorValue: catalog.value,
            factorUnit: "kgCO2e/m³",
            factorSource: "catalogue",
            factorName: "Gaz naturel",
            resultKgCo2e: 1000 * catalog.value,
          },
        ],
      },
    };
    catalog.value = 9;
    const result = resultFromFrozenBilan(row, "2026-01-01", "2026-12-31");
    expect(result?.frozen).toBe(true);
    expect(result?.totalEmissions).toBe(2040);
    expect(result?.detailedBreakdown[0].emissionFactor).toBe(2.04);
    expect(result?.detailedBreakdown[0].emissionFactorSource).toBe("catalogue");
  });

  it("laisse un brouillon hors du gel", () => {
    expect(isClosedBilanStatus("draft")).toBe(false);
    expect(resultFromFrozenBilan({ status: "draft", total_emission: 10 }, "2026-01-01", "2026-12-31")).toBeNull();
  });
});
