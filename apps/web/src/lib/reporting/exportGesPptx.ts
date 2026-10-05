import pptxgen from "pptxgenjs";
import type { GesReportDataset } from "./gesReportDataset.ts";
import { formatScore, formatT, planExecutiveSlides, type SlidePlan } from "./gesReportSlides.ts";

const GREEN = "073F35";
const INK = "072F29";
const MUTED = "53645E";
const SURFACE = "F7FAF8";
const WHITE = "FFFFFF";
const LINE = "DCE5E0";
const SCOPE = ["00BF72", "00BDCE", "FF851B"];

export async function renderGesPptx(dataset: GesReportDataset): Promise<Uint8Array> {
  const slides = planExecutiveSlides(dataset);
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `Présentation GES ${dataset.organizationName} ${dataset.year}`;
  pptx.author = "CarboScan";
  pptx.company = "CarboScan";
  const total = slides.length;
  slides.forEach((plan, index) => {
    const slide = pptx.addSlide();
    if (plan.id === "cover") drawCover(slide, dataset);
    else drawContent(pptx, slide, plan, dataset);
    drawFooter(slide, dataset, index + 1, total);
  });
  const output = await pptx.write({ outputType: "uint8array" });
  return output instanceof Uint8Array ? output : new Uint8Array(output as ArrayBuffer);
}

function drawCover(slide: pptxgen.Slide, dataset: GesReportDataset) {
  slide.background = { color: GREEN };
  slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: "00BF72" } });
  slide.addText("PRÉSENTATION EXÉCUTIVE", {
    x: 0.7, y: 1.3, w: 11, h: 0.35,
    fontFace: "Calibri", fontSize: 14, color: "B7E4C7", bold: true, charSpacing: 3,
  });
  slide.addText(dataset.organizationName, {
    x: 0.7, y: 1.9, w: 11.5, h: 0.9,
    fontFace: "Calibri", fontSize: 36, color: WHITE, bold: true,
  });
  slide.addText(`Exercice ${dataset.year}  ·  ${dataset.perimeterLabel}`, {
    x: 0.7, y: 2.9, w: 11, h: 0.4,
    fontFace: "Calibri", fontSize: 16, color: "DCE5E0",
  });
  const kpis = [
    ["Empreinte opérationnelle", dataset.operational.determinable ? formatT(dataset.operational.totalT) : "Non déterminable"],
    ["Scope 1", formatT(dataset.operational.scope1T)],
    ["Scope 2", formatT(dataset.operational.scope2T)],
    ["Scope 3 hors cat. 15", dataset.operational.determinable ? formatT(dataset.operational.scope3T) : "Non déterminable"],
  ];
  kpis.forEach((kpi, index) => {
    const x = 0.7 + index * 3.05;
    slide.addShape("roundRect", {
      x, y: 4.5, w: 2.85, h: 1.35,
      fill: { color: "0B4A3E" }, rectRadius: 0.08,
    });
    slide.addText(kpi[0], { x: x + 0.15, y: 4.65, w: 2.55, h: 0.35, fontSize: 11, color: "B7E4C7", fontFace: "Calibri" });
    slide.addText(kpi[1], { x: x + 0.15, y: 5.05, w: 2.55, h: 0.5, fontSize: 18, color: WHITE, bold: true, fontFace: "Calibri" });
  });
}

function drawContent(
  pptx: pptxgen,
  slide: pptxgen.Slide,
  plan: SlidePlan,
  dataset: GesReportDataset,
) {
  slide.background = { color: WHITE };
  slide.addText(plan.kicker.toUpperCase(), {
    x: 0.5, y: 0.28, w: 10, h: 0.28,
    fontFace: "Calibri", fontSize: 12, color: GREEN, bold: true, charSpacing: 1.5,
  });
  slide.addText(plan.title, {
    x: 0.5, y: 0.58, w: 12, h: 0.5,
    fontFace: "Calibri", fontSize: 26, color: INK, bold: true,
  });
  slide.addText(plan.message, {
    x: 0.5, y: 1.15, w: 12.2, h: 0.4,
    fontFace: "Calibri", fontSize: 14, color: MUTED,
  });

  if (plan.id === "pcaf" || plan.id === "sectors" || plan.id === "pcaf-quality" || plan.id === "counterparties" || plan.id === "improvements") {
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: "C2410C" } });
  }

  if (plan.id === "scopes") drawScopeChart(pptx, slide, dataset);
  if (plan.id === "posts") drawPosts(slide, dataset);
  if (plan.id === "footprint") drawFootprintCards(slide, dataset);
  if (plan.id === "operational-gap") drawOperationalGap(slide, plan.message);
  if (plan.id === "history") drawHistory(slide, dataset);
  if (plan.id === "quality") drawQuality(slide, dataset);
  if (plan.id === "pcaf") drawPcaf(slide, dataset);
  if (plan.id === "sectors") drawSectors(slide, dataset);
  if (plan.id === "pcaf-quality") drawPcafQuality(slide, dataset);
  if (plan.id === "counterparties") drawCounterparties(slide, dataset);
  if (plan.id === "improvements") drawImprovements(slide, dataset);
  if (plan.id === "actions") drawActions(slide, dataset);
  if (plan.id === "perimeter") drawPerimeter(slide, dataset);
  if (plan.id === "exec") drawExec(slide, dataset);
}

function drawOperationalGap(slide: pptxgen.Slide, message: string) {
  slide.addShape("roundRect", {
    x: 0.6, y: 2.1, w: 12, h: 2.4,
    fill: { color: "FFF7ED" }, line: { color: "C2410C" }, rectRadius: 0.08,
  });
  slide.addText(message, {
    x: 0.95, y: 2.45, w: 11.3, h: 1.1,
    fontFace: "Calibri", fontSize: 22, color: "9A3412", bold: true,
  });
  slide.addText("Donnée manquante : ventilation Scope 3 insuffisante pour isoler la catégorie 15.", {
    x: 0.95, y: 3.6, w: 11.3, h: 0.5,
    fontFace: "Calibri", fontSize: 16, color: INK,
  });
}

function drawFooter(slide: pptxgen.Slide, dataset: GesReportDataset, page: number, total: number) {
  slide.addText(`CarboScan  ·  ${dataset.organizationName}  ·  ${dataset.year}  ·  ${page}/${total}`, {
    x: 0.5, y: 7.15, w: 12.3, h: 0.22,
    fontFace: "Calibri", fontSize: 10, color: MUTED,
  });
}

function drawExec(slide: pptxgen.Slide, dataset: GesReportDataset) {
  const cards = [
    ["Empreinte opérationnelle", dataset.operational.determinable ? formatT(dataset.operational.totalT) : "Non déterminable"],
    ["Scope 3 hors catégorie 15", dataset.operational.determinable ? formatT(dataset.operational.scope3T) : "Non déterminable"],
  ];
  if (dataset.financed) {
    cards.push(["Scope 1+2 financé", formatT(dataset.financed.scope12T)]);
    cards.push(["Scope 3 financé", formatT(dataset.financed.scope3T)]);
  }
  cards.forEach((card, index) => {
    const x = 0.5 + (index % 2) * 6.3;
    const y = 1.9 + Math.floor(index / 2) * 1.7;
    slide.addShape("roundRect", { x, y, w: 6, h: 1.45, fill: { color: SURFACE }, rectRadius: 0.08, line: { color: LINE } });
    slide.addText(card[0], { x: x + 0.3, y: y + 0.25, w: 5.4, h: 0.35, fontSize: 14, color: MUTED, fontFace: "Calibri" });
    slide.addText(card[1], { x: x + 0.3, y: y + 0.65, w: 5.4, h: 0.5, fontSize: 26, color: GREEN, bold: true, fontFace: "Calibri" });
  });
}

function drawPerimeter(slide: pptxgen.Slide, dataset: GesReportDataset) {
  const lines = [
    `Organisation : ${dataset.organizationName}`,
    `Exercice : ${dataset.year}`,
    `Périmètre : ${dataset.perimeterLabel}`,
    dataset.financialInstitution && !dataset.operational.determinable
      ? "Institution financière : total opérationnel non publié, ventilation Scope 3 insuffisante."
      : dataset.financialInstitution
        ? "Institution financière : empreinte opérationnelle et émissions financées séparées."
        : "Organisation : empreinte opérationnelle Scopes 1, 2 et 3.",
    "La catégorie 15 n'est pas additionnée à l'empreinte opérationnelle.",
  ];
  lines.forEach((line, index) => {
    slide.addText(line, {
      x: 0.7, y: 1.9 + index * 0.7, w: 11.5, h: 0.45,
      fontFace: "Calibri", fontSize: 18, color: INK,
    });
  });
}

function drawFootprintCards(slide: pptxgen.Slide, dataset: GesReportDataset) {
  if (!dataset.operational.determinable) return;
  const items = [
    ["Total opérations", formatT(dataset.operational.totalT)],
    ["Intensité / employé", dataset.operational.intensityPerEmployeeT == null ? "—" : formatT(dataset.operational.intensityPerEmployeeT)],
    ["Intensité chiffre d'affaires", dataset.operational.intensityKgPerThousandRevenue == null ? "—" : `${dataset.operational.intensityKgPerThousandRevenue.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kgCO₂e / k${dataset.currency}`],
  ];
  items.forEach((item, index) => {
    const x = 0.5 + index * 4.2;
    slide.addShape("roundRect", { x, y: 2.2, w: 3.95, h: 2.4, fill: { color: SURFACE }, rectRadius: 0.08 });
    slide.addText(item[0], { x: x + 0.25, y: 2.5, w: 3.45, h: 0.6, fontSize: 14, color: MUTED, fontFace: "Calibri" });
    slide.addText(item[1], { x: x + 0.25, y: 3.2, w: 3.45, h: 0.8, fontSize: 20, color: GREEN, bold: true, fontFace: "Calibri" });
  });
}

function drawScopeChart(pptx: pptxgen, slide: pptxgen.Slide, dataset: GesReportDataset) {
  const op = dataset.operational;
  if (!op.determinable || op.totalT == null || op.scope3T == null) return;
  slide.addChart(pptx.ChartType.bar, [
    { name: "tCO₂e", labels: ["Scope 1", "Scope 2", "Scope 3 hors cat. 15"], values: [op.scope1T, op.scope2T, op.scope3T] },
  ], {
    x: 0.6, y: 1.8, w: 8.2, h: 4.6,
    barGrouping: "clustered",
    showValue: true,
    chartColors: SCOPE,
    showLegend: false,
    catAxisLabelColor: MUTED,
    valAxisLabelColor: MUTED,
  });
  const shares = [
    ["Scope 1", share(op.scope1T, op.totalT), SCOPE[0]],
    ["Scope 2", share(op.scope2T, op.totalT), SCOPE[1]],
    ["Scope 3", share(op.scope3T, op.totalT), SCOPE[2]],
  ];
  shares.forEach((item, index) => {
    slide.addText(`${item[0]}  ${item[1]}`, {
      x: 9.1, y: 2.4 + index * 0.8, w: 3.6, h: 0.4,
      fontFace: "Calibri", fontSize: 16, color: INK, bold: true,
    });
  });
}

function drawPosts(slide: pptxgen.Slide, dataset: GesReportDataset) {
  const posts = dataset.operational.posts.slice(0, 6);
  posts.forEach((post, index) => {
    const y = 1.85 + index * 0.75;
    slide.addText(post.name, { x: 0.6, y, w: 6.2, h: 0.35, fontSize: 14, color: INK, fontFace: "Calibri" });
    slide.addText(formatT(post.emissionsT), { x: 7, y, w: 2.4, h: 0.35, fontSize: 14, color: GREEN, bold: true, fontFace: "Calibri" });
    slide.addText(`${post.sharePct.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %`, {
      x: 9.6, y, w: 2, h: 0.35, fontSize: 14, color: MUTED, fontFace: "Calibri",
    });
  });
}

function drawHistory(slide: pptxgen.Slide, dataset: GesReportDataset) {
  dataset.history.forEach((point, index) => {
    const x = 0.6 + index * 2.4;
    slide.addShape("roundRect", { x, y: 2.4, w: 2.2, h: 2.2, fill: { color: SURFACE }, rectRadius: 0.08 });
    slide.addText(String(point.year), { x, y: 2.7, w: 2.2, h: 0.4, align: "center", fontSize: 14, color: MUTED, fontFace: "Calibri" });
    slide.addText(formatT(point.operationalT), { x: x + 0.1, y: 3.2, w: 2, h: 0.7, align: "center", fontSize: 16, color: GREEN, bold: true, fontFace: "Calibri" });
  });
}

function drawQuality(slide: pptxgen.Slide, dataset: GesReportDataset) {
  const q = dataset.operational.quality;
  const rows = [
    ["Données réelles", `${q.realPct} %`],
    ["Données estimées", `${q.estimatedPct} %`],
    ["Données par défaut", `${q.defaultPct} %`],
  ];
  rows.forEach((row, index) => {
    const y = 2.2 + index * 1.2;
    slide.addShape("roundRect", { x: 0.7, y, w: 8, h: 1, fill: { color: SURFACE }, rectRadius: 0.08 });
    slide.addText(row[0], { x: 1, y: y + 0.25, w: 4.5, h: 0.5, fontSize: 18, color: INK, fontFace: "Calibri" });
    slide.addText(row[1], { x: 5.5, y: y + 0.25, w: 2.8, h: 0.5, fontSize: 18, color: GREEN, bold: true, fontFace: "Calibri" });
  });
}

function drawPcaf(slide: pptxgen.Slide, dataset: GesReportDataset) {
  const financed = dataset.financed;
  if (!financed) return;
  const cards = [
    ["Scope 1+2 financé", formatT(financed.scope12T)],
    ["Scope 3 financé", formatT(financed.scope3T)],
    ["Exposition", financed.exposure == null ? "—" : financed.exposure.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + (financed.currency ? ` ${financed.currency}` : "")],
    ["Couverture S1+2 / S3", `${financed.scope12Lines}/${financed.implementedLines} · ${financed.scope3Lines}/${financed.implementedLines}`],
  ];
  cards.forEach((card, index) => {
    const x = 0.5 + (index % 2) * 6.3;
    const y = 1.9 + Math.floor(index / 2) * 2;
    slide.addShape("roundRect", { x, y, w: 6, h: 1.7, fill: { color: SURFACE }, rectRadius: 0.08 });
    slide.addText(card[0], { x: x + 0.3, y: y + 0.3, w: 5.4, h: 0.4, fontSize: 14, color: MUTED, fontFace: "Calibri" });
    slide.addText(card[1], { x: x + 0.3, y: y + 0.8, w: 5.4, h: 0.5, fontSize: 22, color: GREEN, bold: true, fontFace: "Calibri" });
  });
}

function drawSectors(slide: pptxgen.Slide, dataset: GesReportDataset) {
  const sectors = dataset.financed?.sectors.slice(0, 6) ?? [];
  sectors.forEach((sector, index) => {
    const y = 1.9 + index * 0.75;
    slide.addText(sector.sector, { x: 0.6, y, w: 5, h: 0.4, fontSize: 15, color: INK, fontFace: "Calibri" });
    slide.addText(formatT(sector.scope12T + sector.scope3T), { x: 6, y, w: 3, h: 0.4, fontSize: 15, color: GREEN, bold: true, fontFace: "Calibri" });
  });
}

function drawPcafQuality(slide: pptxgen.Slide, dataset: GesReportDataset) {
  const financed = dataset.financed;
  if (!financed) return;
  slide.addText(`Score Scope 1+2   ${formatScore(financed.scope12Score)}`, {
    x: 0.7, y: 2.4, w: 10, h: 0.7, fontSize: 28, color: GREEN, bold: true, fontFace: "Calibri",
  });
  slide.addText(`Score Scope 3   ${formatScore(financed.scope3Score)}`, {
    x: 0.7, y: 3.4, w: 10, h: 0.7, fontSize: 28, color: GREEN, bold: true, fontFace: "Calibri",
  });
  slide.addText("Moyenne pondérée par l'encours. 1 = meilleure qualité.", {
    x: 0.7, y: 4.6, w: 10, h: 0.4, fontSize: 14, color: MUTED, fontFace: "Calibri",
  });
}

function drawCounterparties(slide: pptxgen.Slide, dataset: GesReportDataset) {
  const rows = [...(dataset.financed?.exposures ?? [])]
    .filter((row) => (row.financedScope12T ?? 0) + (row.financedScope3T ?? 0) > 0)
    .sort((a, b) => (b.financedScope12T ?? 0) + (b.financedScope3T ?? 0) - ((a.financedScope12T ?? 0) + (a.financedScope3T ?? 0)))
    .slice(0, 6);
  rows.forEach((row, index) => {
    const y = 1.85 + index * 0.75;
    slide.addText(row.counterparty, { x: 0.6, y, w: 5.2, h: 0.35, fontSize: 14, color: INK, fontFace: "Calibri" });
    slide.addText(row.sector || "", { x: 5.8, y, w: 3.2, h: 0.35, fontSize: 13, color: MUTED, fontFace: "Calibri" });
    slide.addText(formatT((row.financedScope12T ?? 0) + (row.financedScope3T ?? 0)), {
      x: 9.2, y, w: 3.2, h: 0.35, fontSize: 14, color: GREEN, bold: true, fontFace: "Calibri",
    });
  });
}

function drawImprovements(slide: pptxgen.Slide, dataset: GesReportDataset) {
  const financed = dataset.financed;
  const lines = [
    ...(financed?.improvements ?? []),
    ...(financed?.notImplementedClasses ?? []).map((name) => `Classe non implémentée : ${name}`),
  ].slice(0, 5);
  lines.forEach((line, index) => {
    slide.addText(line, {
      x: 0.7, y: 1.9 + index * 0.85, w: 11.5, h: 0.6,
      fontSize: 16, color: INK, fontFace: "Calibri",
    });
  });
}

function drawActions(slide: pptxgen.Slide, dataset: GesReportDataset) {
  dataset.actions.slice(0, 5).forEach((action, index) => {
    const y = 1.9 + index * 0.85;
    slide.addText(action.title, { x: 0.7, y, w: 8, h: 0.4, fontSize: 16, color: INK, fontFace: "Calibri" });
    slide.addText(action.status, { x: 9, y, w: 3, h: 0.4, fontSize: 14, color: GREEN, fontFace: "Calibri" });
  });
}

function share(part: number, total: number): string {
  if (total <= 0) return "0 %";
  return `${Math.round((part / total) * 100)} %`;
}
