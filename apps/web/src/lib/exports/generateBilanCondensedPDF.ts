import jsPDF from 'jspdf';
import { BilanExportContext, computeExport, formatT } from './bilanExportData';

const NAVY: [number, number, number] = [15, 23, 42];
const GREEN: [number, number, number] = [14, 124, 102];
const ACCENT: [number, number, number] = [22, 88, 92];
const DARK: [number, number, number] = [17, 24, 39];
const GRAY: [number, number, number] = [107, 114, 128];
const LIGHT: [number, number, number] = [243, 244, 246];
const RED: [number, number, number] = [220, 38, 38];
const ORANGE: [number, number, number] = [245, 158, 11];

export async function generateBilanCondensedPDF(ctx: BilanExportContext): Promise<void> {
  const data = computeExport(ctx);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210;
  const H = 297;
  const M = 18;
  const TOTAL = 12;

  const setFill = (c: [number, number, number]) => pdf.setFillColor(c[0], c[1], c[2]);
  const setText = (c: [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => pdf.setDrawColor(c[0], c[1], c[2]);

  const footer = (n: number) => {
    setFill(NAVY); pdf.rect(0, H - 12, W, 12, 'F');
    setText([199, 210, 254]); pdf.setFontSize(8);
    pdf.text('CarboScan • Bilan Carbone', M, H - 5);
    pdf.text(`${ctx.organizationName} — ${ctx.year}  |  ${n}/${TOTAL}`, W - M, H - 5, { align: 'right' });
  };

  const pageHeader = (kicker: string, title: string, action?: string) => {
    setText(GREEN); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
    pdf.text(kicker.toUpperCase(), M, M);
    setText(NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20);
    pdf.text(title, M, M + 8);
    if (action) {
      setText(DARK); pdf.setFont('helvetica', 'italic'); pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(action, W - 2 * M);
      pdf.text(lines, M, M + 16);
    }
    setDraw(GREEN); pdf.setLineWidth(0.8); pdf.line(M, M + (action ? 24 : 14), M + 12, M + (action ? 24 : 14));
  };

  // ===== Page 1 — Cover =====
  setFill(NAVY); pdf.rect(0, 0, W, H, 'F');
  setFill(GREEN); pdf.rect(0, 0, 4, H, 'F');
  setText([110, 231, 183]); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
  pdf.text('BILAN CARBONE STRATÉGIQUE', M, 50);
  setText([255, 255, 255]); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(28);
  pdf.text(ctx.organizationName, M, 65, { maxWidth: W - 2 * M });
  setText([203, 213, 225]); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12);
  pdf.text(`Exercice ${ctx.year}  •  Périmètre Scopes 1, 2 et 3`, M, 78);

  // KPI cards
  const kpis = [
    { l: 'Émissions totales', v: formatT(data.totalT) },
    { l: 'Scope dominant', v: data.pctS3 >= data.pctS1 && data.pctS3 >= data.pctS2 ? 'Scope 3' : data.pctS1 >= data.pctS2 ? 'Scope 1' : 'Scope 2' },
    { l: 'Intensité / employé', v: data.perEmployeeT != null ? `${data.perEmployeeT.toFixed(1)} tCO₂e` : 'n/a' },
    { l: 'Indice de confiance', v: `${data.confidenceScore}/100` },
  ];
  const cw = (W - 2 * M - 9) / 2;
  kpis.forEach((k, i) => {
    const cx = M + (i % 2) * (cw + 9);
    const cy = 110 + Math.floor(i / 2) * 45;
    setFill([30, 41, 59]); pdf.roundedRect(cx, cy, cw, 38, 3, 3, 'F');
    setDraw(GREEN); pdf.setLineWidth(0.4); pdf.roundedRect(cx, cy, cw, 38, 3, 3, 'S');
    setText([148, 163, 184]); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
    pdf.text(k.l.toUpperCase(), cx + 5, cy + 9);
    setText([255, 255, 255]); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
    pdf.text(k.v, cx + 5, cy + 24);
  });

  setText([148, 163, 184]); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
  pdf.text('Conforme ISO 14064-1  •  GHG Protocol  •  Méthode ADEME', M, H - 28);
  setText([100, 116, 139]); pdf.setFont('helvetica', 'italic');
  pdf.text('Édité par CarboScan', M, H - 22);

  // ===== Page 2 — Sommaire =====
  pdf.addPage();
  pageHeader('Sommaire', 'Comment lire ce rapport');
  const items = [
    '01  Périmètre et méthodologie',
    '02  Résultats globaux Scopes 1 / 2 / 3',
    '03  Détail Scope 1 — émissions directes',
    '04  Détail Scope 2 — énergie achetée',
    '05  Détail Scope 3 — chaîne de valeur',
    '06  Top 10 des postes émissifs',
    '07  Ratios d\'intensité carbone',
    '08  Trajectoire de décarbonation 2030',
    '09  Plan d\'action prioritaire',
    '10  Indice de confiance des données',
  ];
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12); setText(DARK);
  items.forEach((t, i) => pdf.text(t, M, 55 + i * 12));
  footer(2);

  // ===== Page 3 — Périmètre =====
  pdf.addPage();
  pageHeader('Périmètre', 'Cadre méthodologique', `${ctx.organizationName} — Exercice ${ctx.year}`);
  const rows: [string, string][] = [
    ['Organisation', ctx.organizationName],
    ['Secteur', ctx.sector || 'Non renseigné'],
    ['Effectif', ctx.employees != null ? `${ctx.employees} ETP` : 'n/a'],
    ['Année', String(ctx.year)],
    ['Périmètre', 'Scopes 1, 2 et 3 (catégories pertinentes GHG Protocol)'],
    ['Méthodologie', 'GHG Protocol / ISO 14064-1 / Bilan Carbone® ADEME'],
    ['Facteurs', 'Base Empreinte ADEME + facteurs organisation'],
    ['Outil', 'CarboScan (calcul activity-based)'],
  ];
  let y = M + 35;
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) { setFill(LIGHT); pdf.rect(M, y - 5, W - 2 * M, 13, 'F'); }
    setText(NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10);
    pdf.text(k, M + 3, y + 3);
    setText(DARK); pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(v, W - 2 * M - 55);
    pdf.text(lines, M + 55, y + 3);
    y += 13;
  });
  footer(3);

  // ===== Page 4 — Résultats globaux =====
  pdf.addPage();
  pageHeader('Résultats', 'Répartition par scope',
    `Le ${data.pctS3 >= data.pctS1 && data.pctS3 >= data.pctS2 ? 'Scope 3' : data.pctS1 >= data.pctS2 ? 'Scope 1' : 'Scope 2'} concentre l'essentiel de l'empreinte.`);
  // Horizontal bar chart for scopes
  const scopes = [
    { label: 'Scope 1', value: data.s1T, pct: data.pctS1, color: RED },
    { label: 'Scope 2', value: data.s2T, pct: data.pctS2, color: ORANGE },
    { label: 'Scope 3', value: data.s3T, pct: data.pctS3, color: GREEN },
  ];
  const maxV = Math.max(...scopes.map(s => s.value), 1);
  let by = 80;
  scopes.forEach(sc => {
    setText(DARK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
    pdf.text(sc.label, M, by);
    pdf.text(`${formatT(sc.value)} (${sc.pct.toFixed(1)}%)`, W - M, by, { align: 'right' });
    setFill(LIGHT); pdf.rect(M, by + 3, W - 2 * M, 8, 'F');
    const bw = (W - 2 * M) * (sc.value / maxV);
    setFill(sc.color); pdf.rect(M, by + 3, bw, 8, 'F');
    by += 30;
  });
  setFill([30, 41, 59]); pdf.roundedRect(M, by, W - 2 * M, 30, 3, 3, 'F');
  setText([255, 255, 255]); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
  pdf.text('TOTAL', M + 6, by + 12);
  pdf.setFontSize(20);
  pdf.text(formatT(data.totalT), W - M - 6, by + 18, { align: 'right' });
  footer(4);

  // Helper scope page
  const scopePage = (n: number, scopeNum: 1 | 2 | 3, kicker: string, title: string, action: string, scopeT: number, pct: number, color: [number, number, number]) => {
    pdf.addPage();
    pageHeader(kicker, title, action);
    setFill(LIGHT); pdf.roundedRect(M, M + 35, W - 2 * M, 40, 3, 3, 'F');
    setFill(color); pdf.rect(M, M + 35, W - 2 * M, 2, 'F');
    setText(color); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
    pdf.text(`SCOPE ${scopeNum}`, M + 5, M + 47);
    setText(NAVY); pdf.setFontSize(26);
    pdf.text(formatT(scopeT), M + 5, M + 62);
    setText(GRAY); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
    pdf.text(`${pct.toFixed(1)}% du bilan`, M + 5, M + 70);

    const desc: Record<1 | 2 | 3, string> = {
      1: 'Combustion directe : véhicules, chaudières, groupes électrogènes, fluides frigorigènes.',
      2: 'Énergie achetée : électricité réseau, vapeur, chaleur ou froid urbain.',
      3: 'Chaîne de valeur amont/aval : achats, transport, déchets, usage produits vendus.',
    };
    setText(DARK); pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(desc[scopeNum], W - 2 * M), M, M + 90);

    // Top categories chart
    setText(NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
    pdf.text('Postes contributeurs principaux', M, M + 115);
    const cats = data.topCategories.slice(0, 6);
    if (cats.length === 0) {
      setText(GRAY); pdf.setFont('helvetica', 'italic'); pdf.setFontSize(10);
      pdf.text('Aucune donnée détaillée disponible.', M, M + 130);
    } else {
      const maxC = Math.max(...cats.map(c => c.tonnes), 1);
      let cy2 = M + 125;
      cats.forEach(c => {
        setText(DARK); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
        const label = c.category.length > 60 ? c.category.slice(0, 60) + '…' : c.category;
        pdf.text(label, M, cy2);
        pdf.text(`${c.tonnes.toFixed(1)} tCO₂e`, W - M, cy2, { align: 'right' });
        setFill(LIGHT); pdf.rect(M, cy2 + 2, W - 2 * M, 5, 'F');
        setFill(color); pdf.rect(M, cy2 + 2, (W - 2 * M) * (c.tonnes / maxC), 5, 'F');
        cy2 += 16;
      });
    }
    footer(n);
  };

  scopePage(5, 1, 'Scope 1', 'Émissions directes',
    `Les émissions directes représentent ${data.pctS1.toFixed(1)}% du bilan.`,
    data.s1T, data.pctS1, RED);
  scopePage(6, 2, 'Scope 2', 'Énergie achetée',
    `L'énergie achetée pèse ${data.pctS2.toFixed(1)}% — levier d'achat d'électricité bas-carbone.`,
    data.s2T, data.pctS2, ORANGE);
  scopePage(7, 3, 'Scope 3', 'Chaîne de valeur',
    `La chaîne de valeur pèse ${data.pctS3.toFixed(1)}% — priorité d'engagement fournisseurs.`,
    data.s3T, data.pctS3, GREEN);

  // ===== Page 8 — Top 10 =====
  pdf.addPage();
  pageHeader('Hotspots', 'Top 10 des postes émissifs',
    'Concentrer l\'effort sur les 3 premiers postes capte la majorité du potentiel de réduction.');
  const top = data.topCategories;
  if (top.length === 0) {
    setText(GRAY); pdf.setFont('helvetica', 'italic'); pdf.setFontSize(11);
    pdf.text('Aucune donnée d\'activité disponible.', M, 90);
  } else {
    const maxT = Math.max(...top.map(c => c.tonnes), 1);
    let ty = M + 35;
    top.forEach((c, i) => {
      setText(DARK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
      pdf.text(`${(i + 1).toString().padStart(2, '0')}.`, M, ty + 3);
      pdf.setFont('helvetica', 'normal');
      const label = c.category.length > 55 ? c.category.slice(0, 55) + '…' : c.category;
      pdf.text(label, M + 8, ty + 3);
      pdf.text(`${c.tonnes.toFixed(1)} t (${c.pct.toFixed(1)}%)`, W - M, ty + 3, { align: 'right' });
      setFill(LIGHT); pdf.rect(M + 8, ty + 5, W - 2 * M - 8, 4, 'F');
      setFill(GREEN); pdf.rect(M + 8, ty + 5, (W - 2 * M - 8) * (c.tonnes / maxT), 4, 'F');
      ty += 18;
    });
  }
  footer(8);

  // ===== Page 9 — Ratios =====
  pdf.addPage();
  pageHeader('Intensité', 'Ratios carbone',
    'Indicateurs normalisés pour comparer dans le temps et entre entités.');
  const ratios = [
    { l: 'Émissions totales', v: formatT(data.totalT), s: 'Périmètre annuel' },
    { l: 'Intensité / employé', v: data.perEmployeeT != null ? `${data.perEmployeeT.toFixed(2)} tCO₂e` : 'n/a', s: 'tCO₂e / ETP' },
    { l: 'Intensité / M€', v: data.perRevenueT != null ? `${data.perRevenueT.toFixed(1)} tCO₂e` : 'n/a', s: 'tCO₂e / M€ CA' },
    { l: 'Poids Scope 3', v: `${data.pctS3.toFixed(0)}%`, s: 'du bilan total' },
  ];
  const rw = (W - 2 * M - 8) / 2;
  ratios.forEach((r, i) => {
    const rx = M + (i % 2) * (rw + 8);
    const ry = M + 40 + Math.floor(i / 2) * 60;
    setFill([255, 255, 255]); setDraw([229, 231, 235]); pdf.setLineWidth(0.3);
    pdf.roundedRect(rx, ry, rw, 50, 3, 3, 'FD');
    setFill(GREEN); pdf.rect(rx, ry, rw, 2, 'F');
    setText(GRAY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
    pdf.text(r.l.toUpperCase(), rx + 5, ry + 11);
    setText(NAVY); pdf.setFontSize(22);
    pdf.text(r.v, rx + 5, ry + 28);
    setText(GRAY); pdf.setFont('helvetica', 'italic'); pdf.setFontSize(9);
    pdf.text(r.s, rx + 5, ry + 42);
  });
  footer(9);

  // ===== Page 10 — Trajectoire =====
  pdf.addPage();
  pageHeader('Trajectoire', `Décarbonation ${ctx.year}-2030`,
    `Objectif SBTi : -42% d'ici 2030 → cible ${formatT(data.totalT - data.reductionTarget2030T)}.`);
  // Mini chart: trajectory line
  const chartX = M, chartY = M + 40, chartW = W - 2 * M, chartH = 110;
  setFill([255, 255, 255]); setDraw([229, 231, 235]); pdf.setLineWidth(0.3);
  pdf.rect(chartX, chartY, chartW, chartH, 'FD');
  const traj = data.trajectory;
  const maxVal = Math.max(...traj.map(t => Math.max(t.bau, t.target)), 1);
  const xStep = chartW / (traj.length - 1 || 1);
  const yScale = (chartH - 20) / maxVal;
  // grid lines
  setDraw([229, 231, 235]); pdf.setLineWidth(0.2);
  for (let g = 0; g <= 4; g++) {
    const gy = chartY + 10 + ((chartH - 20) / 4) * g;
    pdf.line(chartX + 12, gy, chartX + chartW - 5, gy);
  }
  // BAU
  setDraw(RED); pdf.setLineWidth(0.8);
  traj.forEach((t, i) => {
    if (i === 0) return;
    const x1 = chartX + 12 + (i - 1) * xStep * ((chartW - 17) / chartW);
    const y1 = chartY + chartH - 10 - traj[i - 1].bau * yScale * ((chartH - 20) / chartH);
    const x2 = chartX + 12 + i * xStep * ((chartW - 17) / chartW);
    const y2 = chartY + chartH - 10 - t.bau * yScale * ((chartH - 20) / chartH);
    pdf.line(x1, y1, x2, y2);
  });
  // Target
  setDraw(GREEN); pdf.setLineWidth(0.8);
  traj.forEach((t, i) => {
    if (i === 0) return;
    const x1 = chartX + 12 + (i - 1) * xStep * ((chartW - 17) / chartW);
    const y1 = chartY + chartH - 10 - traj[i - 1].target * yScale * ((chartH - 20) / chartH);
    const x2 = chartX + 12 + i * xStep * ((chartW - 17) / chartW);
    const y2 = chartY + chartH - 10 - t.target * yScale * ((chartH - 20) / chartH);
    pdf.line(x1, y1, x2, y2);
  });
  // X labels
  setText(GRAY); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
  traj.forEach((t, i) => {
    const lx = chartX + 12 + i * xStep * ((chartW - 17) / chartW);
    pdf.text(String(t.year), lx, chartY + chartH + 5, { align: 'center' });
  });
  // Legend
  setFill(RED); pdf.rect(M, chartY + chartH + 12, 4, 4, 'F');
  setText(DARK); pdf.setFontSize(9);
  pdf.text('Trajectoire BAU', M + 7, chartY + chartH + 16);
  setFill(GREEN); pdf.rect(M + 50, chartY + chartH + 12, 4, 4, 'F');
  pdf.text('Cible SBTi -42%', M + 57, chartY + chartH + 16);
  footer(10);

  // ===== Page 11 — Plan d'action =====
  pdf.addPage();
  pageHeader('Plan d\'action', 'Actions prioritaires',
    `${data.topActions.reduce((a, c) => a + c.reductionT, 0).toFixed(0)} tCO₂e de réduction potentielle identifiées.`);
  // Header row
  setFill(NAVY); pdf.rect(M, M + 35, W - 2 * M, 9, 'F');
  setText([255, 255, 255]); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
  pdf.text('ACTION', M + 3, M + 41);
  pdf.text('LEVIER', M + 75, M + 41);
  pdf.text('RÉDUCTION', W - M - 35, M + 41);
  pdf.text('PRIO.', W - M - 12, M + 41);
  let ay = M + 50;
  if (data.topActions.length === 0) {
    setText(GRAY); pdf.setFont('helvetica', 'italic'); pdf.setFontSize(10);
    pdf.text('Aucune action générée — saisissez plus de données pour identifier des leviers.', M, ay);
  } else {
    data.topActions.forEach((a, i) => {
      if (i % 2 === 0) { setFill(LIGHT); pdf.rect(M, ay - 5, W - 2 * M, 16, 'F'); }
      setText(DARK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
      const title = a.title.length > 38 ? a.title.slice(0, 38) + '…' : a.title;
      pdf.text(title, M + 3, ay);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); setText(GRAY);
      const lever = a.lever.length > 35 ? a.lever.slice(0, 35) + '…' : a.lever;
      pdf.text(lever, M + 75, ay);
      setText(GREEN); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10);
      pdf.text(`${a.reductionT.toFixed(1)} t`, W - M - 35, ay);
      const prioColor: [number, number, number] = a.priority === 'Haute' ? RED : a.priority === 'Moyenne' ? ORANGE : GRAY;
      setText(prioColor); pdf.setFontSize(9);
      pdf.text(a.priority, W - M - 12, ay);
      ay += 16;
    });
  }
  footer(11);

  // ===== Page 12 — Confiance =====
  pdf.addPage();
  pageHeader('Qualité', 'Indice de confiance des données',
    `Score global : ${data.confidenceScore}/100`);
  // Quality bar
  const qy = M + 40;
  setText(DARK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
  pdf.text('Répartition par origine de donnée', M, qy);
  setFill(LIGHT); pdf.rect(M, qy + 5, W - 2 * M, 14, 'F');
  const totalBar = W - 2 * M;
  const w1 = totalBar * (data.realPct / 100);
  const w2 = totalBar * (data.estimatedPct / 100);
  const w3 = totalBar * (data.defaultPct / 100);
  setFill(GREEN); pdf.rect(M, qy + 5, w1, 14, 'F');
  setFill(ORANGE); pdf.rect(M + w1, qy + 5, w2, 14, 'F');
  setFill(RED); pdf.rect(M + w1 + w2, qy + 5, w3, 14, 'F');

  const legend = [
    { c: GREEN, l: 'Données réelles', v: data.realPct, d: 'Factures, compteurs, mesures vérifiées.' },
    { c: ORANGE, l: 'Données estimées', v: data.estimatedPct, d: 'Ratios métier, conversion monétaire→physique.' },
    { c: RED, l: 'Valeurs par défaut', v: data.defaultPct, d: 'Facteurs ADEME standards sans donnée primaire.' },
  ];
  let ly = qy + 35;
  legend.forEach(l => {
    setFill(l.c); pdf.rect(M, ly, 6, 6, 'F');
    setText(NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
    pdf.text(`${l.l} — ${l.v.toFixed(1)}%`, M + 10, ly + 5);
    setText(GRAY); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
    pdf.text(l.d, M + 10, ly + 11);
    ly += 22;
  });

  setText(DARK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
  pdf.text('Recommandation', M, ly + 8);
  setText(GRAY); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
  pdf.text(pdf.splitTextToSize(
    'Prioriser la collecte primaire sur les postes représentant plus de 10% du bilan pour fiabiliser le score de confiance.',
    W - 2 * M), M, ly + 16);

  setText(GRAY); pdf.setFont('helvetica', 'italic'); pdf.setFontSize(8);
  pdf.text('Méthodologie : ISO 14064-1 §6.4 • GHG Protocol Corporate Standard • ADEME Bilan Carbone® v8',
    M, H - 18);
  footer(12);

  const safeName = ctx.organizationName.replace(/[^a-z0-9]/gi, '_');
  pdf.save(`Bilan_Carbone_${safeName}_${ctx.year}_Condensed.pdf`);
}
