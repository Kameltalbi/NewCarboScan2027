import jsPDF from "jspdf";
import { EmissionsResult, IntensityMetrics } from "@/types/empreinteProduit";

// ── Helpers ──
const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const fmtDec = (n: number) => n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString("fr-FR");
const pct = (v: number, t: number) => (t > 0 ? ((v / t) * 100).toFixed(1) : "0");

// ── Colors ──
const C = {
  navy:    [15, 23, 42]    as const,
  teal:    [14, 124, 102]  as const,
  accent:  [26, 188, 156]  as const,
  white:   [255, 255, 255] as const,
  bg:      [248, 250, 252] as const,
  bgCard:  [241, 245, 249] as const,
  border:  [226, 232, 240] as const,
  text:    [30, 41, 59]    as const,
  muted:   [100, 116, 139] as const,
  scope1:  [239, 68, 68]   as const,
  scope2:  [59, 130, 246]  as const,
  scope3:  [168, 85, 247]  as const,
  green:   [16, 185, 129]  as const,
  amber:   [245, 158, 11]  as const,
  rose:    [244, 63, 94]   as const,
  indigo:  [99, 102, 241]  as const,
  cyan:    [6, 182, 212]   as const,
};

type RGB = readonly [number, number, number];

const fill = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
const txt = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
const draw = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

// ── Logo as embedded base64 (loaded at runtime) ──
let logoBase64Cache: string | null = null;

async function loadLogo(): Promise<string | null> {
  if (logoBase64Cache) return logoBase64Cache;
  try {
    const res = await fetch("/images/logo_carboscan.png");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64Cache = reader.result as string;
        resolve(logoBase64Cache);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Draw donut arc (polygon approximation) ──
function drawArc(
  doc: jsPDF,
  cx: number, cy: number,
  outerR: number, innerR: number,
  startDeg: number, endDeg: number,
  color: RGB
) {
  fill(doc, color);
  const pts: [number, number][] = [];
  for (let a = startDeg; a <= endDeg; a += 1.5) {
    const r = (a * Math.PI) / 180;
    pts.push([cx + outerR * Math.cos(r), cy + outerR * Math.sin(r)]);
  }
  const rEnd = (endDeg * Math.PI) / 180;
  pts.push([cx + outerR * Math.cos(rEnd), cy + outerR * Math.sin(rEnd)]);
  for (let a = endDeg; a >= startDeg; a -= 1.5) {
    const r = (a * Math.PI) / 180;
    pts.push([cx + innerR * Math.cos(r), cy + innerR * Math.sin(r)]);
  }
  const rStart = (startDeg * Math.PI) / 180;
  pts.push([cx + innerR * Math.cos(rStart), cy + innerR * Math.sin(rStart)]);

  if (pts.length > 2) {
    for (let i = 1; i < pts.length - 1; i++) {
      doc.triangle(pts[0][0], pts[0][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "F");
    }
  }
}

// ── Footer on every page ──
function drawFooter(doc: jsPDF, W: number, H: number, m: number, page: number, total: number) {
  // Turquoise accent line
  fill(doc, C.accent);
  doc.rect(0, H - 28, W, 1, "F");

  txt(doc, C.muted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  // Left: contact
  doc.text("CarboScan  ·  contact@carboscan.io  ·  +216 55 053 505  ·  www.carboscan.io", m, H - 20);
  // Left: methodology
  doc.text("Méthodologie interne CarboScan — estimation indicative, non certifiée", m, H - 15);

  // Right: page
  doc.text(`${page} / ${total}`, W - m, H - 20, { align: "right" });

  // Center: disclaimer
  doc.setFontSize(6);
  txt(doc, C.border);
  doc.text(
    "Ce document est une estimation indicative. Pour un bilan carbone certifié, contactez CarboScan.",
    W / 2, H - 8, { align: "center" }
  );
}

// ═══════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════
export async function generateResultsPdf(
  results: EmissionsResult,
  companyName?: string,
  metrics?: IntensityMetrics
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = 16; // margin
  const cW = W - m * 2; // content width
  const total = results.totalEmissions;
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  let y = 0;

  // Load logo
  const logo = await loadLogo();

  // ─────────────────────────────────────────────
  // PAGE 1: COVER PAGE
  // ─────────────────────────────────────────────

  // Light background
  fill(doc, C.bg);
  doc.rect(0, 0, W, H, "F");

  // Navy accent strip at top
  fill(doc, C.navy);
  doc.rect(0, 0, W, 5, "F");
  fill(doc, C.accent);
  doc.rect(0, 5, W, 2, "F");

  // Logo
  if (logo) {
    doc.addImage(logo, "PNG", m + 10, 30, 60, 20);
  } else {
    txt(doc, C.teal);
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.text("CarboScan", m + 10, 46);
  }

  // Decorative line
  fill(doc, C.accent);
  doc.rect(m + 10, 58, 40, 1.5, "F");

  // Title
  txt(doc, C.navy);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("BILAN CARBONE", m + 10, 80);
  doc.text("ESTIMATIF", m + 10, 92);

  // Company name
  if (companyName) {
    txt(doc, C.teal);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text(companyName.toUpperCase(), m + 10, 112);
  }

  // Date
  txt(doc, C.muted);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Rapport généré le ${today}`, m + 10, 132);

  // Total emissions highlight box
  const boxY = 155;
  fill(doc, C.white);
  doc.roundedRect(m + 10, boxY, cW - 20, 55, 5, 5, "F");
  draw(doc, C.teal);
  doc.setLineWidth(0.8);
  doc.roundedRect(m + 10, boxY, cW - 20, 55, 5, 5, "S");

  txt(doc, C.muted);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("ÉMISSIONS TOTALES ESTIMÉES", W / 2, boxY + 16, { align: "center" });

  txt(doc, C.teal);
  doc.setFontSize(42);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(total), W / 2, boxY + 37, { align: "center" });

  txt(doc, C.muted);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("tCO₂e / an", W / 2, boxY + 48, { align: "center" });

  // Bottom navy strip
  fill(doc, C.navy);
  doc.rect(0, H - 18, W, 18, "F");
  fill(doc, C.accent);
  doc.rect(0, H - 18, W, 1.5, "F");

  // Conforme text
  txt(doc, [148, 163, 184]);
  doc.setFontSize(8);
  doc.text("Estimation interne  ·  non vérifiée par un tiers", W / 2, H - 12, { align: "center" });

  // ─────────────────────────────────────────────
  // PAGE 2: SYNTHESIS
  // ─────────────────────────────────────────────
  doc.addPage();
  y = 0;

  // Header bar
  fill(doc, C.navy);
  doc.rect(0, 0, W, 22, "F");
  fill(doc, C.accent);
  doc.rect(0, 22, W, 1.5, "F");

  // Header logo/text
  if (logo) {
    doc.addImage(logo, "PNG", m, 4, 36, 14);
  } else {
    txt(doc, C.accent);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CarboScan", m, 14);
  }

  txt(doc, C.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Synthèse des résultats", W - m, 14, { align: "right" });

  y = 32;

  // Section title
  txt(doc, C.navy);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Répartition par Scope", m, y);

  // Accent underline
  fill(doc, C.accent);
  doc.rect(m, y + 2, 45, 1.2, "F");
  y += 14;

  // ── DONUT CHART ──
  const scopes = [
    { label: "Scope 1", sub: "Émissions directes", value: results.scope1, color: C.scope1 },
    { label: "Scope 2", sub: "Énergie indirecte", value: results.scope2, color: C.scope2 },
    { label: "Scope 3", sub: "Autres indirectes", value: results.scope3, color: C.scope3 },
  ];

  const donutCx = m + 38;
  const donutCy = y + 32;
  const outerR = 28;
  const innerR = 17;

  let startAngle = -90;
  scopes.forEach((s) => {
    if (s.value <= 0 || total <= 0) return;
    const sweep = (s.value / total) * 360;
    drawArc(doc, donutCx, donutCy, outerR, innerR, startAngle, startAngle + sweep, s.color as unknown as RGB);
    startAngle += sweep;
  });

  // Donut center
  fill(doc, C.white);
  doc.circle(donutCx, donutCy, innerR, "F");
  txt(doc, C.navy);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(total), donutCx, donutCy - 1, { align: "center" });
  txt(doc, C.muted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("tCO₂e", donutCx, donutCy + 5, { align: "center" });

  // ── SCOPE CARDS (right side) ──
  const cardX = m + 80;
  const cardW = cW - 80;
  scopes.forEach((s, i) => {
    const cardY = y + i * 24;

    // Card background
    fill(doc, C.bgCard);
    doc.roundedRect(cardX, cardY, cardW, 20, 3, 3, "F");

    // Color indicator bar
    fill(doc, s.color as unknown as RGB);
    doc.roundedRect(cardX, cardY, 3, 20, 1.5, 1.5, "F");

    // Scope label
    txt(doc, C.navy);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(s.label, cardX + 8, cardY + 8);

    txt(doc, C.muted);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(s.sub, cardX + 8, cardY + 14);

    // Value
    txt(doc, C.navy);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${fmt(s.value)}`, cardX + cardW - 8, cardY + 8, { align: "right" });

    txt(doc, C.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${pct(s.value, total)}%`, cardX + cardW - 8, cardY + 15, { align: "right" });
  });

  y += 80;

  // ── SEPARATOR ──
  draw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(m, y, W - m, y);
  y += 10;

  // ── INTENSITY METRICS ──
  if (metrics) {
    txt(doc, C.navy);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Indicateurs d'intensité carbone", m, y);
    fill(doc, C.accent);
    doc.rect(m, y + 2, 55, 1.2, "F");
    y += 14;

    const items = [
      { label: "Par collaborateur", value: metrics.perEmployee, unit: "tCO₂e / pers.", icon: "👤" },
      { label: "Par surface", value: metrics.perM2, unit: "tCO₂e / m²", icon: "🏢" },
      { label: "Par chiffre d'affaires", value: metrics.perKDT, unit: "tCO₂e / KDT", icon: "📊" },
    ].filter((i) => i.value > 0);

    if (items.length > 0) {
      const iCardW = (cW - (items.length - 1) * 6) / items.length;
      items.forEach((item, i) => {
        const ix = m + i * (iCardW + 6);

        // Card
        fill(doc, C.bg);
        doc.roundedRect(ix, y, iCardW, 32, 4, 4, "F");
        draw(doc, C.border);
        doc.setLineWidth(0.3);
        doc.roundedRect(ix, y, iCardW, 32, 4, 4, "S");

        // Top accent
        fill(doc, C.accent);
        doc.rect(ix + iCardW / 2 - 10, y, 20, 1.5, "F");

        // Label
        txt(doc, C.muted);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, ix + iCardW / 2, y + 10, { align: "center" });

        // Value
        txt(doc, C.teal);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(fmtDec(item.value), ix + iCardW / 2, y + 21, { align: "center" });

        // Unit
        txt(doc, C.muted);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(item.unit, ix + iCardW / 2, y + 28, { align: "center" });
      });
      y += 42;
    }
  }

  // ── SEPARATOR ──
  draw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(m, y, W - m, y);
  y += 10;

  // ── CATEGORY BREAKDOWN ──
  const sorted = [...results.categoryBreakdown].sort((a, b) => b.value - a.value).slice(0, 10);

  if (sorted.length > 0) {
    txt(doc, C.navy);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Top des postes émetteurs", m, y);
    fill(doc, C.accent);
    doc.rect(m, y + 2, 50, 1.2, "F");
    y += 12;

    const barPalette: RGB[] = [C.scope1, C.scope2, C.scope3, C.teal, C.amber, C.rose, C.indigo, C.cyan, C.green, C.accent];
    const maxVal = sorted[0]?.value || 1;
    const barAreaX = m + 60;
    const barMaxW = cW - 70;

    sorted.forEach((cat, i) => {
      if (y > H - 55) {
        doc.addPage();
        // Repeat header
        fill(doc, C.navy);
        doc.rect(0, 0, W, 22, "F");
        fill(doc, C.accent);
        doc.rect(0, 22, W, 1.5, "F");
        if (logo) {
          doc.addImage(logo, "PNG", m, 4, 36, 14);
        }
        txt(doc, C.white);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Postes émetteurs (suite)", W - m, 14, { align: "right" });
        y = 32;
      }

      const color = barPalette[i % barPalette.length];
      const barW = maxVal > 0 ? barMaxW * (cat.value / maxVal) : 0;

      // Rank number
      txt(doc, C.muted);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}.`, m, y + 4);

      // Category name
      txt(doc, C.text);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const labelMaxW = 48;
      const label = cat.name.length > 25 ? cat.name.substring(0, 24) + "…" : cat.name;
      doc.text(label, m + 6, y + 4);

      // Bar
      fill(doc, C.bgCard);
      doc.roundedRect(barAreaX, y, barMaxW, 7, 2, 2, "F");
      fill(doc, color);
      doc.roundedRect(barAreaX, y, Math.max(barW, 3), 7, 2, 2, "F");

      // Value on bar
      txt(doc, barW > barMaxW * 0.3 ? C.white : C.text);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      const valStr = `${fmt(cat.value)} tCO₂e  (${pct(cat.value, total)}%)`;
      if (barW > barMaxW * 0.3) {
        doc.text(valStr, barAreaX + barW - 3, y + 5, { align: "right" });
      } else {
        doc.text(valStr, barAreaX + barW + 3, y + 5);
      }

      y += 12;
    });
  }

  y += 6;

  // ── CTA ──
  if (y > H - 60) {
    doc.addPage();
    fill(doc, C.navy);
    doc.rect(0, 0, W, 22, "F");
    fill(doc, C.accent);
    doc.rect(0, 22, W, 1.5, "F");
    if (logo) {
      doc.addImage(logo, "PNG", m, 4, 36, 14);
    }
    y = 40;
  }

  // CTA background
  fill(doc, C.teal);
  doc.roundedRect(m, y, cW, 45, 5, 5, "F");

  txt(doc, C.white);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Prêt à réduire votre empreinte carbone ?", W / 2, y + 14, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Obtenez un bilan carbone complet, avec un", W / 2, y + 23, { align: "center" });
  doc.text("accompagnement expert et un plan de réduction personnalisé.", W / 2, y + 29, { align: "center" });

  // CTA button
  fill(doc, C.white);
  const btnW = 70;
  const btnX = (W - btnW) / 2;
  doc.roundedRect(btnX, y + 33, btnW, 9, 4, 4, "F");
  txt(doc, C.teal);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Demander un diagnostic gratuit", W / 2, y + 39.5, { align: "center" });

  // ─────────────────────────────────────────────
  // FOOTERS ON ALL PAGES
  // ─────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    if (p === 1) continue; // Cover page — no footer
    drawFooter(doc, W, H, m, p - 1, pageCount - 1);
  }

  // Download
  const filename = companyName
    ? `bilan-carbone-${companyName.toLowerCase().replace(/\s+/g, "-")}.pdf`
    : "bilan-carbone-estimatif.pdf";
  doc.save(filename);
}
