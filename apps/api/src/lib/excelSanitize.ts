const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function sanitizeExcelCell(value: unknown): unknown {
  if (typeof value === "string" && FORMULA_PREFIX.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function sanitizeImportPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeImportPayload);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeImportPayload(v);
    }
    return out;
  }
  return sanitizeExcelCell(value);
}

export function isAllowedSpreadsheetName(filename: string): boolean {
  return /\.(xlsx|xls|csv)$/i.test(filename);
}

/** Magic-byte / MIME checks for spreadsheet uploads (client or staged payload). */
const SPREADSHEET_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB

const ZIP_MAGIC = [0x50, 0x4b]; // xlsx (ZIP)
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0]; // legacy xls
const CSV_MIME = new Set([
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.ms-excel",
]);
const XLSX_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);
const XLS_MIME = new Set([
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

function bytesStartWith(buf: Uint8Array, magic: number[]): boolean {
  if (buf.length < magic.length) return false;
  return magic.every((b, i) => buf[i] === b);
}

export type SpreadsheetValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateSpreadsheetUpload(input: {
  filename: string;
  mimeType?: string | null;
  sizeBytes: number;
  /** First bytes of the file (optional but recommended). */
  head?: Uint8Array | ArrayBuffer | null;
}): SpreadsheetValidation {
  if (!isAllowedSpreadsheetName(input.filename)) {
    return { ok: false, error: "Extension non autorisée (.xlsx, .xls, .csv)" };
  }
  if (input.sizeBytes <= 0) {
    return { ok: false, error: "Fichier vide" };
  }
  if (input.sizeBytes > SPREADSHEET_MAX_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 10 Mo)" };
  }

  const lower = input.filename.toLowerCase();
  const mime = (input.mimeType ?? "").toLowerCase();
  const head =
    input.head == null
      ? null
      : input.head instanceof Uint8Array
        ? input.head
        : new Uint8Array(input.head);

  if (lower.endsWith(".csv")) {
    if (mime && !CSV_MIME.has(mime) && mime !== "application/octet-stream") {
      return { ok: false, error: "MIME CSV invalide" };
    }
    return { ok: true };
  }

  if (lower.endsWith(".xlsx")) {
    if (mime && !XLSX_MIME.has(mime) && mime !== "application/octet-stream") {
      return { ok: false, error: "MIME XLSX invalide" };
    }
    if (head && !bytesStartWith(head, ZIP_MAGIC)) {
      return { ok: false, error: "Contenu XLSX invalide (attendu ZIP/OOXML)" };
    }
    return { ok: true };
  }

  if (lower.endsWith(".xls")) {
    if (mime && !XLS_MIME.has(mime)) {
      return { ok: false, error: "MIME XLS invalide" };
    }
    if (head && !bytesStartWith(head, OLE_MAGIC) && !bytesStartWith(head, ZIP_MAGIC)) {
      return { ok: false, error: "Contenu XLS invalide" };
    }
    return { ok: true };
  }

  return { ok: false, error: "Type de fichier non supporté" };
}
