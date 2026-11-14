import { describe, expect, it } from "vitest";
import { tunisiaGridFactor } from "@/lib/factors/ademeFactor";
import { resolveRecordedFactor } from "@/lib/factors/factorSelection";
import { ACTIVITY_GROUPS } from "@/modules/collect/activityGroups";
import { formatEmissionAmount, previewLine, proposeTunisiaElectricity } from "./linePreview";

describe("aperçu de saisie", () => {
  it("affiche 23 208 kWh × 0,53 = 12,3 t sans arrondir à zéro", () => {
    const factor = tunisiaGridFactor();
    const preview = previewLine({
      quantity: 23208,
      unit: "kWh",
      factor: {
        id: factor.id,
        name: factor.name,
        value: factor.value,
        unit: factor.unit,
        sourceName: factor.sourceName ?? null,
        factorYear: factor.factorYear ?? null,
        countryCode: factor.countryCode ?? null,
        stableFactorId: factor.stableFactorId ?? null,
      },
    });
    expect(preview.kg).toBeCloseTo(12300.24, 2);
    expect(preview.resultLabel).toBe("12,3 t CO₂e");
    expect(preview.formula).toContain("23");
    expect(preview.formula).toContain("0,53");
    expect(preview.provisional).toBe(true);
    expect(preview.warning).toMatch(/Source, année et périmètre/);
    expect(formatEmissionAmount(530)).toBe("530 kg CO₂e");
  });

  it("n’invente pas un facteur et bloque une unité incompatible", () => {
    expect(previewLine({ quantity: 10, unit: "kWh", factor: null }).status).toBe("incomplete");
    expect(previewLine({ quantity: 10, unit: "kWh", factor: null }).kg).toBeNull();
    const blocked = previewLine({
      quantity: 10,
      unit: "kg",
      factor: {
        id: "x",
        name: "Électricité",
        value: 0.53,
        unit: "kgCO2e/kWh",
        sourceName: "ADEME",
        factorYear: 2024,
        countryCode: "FR",
        stableFactorId: null,
      },
    });
    expect(blocked.status).toBe("incompatible");
    expect(blocked.kg).toBeNull();
  });

  it("laisse une ligne à compléter hors du calcul, y compris l’électricité tunisienne", () => {
    const marked = resolveRecordedFactor({
      subcategory: "electricity_grid",
      quantity: 23208,
      unit: "kWh",
      siteCountry: "Tunisie",
      notes: "A_COMPLETER:\nconsommation",
    });
    expect(marked.kind).toBe("incomplete");
    const fuel = resolveRecordedFactor({
      subcategory: "fuel_diesel",
      quantity: 100,
      unit: "L",
      notes: "A_COMPLETER:",
    });
    expect(fuel.kind).toBe("incomplete");
  });

  it("garde l’accès aux catégories avancées", () => {
    const labels = ACTIVITY_GROUPS.flatMap((group) => group.choices.map((choice) => choice.label));
    expect(labels).toEqual(expect.arrayContaining([
      "Électricité réseau (standard)",
      "Diesel (véhicules)",
      "Viande rouge (bœuf, agneau)",
      "Chaleur réseau (chauffage urbain)",
      "Vapeur achetée",
      "Froid réseau (climatisation urbaine)",
      "Procédé",
    ]));
    expect(ACTIVITY_GROUPS.find((group) => group.id === "combustion")?.choices.some((choice) => choice.label.includes("Bois"))).toBe(true);
    expect(ACTIVITY_GROUPS.find((group) => group.id === "other")?.choices.some((choice) => choice.label.includes("R410"))).toBe(true);
  });

  it("propose le facteur tunisien seulement pour l’électricité du pays du compte", () => {
    expect(proposeTunisiaElectricity("Tunisie", "electricity_grid")).toBe(true);
    expect(proposeTunisiaElectricity("France", "electricity_grid")).toBe(false);
    expect(proposeTunisiaElectricity("Tunisie", "fuel_diesel")).toBe(false);
  });
});
