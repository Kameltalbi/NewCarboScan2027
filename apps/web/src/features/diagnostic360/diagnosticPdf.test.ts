import { describe, expect, it } from "vitest";
import { createDiagnosticPdf, PDF_FOOTER, PDF_NOT_AN_INVENTORY, PDF_UNQUANTIFIED } from "./diagnosticPdf";
import type { PublicSnapshot } from "./types";

const snapshot: PublicSnapshot = {
  templateVersion: "diag-360-2026.1",
  maturityScore: 18,
  maturityLevel: "initial",
  presentation: {
    scoreQualifierFr: "Maturité estimée",
    scoreQualifierEn: "Estimated maturity",
    level: "initial",
    levelLabelFr: "Initial",
    levelLabelEn: "Initial",
    reliabilityWarningFr: "Fiabilité limitée : trop de réponses « Je ne sais pas » ou trop peu de données. Ce niveau accompagne une maturité estimée.",
    reliabilityWarningEn: "Limited reliability.",
    displayLevelFr: "Initial — Fiabilité limitée",
    displayLevelEn: "Initial — Limited reliability",
  },
  dataReadinessScore: 28,
  reliability: "low",
  reliabilityLimited: true,
  axisScores: [
    { axisId: "measure", maturity: 10 },
    { axisId: "energy", maturity: 20 },
    { axisId: "mobility", maturity: null },
    { axisId: "purchases", maturity: 0 },
    { axisId: "steering", maturity: 15 },
    { axisId: "governance", maturity: 5 },
  ],
  recommendations: [
    {
      id: "no_ghg_inventory",
      axisId: "measure",
      priority: "high",
      module: "bilan",
      titleFr: "Réaliser un premier inventaire",
      titleEn: "Complete a first inventory",
      bodyFr: "Aucun inventaire n'est encore disponible.",
      bodyEn: "No inventory yet.",
    },
    {
      id: "cbam_verify_exposure",
      axisId: "governance",
      priority: "high",
      module: "cbam",
      titleFr: "Vérifier votre exposition au MACF",
      titleEn: "Check CBAM exposure",
      bodyFr: "Les marchandises exportées vers l'UE méritent une vérification.",
      bodyEn: "Goods exported to the EU should be checked.",
    },
    {
      id: "scope3_gap",
      axisId: "purchases",
      priority: "medium",
      module: "collect",
      titleFr: "Structurer le scope 3",
      titleEn: "Structure scope 3",
      bodyFr: "Les achats ne sont pas encore suivis.",
      bodyEn: "Purchases are not tracked yet.",
    },
  ],
  roadmap: {
    now: ["no_ghg_inventory", "cbam_verify_exposure"],
    months0to3: ["scope3_gap"],
    months3to12: [],
  },
  applicableAnswers: {},
};

describe("diagnostic pdf", () => {
  it("stays within 3 pages and reprints the frozen snapshot", () => {
    const { document, text } = createDiagnosticPdf({
      snapshot,
      companyName: "Atelier Nord",
      completedAt: "2026-09-22T10:00:00.000Z",
      logoDataUrl: null,
    });
    expect(document.getNumberOfPages()).toBeLessThanOrEqual(3);
    expect(document.getNumberOfPages()).toBe(3);
    expect(text).toContain("Diagnostic Carbone 360°");
    expect(text).toContain("Atelier Nord");
    expect(text).toContain("diag-360-2026.1");
    expect(text).toContain("Maturité estimée");
    expect(text).toContain("18 / 100");
    expect(text).toContain("Initial — Fiabilité limitée");
    expect(text).toContain("28 / 100");
    expect(text).toContain(snapshot.presentation.reliabilityWarningFr ?? "");
    expect(text).toContain("Mesure  10 / 100");
    expect(text).toContain("Mobilité  —");
    expect(text).toContain(PDF_NOT_AN_INVENTORY);
    expect(text).toContain("Vérifier votre exposition au MACF");
    expect(text).toContain("Module CarboScan : CBAM");
    expect(text).toContain("0–3 mois");
    expect(text).toContain("3–12 mois");
    expect(text).toContain("Structurer le scope 3");
    expect(text).toContain(PDF_UNQUANTIFIED);
    expect(text).toContain("Démarrer mon bilan carbone");
    expect(text).toContain(PDF_FOOTER);
    expect(text).not.toMatch(/tCO2e|kgCO2e|facteur d'émission|ROI|SBTi/i);
    expect(text.split("Réaliser un premier inventaire").length - 1).toBeGreaterThan(0);
    expect(snapshot.recommendations.map((item) => item.titleFr).every((title) => text.includes(title))).toBe(true);
  });

  it("uses the primary module call to action when it is not the inventory", () => {
    const { text } = createDiagnosticPdf({
      snapshot: {
        ...snapshot,
        recommendations: [snapshot.recommendations[1]],
        roadmap: { now: ["cbam_verify_exposure"], months0to3: [], months3to12: [] },
      },
      logoDataUrl: null,
    });
    expect(text).toContain("Vérifier votre exposition au MACF");
    expect(text).not.toContain("Démarrer mon bilan carbone");
  });
});
