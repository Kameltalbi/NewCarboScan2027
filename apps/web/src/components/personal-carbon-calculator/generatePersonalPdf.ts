import jsPDF from "jspdf";
import { PersonalEmissionsResult } from "./types";
import { getPersonalRecommendations } from "./personalRecommendations";

export function generatePersonalPdf(results: PersonalEmissionsResult, firstName?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  // Header
  doc.setFillColor(34, 84, 61);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text("Bilan carbone personnel", margin, 14);
  doc.setFontSize(18);
  doc.text(firstName ? `${firstName}, votre empreinte annuelle` : "Votre empreinte annuelle", margin, 24);
  y = 44;

  // Total
  doc.setTextColor(34, 84, 61);
  doc.setFontSize(36);
  doc.text(`${results.total.toFixed(2)} tCO₂e/an`, margin, y);
  y += 8;
  doc.setTextColor(90, 90, 90);
  doc.setFontSize(10);
  const sign = results.vsNationalAverage > 0 ? "+" : "";
  doc.text(
    `${sign}${results.vsNationalAverage}% vs moyenne nationale  ·  Objectif 2050 : 2.0 t  ·  Écart : ${results.gapVs2050.toFixed(2)} t`,
    margin,
    y,
  );
  y += 12;

  // Breakdown
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(14);
  doc.text("Répartition par poste", margin, y);
  y += 6;
  doc.setFontSize(10);

  const barW = pageW - margin * 2 - 60;
  results.breakdown.forEach((cat) => {
    const pct = results.total > 0 ? (cat.value / results.total) * 100 : 0;
    doc.setTextColor(50, 50, 50);
    doc.text(cat.name, margin, y);
    doc.text(`${cat.value.toFixed(2)} t  (${pct.toFixed(0)}%)`, pageW - margin, y, { align: "right" });
    y += 2;
    // bar bg
    doc.setFillColor(235, 235, 235);
    doc.rect(margin, y, barW, 3, "F");
    // bar fill
    const hex = cat.color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    doc.setFillColor(r, g, b);
    doc.rect(margin, y, (barW * pct) / 100, 3, "F");
    y += 9;
  });

  y += 4;
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Vos actions prioritaires", margin, y);
  y += 2;
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`Poste principal : ${results.majorCategory}`, margin, y + 4);
  y += 10;

  const recos = getPersonalRecommendations(results);
  recos.forEach((r, i) => {
    if (y > 265) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(34, 84, 61);
    doc.setFontSize(11);
    doc.text(`${i + 1}. ${r.title}`, margin, y);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.text(r.impact, pageW - margin, y, { align: "right" });
    y += 5;
    const lines = doc.splitTextToSize(r.description, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Méthodologie inspirée ADEME / Nos Gestes Climat. Résultats indicatifs.",
    pageW / 2,
    290,
    { align: "center" },
  );

  doc.save(`bilan-carbone-personnel${firstName ? "-" + firstName.toLowerCase() : ""}.pdf`);
}
