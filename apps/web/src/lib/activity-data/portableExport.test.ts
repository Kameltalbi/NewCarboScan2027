import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createPortableWorkbook } from "./ActivityDataExportService";
import {
  buildPortableExportRows,
  CURRENT_FACTOR_ORIGIN,
  FROZEN_FACTOR_ORIGIN,
  sumExportedEmissionsKg,
  sumRecordedEmissionsKg,
  type ExportActivity,
} from "./portableExport";

const gas: ExportActivity = {
  id: "ligne-gaz",
  activity_type: "fuel",
  category: "scope1",
  subcategory: "fossil_gas",
  quantity: 1000,
  unit: "m3",
  period_start: "2026-01-01",
  period_end: "2026-12-31",
  scope_hint: 1,
  data_quality: "real",
  data_method: "physical",
  source_type: "invoice",
  uncertainty_pct: 8,
  source_document: "Facture gaz",
  site_id: "site-nord",
  notes: "ligne de gaz",
};

const frozenGas = {
  lineKey: "1:scope1:fossil_gas:0",
  name: "Gaz naturel",
  category: "scope1",
  scope: 1 as const,
  quantity: 1000,
  activityUnit: "m3",
  factorId: "facteur-gaz",
  factorValue: 2.04,
  factorUnit: "kgCO2e/m3",
  factorSource: "catalogue au moment de la clôture",
  factorName: "Gaz naturel",
  factorVersion: "2026.1",
  factorYear: 2026,
  factorGeography: "FR",
  resultKgCo2e: 2040,
};

describe("bilan clôturé", () => {
  it("garde 2,04 et 2040 après un catalogue passé à 2,10", async () => {
    const catalogNow = 2.1;
    const snapshot = {
      bilanName: "Bilan 2026",
      frozenAt: "2026-03-01T10:00:00.000Z",
      lines: [frozenGas],
    };
    const rows = buildPortableExportRows({
      organizationName: "Atelier nord",
      sitesById: { "site-nord": "Site nord" },
      activities: [gas],
      snapshotsByYear: { 2026: snapshot },
      currentByActivityId: {
        "ligne-gaz": {
          factorValue: catalogNow,
          factorUnit: "kgCO2e/m3",
          resultKgCo2e: 2100,
        },
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]["Valeur du facteur"]).toBe(2.04);
    expect(rows[0]["Émissions kgCO2e"]).toBe(2040);
    expect(rows[0]["Émissions tCO2e"]).toBe(2.04);
    expect(rows[0]["Origine du facteur"]).toBe(FROZEN_FACTOR_ORIGIN);
    expect(rows[0]["Date du snapshot"]).toBe("2026-03-01T10:00:00.000Z");
    expect(rows[0]["Version du facteur"]).toBe("2026.1");
    expect(rows[0]["Année du facteur"]).toBe(2026);
    expect(rows[0]["Géographie du facteur"]).toBe("FR");
    expect(rows[0]["Identifiant du facteur"]).toBe("facteur-gaz");
    expect(rows[0]["Méthode de donnée"]).toBe("Donnée physique");
    expect(rows[0]["Incertitude (%)"]).toBe(8);
    expect(rows[0]["Type de source"]).toBe("Facture");
    expect(rows[0]["Site"]).toBe("Site nord");
    expect(rows[0]["Justificatif"]).toBe("Facture gaz");
    expect(sumExportedEmissionsKg(rows)).toBe(sumRecordedEmissionsKg(snapshot.lines));
    expect(JSON.stringify(rows)).not.toContain(String(catalogNow));
    expect(JSON.stringify(rows)).not.toContain("2100");

    const workbook = await createPortableWorkbook(rows, []);
    const sheet = workbook.getWorksheet("Données");
    const header = sheet?.getRow(1).values as string[];
    const values = sheet?.getRow(2).values as Array<string | number | null>;
    expect(values[header.indexOf("Valeur du facteur")]).toBe(2.04);
    expect(values[header.indexOf("Émissions kgCO2e")]).toBe(2040);
    expect(header).toContain("ID");
    expect(header).toContain("Méthode de donnée");
    expect(workbook).toBeInstanceOf(ExcelJS.Workbook);
  });

  it("laisse vides les métadonnées absentes du snapshot", () => {
    const rows = buildPortableExportRows({
      activities: [{ ...gas, uncertainty_pct: null, source_type: null, site_id: null }],
      snapshotsByYear: {
        2026: {
          bilanName: "Bilan 2026",
          frozenAt: "2026-03-01T10:00:00.000Z",
          lines: [{
            ...frozenGas,
            factorId: null,
            factorVersion: null,
            factorYear: null,
            factorGeography: null,
            factorSource: "Non trouvé",
          }],
        },
      },
    });
    expect(rows[0]["Valeur du facteur"]).toBe(2.04);
    expect(rows[0]["Version du facteur"]).toBe("");
    expect(rows[0]["Année du facteur"]).toBeNull();
    expect(rows[0]["Géographie du facteur"]).toBe("");
    expect(rows[0]["Identifiant du facteur"]).toBe("");
    expect(rows[0]["Incertitude (%)"]).toBeNull();
    expect(rows[0]["Type de source"]).toBe("");
    expect(rows[0]["Site"]).toBe("");
  });
});

describe("bilan brouillon", () => {
  it("reprend le facteur du calcul déjà enregistré et ignore le catalogue", () => {
    const catalogNow = 2.1;
    const recorded = {
      factorValue: 2.04,
      factorUnit: "kgCO2e/m3",
      factorSource: "calcul déjà affiché",
      factorName: "Gaz naturel",
      resultKgCo2e: 2040,
    };
    const rows = buildPortableExportRows({
      activities: [
        gas,
        {
          id: "achat",
          category: "scope3_upstream",
          subcategory: "cat1_packaging",
          quantity: 500,
          unit: "TND",
          period_start: "2026-02-01",
          scope_hint: 3,
          data_method: "monetary",
          data_quality: "estimated",
        },
        {
          id: "procede",
          category: "scope1",
          subcategory: "process_other:four",
          quantity: 3,
          unit: "t",
          period_start: "2026-04-01",
          scope_hint: 1,
          data_method: "direct_emission",
        },
      ],
      currentByActivityId: {
        "ligne-gaz": recorded,
        achat: { factorValue: 0.4, factorUnit: "kgCO2e/TND", resultKgCo2e: 200 },
        procede: { factorValue: 1500, factorUnit: "kgCO2e/t", resultKgCo2e: 4500 },
      },
    });
    const gazRow = rows.find((row) => row["Identifiant de ligne"] === "ligne-gaz");
    expect(gazRow?.["Valeur du facteur"]).toBe(2.04);
    expect(gazRow?.["Émissions kgCO2e"]).toBe(2040);
    expect(gazRow?.["Origine du facteur"]).toBe(CURRENT_FACTOR_ORIGIN);
    expect(gazRow?.["Date du snapshot"]).toBe("");
    expect(rows.find((row) => row.ID === "achat")?.["Méthode de donnée"]).toBe("Ratio monétaire");
    expect(rows.find((row) => row.ID === "procede")?.["Méthode de donnée"]).toBe("Émission directe");
    const supplier = buildPortableExportRows({
      activities: [
        { id: "fournisseur", data_method: "supplier_specific", period_start: "2026-01-01", quantity: 1, unit: "unité" },
        { id: "autre", data_method: "other", period_start: "2026-01-01", quantity: 1, unit: "unité" },
      ],
    });
    expect(supplier.find((row) => row.ID === "fournisseur")?.["Méthode de donnée"]).toBe("Donnée fournisseur");
    expect(supplier.find((row) => row.ID === "autre")?.["Méthode de donnée"]).toBe("Autre");
    expect(sumExportedEmissionsKg(rows)).toBe(2040 + 200 + 4500);
    expect(JSON.stringify(rows)).not.toContain(String(catalogNow));
  });

  it("n'invente pas l'historique d'une ancienne ligne", () => {
    const rows = buildPortableExportRows({
      activities: [{
        id: "ancienne",
        quantity: 10,
        unit: "kg",
        period_start: "2020-06-01",
        category: "scope3_upstream",
        data_method: null,
        uncertainty_pct: null,
        source_type: null,
        data_quality: null,
        source_document: null,
        site_id: null,
      }],
    });
    expect(rows[0]["Méthode de donnée"]).toBe("Non renseigné");
    expect(rows[0]["Incertitude (%)"]).toBeNull();
    expect(rows[0]["Type de source"]).toBe("");
    expect(rows[0]["Qualité"]).toBe("");
    expect(rows[0]["Valeur du facteur"]).toBeNull();
    expect(rows[0]["Version du facteur"]).toBe("");
    expect(rows[0]["Année du facteur"]).toBeNull();
    expect(rows[0]["Géographie du facteur"]).toBe("");
    expect(rows[0]["Source du facteur"]).toBe("");
    expect(rows[0]["Émissions kgCO2e"]).toBeNull();
    expect(rows[0]["Site"]).toBe("");
    expect(rows[0]["Justificatif"]).toBe("");
    expect(rows[0]["Référence de preuve"]).toBe("");
    expect(sumExportedEmissionsKg(rows)).toBe(0);
  });
});
