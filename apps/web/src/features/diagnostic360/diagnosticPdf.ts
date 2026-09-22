import { jsPDF } from "jspdf";
import type { FrozenRecommendation, PublicSnapshot } from "./types";

const MARGIN = 16;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

const AXIS_LABELS: Record<string, string> = {
  measure: "Mesure",
  energy: "Énergie",
  mobility: "Mobilité",
  purchases: "Achats",
  steering: "Pilotage",
  governance: "Gouvernance carbone",
};

const MODULE_NAMES: Record<string, string> = {
  bilan: "Bilan carbone CarboScan",
  collect: "Collecte",
  wattbim: "WattBim",
  pcf: "Empreinte produit",
  cbam: "CBAM",
  pcaf: "PCAF",
};

const CTA: Record<string, string> = {
  bilan: "Démarrer mon bilan carbone",
  collect: "Organiser la collecte",
  wattbim: "Suivre l'énergie avec WattBim",
  pcaf: "Adapter la mesure au secteur financier",
  pcf: "Mesurer l'empreinte produit",
  cbam: "Vérifier votre exposition au MACF",
  history: "Échanger avec CarboScan",
  contact: "Échanger avec CarboScan",
};

const PRIORITY: Record<string, string> = {
  high: "Priorité haute",
  medium: "Priorité moyenne",
  low: "Priorité basse",
};

export const PDF_NOT_AN_INVENTORY =
  "Ce diagnostic évalue la maturité de votre démarche carbone et la disponibilité de vos données. Il ne constitue pas un inventaire d'émissions de gaz à effet de serre.";

export const PDF_FOOTER =
  "Le Diagnostic Carbone 360° est un outil d'orientation et de maturité. Il ne remplace pas un bilan GES réalisé selon une méthodologie reconnue.";

export const PDF_UNQUANTIFIED = "Potentiel d'optimisation à étudier";

export type DiagnosticPdfInput = {
  snapshot: PublicSnapshot;
  companyName?: string | null;
  completedAt?: string | null;
  logoDataUrl?: string | null;
};

export type DiagnosticPdfDocument = {
  document: jsPDF;
  text: string;
};

export function createDiagnosticPdf(input: DiagnosticPdfInput): DiagnosticPdfDocument {
  const lines: string[] = [];
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
  drawCover(doc, lines, input);
  doc.addPage();
  drawPriorities(doc, lines, input.snapshot);
  doc.addPage();
  drawRoadmap(doc, lines, input.snapshot);
  return { document: doc, text: lines.join("\n") };
}

export async function downloadDiagnosticPdf(input: DiagnosticPdfInput): Promise<void> {
  const logoDataUrl = input.logoDataUrl === undefined ? await loadBrandLogo() : input.logoDataUrl;
  const { document } = createDiagnosticPdf({ ...input, logoDataUrl });
  const day = (input.completedAt ?? new Date().toISOString()).slice(0, 10);
  document.save(`diagnostic-carbone-360-${day}.pdf`);
}

function drawCover(doc: jsPDF, lines: string[], input: DiagnosticPdfInput) {
  const snapshot = input.snapshot;
  let y = 18;
  if (input.logoDataUrl) {
    doc.addImage(input.logoDataUrl, "PNG", MARGIN, y, 42, 10);
    y += 16;
  } else {
    y = write(doc, lines, "CarboScan", MARGIN, y, 12, "#075C43");
  }
  y = write(doc, lines, "Diagnostic Carbone 360°", MARGIN, y + 2, 18, "#073D30");
  if (input.companyName) y = write(doc, lines, input.companyName, MARGIN, y + 1, 12, "#073D30");
  y = write(doc, lines, formatDate(input.completedAt), MARGIN, y + 1, 10, "#52615C");
  y = write(doc, lines, snapshot.templateVersion, MARGIN, y, 8, "#8A9691");
  y += 4;
  y = write(doc, lines, snapshot.presentation.scoreQualifierFr, MARGIN, y, 11, "#087354");
  y = write(doc, lines, `${snapshot.maturityScore ?? "—"} / 100`, MARGIN, y + 1, 22, "#073D30");
  y = write(doc, lines, snapshot.presentation.displayLevelFr ?? "—", MARGIN, y + 1, 12, "#073D30");
  y += 3;
  y = write(doc, lines, "Disponibilité des données", MARGIN, y, 11, "#087354");
  y = write(doc, lines, `${snapshot.dataReadinessScore ?? "—"} / 100`, MARGIN, y + 1, 16, "#073D30");
  y = write(doc, lines, `Fiabilité : ${reliabilityLabel(snapshot.reliability)}`, MARGIN, y + 2, 11, "#073D30");
  if (snapshot.reliabilityLimited && snapshot.presentation.reliabilityWarningFr) {
    y = write(doc, lines, snapshot.presentation.reliabilityWarningFr, MARGIN, y + 2, 10, "#073D30");
  }
  if (snapshot.axisScores.length > 0) {
    y += 4;
    y = write(doc, lines, "Axes", MARGIN, y, 11, "#087354");
    for (const axis of snapshot.axisScores) {
      const label = AXIS_LABELS[axis.axisId] ?? axis.axisId;
      const score = axis.maturity == null ? "—" : `${axis.maturity} / 100`;
      y = write(doc, lines, `${label}  ${score}`, MARGIN, y + 1, 11, "#073D30");
    }
  }
  write(doc, lines, PDF_NOT_AN_INVENTORY, MARGIN, Math.max(y + 6, 250), 9, "#52615C");
}

function drawPriorities(doc: jsPDF, lines: string[], snapshot: PublicSnapshot) {
  let y = write(doc, lines, "Vos 3 priorités", MARGIN, 20, 18, "#073D30");
  const recommendations = snapshot.recommendations.slice(0, 3);
  if (recommendations.length === 0) {
    write(doc, lines, "Aucune priorité n'a été retenue pour ce diagnostic.", MARGIN, y + 4, 11, "#073D30");
    return;
  }
  for (const item of recommendations) {
    y = drawRecommendation(doc, lines, item, y + 5);
  }
}

function drawRecommendation(doc: jsPDF, lines: string[], item: FrozenRecommendation, y: number): number {
  y = write(doc, lines, item.titleFr, MARGIN, y, 13, "#073D30");
  const axis = AXIS_LABELS[item.axisId] ?? item.axisId;
  y = write(doc, lines, `${axis} · ${PRIORITY[item.priority] ?? item.priority}`, MARGIN, y, 9, "#087354");
  y = write(doc, lines, item.bodyFr, MARGIN, y + 1, 10, "#073D30");
  const moduleName = MODULE_NAMES[item.module];
  if (moduleName) y = write(doc, lines, `Module CarboScan : ${moduleName}`, MARGIN, y + 1, 10, "#075C43");
  return y;
}

function drawRoadmap(doc: jsPDF, lines: string[], snapshot: PublicSnapshot) {
  const byId = new Map(snapshot.recommendations.slice(0, 3).map((item) => [item.id, item]));
  const roadmap = snapshot.roadmap;
  const nearIds = roadmap
    ? [...roadmap.now, ...roadmap.months0to3]
    : snapshot.recommendations.filter((item) => item.priority !== "low").map((item) => item.id);
  const laterIds = roadmap
    ? roadmap.months3to12
    : snapshot.recommendations.filter((item) => item.priority === "low").map((item) => item.id);
  const near = unique(nearIds).map((id) => byId.get(id)).filter((item): item is FrozenRecommendation => Boolean(item));
  const later = unique(laterIds).map((id) => byId.get(id)).filter((item): item is FrozenRecommendation => Boolean(item));
  let y = write(doc, lines, "Votre feuille de route", MARGIN, 20, 18, "#073D30");
  y = writePeriod(doc, lines, "0–3 mois", near, y + 4);
  y = writePeriod(doc, lines, "3–12 mois", later, y + 4);
  y = write(doc, lines, PDF_UNQUANTIFIED, MARGIN, y + 4, 11, "#073D30");
  const primary = snapshot.recommendations[0];
  const cta = primary ? CTA[primary.module] ?? "Démarrer mon bilan carbone" : "Démarrer mon bilan carbone";
  y = write(doc, lines, cta, MARGIN, y + 6, 13, "#075C43");
  write(doc, lines, PDF_FOOTER, MARGIN, Math.max(y + 8, 270), 8, "#52615C");
}

function writePeriod(doc: jsPDF, lines: string[], title: string, items: FrozenRecommendation[], y: number): number {
  y = write(doc, lines, title, MARGIN, y, 13, "#087354");
  if (items.length === 0) {
    return write(doc, lines, "Aucune priorité supplémentaire pour cette période.", MARGIN, y + 1, 10, "#52615C");
  }
  for (const item of items) {
    y = write(doc, lines, item.titleFr, MARGIN, y + 1, 11, "#073D30");
  }
  return y;
}

function write(doc: jsPDF, lines: string[], value: string, x: number, y: number, size: number, color: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(color);
  const wrapped = doc.splitTextToSize(value, CONTENT_W) as string[];
  doc.text(wrapped, x, y);
  lines.push(value);
  return y + wrapped.length * (size * 0.45) + 1.5;
}

function reliabilityLabel(value: PublicSnapshot["reliability"]): string {
  if (value === "high") return "élevée";
  if (value === "medium") return "moyenne";
  return "limitée";
}

function formatDate(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("fr-FR");
  return date.toLocaleDateString("fr-FR");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

async function loadBrandLogo(): Promise<string | null> {
  try {
    const response = await fetch("/brand/carboscan-logo-light.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
