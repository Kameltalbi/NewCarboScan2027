import { describe, expect, it } from "vitest";
import { ATLAS_COUNTERPARTIES } from "../pcaf/atlasDemoPortfolio";
import { calculateBusinessLoan } from "../pcaf/businessLoans";
import {
  contributionFromBusinessLoan,
  isScope3Category15,
  stripCategory15,
  summarizeFinancedPortfolio,
} from "./institutionFootprint";

describe("empreinte institution — hors catégorie 15", () => {
  it("retire la catégorie 15 des totaux et des postes", () => {
    const view = stripCategory15({
      totalEmissions: 1500,
      scope1: 400,
      scope2: 300,
      scope3: 800,
      breakdown: [],
      detailedBreakdown: [
        { category: "Énergie", subcategory: "électricité", emissions: 400, scope: 1 },
        { category: "Énergie", subcategory: "électricité réseau", emissions: 300, scope: 2 },
        { category: "Déchets", subcategory: "cat5_waste", emissions: 200, scope: 3 },
        { category: "Investissements", subcategory: "cat15_equity", emissions: 600, scope: 3 },
      ],
    });
    expect(view.separated).toBe(true);
    expect(view.excludedCategory15Kg).toBe(600);
    expect(view.scope1).toBe(400);
    expect(view.scope2).toBe(300);
    expect(view.scope3).toBe(200);
    expect(view.totalEmissions).toBe(900);
    expect(view.breakdown.map((row) => row.category)).not.toContain("cat15_equity");
    expect(view.totalEmissions + view.excludedCategory15Kg).toBe(1500);
  });

  it("ne soustrait rien quand le bilan n'a pas de lignes", () => {
    const view = stripCategory15({
      totalEmissions: 1000,
      scope1: 1000,
      scope2: 0,
      scope3: 0,
      breakdown: [{ category: "Scope 1", emissions: 1000, percentage: 100 }],
      detailedBreakdown: [],
    });
    expect(view.separated).toBe(false);
    expect(view.totalEmissions).toBe(1000);
  });

  it("reconnaît la catégorie 15 sans prendre la catégorie 1", () => {
    expect(isScope3Category15("scope3", "cat15_debt")).toBe(true);
    expect(isScope3Category15("Catégorie 15", "financements")).toBe(true);
    expect(isScope3Category15("Achats", "cat1_purchased_goods")).toBe(false);
  });
});

describe("portefeuille financier — agrégat des moteurs", () => {
  it("recalcule Banque Atlas depuis les entrées, sans résultat figé", () => {
    const summary = summarizeFinancedPortfolio(
      ATLAS_COUNTERPARTIES.map((row) => contributionFromBusinessLoan(calculateBusinessLoan(row.input))),
      2025,
    );
    expect(summary.currency).toBe("TND");
    expect(summary.mixedCurrencies).toBe(false);
    expect(summary.exposure).toBe(325_300_000);
    expect(summary.scope12Tco2e).toBeCloseTo(129_138, 0);
    expect(summary.scope3Tco2e).toBeCloseTo(46_295, 0);
    expect(summary.scope12Score).toBeCloseTo(2.63, 2);
    expect(summary.scope3Score).toBeCloseTo(3.02, 2);
    expect(summary.implementedLines).toBe(12);
    expect(summary.scope12Lines).toBe(12);
    expect(summary.scope3Lines).toBe(11);
    expect(summary.scope12Tco2e + summary.scope3Tco2e).not.toBe(summary.scope12Tco2e);
  });

  it("ignore une classe non implémentée", () => {
    const summary = summarizeFinancedPortfolio(
      [
        {
          assetClass: "commercial_real_estate",
          implemented: false,
          currency: "TND",
          reportingYear: 2025,
          exposure: 1_000_000,
          scope12Tco2e: 999,
          scope3Tco2e: 999,
          scope12Score: 1,
          scope3Score: 1,
        },
      ],
      2025,
    );
    expect(summary.notImplementedLines).toBe(1);
    expect(summary.scope12Tco2e).toBe(0);
    expect(summary.scope3Tco2e).toBe(0);
    expect(summary.exposure).toBe(0);
  });
});
