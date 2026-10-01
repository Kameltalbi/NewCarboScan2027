import { describe, expect, it } from "vitest";
import { carbonIntensities, resolveDenominators } from "./carbonIntensity";

describe("carbonIntensities", () => {
  it("donne 10 t par salarié pour 100 t et 10 salariés", () => {
    const [employee] = carbonIntensities({ totalTonnes: 100, employees: 10 });
    expect(employee).toMatchObject({ id: "employee", value: 10, unit: "tCO₂e / salarié" });
  });

  it("n'affiche rien quand l'effectif est vide ou nul", () => {
    expect(carbonIntensities({ totalTonnes: 100, employees: 0 })).toEqual([]);
    expect(carbonIntensities({ totalTonnes: 100, employees: null })).toEqual([]);
  });

  it("n'invente pas une unité produite absente", () => {
    const indicators = carbonIntensities({
      totalTonnes: 100,
      employees: 10,
      productionLabel: "tonne produite",
      productionQuantity: null,
    });
    expect(indicators.map((item) => item.id)).toEqual(["employee"]);
  });

  it("exprime le chiffre d'affaires par million dans la devise saisie", () => {
    const revenue = carbonIntensities({
      totalTonnes: 100,
      revenue: 2_000_000,
      currency: "TND",
    }).find((item) => item.id === "revenue");
    expect(revenue).toMatchObject({ value: 50, unit: "tCO₂e / M TND" });
  });

  it("ajoute l'unité produite sans changer le total utilisé", () => {
    const indicators = carbonIntensities({
      totalTonnes: 100,
      productionLabel: "pièce",
      productionQuantity: 25,
    });
    expect(indicators).toEqual([
      { id: "production", label: "pièce", value: 4, unit: "tCO₂e / pièce" },
    ]);
  });
});

describe("resolveDenominators", () => {
  it("reprend la somme des sites quand l'organisation n'a pas de dénominateur", () => {
    expect(resolveDenominators(
      { employees: null, surfaceM2: null, revenue: null },
      [
        { employees: 4, surfaceM2: 100, revenue: 0 },
        { employees: 6, surfaceM2: 50, revenue: null },
      ],
    )).toEqual({ employees: 10, surfaceM2: 150, revenue: null });
  });

  it("garde le chiffre d'organisation sans l'ajouter à celui des sites", () => {
    expect(resolveDenominators(
      { employees: 10, surfaceM2: null, revenue: 1_000_000 },
      [{ employees: 4, surfaceM2: 20, revenue: 500_000 }],
    )).toEqual({ employees: 10, surfaceM2: 20, revenue: 1_000_000 });
  });
});
