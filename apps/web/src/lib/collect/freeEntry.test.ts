import { describe, expect, it } from "vitest";
import { buildFreeEntry, isDocumentedFactor } from "./freeEntry";
import type { AdemeFactorRef } from "@/lib/factors/ademeFactor";

const steel: AdemeFactorRef = {
  id: "demo-steel",
  name: "Acier",
  value: 2,
  unit: "kgCO2e/kg",
  sourceKey: "ademe",
  sourceName: "Base ADEME",
  datasetVersion: null,
  countryCode: "FR",
  region: null,
  factorYear: 2024,
  stableFactorId: null,
  replacementReason: null,
};

const base = {
  organizationId: "org",
  siteId: "site",
  designation: "Tôle d’acier",
  quantity: 1000,
  unit: "kg",
  periodStart: "2025-01-01",
  periodEnd: "2025-12-31",
  notes: "",
};

describe("saisie libre", () => {
  it("garde la désignation et le facteur sans calculer tant que le classement est indéterminé", () => {
    const entry = buildFreeEntry({ ...base, classification: "unknown", factor: steel });
    expect(entry.counted).toBe(false);
    expect(entry.resultLabel).toBe("Émissions non calculées");
    expect(entry.payload.notes).toMatch(/^A_COMPLETER:/);
    expect(entry.payload.notes).toContain("DESIGNATION: Tôle d’acier");
    expect(entry.payload.notes).toContain("CLASSEMENT: indéterminé");
    expect(entry.payload.notes).toContain("FACTEUR_RETENU:");
    expect(entry.payload.notes).not.toContain("FE_SNAPSHOT:");
    expect(entry.payload.scope).toBeNull();
    expect(entry.payload.scope_hint).toBeNull();
    expect(entry.payload.category).toBeNull();
    expect("factor_id" in entry.payload).toBe(false);
  });

  it("calcule seulement avec un classement déterminé et un facteur compatible", () => {
    const entry = buildFreeEntry({ ...base, quantity: 100, classification: "purchase", factor: steel });
    expect(entry.counted).toBe(true);
    expect(entry.resultLabel).toBe("200 kg CO₂e");
    expect(entry.payload.notes).toContain("FE_SNAPSHOT:");
    expect(entry.payload.notes).toContain("DESIGNATION: Tôle d’acier");
    expect(entry.payload.notes).toContain("CLASSEMENT: Scope 3 — achat");
    expect(entry.payload.notes).not.toContain("A_COMPLETER:");
    expect(entry.payload.scope).toBe(3);
    expect(entry.payload.subcategory).toBe("libre_achat");
    expect("factor_id" in entry.payload).toBe(false);
  });

  it("n’assimile pas un facteur absent ou une unité incompatible à zéro", () => {
    const missing = buildFreeEntry({ ...base, classification: "direct", factor: null });
    expect(missing.resultLabel).toBe("Émissions non calculées");
    expect(missing.payload.notes).toMatch(/^A_COMPLETER:/);
    expect(missing.payload.notes).not.toContain("FE_SNAPSHOT:");
    const blocked = buildFreeEntry({ ...base, classification: "direct", unit: "kWh", factor: steel });
    expect(blocked.counted).toBe(false);
    expect(blocked.resultLabel).toBe("Émissions non calculées");
    expect(blocked.payload.notes).toContain("FACTEUR_RETENU:");
    expect(blocked.payload.quantity).toBe(1000);
  });

  it("exige une source pour un facteur personnalisé", () => {
    expect(isDocumentedFactor({ ...steel, sourceKey: "manual", sourceName: "Fiche fournisseur 2024" })).toBe(true);
    expect(isDocumentedFactor({ ...steel, sourceKey: "manual", sourceName: "  " })).toBe(false);
  });
});
