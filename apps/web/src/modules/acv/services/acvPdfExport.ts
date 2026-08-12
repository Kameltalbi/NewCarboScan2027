/**
 * Génération PDF du rapport ACV conforme ISO 14040/14044
 * Utilise jsPDF pour un rendu professionnel
 */

import jsPDF from 'jspdf';
import type { ACVProductResult } from '../engine/acvCalculationEngine';
import type { ACVProject } from '@/types/acv';
import { formatImpact } from '../engine/acvCalculationEngine';

const COLORS = {
  primary: [30, 64, 175] as [number, number, number],   // Blue
  secondary: [100, 116, 139] as [number, number, number], // Slate
  accent: [16, 185, 129] as [number, number, number],    // Emerald
  danger: [239, 68, 68] as [number, number, number],     // Red
  text: [15, 23, 42] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
  bg: [248, 250, 252] as [number, number, number],
};

export function generateACVPdfReport(
  project: ACVProject,
  result: ACVProductResult
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
    addFooter(doc, project);
  };

  const checkPage = (needed: number) => {
    if (y + needed > 275) addPage();
  };

  // ── PAGE DE COUVERTURE ──
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 80, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport ACV', margin, 40);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Analyse du Cycle de Vie — ISO 14040/14044', margin, 52);
  
  doc.setFontSize(11);
  doc.text(project.name, margin, 65);

  // Métadonnées
  doc.setTextColor(...COLORS.text);
  y = 95;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Date du rapport :', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('fr-FR'), margin + 40, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Unité fonctionnelle :', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(project.functional_unit, margin + 42, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Statut :', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(project.status, margin + 20, y);
  y += 15;

  // ── SECTION 1: MÉTHODOLOGIE ──
  y = drawSectionTitle(doc, '1. Cadre méthodologique', y, margin);
  
  const methodology = [
    'Ce rapport est établi conformément aux normes ISO 14040 (principes) et ISO 14044 (exigences)',
    'applicables à l\'Analyse du Cycle de Vie. La nomenclature suit le standard EN 15804 pour',
    'la répartition en modules (A1 à D).',
    '',
    `Objectif de l'étude : ${project.goal_definition}`,
    `Périmètre : ${project.scope_definition}`,
  ];
  
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  methodology.forEach(line => {
    checkPage(5);
    doc.text(line, margin, y);
    y += 5;
  });
  y += 5;

  // ── SECTION 2: RÉSULTATS MULTI-IMPACTS ──
  y = drawSectionTitle(doc, '2. Résultats des impacts environnementaux', y, margin);

  // Tableau des KPIs
  const kpis = [
    { label: 'Changement climatique', value: formatImpact(result.totals.carbon, 'carbon'), unit: 'kgCO₂e' },
    { label: 'Énergie primaire', value: formatImpact(result.totals.energy, 'energy'), unit: 'MJ' },
    { label: 'Consommation d\'eau', value: formatImpact(result.totals.water, 'water'), unit: 'm³' },
    { label: 'Acidification', value: formatImpact(result.totals.acidification, 'acidification'), unit: 'kgSO₂e' },
  ];

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Catégorie d\'impact', margin + 3, y + 5.5);
  doc.text('Valeur totale', margin + contentWidth - 40, y + 5.5);
  y += 8;

  kpis.forEach((kpi, i) => {
    checkPage(8);
    doc.setFillColor(i % 2 === 0 ? 248 : 241, i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 252 : 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(kpi.label, margin + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, margin + contentWidth - 40, y + 5);
    y += 7;
  });
  y += 10;

  // ── SECTION 3: RÉPARTITION PAR COMPOSANT ──
  checkPage(40);
  y = drawSectionTitle(doc, '3. Répartition par composant', y, margin);

  // Table header
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Composant', margin + 3, y + 5.5);
  doc.text('Matériau', margin + 55, y + 5.5);
  doc.text('Procédé', margin + 85, y + 5.5);
  doc.text('Transport', margin + 110, y + 5.5);
  doc.text('Total', margin + 135, y + 5.5);
  doc.text('%', margin + 158, y + 5.5);
  y += 8;

  result.components.forEach((c, i) => {
    checkPage(8);
    doc.setFillColor(i % 2 === 0 ? 248 : 241, i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 252 : 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const name = c.component_name.length > 20 ? c.component_name.slice(0, 20) + '…' : c.component_name;
    doc.text(name, margin + 3, y + 5);
    doc.text(c.material_impact.carbon.toFixed(2), margin + 55, y + 5);
    doc.text(c.process_impact.carbon.toFixed(2), margin + 85, y + 5);
    doc.text(c.transport_impact.carbon.toFixed(2), margin + 110, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(c.total.carbon.toFixed(2), margin + 135, y + 5);
    doc.text(`${c.percentage.toFixed(1)}%`, margin + 158, y + 5);
    y += 7;
  });
  y += 10;

  // ── SECTION 4: RÉPARTITION PAR PHASE DU CYCLE DE VIE ──
  checkPage(40);
  y = drawSectionTitle(doc, '4. Répartition par phase du cycle de vie (EN 15804)', y, margin);

  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Module', margin + 3, y + 5.5);
  doc.text('Phase', margin + 20, y + 5.5);
  doc.text('kgCO₂e', margin + 90, y + 5.5);
  doc.text('MJ', margin + 115, y + 5.5);
  doc.text('m³', margin + 135, y + 5.5);
  doc.text('%', margin + 155, y + 5.5);
  y += 8;

  result.lifecycle.forEach((l, i) => {
    checkPage(8);
    doc.setFillColor(i % 2 === 0 ? 248 : 241, i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 252 : 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(l.module_code, margin + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(l.module_name, margin + 20, y + 5);
    doc.text(l.impact.carbon.toFixed(2), margin + 90, y + 5);
    doc.text(l.impact.energy.toFixed(2), margin + 115, y + 5);
    doc.text(l.impact.water.toFixed(3), margin + 135, y + 5);
    doc.text(`${l.percentage.toFixed(1)}%`, margin + 155, y + 5);
    y += 7;
  });
  y += 10;

  // ── SECTION 5: HOTSPOTS ──
  const carbonHotspots = result.hotspots.filter(h => h.impact_category === 'carbon');
  if (carbonHotspots.length > 0) {
    checkPage(30);
    y = drawSectionTitle(doc, '5. Analyse des hotspots (contributions ≥ 5%)', y, margin);

    carbonHotspots.forEach((h, i) => {
      checkPage(12);
      doc.setFillColor(255, 247, 237); // orange-50
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setDrawColor(251, 146, 60);
      doc.rect(margin, y, contentWidth, 10, 'S');
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(h.source, margin + 3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${h.percentage.toFixed(1)}% — ${formatImpact(h.value, 'carbon')}`, margin + 3, y + 9);
      
      // Barre de progression
      const barWidth = Math.min(h.percentage, 100) * 0.5;
      doc.setFillColor(...COLORS.primary);
      doc.rect(margin + contentWidth - 55, y + 3, barWidth, 4, 'F');
      y += 12;
    });
    y += 5;
  }

  // ── SECTION 6: RECOMMANDATIONS ──
  checkPage(30);
  y = drawSectionTitle(doc, '6. Recommandations', y, margin);

  const recommendations = generateRecommendations(result);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  recommendations.forEach(rec => {
    checkPage(8);
    doc.setFont('helvetica', 'bold');
    doc.text('•', margin, y);
    doc.text(rec.title, margin + 5, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(rec.description, margin + 5, y);
    y += 7;
  });

  // Footer sur chaque page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, project, i, totalPages);
  }

  // Télécharger
  doc.save(`rapport-acv-${project.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  doc.setFillColor(...COLORS.bg);
  doc.rect(margin, y - 2, 170, 10, 'F');
  doc.setDrawColor(...COLORS.primary);
  doc.line(margin, y + 8, margin + 170, y + 8);
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y + 5);
  return y + 14;
}

function addFooter(doc: jsPDF, project: ACVProject, page?: number, total?: number) {
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Rapport ACV — ${project.name} — ISO 14040/14044 — Base Carbone ADEME`,
    20, 290
  );
  if (page && total) {
    doc.text(`${page} / ${total}`, 185, 290);
  }
}

function generateRecommendations(result: ACVProductResult): Array<{ title: string; description: string }> {
  const recs: Array<{ title: string; description: string }> = [];
  
  // Analyser les hotspots pour générer des recommandations
  const materialHotspots = result.hotspots.filter(h => h.type === 'material' && h.impact_category === 'carbon');
  const transportHotspots = result.hotspots.filter(h => h.type === 'transport' && h.impact_category === 'carbon');
  const processHotspots = result.hotspots.filter(h => h.type === 'process' && h.impact_category === 'carbon');

  if (materialHotspots.length > 0) {
    recs.push({
      title: 'Substitution de matériaux',
      description: `Envisager des matériaux recyclés ou biosourcés pour ${materialHotspots[0].source} (${materialHotspots[0].percentage.toFixed(0)}% de l'impact).`,
    });
  }

  if (transportHotspots.length > 0) {
    recs.push({
      title: 'Optimisation du transport',
      description: 'Privilégier le fret ferroviaire ou maritime pour réduire les émissions liées au transport.',
    });
  }

  if (processHotspots.length > 0) {
    recs.push({
      title: 'Efficacité énergétique des procédés',
      description: "Ameliorer l'efficacite energetique des processus de fabrication ou transitionner vers des energies renouvelables.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      title: 'Optimisation continue',
      description: "Maintenir une veille sur les facteurs d'emission et mettre a jour les donnees regulierement.",
    });
  }

  recs.push({
    title: 'Économie circulaire',
    description: 'Augmenter le taux de matériaux recyclés et prévoir la recyclabilité en fin de vie (module D).',
  });

  return recs;
}
