import { jsPDF } from "jspdf";
import type { GesReportDataset } from "./gesReportDataset.ts";
import { OPERATIONAL_TOTAL_UNDETERMINED } from "./gesReportDataset.ts";
import { formatScore, formatT } from "./gesReportSlides.ts";

const GREEN: [number, number, number] = [7, 63, 53];
const INK: [number, number, number] = [7, 47, 41];
const MUTED: [number, number, number] = [83, 100, 94];

export function gesPdfOutline(dataset: GesReportDataset): string[] {
  const sections = [
    "Couverture",
    "Synthèse exécutive",
    "Périmètre et méthodologie",
    "Scope 1",
    "Scope 2",
    "Scope 3 hors catégorie 15",
    "Principaux postes",
    "Indicateurs et intensités",
    "Qualité des données",
    "Plan d'action et trajectoire",
  ];
  if (dataset.financed) sections.push("Émissions financées — Scope 3 catégorie 15");
  sections.push("Méthodologie et référentiels");
  return sections;
}

function pdfSafe(text: string): string {
  return text
    .replace(/\u202f|\u00a0/g, " ")
    .replace(/₂/g, "2")
    .replace(/—/g, " - ")
    .replace(/·/g, " - ");
}

export function renderGesPdf(dataset: GesReportDataset): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const page = { n: 1 };
  const outline = gesPdfOutline(dataset);

  cover(doc, dataset);
  for (const title of outline.slice(1)) {
    doc.addPage();
    page.n += 1;
    header(doc, dataset, title);
    body(doc, dataset, title, page);
    footer(doc, dataset, page.n);
  }
  const output = doc.output("arraybuffer");
  return new Uint8Array(output);
}

function cover(doc: jsPDF, dataset: GesReportDataset) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RAPPORT GES", 20, 70);
  doc.setFontSize(28);
  const name = doc.splitTextToSize(pdfSafe(dataset.organizationName), 170);
  doc.text(name, 20, 88);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(`Exercice ${dataset.year}`, 20, 120);
  doc.text(pdfSafe(dataset.perimeterLabel), 20, 128);
  doc.setFontSize(12);
  const operationalLine = dataset.operational.determinable
    ? `Empreinte opérationnelle  ${formatT(dataset.operational.totalT)}`
    : OPERATIONAL_TOTAL_UNDETERMINED;
  doc.text(doc.splitTextToSize(pdfSafe(operationalLine), 170), 20, 160);
  doc.text(pdfSafe("Document détaillé  -  GHG Protocol"), 20, 250);
  doc.text("CarboScan", 20, 270);
}

function header(doc: jsPDF, dataset: GesReportDataset, title: string) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(pdfSafe(title), 14, 14);
  doc.setFontSize(9);
  doc.text(pdfSafe(`${dataset.organizationName} - ${dataset.year}`), 196, 14, { align: "right" });
}

function footer(doc: jsPDF, dataset: GesReportDataset, page: number) {
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text(pdfSafe(`CarboScan - ${dataset.organizationName} - ${dataset.year} - p. ${page}`), 14, 290);
}

function body(doc: jsPDF, dataset: GesReportDataset, title: string, page: { n: number }) {
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = sectionLines(dataset, title);
  let y = 34;
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(pdfSafe(line), 180);
    const height = wrapped.length * 6 + 2;
    if (y + height > 280) {
      footer(doc, dataset, page.n);
      doc.addPage();
      page.n += 1;
      header(doc, dataset, title);
      y = 34;
    }
    doc.text(wrapped, 14, y);
    y += height;
  }
}

function sectionLines(dataset: GesReportDataset, title: string): string[] {
  const op = dataset.operational;
  if (title === "Synthèse exécutive") {
    const lines = op.determinable
      ? [
          `Empreinte opérationnelle : ${formatT(op.totalT)}.`,
          `Scope 1 ${formatT(op.scope1T)}, Scope 2 ${formatT(op.scope2T)}, Scope 3 hors catégorie 15 ${formatT(op.scope3T)}.`,
          "Ce total ne comprend pas les émissions financées.",
        ]
      : [
          OPERATIONAL_TOTAL_UNDETERMINED,
          "Donnée manquante : ventilation Scope 3 insuffisante pour isoler la catégorie 15.",
          "Aucun total opérationnel n'est publié, pour éviter d'y inclure des émissions financées.",
          `Scope 1 ${formatT(op.scope1T)}, Scope 2 ${formatT(op.scope2T)}. Le Scope 3 hors catégorie 15 n'est pas chiffré.`,
        ];
    if (dataset.financed) {
      lines.push(`Émissions financées, présentées à part : Scope 1+2 ${formatT(dataset.financed.scope12T)}, Scope 3 ${formatT(dataset.financed.scope3T)}.`);
    }
    return lines;
  }
  if (title === "Périmètre et méthodologie") {
    return [
      `Périmètre retenu : ${dataset.perimeterLabel}.`,
      dataset.financialInstitution
        ? "Institution financière : l'empreinte de l'organisation et les émissions financées sont deux périmètres distincts."
        : "Organisation : le rapport couvre l'empreinte opérationnelle.",
      "Les émissions sont celles déjà calculées par le moteur de bilan. Les exports ne relancent pas les équations.",
      !op.determinable
        ? OPERATIONAL_TOTAL_UNDETERMINED
        : op.category15Separated
          ? `Scope 3 catégorie 15 isolé des lignes : ${formatT(op.excludedCategory15T)}, non additionné à l'empreinte.`
          : "Aucune ligne de catégorie 15 dans la ventilation. Le total opérationnel est celui des postes identifiés.",
    ];
  }
  if (title === "Scope 1") return scopeLines(dataset, 1, op.scope1T);
  if (title === "Scope 2") return scopeLines(dataset, 2, op.scope2T);
  if (title === "Scope 3 hors catégorie 15") {
    if (!op.determinable || op.scope3T == null) {
      return [
        OPERATIONAL_TOTAL_UNDETERMINED,
        "Donnée manquante : la ventilation Scope 3 ne permet pas d'isoler la catégorie 15.",
      ];
    }
    return scopeLines(dataset, 3, op.scope3T);
  }
  if (title === "Principaux postes") {
    if (op.posts.length === 0) return ["Aucun poste détaillé sur ce périmètre."];
    return op.posts.slice(0, 10).map((post) => `${post.name} — ${formatT(post.emissionsT)} (${post.sharePct.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %).`);
  }
  if (title === "Indicateurs et intensités") {
    return [
      `Intensité par employé : ${op.intensityPerEmployeeT == null ? "non disponible" : formatT(op.intensityPerEmployeeT)}.`,
      `Intensité chiffre d'affaires : ${op.intensityKgPerThousandRevenue == null ? "non disponible" : `${op.intensityKgPerThousandRevenue.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kgCO₂e / k${dataset.currency}`}.`,
    ];
  }
  if (title === "Qualité des données") {
    return [
      `Données réelles : ${op.quality.realPct} %.`,
      `Données estimées : ${op.quality.estimatedPct} %.`,
      `Données par défaut : ${op.quality.defaultPct} %.`,
    ];
  }
  if (title === "Plan d'action et trajectoire") {
    const lines = dataset.actions.length
      ? dataset.actions.map((action) => `${action.title} — ${action.status}`)
      : ["Aucune action enregistrée pour cet exercice."];
    if (dataset.history.length >= 2) {
      lines.push("Historique opérationnel :");
      for (const point of dataset.history) lines.push(`${point.year} : ${formatT(point.operationalT)}`);
    } else {
      lines.push("Historique insuffisant pour tracer une évolution.");
    }
    return lines;
  }
  if (title.startsWith("Émissions financées")) return financedLines(dataset);
  return [
    "Empreinte opérationnelle : GHG Protocol, scopes 1, 2 et 3 hors catégorie 15.",
    "Émissions financées : résultats du moteur PCAF déjà calculés (business loans et equity non cotée). Les autres classes d'actifs ne sont pas simulées.",
    "Les trois formats de ce rapport lisent le même jeu de résultats.",
  ];
}

function scopeLines(dataset: GesReportDataset, scope: 1 | 2 | 3, total: number | null): string[] {
  const lines = dataset.operational.lines.filter((line) => line.scope === scope && line.emissionsT > 0);
  if (lines.length === 0) return [`${formatT(total)}. Aucune ligne détaillée pour ce scope.`];
  const grouped = new Map<string, number>();
  for (const line of lines) {
    const name = line.subcategory || line.category;
    grouped.set(name, (grouped.get(name) || 0) + line.emissionsT);
  }
  const rows = [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  return [formatT(total), ...rows.map(([name, value]) => `${name} - ${formatT(value)}`)];
}

function financedLines(dataset: GesReportDataset): string[] {
  const financed = dataset.financed;
  if (!financed) return ["Émissions financées non incluses."];
  const top = [...financed.exposures]
    .filter((row) => row.implemented)
    .sort((a, b) => (b.financedScope12T ?? 0) + (b.financedScope3T ?? 0) - ((a.financedScope12T ?? 0) + (a.financedScope3T ?? 0)))
    .slice(0, 8);
  return [
    "Périmètre distinct de l'empreinte opérationnelle. Scope 3 catégorie 15.",
    `Exposition analysée : ${financed.exposure == null ? "non sommable" : financed.exposure.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${financed.currency ?? ""}`.trim(),
    `Scope 1+2 financé : ${formatT(financed.scope12T)}.`,
    `Scope 3 financé : ${formatT(financed.scope3T)}.`,
    `Couverture Scope 1+2 : ${financed.scope12Lines}/${financed.implementedLines}. Couverture Scope 3 : ${financed.scope3Lines}/${financed.implementedLines}.`,
    `Score qualité PCAF Scope 1+2 : ${formatScore(financed.scope12Score)}.`,
    `Score qualité PCAF Scope 3 : ${formatScore(financed.scope3Score)}.`,
    ...financed.sectors.slice(0, 6).map((sector) => `Secteur ${sector.sector} — ${formatT(sector.scope12T + sector.scope3T)}.`),
    ...top.map((row) => `${row.counterparty} — S1+2 ${formatT(row.financedScope12T ?? 0)}, S3 ${formatT(row.financedScope3T ?? 0)}.`),
    ...(financed.missingData.length ? financed.missingData.slice(0, 6).map((item) => `Donnée manquante : ${item}`) : ["Aucune donnée manquante signalée sur les lignes calculées."]),
    "Méthode : PCAF Part A, résultats du moteur business loans. Aucune formule n'est recalculée dans ce document.",
    ...(financed.notImplementedClasses.length
      ? [`Classes non implémentées, sans résultat inventé : ${financed.notImplementedClasses.join(", ")}.`]
      : []),
  ];
}
