import pptxgen from 'pptxgenjs';
import { BilanExportContext, computeExport, formatT } from './bilanExportData';

// Brand palette
const NAVY = '0F172A';
const DARK = '111827';
const GREEN = '0E7C66';
const ACCENT = '16585C';
const GRAY = '6B7280';
const LIGHT = 'F3F4F6';
const WHITE = 'FFFFFF';

export async function generateBilanPPTX(ctx: BilanExportContext): Promise<void> {
  const data = computeExport(ctx);
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.title = `Bilan Carbone ${ctx.organizationName} — ${ctx.year}`;
  pptx.company = 'CarboScan';

  const W = 13.33;
  const H = 7.5;

  const addFooter = (slide: pptxgen.Slide, pageNum: number, total: number) => {
    slide.addShape('rect', { x: 0, y: H - 0.35, w: W, h: 0.35, fill: { color: NAVY } });
    slide.addText('CarboScan • Bilan Carbone', {
      x: 0.3, y: H - 0.32, w: 6, h: 0.3, fontSize: 9, color: 'C7D2FE', fontFace: 'Calibri',
    });
    slide.addText(`${ctx.organizationName} — ${ctx.year}  |  ${pageNum}/${total}`, {
      x: W - 6.3, y: H - 0.32, w: 6, h: 0.3, fontSize: 9, color: 'C7D2FE',
      fontFace: 'Calibri', align: 'right',
    });
  };

  const addTitleBar = (slide: pptxgen.Slide, kicker: string, title: string, actionTitle?: string) => {
    slide.background = { color: WHITE };
    slide.addText(kicker.toUpperCase(), {
      x: 0.5, y: 0.35, w: 10, h: 0.3, fontSize: 11, color: GREEN, fontFace: 'Calibri', bold: true,
      charSpacing: 4,
    });
    slide.addText(title, {
      x: 0.5, y: 0.65, w: 12, h: 0.7, fontSize: 28, color: NAVY, fontFace: 'Calibri', bold: true,
    });
    if (actionTitle) {
      slide.addText(actionTitle, {
        x: 0.5, y: 1.35, w: 12.3, h: 0.6, fontSize: 16, color: DARK, fontFace: 'Calibri',
        italic: true,
      });
    }
    slide.addShape('rect', { x: 0.5, y: 1.95, w: 0.6, h: 0.04, fill: { color: GREEN }, line: { color: GREEN } });
  };

  const TOTAL = 12;

  // ----- Slide 1 — Cover -----
  {
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    s.addShape('rect', { x: 0, y: 0, w: 0.25, h: H, fill: { color: GREEN } });
    s.addText('BILAN CARBONE STRATÉGIQUE', {
      x: 0.8, y: 1.0, w: 11, h: 0.45, fontSize: 14, color: '6EE7B7', fontFace: 'Calibri',
      bold: true, charSpacing: 6,
    });
    s.addText(ctx.organizationName, {
      x: 0.8, y: 1.6, w: 11, h: 1.0, fontSize: 44, color: WHITE, fontFace: 'Calibri', bold: true,
    });
    s.addText(`Exercice ${ctx.year}  •  Périmètre Scopes 1, 2 et 3`, {
      x: 0.8, y: 2.65, w: 11, h: 0.4, fontSize: 16, color: 'CBD5E1', fontFace: 'Calibri',
    });

    // KPI band
    const kpis = [
      { label: 'Émissions totales', value: formatT(data.totalT) },
      { label: 'Scope dominant', value: data.pctS3 >= data.pctS1 && data.pctS3 >= data.pctS2 ? 'Scope 3' : data.pctS1 >= data.pctS2 ? 'Scope 1' : 'Scope 2' },
      { label: 'Intensité / employé', value: data.perEmployeeT != null ? `${data.perEmployeeT.toFixed(1)} tCO₂e` : 'n/a' },
      { label: 'Indice de confiance', value: `${data.confidenceScore}/100` },
    ];
    kpis.forEach((k, i) => {
      const x = 0.8 + i * 3.0;
      s.addShape('roundRect', { x, y: 4.3, w: 2.7, h: 1.6, fill: { color: '1E293B' }, line: { color: GREEN, width: 1 }, rectRadius: 0.12 });
      s.addText(k.label, { x: x + 0.15, y: 4.4, w: 2.5, h: 0.35, fontSize: 10, color: '94A3B8', fontFace: 'Calibri', bold: true, charSpacing: 2 });
      s.addText(k.value, { x: x + 0.15, y: 4.8, w: 2.5, h: 0.9, fontSize: 22, color: WHITE, fontFace: 'Calibri', bold: true });
    });

    s.addText('Calcul interne CarboScan — non vérifié par un tiers', {
      x: 0.8, y: 6.4, w: 11, h: 0.3, fontSize: 11, color: '94A3B8', fontFace: 'Calibri',
    });
    s.addText('Édité par CarboScan', {
      x: 0.8, y: 6.75, w: 11, h: 0.3, fontSize: 10, color: '64748B', fontFace: 'Calibri', italic: true,
    });
  }

  // ----- Slide 2 — Sommaire -----
  {
    const s = pptx.addSlide();
    addTitleBar(s, 'Sommaire', 'Comment lire ce rapport');
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
    items.forEach((t, i) => {
      const col = i < 5 ? 0 : 1;
      const row = i % 5;
      s.addText(t, {
        x: 0.8 + col * 6.2, y: 2.4 + row * 0.7, w: 5.8, h: 0.5,
        fontSize: 16, color: DARK, fontFace: 'Calibri',
      });
    });
    addFooter(s, 2, TOTAL);
  }

  // ----- Slide 3 — Périmètre -----
  {
    const s = pptx.addSlide();
    addTitleBar(s, 'Périmètre', 'Cadre méthodologique du bilan',
      `${ctx.organizationName} — Exercice ${ctx.year} — Périmètre déclaré (non audité)`);
    const rows: [string, string][] = [
      ['Organisation', ctx.organizationName],
      ['Secteur', ctx.sector || 'Non renseigné'],
      ['Effectif', ctx.employees != null ? `${ctx.employees} ETP` : 'n/a'],
      ['Année de reporting', String(ctx.year)],
      ['Périmètre opérationnel', 'Scopes 1, 2 et 3 (couverture partielle, non auditée)'],
      ['Méthodologie', 'Comptabilité carbone interne CarboScan'],
      ['Facteurs d\'émission', 'Pack interne versionné — pas un pack ADEME officiel'],
      ['Outil de calcul', 'CarboScan (calcul interne, non certifié)'],
    ];
    s.addTable(
      rows.map(([k, v]) => [
        { text: k, options: { bold: true, color: NAVY, fill: { color: LIGHT } } },
        { text: v },
      ]),
      {
        x: 0.5, y: 2.3, w: 12.3, colW: [3.5, 8.8],
        fontSize: 13, fontFace: 'Calibri', color: DARK,
        border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
        rowH: 0.45,
      }
    );
    addFooter(s, 3, TOTAL);
  }

  // ----- Slide 4 — Résultats globaux -----
  {
    const s = pptx.addSlide();
    addTitleBar(s, 'Résultats', 'Répartition des émissions par scope',
      `Le ${data.pctS3 >= data.pctS1 && data.pctS3 >= data.pctS2 ? 'Scope 3' : data.pctS1 >= data.pctS2 ? 'Scope 1' : 'Scope 2'} concentre l'essentiel de l'empreinte — c'est le levier prioritaire.`);

    s.addChart(pptx.ChartType.doughnut, [{
      name: 'Émissions',
      labels: ['Scope 1', 'Scope 2', 'Scope 3'],
      values: [+data.s1T.toFixed(1), +data.s2T.toFixed(1), +data.s3T.toFixed(1)],
    }], {
      x: 0.6, y: 2.3, w: 5.5, h: 4.5,
      chartColors: ['DC2626', 'F59E0B', GREEN],
      showLegend: true, legendPos: 'b',
      showPercent: true, dataLabelFontSize: 11,
    });

    // KPI tiles right
    const tiles = [
      { label: 'Total', value: formatT(data.totalT), color: NAVY },
      { label: `Scope 1 — ${data.pctS1.toFixed(1)}%`, value: formatT(data.s1T), color: 'DC2626' },
      { label: `Scope 2 — ${data.pctS2.toFixed(1)}%`, value: formatT(data.s2T), color: 'F59E0B' },
      { label: `Scope 3 — ${data.pctS3.toFixed(1)}%`, value: formatT(data.s3T), color: GREEN },
    ];
    tiles.forEach((t, i) => {
      const y = 2.3 + i * 1.1;
      s.addShape('roundRect', { x: 6.6, y, w: 6.3, h: 1.0, fill: { color: LIGHT }, line: { color: 'E5E7EB' }, rectRadius: 0.1 });
      s.addShape('rect', { x: 6.6, y, w: 0.08, h: 1.0, fill: { color: t.color }, line: { color: t.color } });
      s.addText(t.label, { x: 6.9, y: y + 0.1, w: 6, h: 0.35, fontSize: 11, color: GRAY, fontFace: 'Calibri', bold: true });
      s.addText(t.value, { x: 6.9, y: y + 0.45, w: 6, h: 0.5, fontSize: 22, color: NAVY, fontFace: 'Calibri', bold: true });
    });
    addFooter(s, 4, TOTAL);
  }

  // Helper for scope detail
  const addScopeDetail = (slide: pptxgen.Slide, scopeNum: 1 | 2 | 3, kicker: string, title: string, action: string, scopeT: number, scopePct: number, color: string) => {
    addTitleBar(slide, kicker, title, action);
    // Big number
    slide.addShape('roundRect', { x: 0.5, y: 2.3, w: 4.5, h: 4.5, fill: { color: LIGHT }, line: { color: 'E5E7EB' }, rectRadius: 0.15 });
    slide.addShape('rect', { x: 0.5, y: 2.3, w: 4.5, h: 0.15, fill: { color }, line: { color } });
    slide.addText(`Scope ${scopeNum}`, { x: 0.7, y: 2.6, w: 4, h: 0.5, fontSize: 16, color, fontFace: 'Calibri', bold: true });
    slide.addText(formatT(scopeT), { x: 0.7, y: 3.1, w: 4, h: 1.3, fontSize: 38, color: NAVY, fontFace: 'Calibri', bold: true });
    slide.addText(`${scopePct.toFixed(1)}% du bilan total`, { x: 0.7, y: 4.5, w: 4, h: 0.4, fontSize: 14, color: GRAY, fontFace: 'Calibri' });
    const descMap: Record<1 | 2 | 3, string> = {
      1: 'Combustion directe : véhicules de l\'entreprise, chaudières, groupes électrogènes, fuites de fluides frigorigènes.',
      2: 'Énergie achetée et consommée : électricité réseau, vapeur, chaleur ou froid urbain.',
      3: 'Toute la chaîne de valeur amont et aval : achats de biens et services, transport, déplacements, déchets, usage des produits vendus.',
    };
    slide.addText(descMap[scopeNum], { x: 0.7, y: 5.0, w: 4.2, h: 1.6, fontSize: 12, color: DARK, fontFace: 'Calibri' });

    // Right: top categories within scope
    slide.addText('Postes contributeurs principaux', {
      x: 5.3, y: 2.3, w: 7.5, h: 0.4, fontSize: 14, color: NAVY, fontFace: 'Calibri', bold: true,
    });
    const cats = data.topCategories.slice(0, 6);
    if (cats.length === 0) {
      slide.addText('Aucune donnée détaillée disponible pour ce scope.', {
        x: 5.3, y: 3.0, w: 7.5, h: 0.5, fontSize: 12, color: GRAY, italic: true,
      });
    } else {
      slide.addChart(pptx.ChartType.bar, [{
        name: 'tCO₂e',
        labels: cats.map(c => c.category.length > 35 ? c.category.slice(0, 35) + '…' : c.category),
        values: cats.map(c => +c.tonnes.toFixed(1)),
      }], {
        x: 5.3, y: 2.7, w: 7.5, h: 4.1,
        barDir: 'bar', chartColors: [color],
        catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
        showValue: true, dataLabelFontSize: 9,
      });
    }
  };

  // ----- Slide 5 — Scope 1 -----
  {
    const s = pptx.addSlide();
    addScopeDetail(s, 1, 'Scope 1', 'Émissions directes',
      `Les émissions directes représentent ${data.pctS1.toFixed(1)}% du bilan.`,
      data.s1T, data.pctS1, 'DC2626');
    addFooter(s, 5, TOTAL);
  }
  // ----- Slide 6 — Scope 2 -----
  {
    const s = pptx.addSlide();
    addScopeDetail(s, 2, 'Scope 2', 'Énergie achetée',
      `L'énergie achetée pèse ${data.pctS2.toFixed(1)}% — un levier d'achat d'électricité bas-carbone.`,
      data.s2T, data.pctS2, 'F59E0B');
    addFooter(s, 6, TOTAL);
  }
  // ----- Slide 7 — Scope 3 -----
  {
    const s = pptx.addSlide();
    addScopeDetail(s, 3, 'Scope 3', 'Chaîne de valeur',
      `La chaîne de valeur pèse ${data.pctS3.toFixed(1)}% du bilan — priorité d'engagement fournisseurs.`,
      data.s3T, data.pctS3, GREEN);
    addFooter(s, 7, TOTAL);
  }

  // ----- Slide 8 — Top 10 -----
  {
    const s = pptx.addSlide();
    addTitleBar(s, 'Hotspots', 'Top 10 des postes émissifs',
      'Concentrer l\'effort sur les 3 premiers postes capte la majorité du potentiel de réduction.');
    const top = data.topCategories;
    if (top.length === 0) {
      s.addText('Aucune donnée d\'activité disponible.', { x: 0.5, y: 3, w: 12, h: 1, fontSize: 16, color: GRAY, italic: true });
    } else {
      s.addChart(pptx.ChartType.bar, [{
        name: 'tCO₂e',
        labels: top.map(c => c.category.length > 40 ? c.category.slice(0, 40) + '…' : c.category),
        values: top.map(c => +c.tonnes.toFixed(1)),
      }], {
        x: 0.5, y: 2.3, w: 12.3, h: 4.6,
        barDir: 'bar', chartColors: [GREEN],
        catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
        showValue: true, dataLabelFontSize: 10,
      });
    }
    addFooter(s, 8, TOTAL);
  }

  // ----- Slide 9 — Ratios -----
  {
    const s = pptx.addSlide();
    addTitleBar(s, 'Intensité', 'Ratios carbone',
      'Indicateurs normalisés pour comparer dans le temps et entre entités.');
    const ratios = [
      { label: 'Émissions totales', value: formatT(data.totalT), sub: 'Périmètre annuel' },
      { label: 'Intensité / employé', value: data.perEmployeeT != null ? `${data.perEmployeeT.toFixed(2)} tCO₂e` : 'n/a', sub: 'tCO₂e par ETP' },
      { label: 'Intensité / M€', value: data.perRevenueT != null ? `${data.perRevenueT.toFixed(1)} tCO₂e` : 'n/a', sub: 'tCO₂e / M€ CA' },
      { label: 'Scope 3 / Total', value: `${data.pctS3.toFixed(0)}%`, sub: 'Poids chaîne de valeur' },
    ];
    ratios.forEach((r, i) => {
      const x = 0.5 + i * 3.15;
      s.addShape('roundRect', { x, y: 2.4, w: 2.95, h: 2.8, fill: { color: WHITE }, line: { color: 'E5E7EB' }, rectRadius: 0.12 });
      s.addShape('rect', { x, y: 2.4, w: 2.95, h: 0.12, fill: { color: GREEN }, line: { color: GREEN } });
      s.addText(r.label, { x: x + 0.15, y: 2.65, w: 2.7, h: 0.45, fontSize: 11, color: GRAY, fontFace: 'Calibri', bold: true });
      s.addText(r.value, { x: x + 0.15, y: 3.15, w: 2.7, h: 1.0, fontSize: 26, color: NAVY, fontFace: 'Calibri', bold: true });
      s.addText(r.sub, { x: x + 0.15, y: 4.4, w: 2.7, h: 0.5, fontSize: 11, color: GRAY, fontFace: 'Calibri', italic: true });
    });
    addFooter(s, 9, TOTAL);
  }

  // ----- Slide 10 — Trajectoire -----
  {
    const s = pptx.addSlide();
    addTitleBar(s, 'Trajectoire', `Décarbonation ${ctx.year}-2030`,
      `Illustration interne (non validée) : −42 % d'ici 2030 → ${formatT(data.totalT - data.reductionTarget2030T)}.`);
    s.addChart(pptx.ChartType.line, [
      { name: 'Trajectoire BAU', labels: data.trajectory.map(t => String(t.year)), values: data.trajectory.map(t => t.bau) },
      { name: 'Cible illustrative −42 %', labels: data.trajectory.map(t => String(t.year)), values: data.trajectory.map(t => t.target) },
    ], {
      x: 0.5, y: 2.3, w: 12.3, h: 4.6,
      chartColors: ['DC2626', GREEN],
      showLegend: true, legendPos: 'b', legendFontSize: 11,
      catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
      lineDataSymbol: 'circle', lineDataSymbolSize: 8,
    });
    addFooter(s, 10, TOTAL);
  }

  // ----- Slide 11 — Plan d'action -----
  {
    const s = pptx.addSlide();
    addTitleBar(s, 'Plan d\'action', 'Actions prioritaires de réduction',
      `${data.topActions.reduce((a, c) => a + c.reductionT, 0).toFixed(0)} tCO₂e de réduction potentielle identifiées.`);
    const head = ['Action', 'Levier', 'Réduction (tCO₂e)', 'Priorité'];
    const body: string[][] = data.topActions.length > 0
      ? data.topActions.map(a => [a.title, a.lever, a.reductionT.toLocaleString('fr-FR'), a.priority])
      : [['—', '—', '—', '—']];
    const headerRow = head.map(h => ({
      text: h,
      options: { bold: true, color: WHITE, fill: { color: NAVY } },
    }));
    const bodyRows = body.map(r => r.map(c => ({ text: c })));
    s.addTable([headerRow, ...bodyRows], {
      x: 0.5, y: 2.3, w: 12.3, colW: [5.0, 4.3, 1.8, 1.2],
      fontSize: 12, fontFace: 'Calibri', color: DARK,
      border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
      rowH: 0.55,
    });
    addFooter(s, 11, TOTAL);
  }

  // ----- Slide 12 — Confiance données -----
  {
    const s = pptx.addSlide();
    addTitleBar(s, 'Qualité', 'Indice de confiance des données',
      `Score global : ${data.confidenceScore}/100 — basé sur l'origine des données (réelle / estimée / par défaut).`);
    s.addChart(pptx.ChartType.doughnut, [{
      name: 'Qualité',
      labels: ['Données réelles', 'Données estimées', 'Valeurs par défaut'],
      values: [+data.realPct.toFixed(1), +data.estimatedPct.toFixed(1), +data.defaultPct.toFixed(1)],
    }], {
      x: 0.5, y: 2.3, w: 5.5, h: 4.5,
      chartColors: [GREEN, 'F59E0B', 'DC2626'],
      showLegend: true, legendPos: 'b', showPercent: true,
    });
    const explain = [
      'Données réelles : factures, compteurs, mesures vérifiées.',
      'Données estimées : ratios métier, conversion monétaire→physique.',
      'Valeurs par défaut : facteurs ADEME standards en l\'absence de donnée primaire.',
      '',
      'Recommandation : prioriser la collecte primaire sur les postes représentant >10% du bilan.',
    ];
    s.addText(explain.join('\n'), {
      x: 6.4, y: 2.4, w: 6.5, h: 4.0, fontSize: 13, color: DARK, fontFace: 'Calibri',
      paraSpaceAfter: 6,
    });
    s.addText('Méthodologie interne CarboScan — document non certifié, non opposable à un auditeur.', {
      x: 0.5, y: 6.7, w: 12.3, h: 0.3, fontSize: 10, color: GRAY, italic: true, fontFace: 'Calibri',
    });
    addFooter(s, 12, TOTAL);
  }

  const safeName = ctx.organizationName.replace(/[^a-z0-9]/gi, '_');
  await pptx.writeFile({ fileName: `Bilan_Carbone_${safeName}_${ctx.year}.pptx` });
}
