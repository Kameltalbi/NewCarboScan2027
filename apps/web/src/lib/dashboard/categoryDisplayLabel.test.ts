import { describe, expect, it } from "vitest";
import { categoryDisplayLabel } from "./categoryDisplayLabel";

describe("categoryDisplayLabel", () => {
  it("humanise les clés composites techniques", () => {
    expect(categoryDisplayLabel("Cat2 Capital Goods:Cat2 Capex General")).toBe(
      "Immobilisations & équipements",
    );
    expect(categoryDisplayLabel("Cat7 Employee Commuting:Cat7 Car Solo")).toMatch(
      /Trajets domicile-travail/i,
    );
    expect(categoryDisplayLabel("Cat1 Purchased Goods:Cat1 Outsourced Services")).toBe(
      "Prestations de services",
    );
  });

  it("ne casse pas les libellés déjà lisibles", () => {
    expect(categoryDisplayLabel("Électricité réseau")).toContain("Électricité");
  });

  it("mappe les clés anglaises fréquentes", () => {
    expect(categoryDisplayLabel("Electricity Grid")).toBe("Électricité réseau");
    expect(categoryDisplayLabel("electricity")).toBe("Électricité réseau");
  });
});
