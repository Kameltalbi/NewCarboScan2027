import ExcelJS from "exceljs";
import { IMPORT_GUIDES } from "@/lib/collect/importReview";
import { ACTIVITY_GROUPS } from "@/modules/collect/activityGroups";

export interface WorkbookSheet {
  name: string;
  rows: unknown[][];
}

const HEADERS = [
  "Début de période",
  "Fin de période",
  "Désignation *",
  "Produit ou type",
  "Quantité *",
  "Unité *",
  "Référence du justificatif",
];

export async function readSpreadsheet(file: File): Promise<WorkbookSheet[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    const text = await file.text();
    return [{ name: "Saisie", rows: parseCsv(text) }];
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await fileBytes(file));
  return workbook.worksheets.map((worksheet) => {
    const rows: unknown[][] = [];
    worksheet.eachRow((row, rowNumber) => {
      const values: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        values[column - 1] = cellValue(cell.value);
      });
      rows[rowNumber - 1] = values;
    });
    return { name: worksheet.name, rows };
  });
}

export async function downloadActivityTemplate(activityGroupId: string): Promise<void> {
  const group = ACTIVITY_GROUPS.find((item) => item.id === activityGroupId);
  const guide = IMPORT_GUIDES[activityGroupId] || IMPORT_GUIDES.other;
  const workbook = new ExcelJS.Workbook();
  const entry = workbook.addWorksheet("Saisie");
  entry.addRow(HEADERS);
  entry.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  entry.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14532D" } };
  entry.columns = HEADERS.map((header) => ({ width: Math.max(header.length + 2, 18) }));

  const examples = workbook.addWorksheet("Exemples");
  examples.addRow(["Cet onglet n’est pas importé. Une ligne correspond à une opération ou une consommation."]);
  examples.addRow([guide.expected]);
  examples.addRow([`Unités attendues : ${guide.units}`]);
  examples.addRow([]);
  examples.addRow(HEADERS);
  examples.addRow(exampleRow(activityGroupId));
  examples.getRow(5).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Modele_${group?.label || "collecte"}_CarboScan.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exampleRow(activityGroupId: string): string[] {
  if (activityGroupId === "electricity") return ["01/01/2025", "31/12/2025", "Facture réseau", "Électricité", "23208", "kWh", ""];
  if (activityGroupId === "fuels") return ["01/03/2025", "31/03/2025", "Carte gasoil véhicules", "Diesel", "800", "L", ""];
  if (activityGroupId === "purchases") return ["01/02/2025", "01/02/2025", "Achat lait cuisine", "Lait entier", "30", "L", "Facture F-12"];
  return ["01/01/2025", "31/01/2025", "Opération", "", "1", "kg", ""];
}

async function fileBytes(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
    if ("result" in value) return cellValue(value.result as ExcelJS.CellValue);
    if ("text" in value && value.text) return value.text;
  }
  return value;
}

function parseCsv(text: string): unknown[][] {
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if ((char === "," || char === ";") && !quoted) {
        cells.push(current.trim());
        current = "";
      } else current += char;
    }
    cells.push(current.trim());
    return cells;
  });
}
