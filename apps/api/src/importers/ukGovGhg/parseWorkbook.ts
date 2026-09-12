import { createRequire } from "node:module";
import type { UkRawRow, UkReconcileStats } from "./types.js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx") as typeof import("xlsx");

const SHEET = "Factors by Category";
const GHG_CO2E = "kg CO2e";

function cellStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Normalize numeric text for PostgreSQL numeric round-trip (no magnitude change). */
export function normalizeNumericText(raw: string): string {
  const t = raw.trim().replace(/,/g, "");
  if (!t) throw new Error("empty numeric text");
  // Keep scientific notation if present; otherwise strip only trailing spaces.
  return t;
}

function parseValueCell(cell: { t?: string; v?: unknown; w?: string } | undefined): {
  value: number | null;
  valueText: string | null;
  valueIsNull: boolean;
  valueIsZero: boolean;
  isNegative: boolean;
} {
  if (!cell || cell.t === "z" || cell.v === null || cell.v === undefined) {
    return {
      value: null,
      valueText: null,
      valueIsNull: true,
      valueIsZero: false,
      isNegative: false,
    };
  }
  if (cell.t === "s" && String(cell.v).trim() === "") {
    return {
      value: null,
      valueText: null,
      valueIsNull: true,
      valueIsZero: false,
      isNegative: false,
    };
  }

  // Prefer Excel displayed/formatted text when present (preserves authoring digits).
  const formatted = typeof cell.w === "string" ? cell.w.trim() : "";
  let valueText: string | null = null;
  if (formatted && /^-?\d/.test(formatted.replace(/,/g, ""))) {
    valueText = normalizeNumericText(formatted);
  } else if (typeof cell.v === "number" && Number.isFinite(cell.v)) {
    // Fall back to full float decimal string without scientific surprises where possible
    valueText = normalizeNumericText(String(cell.v));
  } else if (typeof cell.v === "string" && cell.v.trim() !== "") {
    valueText = normalizeNumericText(cell.v);
  } else {
    return {
      value: null,
      valueText: null,
      valueIsNull: true,
      valueIsZero: false,
      isNegative: false,
    };
  }

  const n = Number(valueText);
  if (!Number.isFinite(n)) {
    return {
      value: null,
      valueText: null,
      valueIsNull: true,
      valueIsZero: false,
      isNegative: false,
    };
  }
  return {
    value: n,
    valueText,
    valueIsNull: false,
    valueIsZero: n === 0,
    isNegative: n < 0,
  };
}

/** Read Factors by Category (header at Excel row 6 / 0-based index 5). */
export function parseUkWorkbook(path: string): UkRawRow[] {
  const wb = XLSX.readFile(path, { cellDates: false, cellNF: true, cellText: true });
  const sheet = wb.Sheets[SHEET];
  if (!sheet) throw new Error(`Missing sheet: ${SHEET}`);

  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(40, matrix.length); i++) {
    const row = matrix[i] ?? [];
    const cells = row.map((c) => (c == null ? "" : String(c).trim()));
    if (cells.includes("ID") && cells.includes("GHG/Unit") && cells.includes("UOM")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) throw new Error("UK Factors by Category: header row not found");

  const headers = (matrix[headerIdx] ?? []).map((c) => (c == null ? "" : String(c).trim()));
  const idx = (name: string) => headers.indexOf(name);
  const iId = idx("ID");
  const iScope = idx("Scope");
  const iL1 = idx("Level 1");
  const iL2 = idx("Level 2");
  const iL3 = idx("Level 3");
  const iL4 = idx("Level 4");
  const iText = idx("Column Text");
  const iUom = idx("UOM");
  const iGhg = idx("GHG/Unit");
  const iVal = idx("GHG Conversion Factor 2026");
  if ([iId, iGhg, iVal, iUom].some((i) => i < 0)) {
    throw new Error(`UK header missing required columns: ${headers.join("|")}`);
  }

  const rows: UkRawRow[] = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const id = cellStr(row[iId]);
    if (!id) continue;
    const addr = XLSX.utils.encode_cell({ r, c: iVal });
    const pv = parseValueCell(sheet[addr] as { t?: string; v?: unknown; w?: string } | undefined);
    rows.push({
      id,
      scope: cellStr(row[iScope]),
      level1: cellStr(row[iL1]),
      level2: cellStr(row[iL2]),
      level3: cellStr(row[iL3]),
      level4: cellStr(row[iL4]),
      columnText: cellStr(row[iText]),
      uom: cellStr(row[iUom]),
      ghgUnit: cellStr(row[iGhg]),
      value: pv.value,
      valueText: pv.valueText,
      valueIsNull: pv.valueIsNull,
      valueIsZero: pv.valueIsZero,
    });
  }
  return rows;
}

export function reconcileUkRows(rows: UkRawRow[]): UkReconcileStats {
  const ids = new Set<string>();
  const ghgUnitDistribution: Record<string, number> = {};
  let nullValues = 0;
  let zeroValues = 0;
  let negativeValues = 0;
  let kgCo2eTotalRows = 0;
  let kgCo2eValuedRows = 0;

  for (const row of rows) {
    ids.add(row.id);
    const g = row.ghgUnit ?? "(blank)";
    ghgUnitDistribution[g] = (ghgUnitDistribution[g] ?? 0) + 1;
    if (row.valueIsNull) nullValues += 1;
    else if (row.valueIsZero) zeroValues += 1;
    else if (row.value !== null && row.value < 0) negativeValues += 1;

    if ((row.ghgUnit ?? "").trim() === GHG_CO2E) {
      kgCo2eTotalRows += 1;
      if (!row.valueIsNull && row.value !== null) kgCo2eValuedRows += 1;
    }
  }

  return {
    sourceRowsWithId: rows.length,
    distinctIds: ids.size,
    ghgUnitDistribution,
    nullValues,
    zeroValues,
    negativeValues,
    kgCo2eTotalRows,
    kgCo2eValuedRows,
  };
}

export function assertReconcileInvariants(stats: UkReconcileStats): void {
  const expected = {
    sourceRowsWithId: 8740,
    distinctIds: 8740,
    kgCo2eTotalRows: 3425,
    kgCo2eValuedRows: 2622,
  };
  const failures: string[] = [];
  for (const [k, v] of Object.entries(expected) as Array<[keyof typeof expected, number]>) {
    if (stats[k] !== v) failures.push(`${k}: got ${stats[k]}, expected ${v}`);
  }
  if (stats.negativeValues !== 0) {
    failures.push(`negativeValues: got ${stats.negativeValues}, expected 0`);
  }
  if (failures.length) {
    throw new Error(`UK reconcile invariants failed:\n- ${failures.join("\n- ")}`);
  }
}

export function isImportableKgCo2e(row: UkRawRow): boolean {
  return (
    (row.ghgUnit ?? "").trim() === GHG_CO2E &&
    !row.valueIsNull &&
    row.value !== null &&
    row.valueText != null
  );
}

export { GHG_CO2E };
