import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ademeFactorNote } from "@/lib/factors/ademeFactor";
import {
  assessLine,
  controlFileName,
  editorResult,
  notesAfterEdit,
  proposeEdit,
  summarize,
  type ControlFactor,
  type ControlSourceLine,
} from "./controlCalculations";
import { buildControlWorkbook, exportRows, exportTotalKg } from "./controlExport";

const diesel: ControlFactor = {
  id: "diesel-demo",
  name: "Carburant véhicule",
  value: 2.65,
  unit: "kgCO2e/L",
  sourceName: "Facteur de démonstration",
  factorYear: null,
  countryCode: null,
  stableFactorId: null,
  datasetVersion: null,
  region: null,
  sourceKey: "manual",
};

function line(partial: Partial<ControlSourceLine>): ControlSourceLine {
  return {
    id: "1",
    designation: "Carburant véhicule",
    siteName: "Siège",
    periodStart: "2025-01-01",
    periodEnd: "2025-01-31",
    quantity: 600,
    unit: "L",
    subcategory: "fuel_diesel",
    activityType: "fuel",
    scope: 1,
    notes: "DESIGNATION: Carburant véhicule",
    factor: diesel,
    ...partial,
  };
}

describe("contrôle des calculs", () => {
  it("calcule la quantité modifiée sans arrondir le résultat, et n’écrit rien tout seul", () => {
    const saved = line({});
    const edited = proposeEdit(saved, { quantity: 650, unit: "L", factor: diesel });
    expect(saved.quantity).toBe(600);
    expect(edited.before.kg).toBeCloseTo(1590, 6);
    expect(edited.after.kg).toBeCloseTo(1722.5, 6);
    expect(editorResult(edited.after.kg || 0).kg).toBe("1\u202f722,5 kg CO₂e");
    expect(edited.blocked).toBeNull();
  });

  it("bloque une unité incompatible et laisse une émission absente vide", () => {
    const blocked = proposeEdit(line({}), { quantity: 600, unit: "kg", factor: diesel });
    expect(blocked.blocked).toMatch(/incompatible/i);
    expect(blocked.after.kg).toBeNull();
    expect(blocked.after.display).toBe("Non calculé");
    const missing = assessLine(line({ factor: null, quantity: 45 }));
    expect(missing.display).toBe("Non calculé");
    expect(missing.kg).toBeNull();
    expect(summarize([missing]).totalLabel).toBe("Aucune émission comptée · total partiel");
  });

  it("explique une conversion et conserve la désignation", () => {
    const mwh = proposeEdit(line({ unit: "kWh", quantity: 2, factor: { ...diesel, unit: "kgCO2e/kWh", value: 0.53 } }), {
      quantity: 2,
      unit: "MWh",
      factor: { ...diesel, unit: "kgCO2e/kWh", value: 0.53 },
    });
    expect(mwh.after.conversion).toMatch(/× 1000/);
    expect(mwh.after.kg).toBeCloseTo(1060, 6);
    const notes = notesAfterEdit("DESIGNATION: Facture réseau\nJUSTIFICATIF: F-1", {
      id: "manuel",
      name: "Facteur saisi",
      value: 0.4,
      unit: "kgCO2e/kWh",
      sourceKey: "manual",
      sourceName: "Facteur saisi",
      datasetVersion: null,
      countryCode: null,
      region: null,
      factorYear: 2024,
      stableFactorId: null,
      replacementReason: null,
    });
    expect(notes).toContain("DESIGNATION: Facture réseau");
    expect(notes).toContain("FE_SNAPSHOT:");
    expect(notesAfterEdit(notes, null)).toMatch(/^A_COMPLETER:/);
    expect(ademeFactorNote).toBeTypeOf("function");
  });

  it("aligne le total filtré, le statut partiel et l’export, sans prendre une modification non enregistrée", async () => {
    const saved = [
      line({}),
      line({ id: "2", designation: "Achat de viande", quantity: 45, unit: "kg", factor: null, subcategory: "cat1_meat_red" }),
    ];
    const summary = summarize(saved.map(assessLine));
    expect(summary.uncalculated).toBe(1);
    expect(summary.partial).toBe(true);
    expect(summary.calculatedKg).toBeCloseTo(1590, 6);
    const rows = exportRows(saved);
    expect(exportTotalKg(rows)).toBeCloseTo(summary.calculatedKg, 6);
    expect(rows[1].emissionsKg).toBeNull();
    expect(rows[1].status).toBe("Non calculé");
    const unsaved = proposeEdit(saved[0], { quantity: 1, unit: "L", factor: diesel });
    expect(exportTotalKg(exportRows(saved))).not.toBeCloseTo(unsaved.after.kg || 0, 6);

    const workbook = await buildControlWorkbook({
      organization: "KTC Tunisie",
      year: 2025,
      exportedAt: "2026-11-14",
      filters: "Tous les sites · Toutes les activités",
      lines: saved,
    });
    expect(workbook.fileName).toBe(controlFileName("KTC Tunisie", 2025, "2026-11-14"));
    const read = new ExcelJS.Workbook();
    await read.xlsx.load(workbook.buffer);
    const detail = read.getWorksheet("Détail des calculs");
    const synthesis = read.getWorksheet("Synthèse");
    expect(detail?.getCell("P3").value).toBeNull();
    expect(detail?.getCell("S3").value).toBe("Non calculé");
    expect(synthesis?.getCell("B7").value).toBeCloseTo(1590, 6);
  });
});
