import { describe, expect, it } from "vitest";
import {
  categorySecondary,
  categorySuggestions,
  collectCatalog,
  enableCategory,
  rememberCategory,
  sanitizeCollectCategoryIds,
} from "./collectCategories";

describe("catégories de collecte", () => {
  const catalog = collectCatalog();

  it("reprend les postes des scopes 1 et 2 et les 15 catégories du scope 3", () => {
    expect(catalog.filter((item) => item.scope === 1).map((item) => item.id)).toEqual([
      "poste-1-1", "poste-1-2", "poste-1-3", "poste-1-4", "poste-1-5",
    ]);
    expect(catalog.filter((item) => item.scope === 2).map((item) => item.id)).toEqual([
      "poste-2-1", "poste-2-2",
    ]);
    const scope3 = catalog.filter((item) => item.scope === 3);
    expect(scope3).toHaveLength(15);
    expect(scope3.map((item) => item.officialNumber)).toEqual([
      "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15",
    ]);
    expect(catalog.some((item) => item.id === "fuel_diesel" || item.id === "electricity_grid")).toBe(false);
    expect(categorySecondary(scope3[3])).toBe("Scope 3 · n° 4");
    expect(categorySecondary(catalog[0])).toBe("Scope 1");
  });

  it("retrouve une catégorie par un exemple et signale qu’elle est masquée", () => {
    const { visible, hidden } = categorySuggestions(catalog, ["poste-2-1"], "diesel");
    expect(visible).toHaveLength(0);
    expect(hidden.map((item) => item.id)).toContain("poste-1-2");
    expect(hidden.find((item) => item.id === "poste-1-2")?.scope).toBe(1);
  });

  it("ne propose pas les catégories masquées tant que la recherche est vide", () => {
    const { visible, hidden } = categorySuggestions(catalog, ["poste-2-1"], "");
    expect(visible.map((item) => item.id)).toEqual(["poste-2-1"]);
    expect(hidden).toHaveLength(0);
  });

  it("active une catégorie sans toucher aux données déjà saisies", () => {
    const entry = { quantity: "1200", designation: "Acier janvier", unit: "kg" };
    const next = enableCategory(["poste-2-1"], "cat1_purchased_goods");
    expect(next).toEqual(["poste-2-1", "cat1_purchased_goods"]);
    expect(sanitizeCollectCategoryIds(["fuel_diesel", "poste-2-1", "poste-2-1"])).toEqual(["poste-2-1"]);
    expect(entry).toEqual({ quantity: "1200", designation: "Acier janvier", unit: "kg" });
    const purchase = catalog.find((item) => item.id === "cat1_purchased_goods");
    expect(purchase?.choices.some((choice) => choice.label === "Matières premières")).toBe(true);
    expect(purchase?.scope).toBe(3);
  });

  it("conserve le scope de la catégorie, indépendamment d’un facteur", () => {
    const electricity = catalog.find((item) => item.id === "poste-2-1");
    const factorFromAnotherBase = { name: "Acier", unit: "kgCO2e/kg", value: 2 };
    expect(electricity?.scope).toBe(2);
    expect(electricity?.choices[0]?.scope).toBe(2);
    expect(factorFromAnotherBase.value).toBe(2);
    expect(rememberCategory(["poste-1-2", "poste-2-1", "cat5_waste", "cat6_business_travel"], "cat1_purchased_goods"))
      .toEqual(["cat1_purchased_goods", "poste-1-2", "poste-2-1", "cat5_waste"]);
  });
});
