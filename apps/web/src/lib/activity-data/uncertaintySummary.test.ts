import { describe, expect, it } from "vitest";
import { keepCollectionQuality, summarizeUncertainty } from "./uncertaintySummary";

describe("incertitude du bilan", () => {
  it("laisse une ligne real en real", () => {
    expect(keepCollectionQuality("real")).toBe("real");
    expect(keepCollectionQuality("estimated")).toBe("estimated");
    expect(keepCollectionQuality("default")).toBe("default");
  });

  it("combine deux lignes comme le moteur", () => {
    const summary = summarizeUncertainty([
      { label: "Gaz", kg: 1000, quality: "real", uncertaintyPct: 8 },
      { label: "Électricité", kg: 500, quality: "estimated", uncertaintyPct: 12 },
    ]);
    expect(summary.status).toBe("combined");
    expect(summary.combinedPct).toBe("14.4222");
    expect(summary.quality.real).toBe(1);
  });

  it("reste vide si aucune incertitude n'est saisie", () => {
    const summary = summarizeUncertainty([
      { label: "Gaz", kg: 2040, quality: "real", uncertaintyPct: null },
    ]);
    expect(summary.status).toBe("empty");
    expect(summary.combinedPct).toBeNull();
    expect(summary.totalLabel).toBe("Aucune incertitude saisie");
    expect(summary.contributors).toEqual([]);
  });

  it("n'invente pas de total si une ligne n'a pas de taux", () => {
    const summary = summarizeUncertainty([
      { label: "Gaz", kg: 1000, quality: "real", uncertaintyPct: 8 },
      { label: "Diesel", kg: 400, quality: "default", uncertaintyPct: null },
    ]);
    expect(summary.status).toBe("partial");
    expect(summary.totalLabel).toBe("non renseigné");
    expect(summary.combinedPct).toBeNull();
    expect(summary.contributors).toEqual([
      { label: "Gaz", uncertaintyPct: 8, kg: 1000 },
    ]);
  });
});
