import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildImportDraft, emissionCell } from "./importReview";
import { readSpreadsheet } from "./importWorkbook";

describe("fichier d’import", () => {
  it("lit un classeur dont les désignations ne sont pas des noms de facteurs, et ignore les exemples", async () => {
    const workbook = new ExcelJS.Workbook();
    const entry = workbook.addWorksheet("Saisie");
    entry.addRow(["Début de période", "Fin de période", "Désignation", "Produit ou type", "Quantité", "Unité", "Référence du justificatif"]);
    entry.addRow(["01/02/2025", "01/02/2025", "Achat lait cuisine", "Lait", 30, "L", "F-12"]);
    entry.addRow(["01/03/2025", "01/03/2025", "Bœuf frais", "", 45, "kg", ""]);
    entry.addRow(["02/03/2025", "02/03/2025", "Achat viande fournisseur X", "", 20, "kg", ""]);
    entry.addRow(["04/03/2025", "04/03/2025", "Divers cuisine", "", 1, "lot", ""]);
    entry.addRow(["01/03/2025", "01/03/2025", "Bœuf frais", "", 45, "kg", ""]);
    const examples = workbook.addWorksheet("Exemples");
    examples.addRow(["Cet onglet n’est pas importé"]);
    examples.addRow(["Bœuf frais", 99, "kg"]);
    const buffer = await workbook.xlsx.writeBuffer();
    const file = new File([buffer], "achats_alimentaires.xlsx");
    const sheets = await readSpreadsheet(file);
    const draft = buildImportDraft({
      sheets,
      activityGroupId: "purchases",
      year: 2025,
      organizationCountry: "Tunisie",
    });

    expect(draft.ignoredSheets).toEqual(["Exemples"]);
    expect(draft.lines.map((line) => line.designation)).toEqual([
      "Achat lait cuisine",
      "Bœuf frais",
      "Achat viande fournisseur X",
      "Divers cuisine",
      "Bœuf frais",
    ]);
    expect(draft.lines[1].status).toBe("confirm");
    expect(draft.lines[1].factorConfirmed).toBe(false);
    expect(draft.lines[2].productLabel).toBe("À préciser");
    expect(draft.lines[3].unit).toBe("lot");
    expect(draft.lines[3].quantity).toBe(1);
    expect(emissionCell(draft.lines[3])).toBe("Non calculées");
    expect(draft.lines.filter((line) => line.duplicate)).toHaveLength(2);
    expect(draft.lines.every((line) => line.preview?.kg == null || line.status !== "ready")).toBe(true);
  });
});
