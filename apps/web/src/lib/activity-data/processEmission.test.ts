import { describe, expect, it } from "vitest";
import { BilanCarboneCalculator } from "../calculators/BilanCarboneCalculator";
import {
  encodeProcessNotes,
  matchProcessEmission,
  validateProcessEmission,
  type ProcessEmissionDraft,
} from "./processEmission";

const Calculator = BilanCarboneCalculator as unknown as {
  getDefaultFactor: (subcategory: string, activityType: string) => number;
};

function draft(overrides: Partial<ProcessEmissionDraft> = {}): ProcessEmissionDraft {
  return {
    processName: "Four de calcination",
    ghg: "CO2",
    description: "Ligne de cuisson",
    comment: "Campagne 2026",
    justification: "Note de calcul interne",
    mode: "activity_factor",
    activityQuantity: "10",
    activityUnit: "t",
    factorValue: "2.5",
    factorScale: "kg",
    factorSource: "Mesure site 2026",
    directValue: "",
    directScale: "kg",
    uncertaintyPct: "15",
    ...overrides,
  };
}

describe("procédé Scope 1", () => {
  it("calcule donnée × facteur en kgCO2e", () => {
    const result = validateProcessEmission(draft());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kgCO2e).toBe(25);
    expect(result.quantity).toBe(10);
    expect(result.unit).toBe("t");
    const matched = matchProcessEmission({
      subcategory: result.subcategory,
      notes: result.notes,
    });
    expect(matched).toMatchObject({ kind: "ok", kgCO2e: 25, factor: 2.5 });
  });

  it("convertit un facteur saisi en tCO2e", () => {
    const result = validateProcessEmission(draft({ factorValue: "1.5", factorScale: "t" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kgCO2e).toBe(15000);
  });

  it("reprend une émission déjà connue en kgCO2e", () => {
    const result = validateProcessEmission(
      draft({ mode: "direct_emission", directValue: "1500", directScale: "kg" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kgCO2e).toBe(1500);
    expect(result.unit).toBe("kgCO2e");
    const matched = matchProcessEmission({
      subcategory: result.subcategory,
      notes: result.notes,
    });
    expect(matched).toMatchObject({ kind: "ok", kgCO2e: 1500, factor: 1 });
  });

  it("convertit une émission déjà connue saisie en tCO2e", () => {
    const result = validateProcessEmission(
      draft({ mode: "direct_emission", directValue: "1,5", directScale: "t" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kgCO2e).toBe(1500);
  });

  it("refuse un procédé sans facteur", () => {
    const result = validateProcessEmission(draft({ factorValue: "" }));
    expect(result.ok).toBe(false);
  });

  it("refuse un procédé sans émission déjà connue", () => {
    const result = validateProcessEmission(
      draft({ mode: "direct_emission", directValue: "0" }),
    );
    expect(result.ok).toBe(false);
  });

  it("ne recalcule pas une fiche procédé illisible avec un facteur générique", () => {
    const matched = matchProcessEmission({
      subcategory: "process_other:Four",
      notes: "texte libre",
    });
    expect(matched.kind).toBe("missing");
  });

  it("laisse les familles Scope 1 existantes hors de ce mode", () => {
    expect(matchProcessEmission({ subcategory: "fossil_gas", notes: "" }).kind).toBe("skip");
    expect(matchProcessEmission({ subcategory: "fuel_diesel", notes: "" }).kind).toBe("skip");
    expect(matchProcessEmission({ subcategory: "fugitive_r410a", notes: "" }).kind).toBe("skip");
  });

  it("relit la charge utile après encodage", () => {
    const result = validateProcessEmission(draft());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const again = matchProcessEmission({
      subcategory: result.subcategory,
      notes: encodeProcessNotes(result.record),
    });
    expect(again.kind).toBe("ok");
  });
});

describe("régression des facteurs Scope 1 déjà en place", () => {
  it("conserve le gaz fixe, le diesel mobile et le R410A", () => {
    expect(Calculator.getDefaultFactor("fossil_gas", "energy")).toBe(2.04);
    expect(Calculator.getDefaultFactor("fuel_diesel", "energy")).toBe(2.68);
    expect(Calculator.getDefaultFactor("fugitive_r410a", "energy")).toBe(2088);
  });
});
