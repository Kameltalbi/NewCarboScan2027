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
