import ExcelJS from "exceljs";
import type { GesReportDataset, PcafExposureRow, ReportActivityLine } from "./gesReportDataset.ts";
import { OPERATIONAL_TOTAL_UNDETERMINED } from "./gesReportDataset.ts";

const HEADERS = {
  fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF073F35" } },
  font: { color: { argb: "FFFFFFFF" }, bold: true, name: "Calibri" },
};

export async function renderGesExcel(dataset: GesReportDataset): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CarboScan";
  workbook.title = `${dataset.organizationName} ${dataset.year}`;

  addSynthesis(workbook, dataset);
  addScope(workbook, "02_Scope1", 1, dataset);
  addScope(workbook, "03_Scope2", 2, dataset);
  addScope(workbook, "04_Scope3", 3, dataset);
  addActivity(workbook, dataset);
  addFactors(workbook, dataset);
  addQuality(workbook, dataset);
  addActions(workbook, dataset);
  addTrajectory(workbook, dataset);

  if (dataset.financed) {
    addPcafSynthesis(workbook, dataset);
    addPcafExposures(workbook, dataset.financed.exposures);
    addPcafMethods(workbook, dataset);
    addPcafQuality(workbook, dataset);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function addSynthesis(workbook: ExcelJS.Workbook, dataset: GesReportDataset) {
  const sheet = workbook.addWorksheet("01_Synthese");
  sheet.addRow(["Indicateur", "Valeur", "Unité", "Note"]);
  styleHeader(sheet);
  const rows: Array<[string, number | string | null, string, string]> = [
    ["Organisation", dataset.organizationName, "", ""],
    ["Exercice", dataset.year, "", ""],
    ["Périmètre", dataset.perimeterLabel, "", ""],
    [
      "Empreinte opérationnelle",
      dataset.operational.totalT,
      dataset.operational.determinable ? "tCO2e" : "",
      dataset.operational.determinable ? "Hors Scope 3 catégorie 15" : OPERATIONAL_TOTAL_UNDETERMINED,
    ],
    ["Scope 1", dataset.operational.scope1T, "tCO2e", "Opérations"],
    ["Scope 2", dataset.operational.scope2T, "tCO2e", "Opérations"],
    [
      "Scope 3 hors catégorie 15",
      dataset.operational.scope3T,
      dataset.operational.determinable ? "tCO2e" : "",
      dataset.operational.determinable ? "Opérations" : OPERATIONAL_TOTAL_UNDETERMINED,
    ],
    [
      "Catégorie 15 exclue du total opérationnel",
      dataset.operational.excludedCategory15T,
      dataset.operational.determinable ? "tCO2e" : "",
      dataset.operational.determinable
        ? dataset.operational.category15Separated
          ? "Isolée des lignes de bilan, non additionnée à l'empreinte"
          : "Aucune ligne de catégorie 15 dans la ventilation"
        : "Donnée manquante : ventilation Scope 3 insuffisante",
    ],
  ];
  if (dataset.financed) {
    rows.push(
      ["Émissions financées Scope 1+2", dataset.financed.scope12T, "tCO2e", "PCAF, hors empreinte opérationnelle"],
      ["Émissions financées Scope 3", dataset.financed.scope3T, "tCO2e", "PCAF, hors empreinte opérationnelle"],
      ["Exposition analysée", dataset.financed.exposure, dataset.financed.currency || "", dataset.financed.mixedCurrencies ? "Devises mixtes : somme non affichée" : ""],
      ["Score qualité PCAF Scope 1+2", dataset.financed.scope12Score, "1 à 5", "Moyenne pondérée par l'encours"],
      ["Score qualité PCAF Scope 3", dataset.financed.scope3Score, "1 à 5", "Moyenne pondérée par l'encours"],
    );
  }
  for (const row of rows) sheet.addRow(row);
  applyNumberFormat(sheet, [2]);
  sheet.getColumn(1).width = 48;
  sheet.getColumn(2).width = 28;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 62;
}

function addScope(workbook: ExcelJS.Workbook, name: string, scope: 1 | 2 | 3, dataset: GesReportDataset) {
  const sheet = workbook.addWorksheet(name);
  writeActivityHeader(sheet);
  const lines = dataset.operational.lines.filter((line) => line.scope === scope);
  if (scope === 3 && !dataset.operational.determinable) {
    sheet.addRow([
      "Ventilation insuffisante",
      "",
      3,
      null,
      "",
      null,
      "",
      "",
      null,
      "",
      OPERATIONAL_TOTAL_UNDETERMINED,
    ]);
    return;
  }
  if (lines.length === 0) {
    sheet.addRow(["Aucune ligne", "", "", "", "", "", "", "", "", "", "Hors catégorie 15"]);
    return;
  }
  for (const line of lines) writeActivityRow(sheet, line);
  applyNumberFormat(sheet, [4, 6, 9]);
}

function addActivity(workbook: ExcelJS.Workbook, dataset: GesReportDataset) {
  const sheet = workbook.addWorksheet("05_Donnees_activite");
  writeActivityHeader(sheet);
  if (dataset.operational.lines.length === 0) {
    sheet.addRow(["Aucune donnée d'activité sur ce périmètre"]);
    return;
  }
  for (const line of dataset.operational.lines) writeActivityRow(sheet, line);
  applyNumberFormat(sheet, [4, 6, 9]);
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(sheet.rowCount, 2), column: 11 } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function writeActivityHeader(sheet: ExcelJS.Worksheet) {
  sheet.addRow([
    "Poste",
    "Sous-poste",
    "Scope",
    "Quantité",
    "Unité",
    "Facteur",
    "Unité facteur",
    "Source facteur",
    "Émissions tCO2e",
    "Qualité",
    "Méthode",
  ]);
  styleHeader(sheet);
}

function writeActivityRow(sheet: ExcelJS.Worksheet, line: ReportActivityLine) {
  sheet.addRow([
    line.category,
    line.subcategory,
    line.scope,
    line.quantity,
    line.unit,
    line.factor,
    line.factorUnit,
    line.factorSource,
    line.emissionsT,
    line.dataQuality,
    line.method,
  ]);
}

function addFactors(workbook: ExcelJS.Workbook, dataset: GesReportDataset) {
  const sheet = workbook.addWorksheet("06_Facteurs_emission");
  sheet.addRow(["Source", "Facteur", "Unité", "Poste", "Scope"]);
  styleHeader(sheet);
  const seen = new Set<string>();
  for (const line of dataset.operational.lines) {
    if (line.factor == null && !line.factorSource) continue;
    const key = `${line.factorSource}|${line.factor}|${line.factorUnit}|${line.subcategory}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sheet.addRow([line.factorSource, line.factor, line.factorUnit, line.subcategory || line.category, line.scope]);
  }
  if (seen.size === 0) sheet.addRow(["Aucun facteur détaillé"]);
  sheet.getColumn(1).width = 42;
}

function addQuality(workbook: ExcelJS.Workbook, dataset: GesReportDataset) {
  const sheet = workbook.addWorksheet("07_Qualite_donnees");
  sheet.addRow(["Indicateur", "Valeur"]);
  styleHeader(sheet);
  sheet.addRow(["Part données réelles %", dataset.operational.quality.realPct]);
  sheet.addRow(["Part données estimées %", dataset.operational.quality.estimatedPct]);
  sheet.addRow(["Part données par défaut %", dataset.operational.quality.defaultPct]);
  for (const item of dataset.operational.missingData) sheet.addRow(["Donnée manquante", item]);
  sheet.getColumn(1).width = 36;
  sheet.getColumn(2).width = 78;
}

function addActions(workbook: ExcelJS.Workbook, dataset: GesReportDataset) {
  const sheet = workbook.addWorksheet("08_Actions");
  sheet.addRow(["Action", "Levier", "Statut"]);
  styleHeader(sheet);
  if (dataset.actions.length === 0) {
    sheet.addRow(["Aucune action enregistrée", "", ""]);
    return;
  }
  for (const action of dataset.actions) sheet.addRow([action.title, action.lever, action.status]);
}

function addTrajectory(workbook: ExcelJS.Workbook, dataset: GesReportDataset) {
  const sheet = workbook.addWorksheet("09_Trajectoire");
  sheet.addRow(["Exercice", "Empreinte opérationnelle tCO2e"]);
  styleHeader(sheet);
  if (dataset.history.length < 2) {
    sheet.addRow(["Historique insuffisant pour une trajectoire", ""]);
    return;
  }
  for (const point of dataset.history) sheet.addRow([point.year, point.operationalT]);
}

function addPcafSynthesis(workbook: ExcelJS.Workbook, dataset: GesReportDataset) {
  const financed = dataset.financed;
  if (!financed) return;
  const sheet = workbook.addWorksheet("10_PCAF_Synthese");
  sheet.addRow(["Indicateur", "Valeur", "Unité"]);
  styleHeader(sheet);
  const rows: Array<[string, number | string | null, string]> = [
    ["Exposition analysée", financed.exposure, financed.currency || ""],
    ["Émissions financées Scope 1+2", financed.scope12T, "tCO2e"],
    ["Émissions financées Scope 3", financed.scope3T, "tCO2e"],
    ["Score qualité Scope 1+2", financed.scope12Score, "1 à 5"],
    ["Score qualité Scope 3", financed.scope3Score, "1 à 5"],
    ["Lignes calculées", financed.implementedLines, ""],
    ["Lignes Scope 1+2 calculées", financed.scope12Lines, ""],
    ["Lignes Scope 3 calculées", financed.scope3Lines, ""],
    ["Lignes non implémentées", financed.notImplementedLines, financed.notImplementedClasses.join(", ")],
  ];
  for (const row of rows) sheet.addRow(row);
  applyNumberFormat(sheet, [2]);
  sheet.getColumn(1).width = 40;
  sheet.getColumn(2).width = 22;
}

function addPcafExposures(workbook: ExcelJS.Workbook, rows: PcafExposureRow[]) {
  const sheet = workbook.addWorksheet("11_PCAF_Expositions");
  sheet.addRow([
    "Contrepartie",
    "Classe d'actifs PCAF",
    "Secteur",
    "Encours",
    "Devise",
    "Année",
    "Méthode Scope 1+2",
    "Score qualité Scope 1+2",
    "Méthode Scope 3",
    "Score qualité Scope 3",
    "Dénominateur",
    "Libellé dénominateur",
    "Facteur d'attribution",
    "Émissions contrepartie Scope 1+2",
    "Émissions financées Scope 1+2",
    "Émissions contrepartie Scope 3",
    "Émissions financées Scope 3",
    "Source des données",
    "Facteur d'émission",
    "Statut",
    "Données manquantes",
  ]);
  styleHeader(sheet);
  if (rows.length === 0) {
    sheet.addRow(["Aucune exposition"]);
    return;
  }
  for (const row of rows) {
    sheet.addRow([
      row.counterparty,
      row.assetClass,
      row.sector,
      row.exposure,
      row.currency,
      row.year,
      row.methodScope12,
      row.scoreScope12,
      row.methodScope3,
      row.scoreScope3,
      row.denominator,
      row.denominatorLabel,
      row.attributionFactor,
      row.borrowerScope12T,
      row.financedScope12T,
      row.borrowerScope3T,
      row.financedScope3T,
      row.dataSource,
      row.emissionFactor,
      row.status,
      row.missing,
    ]);
  }
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(sheet.rowCount, 2), column: 21 } };
  applyNumberFormat(sheet, [4, 6, 8, 10, 11, 13, 14, 15, 16, 17]);
  const widths = [32, 28, 24, 18, 12, 12, 28, 16, 28, 16, 18, 28, 18, 22, 22, 22, 22, 28, 22, 24, 36];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

function addPcafMethods(workbook: ExcelJS.Workbook, dataset: GesReportDataset) {
  const sheet = workbook.addWorksheet("12_PCAF_Methodes");
  sheet.addRow(["Contrepartie", "Scope", "Méthode", "Score", "Référence moteur"]);
  styleHeader(sheet);
  const financed = dataset.financed;
  if (!financed) return;
  for (const row of financed.exposures) {
    sheet.addRow([row.counterparty, "Scope 1+2", row.methodScope12, row.scoreScope12, "Moteur PCAF business loans"]);
    sheet.addRow([row.counterparty, "Scope 3", row.methodScope3, row.scoreScope3, "Moteur PCAF business loans"]);
  }
  sheet.getColumn(3).width = 55;
}

function addPcafQuality(workbook: ExcelJS.Workbook, dataset: GesReportDataset) {
  const financed = dataset.financed;
  if (!financed) return;
  const sheet = workbook.addWorksheet("13_PCAF_Qualite");
  sheet.addRow(["Élément", "Détail"]);
  styleHeader(sheet);
  sheet.addRow(["Score pondéré Scope 1+2", financed.scope12Score]);
  sheet.addRow(["Score pondéré Scope 3", financed.scope3Score]);
  sheet.addRow(["Couverture Scope 1+2", `${financed.scope12Lines}/${financed.implementedLines || 0}`]);
  sheet.addRow(["Couverture Scope 3", `${financed.scope3Lines}/${financed.implementedLines || 0}`]);
  if (financed.missingData.length === 0) {
    sheet.addRow(["Données manquantes", "Aucune ligne calculable sans donnée manquante signalée"]);
  } else {
    for (const item of financed.missingData) sheet.addRow(["Donnée manquante", item]);
  }
  for (const item of financed.improvements) sheet.addRow(["Axe d'amélioration", item]);
  for (const assetClass of financed.notImplementedClasses) {
    sheet.addRow(["Classe non implémentée", assetClass]);
  }
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 80;
}

function applyNumberFormat(sheet: ExcelJS.Worksheet, columns: number[]) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    for (const column of columns) {
      const cell = row.getCell(column);
      if (typeof cell.value === "number") cell.numFmt = "#,##0.00";
    }
  });
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.eachCell((cell) => {
    cell.fill = HEADERS.fill;
    cell.font = HEADERS.font;
  });
}
