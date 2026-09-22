/**
 * Lecture XLSX hors du paquet npm `xlsx` (advisory GHSA, aucune version corrigée).
 * Les valeurs brutes restent des nombres / chaînes, comme `sheet_to_json({ raw: true })`.
 */
import ExcelJS from "exceljs";

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

function excelSerial(date: Date): number {
  return (date.getTime() - EXCEL_EPOCH_MS) / 86_400_000;
}

export function cellRaw(value: ExcelJS.CellValue): unknown {
  if (value == null) return null;
  if (value instanceof Date) return excelSerial(value);
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("result" in value) {
      const result = value.result;
      if (result == null || (typeof result === "object" && "error" in result)) return null;
      if (result instanceof Date) return excelSerial(result);
      return result;
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("error" in value) return null;
  }
  return value;
}

export async function loadWorksheet(
  workbookPath: string,
  sheetName: string,
): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    const names = workbook.worksheets.map((item) => item.name).join(", ");
    throw new Error(`Missing sheet ${sheetName} (found: ${names})`);
  }
  return sheet;
}

/** Lignes 0-based, cellules vides = null. `blankrows` false saute les lignes entièrement vides. */
export function worksheetMatrix(sheet: ExcelJS.Worksheet, blankrows: boolean): unknown[][] {
  const width = Math.max(sheet.columnCount, 1);
  const matrix: unknown[][] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells: unknown[] = [];
    let filled = false;
    for (let c = 1; c <= width; c++) {
      const raw = cellRaw(row.getCell(c).value);
      if (raw !== null && raw !== "") filled = true;
      cells.push(raw);
    }
    if (!blankrows && !filled) continue;
    matrix.push(cells);
  }
  return matrix;
}

/** Texte affiché (`cell.text`) + valeur brute, pour conserver les décimales d'origine. */
export function displayCell(cell: ExcelJS.Cell): { t?: string; v?: unknown; w?: string } {
  const v = cellRaw(cell.value);
  const w = cell.text ?? "";
  if (v == null || (typeof v === "string" && v.trim() === "")) {
    return { t: "z", v: null, w };
  }
  if (typeof v === "number") return { t: "n", v, w };
  return { t: "s", v, w };
}
