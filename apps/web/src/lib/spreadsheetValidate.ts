/** Client-side spreadsheet upload guards (extension, size, magic bytes). */

const FORMULA_OK = true; // parsing handled separately

const SPREADSHEET_MAX_BYTES = 10 * 1024 * 1024;

const ZIP_MAGIC = [0x50, 0x4b];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

export type SpreadsheetValidation =
  | { ok: true }
  | { ok: false; error: string };

function bytesStartWith(buf: Uint8Array, magic: number[]): boolean {
  if (buf.length < magic.length) return false;
  return magic.every((b, i) => buf[i] === b);
}

export function isAllowedSpreadsheetName(filename: string): boolean {
  return /\.(xlsx|xls|csv)$/i.test(filename);
}

export async function validateSpreadsheetFile(file: File): Promise<SpreadsheetValidation> {
  if (!isAllowedSpreadsheetName(file.name)) {
    return { ok: false, error: "Extension non autorisée (.xlsx, .xls, .csv)" };
  }
  if (file.size <= 0) {
    return { ok: false, error: "Fichier vide" };
  }
  if (file.size > SPREADSHEET_MAX_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 10 Mo)" };
  }

  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    return { ok: true };
  }

  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (lower.endsWith(".xlsx")) {
    if (!bytesStartWith(head, ZIP_MAGIC)) {
      return { ok: false, error: "Contenu XLSX invalide (attendu ZIP/OOXML)" };
    }
    return { ok: true };
  }
  if (lower.endsWith(".xls")) {
    if (!bytesStartWith(head, OLE_MAGIC) && !bytesStartWith(head, ZIP_MAGIC)) {
      return { ok: false, error: "Contenu XLS invalide" };
    }
    return { ok: true };
  }
  return { ok: false, error: "Type de fichier non supporté" };
}

void FORMULA_OK;
