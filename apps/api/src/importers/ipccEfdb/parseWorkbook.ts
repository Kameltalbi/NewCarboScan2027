/**
 * Parse IPCC EFDB_output.xlsx Sheet1 (headers row 1, data rows 2–27567).
 */
import { loadWorksheet, worksheetMatrix } from "../xlsxMatrix.js";
import {
  IPCC_EFDB_COLUMN_COUNT,
  IPCC_EFDB_DATA_END_ROW,
  IPCC_EFDB_DATA_START_ROW,
  IPCC_EFDB_EXPECTED_DISTINCT_EF_IDS,
  IPCC_EFDB_EXPECTED_RECORD_COUNT,
  IPCC_EFDB_HEADERS,
  IPCC_EFDB_PARAM_TYPE_COUNTS,
  IPCC_EFDB_SHEET_NAME,
  type IpccRawRecord,
} from "./types.js";
import { assertIpccEfdbWorkbookSha256 } from "./sha256.js";

type SheetMatrix = unknown[][];

function cleanCell(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\u00a0/g, " ").trim();
  return s === "" ? null : s;
}

function splitList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

async function loadMatrix(workbookPath: string): Promise<SheetMatrix> {
  const sheet = await loadWorksheet(workbookPath, IPCC_EFDB_SHEET_NAME);
  return worksheetMatrix(sheet, false);
}

export type IpccParseStats = {
  sourceSha256: string;
  recordCount: number;
  distinctEfIds: number;
  paramTypeCounts: Record<string, number>;
  emptyGeo: number;
  emptyUnit: number;
  emptyDescription: number;
  multiGas: number;
};

export async function parseIpccEfdbWorkbook(workbookPath: string): Promise<{
  records: IpccRawRecord[];
  stats: IpccParseStats;
}> {
  const sourceSha256 = assertIpccEfdbWorkbookSha256(workbookPath);
  const matrix = await loadMatrix(workbookPath);
  if (matrix.length < IPCC_EFDB_DATA_END_ROW) {
    throw new Error(
      `Expected at least ${IPCC_EFDB_DATA_END_ROW} rows (header+data), got ${matrix.length}`,
    );
  }

  const header = (matrix[0] ?? []).slice(0, IPCC_EFDB_COLUMN_COUNT).map((h) =>
    String(h ?? "").trim(),
  );
  for (let i = 0; i < IPCC_EFDB_HEADERS.length; i++) {
    if (header[i] !== IPCC_EFDB_HEADERS[i]) {
      throw new Error(
        `Header mismatch col ${i + 1}: got ${JSON.stringify(header[i])}, expected ${JSON.stringify(IPCC_EFDB_HEADERS[i])}`,
      );
    }
  }

  const records: IpccRawRecord[] = [];
  const efIds = new Set<string>();
  const paramTypeCounts: Record<string, number> = {};
  let emptyGeo = 0;
  let emptyUnit = 0;
  let emptyDescription = 0;
  let multiGas = 0;

  for (let r = IPCC_EFDB_DATA_START_ROW - 1; r < IPCC_EFDB_DATA_END_ROW; r++) {
    const row = matrix[r] ?? [];
    const cells = Array.from({ length: IPCC_EFDB_COLUMN_COUNT }, (_, i) =>
      cleanCell(row[i]),
    );
    const efId = cells[0];
    if (!efId) {
      throw new Error(`Missing EF ID at Excel row ${r + 1}`);
    }
    if (efIds.has(efId)) {
      throw new Error(`Duplicate EF ID ${efId}`);
    }
    efIds.add(efId);

    const gasRaw = cells[3];
    const gases = splitList(gasRaw);
    if (gases.length > 1) multiGas += 1;

    const typeOfParameter = cells[7];
    const key = typeOfParameter ?? "";
    paramTypeCounts[key] = (paramTypeCounts[key] ?? 0) + 1;

    if (!cells[11]) emptyGeo += 1;
    if (!cells[15]) emptyUnit += 1;
    if (!cells[8]) emptyDescription += 1;

    records.push({
      efId,
      ipcc1996Category: cells[1],
      ipcc2006Category: cells[2],
      gasRaw,
      gases,
      fuel1996: cells[4],
      fuel2006: cells[5],
      cPool: cells[6],
      typeOfParameter,
      description: cells[8],
      technologies: cells[9],
      parametersConditions: cells[10],
      region: cells[11],
      abatement: cells[12],
      otherProperties: cells[13],
      valueRaw: cells[14],
      unitRaw: cells[15],
      equation: cells[16],
      ipccWorksheet: cells[17],
      technicalReference: cells[18],
      sourceOfData: cells[19],
      dataProvider: cells[20],
    });
  }

  if (records.length !== IPCC_EFDB_EXPECTED_RECORD_COUNT) {
    throw new Error(
      `Record count ${records.length} ≠ ${IPCC_EFDB_EXPECTED_RECORD_COUNT}`,
    );
  }
  if (efIds.size !== IPCC_EFDB_EXPECTED_DISTINCT_EF_IDS) {
    throw new Error(
      `Distinct EF IDs ${efIds.size} ≠ ${IPCC_EFDB_EXPECTED_DISTINCT_EF_IDS}`,
    );
  }

  for (const [k, expected] of Object.entries(IPCC_EFDB_PARAM_TYPE_COUNTS)) {
    if ((paramTypeCounts[k] ?? 0) !== expected) {
      throw new Error(
        `Type of parameter ${k}: got ${paramTypeCounts[k] ?? 0}, expected ${expected}`,
      );
    }
  }

  return {
    records,
    stats: {
      sourceSha256,
      recordCount: records.length,
      distinctEfIds: efIds.size,
      paramTypeCounts,
      emptyGeo,
      emptyUnit,
      emptyDescription,
      multiGas,
    },
  };
}
