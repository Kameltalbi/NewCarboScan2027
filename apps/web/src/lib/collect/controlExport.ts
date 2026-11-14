import ExcelJS from "exceljs";
import {
  assessLine,
  controlFileName,
  type ControlAssessment,
  type ControlSourceLine,
} from "@/lib/collect/controlCalculations";
import { ACTIVITY_GROUPS } from "@/modules/collect/activityGroups";

export interface ControlExportRow {
  designation: string;
  activity: string;
  site: string;
  periodStart: string;
  periodEnd: string;
  quantity: number | null;
  quantityUnit: string;
  factorName: string;
  factorValue: number | null;
  factorUnit: string;
  factorSource: string;
  factorYear: number | null;
  factorGeography: string;
  factorVersion: string;
  factorBoundary: string;
  emissionsKg: number | null;
  emissionsT: number | null;
  scope: string;
  status: "Calculé" | "Provisoire" | "Non calculé";
}

const STATUS: Record<ControlAssessment["status"], ControlExportRow["status"]> = {
  calculated: "Calculé",
  provisional: "Provisoire",
  uncalculated: "Non calculé",
};

export function exportRows(lines: ControlSourceLine[]): ControlExportRow[] {
  return lines.map((line) => {
    const assessment = assessLine(line);
    return {
      designation: line.designation,
      activity: activityLabel(line),
      site: line.siteName,
      periodStart: line.periodStart || "",
      periodEnd: line.periodEnd || "",
      quantity: line.quantity,
      quantityUnit: line.unit,
      factorName: line.factor?.name || "",
      factorValue: line.factor?.value ?? null,
      factorUnit: line.factor?.unit || "",
      factorSource: line.factor?.sourceName || "",
      factorYear: line.factor?.factorYear ?? null,
      factorGeography: line.factor?.countryCode || "",
      factorVersion: line.factor?.datasetVersion || "",
      factorBoundary: line.factor?.region || "",
      emissionsKg: assessment.kg,
      emissionsT: assessment.tonnes,
      scope: line.scope ? `Scope ${line.scope}` : "",
      status: STATUS[assessment.status],
    };
  });
}

export function exportTotalKg(rows: ControlExportRow[]): number {
  return rows.reduce((sum, row) => sum + (row.emissionsKg ?? 0), 0);
}

export async function buildControlWorkbook(input: {
  organization: string;
  year: number;
  exportedAt: string;
  filters: string;
  lines: ControlSourceLine[];
}): Promise<{ fileName: string; buffer: ArrayBuffer }> {
  const rows = exportRows(input.lines);
  const uncalculated = rows.filter((row) => row.status === "Non calculé").length;
  const total = exportTotalKg(rows);
  const workbook = new ExcelJS.Workbook();
  const detail = workbook.addWorksheet("Détail des calculs");
  detail.columns = [
    { header: "Désignation", key: "designation", width: 28 },
    { header: "Activité", key: "activity", width: 22 },
    { header: "Site", key: "site", width: 18 },
    { header: "Début", key: "periodStart", width: 14 },
    { header: "Fin", key: "periodEnd", width: 14 },
    { header: "Quantité", key: "quantity", width: 14 },
    { header: "Unité quantité", key: "quantityUnit", width: 14 },
    { header: "Facteur", key: "factorName", width: 28 },
    { header: "Valeur du facteur", key: "factorValue", width: 18 },
    { header: "Unité du facteur", key: "factorUnit", width: 18 },
    { header: "Source", key: "factorSource", width: 24 },
    { header: "Année du facteur", key: "factorYear", width: 16 },
    { header: "Géographie", key: "factorGeography", width: 14 },
    { header: "Version", key: "factorVersion", width: 18 },
    { header: "Périmètre", key: "factorBoundary", width: 22 },
    { header: "Émissions kg CO2e", key: "emissionsKg", width: 18 },
    { header: "Émissions t CO2e", key: "emissionsT", width: 18 },
    { header: "Scope", key: "scope", width: 12 },
    { header: "Statut", key: "status", width: 16 },
  ];
  for (const row of rows) {
    const added = detail.addRow(row);
    numberCell(added.getCell("quantity"), row.quantity);
    numberCell(added.getCell("factorValue"), row.factorValue);
    numberCell(added.getCell("factorYear"), row.factorYear);
    numberCell(added.getCell("emissionsKg"), row.emissionsKg);
    numberCell(added.getCell("emissionsT"), row.emissionsT);
  }
  detail.getRow(1).font = { bold: true };

  const synthesis = workbook.addWorksheet("Synthèse");
  synthesis.columns = [
    { header: "Information", key: "label", width: 36 },
    { header: "Valeur", key: "value", width: 48 },
  ];
  synthesis.addRow({ label: "Organisation", value: input.organization });
  synthesis.addRow({ label: "Année", value: input.year });
  synthesis.addRow({ label: "Filtres", value: input.filters });
  synthesis.addRow({ label: "Date d’export", value: input.exportedAt });
  synthesis.addRow({ label: "Nombre de lignes", value: rows.length });
  const totalRow = synthesis.addRow({ label: "Total calculé (kg CO2e)", value: total });
  numberCell(totalRow.getCell(2), total);
  synthesis.addRow({ label: "Lignes non calculées", value: uncalculated });
  synthesis.addRow({ label: "Total", value: uncalculated > 0 ? "Partiel" : "Complet" });
  synthesis.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    fileName: controlFileName(input.organization, input.year, input.exportedAt.slice(0, 10)),
    buffer: buffer as ArrayBuffer,
  };
}

function numberCell(cell: ExcelJS.Cell, value: number | null) {
  if (value == null) {
    cell.value = null;
    return;
  }
  cell.value = value;
  cell.numFmt = "0.########";
}

function activityLabel(line: ControlSourceLine): string {
  const key = (line.subcategory || "").split(":").pop() || "";
  for (const group of ACTIVITY_GROUPS) {
    const choice = group.choices.find((item) => item.value === key || item.subcategory === line.subcategory);
    if (choice) return choice.label;
  }
  return line.activityType || "";
}
