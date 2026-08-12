// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
import { jsPDF } from 'npm:jspdf@2.5.2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;

// ============================================================================
// Palette & helpers
// ============================================================================
const C = {
  ink: [15, 23, 42] as [number, number, number],
  brand: [14, 124, 102] as [number, number, number],
  brandDark: [27, 58, 45] as [number, number, number],
  s1: [37, 99, 235] as [number, number, number],
  s2: [234, 88, 12] as [number, number, number],
  s3: [22, 163, 74] as [number, number, number],
  mute: [100, 116, 139] as [number, number, number],
  faint: [241, 245, 249] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const setColor = (doc: jsPDF, kind: 'fill' | 'text' | 'draw', c: [number, number, number]) => {
  if (kind === 'fill') doc.setFillColor(c[0], c[1], c[2]);
  else if (kind === 'text') doc.setTextColor(c[0], c[1], c[2]);
  else doc.setDrawColor(c[0], c[1], c[2]);
};

function fmtT(n: number): string {
  if (!isFinite(n)) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + ' k';
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function aggregateScope3(activities: any[]) {
  const map = new Map<string, number>();
  for (const a of activities) {
    const cat = (a.category || '').toString();
    const sub = (a.subcategory || '').toString();
    if (!cat.startsWith('scope3')) continue;
    let key = 'Autres';
    const m = cat.match(/cat(\d+)/i) || sub.match(/cat(\d+)/i);
    if (m) key = `Cat. ${m[1]}`;
    else if (sub) key = sub;
    const kg = Number(a.calculated_emissions ?? 0);
    map.set(key, (map.get(key) || 0) + kg);
  }
  return Array.from(map.entries())
    .map(([k, kg]) => ({ label: k, t: kg / 1000 }))
    .sort((a, b) => b.t - a.t);
}

// ============================================================================
// OpenAI narrative generator
// ============================================================================
async function generateNarrative(payload: any, lang: 'fr' | 'en'): Promise<any> {
  const langLabel = lang === 'fr' ? 'français' : 'English';
  const sys = `Tu es un consultant senior en bilan carbone et stratégie climat, expert GHG Protocol et ISO 14064. Tu rédiges des rapports professionnels denses, précis, sans remplissage. Chaque section doit être un texte fluide et corporate en ${langLabel}, structuré par paragraphes, sans listes à puces sauf mention contraire. Pas d'espaces excessifs, pas de généralités creuses. Utilise les chiffres exacts fournis. Format de sortie: JSON strict.`;

  const scope3Top = (payload.scope3Cats || []).slice(0, 5)
    .map((c: any) => `${c.label}: ${c.t.toFixed(2)} tCO2e`).join(' ; ');

  const user = `Rédige un rapport carbone pour ${payload.orgName} (année ${payload.year}, secteur ${payload.sector || 'non précisé'}).

DONNÉES CHIFFRÉES (à utiliser exactement):
- Total: ${payload.total.toFixed(2)} tCO2e
- Scope 1: ${payload.s1.toFixed(2)} tCO2e (${payload.p1}%)
- Scope 2: ${payload.s2.toFixed(2)} tCO2e (${payload.p2}%)
- Scope 3: ${payload.s3.toFixed(2)} tCO2e (${payload.p3}%)
- Nombre d'enregistrements: ${payload.activityCount}
- Qualité données: ${payload.dqReal} mesurées / ${payload.dqEst} estimées / ${payload.dqDef} par défaut
- Top Scope 3: ${scope3Top || 'non détaillé'}
- Actions planifiées: ${payload.actionsCount}

Réponds STRICTEMENT au format JSON suivant, chaque section ≈ 380 mots de texte fluide (2 à 3 paragraphes séparés par \\n\\n), sans titres internes, sans listes à puces, sans markdown:
{
  "objectifs": "…",
  "resultats": "…",
  "analyse": "…",
  "plan_actions": "…",
  "conclusion": "…",
  "annexes": "…"
}

Contraintes:
- "objectifs": contexte stratégique de la démarche, cadre normatif (GHG Protocol, ISO 14064), périmètre organisationnel et opérationnel, motivations (CSRD, attentes parties prenantes, banques, clients).
- "resultats": présentation détaillée des émissions par scope avec commentaires sur la répartition, intensité, comparaison sectorielle plausible.
- "analyse": interprétation des postes majeurs, hotspots Scope 3, qualité des données, incertitudes, points d'attention méthodologiques.
- "plan_actions": leviers de décarbonation prioritaires, trajectoire alignée 1,5°C, jalons temporels, gouvernance, indicateurs de suivi.
- "conclusion": bénéfices attendus, prochaines étapes, engagement de la direction, ancrage dans une trajectoire net-zéro.
- "annexes": méthodologie (facteurs ADEME/DEFRA/IEA), calcul, limites, glossaire concis intégré dans le texte.

Aucune ligne vide superflue à l'intérieur des sections.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('OpenAI error:', data);
      throw new Error(data?.error?.message || 'OpenAI request failed');
    }
    const txt = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(txt);
  } catch (e) {
    console.error('narrative fallback:', (e as Error).message);
    return null;
  }
}

// ============================================================================
// PDF rendering
// ============================================================================
const PAGE = { W: 210, H: 297, mL: 18, mR: 18, mT: 22, mB: 22 };
const CONTENT_W = PAGE.W - PAGE.mL - PAGE.mR;
const CONTENT_BOTTOM = PAGE.H - PAGE.mB;

function drawFooter(doc: jsPDF, orgName: string, year: number, pageNum: number, totalPages: number) {
  setColor(doc, 'draw', C.line);
  doc.setLineWidth(0.3);
  doc.line(PAGE.mL, PAGE.H - 14, PAGE.W - PAGE.mR, PAGE.H - 14);
  doc.setFontSize(8);
  setColor(doc, 'text', C.mute);
  doc.setFont('helvetica', 'normal');
  doc.text(`${orgName} — Bilan carbone ${year}`, PAGE.mL, PAGE.H - 9);
  doc.text('CarboScan', PAGE.W / 2, PAGE.H - 9, { align: 'center' });
  doc.text(`${pageNum} / ${totalPages}`, PAGE.W - PAGE.mR, PAGE.H - 9, { align: 'right' });
}

function drawPageHeader(doc: jsPDF, sectionLabel: string, orgName: string) {
  doc.setFontSize(8);
  setColor(doc, 'text', C.mute);
  doc.setFont('helvetica', 'normal');
  doc.text(sectionLabel.toUpperCase(), PAGE.mL, 12, { charSpace: 1 });
  doc.text(orgName, PAGE.W - PAGE.mR, 12, { align: 'right' });
  setColor(doc, 'draw', C.line);
  doc.setLineWidth(0.2);
  doc.line(PAGE.mL, 15, PAGE.W - PAGE.mR, 15);
}

function drawSectionTitle(doc: jsPDF, y: number, num: string, title: string): number {
  setColor(doc, 'text', C.brand);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(num, PAGE.mL, y);
  setColor(doc, 'text', C.ink);
  doc.setFontSize(20);
  doc.text(title, PAGE.mL, y + 8);
  setColor(doc, 'fill', C.brand);
  doc.rect(PAGE.mL, y + 11, 25, 0.8, 'F');
  return y + 20;
}

/** Draws justified paragraphs and returns the final Y. Breaks pages as needed. */
function drawJustifiedText(
  doc: jsPDF,
  text: string,
  y: number,
  ctx: { section: string; org: string; onNewPage: () => number },
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  setColor(doc, 'text', C.ink);
  const lineH = 5.2;
  const paras = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  let cy = y;
  for (let pi = 0; pi < paras.length; pi++) {
    const lines: string[] = doc.splitTextToSize(paras[pi], CONTENT_W) as any;
    for (let li = 0; li < lines.length; li++) {
      if (cy + lineH > CONTENT_BOTTOM) {
        cy = ctx.onNewPage();
      }
      const isLast = li === lines.length - 1;
      const line = lines[li];
      // Justify all lines except the last of each paragraph
      if (!isLast && line.trim().split(/\s+/).length > 1) {
        doc.text(line, PAGE.mL, cy, { align: 'justify', maxWidth: CONTENT_W });
      } else {
        doc.text(line, PAGE.mL, cy);
      }
      cy += lineH;
    }
    cy += 2.5; // paragraph spacing
  }
  return cy;
}

function drawKpiRow(doc: jsPDF, y: number, kpis: { label: string; value: string; sub: string; color: [number, number, number] }[]): number {
  const gap = 4;
  const w = (CONTENT_W - gap * (kpis.length - 1)) / kpis.length;
  const h = 24;
  kpis.forEach((k, i) => {
    const x = PAGE.mL + i * (w + gap);
    setColor(doc, 'fill', C.faint);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');
    setColor(doc, 'fill', k.color);
    doc.rect(x, y, 2.5, h, 'F');
    doc.setFontSize(7.5);
    setColor(doc, 'text', C.mute);
    doc.setFont('helvetica', 'normal');
    doc.text(k.label.toUpperCase(), x + 5, y + 6, { charSpace: 0.5 });
    doc.setFontSize(15);
    setColor(doc, 'text', C.ink);
    doc.setFont('helvetica', 'bold');
    doc.text(k.value, x + 5, y + 14);
    doc.setFontSize(8);
    setColor(doc, 'text', C.mute);
    doc.setFont('helvetica', 'normal');
    doc.text(k.sub, x + 5, y + 20);
  });
  return y + h + 6;
}

function drawScopeBar(doc: jsPDF, y: number, s1: number, s2: number, s3: number): number {
  const total = s1 + s2 + s3 || 1;
  const barH = 9;
  const w = CONTENT_W;
  const w1 = (s1 / total) * w, w2 = (s2 / total) * w, w3 = (s3 / total) * w;
  setColor(doc, 'fill', C.s1); doc.rect(PAGE.mL, y, w1, barH, 'F');
  setColor(doc, 'fill', C.s2); doc.rect(PAGE.mL + w1, y, w2, barH, 'F');
  setColor(doc, 'fill', C.s3); doc.rect(PAGE.mL + w1 + w2, y, w3, barH, 'F');
  doc.setFontSize(8);
  setColor(doc, 'text', C.white);
  doc.setFont('helvetica', 'bold');
  if (w1 > 15) doc.text(`${((s1 / total) * 100).toFixed(0)}%`, PAGE.mL + w1 / 2, y + 6, { align: 'center' });
  if (w2 > 15) doc.text(`${((s2 / total) * 100).toFixed(0)}%`, PAGE.mL + w1 + w2 / 2, y + 6, { align: 'center' });
  if (w3 > 15) doc.text(`${((s3 / total) * 100).toFixed(0)}%`, PAGE.mL + w1 + w2 + w3 / 2, y + 6, { align: 'center' });
  return y + barH + 3;
}

/** Vector donut chart with legend. Returns new Y. */
function drawDonutChart(
  doc: jsPDF,
  y: number,
  segments: { label: string; value: number; color: [number, number, number] }[],
  title: string,
): number {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const cx = PAGE.mL + 32;
  const cy = y + 32;
  const rOuter = 26;
  const rInner = 15;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(doc, 'text', C.ink);
  doc.text(title, PAGE.mL, y - 1);

  // Draw donut as thin sector triangles
  let a0 = -Math.PI / 2;
  const steps = 90;
  for (const seg of segments) {
    if (seg.value <= 0) continue;
    const a1 = a0 + (seg.value / total) * Math.PI * 2;
    setColor(doc, 'fill', seg.color);
    const n = Math.max(4, Math.round(((a1 - a0) / (Math.PI * 2)) * steps));
    for (let i = 0; i < n; i++) {
      const t0 = a0 + ((a1 - a0) * i) / n;
      const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
      // triangle from center to outer arc (two triangles per slice cell)
      const p1x = cx + Math.cos(t0) * rOuter, p1y = cy + Math.sin(t0) * rOuter;
      const p2x = cx + Math.cos(t1) * rOuter, p2y = cy + Math.sin(t1) * rOuter;
      const p3x = cx + Math.cos(t1) * rInner, p3y = cy + Math.sin(t1) * rInner;
      const p4x = cx + Math.cos(t0) * rInner, p4y = cy + Math.sin(t0) * rInner;
      (doc as any).triangle(p1x, p1y, p2x, p2y, p3x, p3y, 'F');
      (doc as any).triangle(p1x, p1y, p3x, p3y, p4x, p4y, 'F');
    }
    a0 = a1;
  }

  // Center total
  setColor(doc, 'text', C.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(fmtT(total), cx, cy - 1, { align: 'center' });
  doc.setFontSize(7);
  setColor(doc, 'text', C.mute);
  doc.setFont('helvetica', 'normal');
  doc.text('tCO2e', cx, cy + 4, { align: 'center' });

  // Legend
  const lx = cx + rOuter + 12;
  let ly = y + 8;
  doc.setFontSize(9);
  segments.forEach((s) => {
    setColor(doc, 'fill', s.color);
    doc.rect(lx, ly - 3, 4, 4, 'F');
    setColor(doc, 'text', C.ink);
    doc.setFont('helvetica', 'bold');
    doc.text(s.label, lx + 6, ly);
    setColor(doc, 'text', C.mute);
    doc.setFont('helvetica', 'normal');
    const pct = ((s.value / total) * 100).toFixed(1);
    doc.text(`${fmtT(s.value)} tCO2e  ·  ${pct}%`, lx + 6, ly + 5);
    ly += 12;
  });
  return Math.max(cy + rOuter + 6, ly + 2);
}

/** Vector horizontal bar chart. Returns new Y. */
function drawHBarChart(
  doc: jsPDF,
  y: number,
  items: { label: string; value: number }[],
  title: string,
  color: [number, number, number],
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(doc, 'text', C.ink);
  doc.text(title, PAGE.mL, y);
  y += 5;

  const max = Math.max(...items.map(i => i.value), 0.0001);
  const labelW = 48;
  const valueW = 22;
  const barMaxW = CONTENT_W - labelW - valueW - 4;
  const rowH = 6.5;

  doc.setFontSize(8.5);
  for (const it of items) {
    // label
    setColor(doc, 'text', C.ink);
    doc.setFont('helvetica', 'normal');
    doc.text(String(it.label).substring(0, 26), PAGE.mL, y + 4.5);
    // track
    setColor(doc, 'fill', C.faint);
    doc.rect(PAGE.mL + labelW, y + 1, barMaxW, rowH - 2, 'F');
    // bar
    const w = Math.max(0.5, (it.value / max) * barMaxW);
    setColor(doc, 'fill', color);
    doc.rect(PAGE.mL + labelW, y + 1, w, rowH - 2, 'F');
    // value
    setColor(doc, 'text', C.mute);
    doc.text(`${fmtT(it.value)} tCO2e`, PAGE.mL + CONTENT_W, y + 4.5, { align: 'right' });
    y += rowH;
  }
  return y + 3;
}

function drawTable(doc: jsPDF, y: number, headers: string[], rows: string[][], colW: number[]): number {
  const rowH = 6.5;
  const totalW = colW.reduce((a, b) => a + b, 0);
  // header
  setColor(doc, 'fill', C.brandDark);
  doc.rect(PAGE.mL, y, totalW, rowH, 'F');
  setColor(doc, 'text', C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  let cx = PAGE.mL;
  headers.forEach((h, i) => {
    const align = i === 0 ? 'left' : 'right';
    const tx = align === 'left' ? cx + 2 : cx + colW[i] - 2;
    doc.text(h, tx, y + 4.5, { align });
    cx += colW[i];
  });
  let cy = y + rowH;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  rows.forEach((r, ri) => {
    if (ri % 2 === 0) {
      setColor(doc, 'fill', C.faint);
      doc.rect(PAGE.mL, cy, totalW, rowH, 'F');
    }
    setColor(doc, 'text', C.ink);
    let x = PAGE.mL;
    r.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'right';
      const tx = align === 'left' ? x + 2 : x + colW[i] - 2;
      doc.text(String(cell).substring(0, 60), tx, cy + 4.5, { align });
      x += colW[i];
    });
    cy += rowH;
  });
  return cy + 3;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, newPage: () => number): number {
  if (y + needed > CONTENT_BOTTOM) return newPage();
  return y;
}

function enrichIfShort(text: string, minimumChars: number, addition: string): string {
  const clean = String(text || '').trim();
  if (clean.length >= minimumChars) return clean;
  return `${clean}\n\n${addition}`.trim();
}

function drawCompactPanel(doc: jsPDF, y: number, title: string, items: string[]): number {
  const rowH = 7.5;
  const h = 13 + items.length * rowH;
  setColor(doc, 'fill', C.faint);
  doc.roundedRect(PAGE.mL, y, CONTENT_W, h, 1.5, 1.5, 'F');
  setColor(doc, 'draw', C.line);
  doc.roundedRect(PAGE.mL, y, CONTENT_W, h, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setColor(doc, 'text', C.ink);
  doc.text(title, PAGE.mL + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  items.forEach((item, index) => {
    const cy = y + 14 + index * rowH;
    setColor(doc, 'fill', C.brand);
    doc.circle(PAGE.mL + 5, cy - 2.2, 1.1, 'F');
    setColor(doc, 'text', C.ink);
    const lines = doc.splitTextToSize(item, CONTENT_W - 14) as any;
    doc.text(lines.slice(0, 1), PAGE.mL + 9, cy);
  });
  return y + h + 5;
}

function drawIfSparse(doc: jsPDF, y: number, title: string, items: string[]): number {
  const needed = 13 + items.length * 7.5;
  if (CONTENT_BOTTOM - y < needed + 18) return y;
  return drawCompactPanel(doc, y + 5, title, items);
}

// ============================================================================
// PDF builder — dense, no whitespace
// ============================================================================
async function buildPdf(data: {
  org: any;
  year: number;
  bilan: any;
  activities: any[];
  actions: any[];
  lang: 'fr' | 'en';
}): Promise<{ pdf: Uint8Array; pageCount: number }> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const orgName = data.org?.name || '—';

  // bilan.scope*_emission is stored in tCO2e (aggregated tables). Do NOT divide by 1000.
  const s1 = Number(data.bilan?.scope1_emission || 0);
  const s2 = Number(data.bilan?.scope2_emission || 0);
  const s3 = Number(data.bilan?.scope3_emission || 0);
  const total = s1 + s2 + s3;
  const p1 = ((s1 / (total || 1)) * 100).toFixed(1);
  const p2 = ((s2 / (total || 1)) * 100).toFixed(1);
  const p3 = ((s3 / (total || 1)) * 100).toFixed(1);
  const scope3Cats = aggregateScope3(data.activities);
  const dqReal = data.activities.filter(a => a.data_quality === 'real').length;
  const dqEst = data.activities.filter(a => a.data_quality === 'estimated').length;
  const dqDef = data.activities.filter(a => a.data_quality === 'default' || !a.data_quality).length;

  // Generate narrative via OpenAI
  const narrative = await generateNarrative({
    orgName,
    year: data.year,
    sector: data.org?.sector,
    total, s1, s2, s3, p1, p2, p3,
    scope3Cats,
    activityCount: data.activities.length,
    dqReal, dqEst, dqDef,
    actionsCount: data.actions.length,
  }, data.lang);

  const N = narrative || {
    objectifs: `Le présent rapport formalise le bilan des émissions de gaz à effet de serre de ${orgName} pour l'exercice ${data.year}. Il s'inscrit dans une démarche structurée de mesure, de pilotage et de réduction de l'empreinte carbone, alignée sur les référentiels internationaux GHG Protocol Corporate Standard et ISO 14064-1:2018.\n\nLa démarche répond à trois objectifs stratégiques : documenter de manière transparente l'empreinte carbone de l'organisation, identifier les postes d'émissions prioritaires et outiller la direction pour construire une trajectoire de décarbonation crédible et vérifiable. Elle s'inscrit dans un contexte de tension croissante sur les attentes des parties prenantes : régulateurs (CSRD, taxonomie européenne, CBAM), financeurs et banques, clients grands comptes exigeant désormais des données Scope 3 fiables.`,
    resultats: `L'empreinte carbone totale de ${orgName} pour ${data.year} s'établit à ${fmtT(total)} tCO2e, répartie sur les trois scopes du GHG Protocol.\n\nLe Scope 1 (émissions directes) représente ${fmtT(s1)} tCO2e (${p1}%). Le Scope 2 (énergie achetée) totalise ${fmtT(s2)} tCO2e (${p2}%). Le Scope 3 (chaîne de valeur amont et aval) atteint ${fmtT(s3)} tCO2e (${p3}%). Cette répartition, cohérente avec les benchmarks sectoriels, souligne l'importance stratégique du Scope 3 dans le pilotage de la performance climat.`,
    analyse: `L'analyse des données révèle plusieurs enseignements structurants pour orienter la stratégie de décarbonation.\n\nLe premier concerne la concentration des émissions : quelques postes concentrent l'essentiel de l'empreinte, ce qui permet un ciblage efficace des leviers d'action. Le second concerne la qualité des données : sur ${data.activities.length} enregistrements, ${dqReal} sont issus de mesures directes, ${dqEst} d'estimations et ${dqDef} de facteurs par défaut. Cette répartition invite à poursuivre l'effort de collecte de données primaires pour renforcer la fiabilité des futurs bilans.`,
    plan_actions: `La feuille de route de décarbonation doit conjuguer ambition et faisabilité opérationnelle. Elle s'articule autour de trois horizons temporels.\n\nÀ court terme (0-2 ans) : audit énergétique, plan de sobriété, contractualisation d'électricité renouvelable, sensibilisation des collaborateurs. À moyen terme (2-5 ans) : investissements d'efficacité énergétique, électrification des flottes, engagement fournisseurs sur les émissions Scope 3. À long terme (5-10 ans) : refonte des procédés, économie circulaire, alignement sur une trajectoire 1,5°C validée SBTi.`,
    conclusion: `Ce bilan constitue le point de départ d'une transformation profonde et durable. Il fournit à la direction de ${orgName} une base factuelle solide pour arbitrer les investissements, structurer la communication extra-financière et anticiper les évolutions réglementaires.\n\nLes bénéfices attendus dépassent le seul volet environnemental : maîtrise des coûts énergétiques, résilience opérationnelle, attractivité employeur, accès facilité aux financements verts. La prochaine étape consiste à valider les cibles de réduction, à instaurer une gouvernance climat au plus haut niveau et à intégrer la performance carbone aux processus décisionnels.`,
    annexes: `Méthodologie : GHG Protocol Corporate Standard (WRI/WBCSD) et ISO 14064-1:2018. Les émissions sont calculées selon la formule Émissions = Donnée d'activité × Facteur d'émission. Facteurs d'émission mobilisés : ADEME Base Empreinte, DEFRA, IEA, EPA, avec priorité aux facteurs les plus récents et géographiquement pertinents.\n\nIncertitudes évaluées via la méthode Pedigree Matrix. Glossaire : tCO2e (tonne équivalent CO2), PRG (Potentiel de Réchauffement Global), Scope 1 (émissions directes), Scope 2 (énergie achetée), Scope 3 (15 catégories d'émissions indirectes amont et aval selon la Corporate Value Chain Standard).`,
  };

  N.objectifs = enrichIfShort(N.objectifs, 850, `Le périmètre retenu couvre les émissions directes, les consommations d'énergie et les principaux flux indirects associés à l'activité. Le rapport doit être lu comme un document de pilotage : il consolide les données disponibles, explicite les limites méthodologiques et prépare les décisions d'investissement, d'achat et de gouvernance nécessaires pour réduire l'exposition carbone de l'organisation.`);
  N.resultats = enrichIfShort(N.resultats, 850, `La lecture des résultats privilégie l'ordre de matérialité : les scopes et postes les plus contributeurs doivent être traités en priorité, tandis que les postes secondaires servent à compléter la trajectoire de progrès. Cette approche évite une dispersion des efforts et permet de concentrer les plans d'action sur les leviers présentant le meilleur rapport impact, coût et faisabilité opérationnelle.`);
  N.analyse = enrichIfShort(N.analyse, 850, `L'analyse ne se limite pas au volume d'émissions : elle tient compte de la robustesse des données, du degré de contrôle de l'organisation sur chaque poste et de la capacité à mobiliser les parties prenantes internes ou externes. Les postes estimés ou calculés avec des facteurs par défaut doivent faire l'objet d'un plan d'amélioration de la donnée lors du prochain exercice.`);
  N.plan_actions = enrichIfShort(N.plan_actions, 850, `La mise en œuvre doit être pilotée par un comité clairement identifié, avec des responsables par action, des jalons trimestriels et des indicateurs simples : tCO2e évitées, économies réalisées, budget engagé, statut d'avancement et niveau de confiance de la mesure. Cette gouvernance transforme le bilan carbone en outil de management plutôt qu'en simple document de conformité.`);
  N.conclusion = enrichIfShort(N.conclusion, 700, `La valeur du rapport dépendra surtout de sa traduction en décisions concrètes : arbitrages budgétaires, amélioration des données, engagement fournisseurs et intégration du carbone dans les routines de pilotage. Le prochain bilan devra permettre de mesurer les progrès réalisés et de réviser la trajectoire sur une base documentée.`);
  N.annexes = enrichIfShort(N.annexes, 700, `Les résultats doivent être interprétés avec prudence lorsque les données primaires ne sont pas disponibles. Les améliorations recommandées portent sur la traçabilité des sources, la granularité par site ou activité, la conservation des justificatifs et la mise à jour régulière des facteurs d'émission utilisés.`);

  // ==== COVER ====
  setColor(doc, 'fill', C.brandDark);
  doc.rect(0, 0, PAGE.W, PAGE.H, 'F');
  setColor(doc, 'fill', C.brand);
  doc.rect(0, PAGE.H - 70, PAGE.W, 70, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(doc, 'text', C.white);
  doc.text('CARBOSCAN', PAGE.mL, 30, { charSpace: 2 });
  doc.setFontSize(36);
  doc.text(data.lang === 'fr' ? 'Rapport carbone' : 'Carbon report', PAGE.mL, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(18);
  doc.text(orgName, PAGE.mL, 118);
  doc.setFontSize(12);
  setColor(doc, 'text', [200, 220, 210]);
  doc.text(`${data.lang === 'fr' ? 'Exercice' : 'Fiscal year'} ${data.year}`, PAGE.mL, 128);
  doc.setFontSize(10);
  doc.text(`GHG Protocol Corporate Standard · ISO 14064-1:2018`, PAGE.mL, PAGE.H - 40);
  doc.text(new Date().toLocaleDateString(data.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), PAGE.mL, PAGE.H - 32);
  doc.text(data.lang === 'fr' ? 'Généré par CarboScan' : 'Generated by CarboScan', PAGE.mL, PAGE.H - 24);

  // Helper to add narrative pages with header/footer
  let currentSection = '';
  const newContentPage = (section: string): number => {
    doc.addPage();
    currentSection = section;
    drawPageHeader(doc, section, orgName);
    return 22;
  };

  const startSection = (y: number, num: string, title: string, section: string, minHeight = 70): number => {
    currentSection = section;
    const sy = y + minHeight > CONTENT_BOTTOM ? newContentPage(section) : y + 9;
    return drawSectionTitle(doc, sy, num, title);
  };

  // ==== SECTION 1: Executive summary with KPIs + intro narrative ====
  let y = newContentPage(data.lang === 'fr' ? 'Synthèse exécutive' : 'Executive summary');
  y = drawSectionTitle(doc, y, '01', data.lang === 'fr' ? 'Contexte & objectifs' : 'Context & objectives');
  y = drawKpiRow(doc, y, [
    { label: data.lang === 'fr' ? 'Total' : 'Total', value: `${fmtT(total)}`, sub: `tCO2e — ${data.year}`, color: C.brand },
    { label: 'Scope 1', value: `${p1}%`, sub: `${fmtT(s1)} tCO2e`, color: C.s1 },
    { label: 'Scope 2', value: `${p2}%`, sub: `${fmtT(s2)} tCO2e`, color: C.s2 },
    { label: 'Scope 3', value: `${p3}%`, sub: `${fmtT(s3)} tCO2e`, color: C.s3 },
  ]);
  y = drawScopeBar(doc, y, s1, s2, s3);
  y += 6;
  // Donut chart
  y = drawDonutChart(doc, y, [
    { label: 'Scope 1', value: s1, color: C.s1 },
    { label: 'Scope 2', value: s2, color: C.s2 },
    { label: 'Scope 3', value: s3, color: C.s3 },
  ], data.lang === 'fr' ? 'Répartition des émissions par scope' : 'Emissions breakdown by scope');
  y += 2;
  y = drawJustifiedText(doc, N.objectifs, y, {
    section: currentSection, org: orgName,
    onNewPage: () => newContentPage(data.lang === 'fr' ? 'Synthèse exécutive' : 'Executive summary'),
  });

  // ==== SECTION 2: Results ====
  y = startSection(y, '02', data.lang === 'fr' ? 'Résultats détaillés' : 'Detailed results', data.lang === 'fr' ? 'Résultats' : 'Results', 78);
  y = drawTable(doc, y,
    ['Scope', 'tCO2e', '%'],
    [
      [data.lang === 'fr' ? 'Scope 1 — Émissions directes' : 'Scope 1 — Direct emissions', fmtT(s1), `${p1}%`],
      [data.lang === 'fr' ? 'Scope 2 — Énergie achetée' : 'Scope 2 — Purchased energy', fmtT(s2), `${p2}%`],
      [data.lang === 'fr' ? 'Scope 3 — Chaîne de valeur' : 'Scope 3 — Value chain', fmtT(s3), `${p3}%`],
      ['TOTAL', fmtT(total), '100%'],
    ],
    [CONTENT_W - 60, 30, 30],
  );
  y += 2;
  y = ensureSpace(doc, y, 34, () => newContentPage(data.lang === 'fr' ? 'Résultats' : 'Results'));
  y = drawHBarChart(doc, y,
    [
      { label: 'Scope 1', value: s1 },
      { label: 'Scope 2', value: s2 },
      { label: 'Scope 3', value: s3 },
    ],
    data.lang === 'fr' ? 'Comparaison des scopes (tCO2e)' : 'Scopes comparison (tCO2e)',
    C.brand,
  );
  y = drawJustifiedText(doc, N.resultats, y, {
    section: currentSection, org: orgName,
    onNewPage: () => newContentPage(data.lang === 'fr' ? 'Résultats' : 'Results'),
  });

  // ==== SECTION 3: Analysis + Scope 3 breakdown + data quality ====
  y = startSection(y, '03', data.lang === 'fr' ? 'Analyse & hotspots' : 'Analysis & hotspots', data.lang === 'fr' ? 'Analyse' : 'Analysis', scope3Cats.length > 0 ? 95 : 70);
  if (scope3Cats.length > 0) {
    y = ensureSpace(doc, y, 62, () => newContentPage(data.lang === 'fr' ? 'Analyse' : 'Analysis'));
    y = drawHBarChart(doc, y,
      scope3Cats.slice(0, 8).map(c => ({ label: c.label, value: c.t })),
      data.lang === 'fr' ? 'Top postes Scope 3' : 'Top Scope 3 items',
      C.s3,
    );
    const s3Total = scope3Cats.reduce((a, c) => a + c.t, 0) || 1;
    const rows = scope3Cats.slice(0, 8).map(c => [c.label, fmtT(c.t), `${((c.t / s3Total) * 100).toFixed(1)}%`]);
    y = ensureSpace(doc, y, 14 + rows.length * 6.5, () => newContentPage(data.lang === 'fr' ? 'Analyse' : 'Analysis'));
    y = drawTable(doc, y, [data.lang === 'fr' ? 'Poste Scope 3' : 'Scope 3 item', 'tCO2e', '% S3'], rows, [CONTENT_W - 60, 30, 30]);
  }
  y = drawJustifiedText(doc, N.analyse, y, {
    section: currentSection, org: orgName,
    onNewPage: () => newContentPage(data.lang === 'fr' ? 'Analyse' : 'Analysis'),
  });
  y = drawIfSparse(doc, y, data.lang === 'fr' ? 'Points de vigilance' : 'Watch points', [
    data.lang === 'fr' ? `${dqReal} données mesurées, ${dqEst} estimées et ${dqDef} par défaut : prioriser l'amélioration des postes les plus émetteurs.` : `${dqReal} measured, ${dqEst} estimated and ${dqDef} default data points: improve the highest-emission items first.`,
    data.lang === 'fr' ? `Top Scope 3 à challenger lors du prochain exercice : ${scope3Cats.slice(0, 3).map(c => c.label).join(', ') || 'postes non détaillés'}.` : `Scope 3 items to challenge next year: ${scope3Cats.slice(0, 3).map(c => c.label).join(', ') || 'not detailed'}.`,
    data.lang === 'fr' ? 'Formaliser les hypothèses, justificatifs et facteurs d’émission utilisés pour faciliter l’audit.' : 'Document assumptions, evidence and emission factors to support auditability.',
  ]);

  // ==== SECTION 4: Action plan ====
  y = startSection(y, '04', data.lang === 'fr' ? "Plan d'action & trajectoire" : 'Action plan & trajectory', data.lang === 'fr' ? "Plan d'action" : 'Action plan', data.actions.length > 0 ? 90 : 70);
  if (data.actions.length > 0) {
    const rows = data.actions.slice(0, 10).map(a => [
      (a.title || '—').toString(),
      fmtT(Number(a.expected_reduction_kgco2e || 0) / 1000),
      (a.priority || a.status || '—').toString(),
    ]);
    y = ensureSpace(doc, y, 14 + rows.length * 6.5, () => newContentPage(data.lang === 'fr' ? "Plan d'action" : 'Action plan'));
    y = drawTable(doc, y, ['Action', data.lang === 'fr' ? 'Réduction tCO2e' : 'Reduction tCO2e', data.lang === 'fr' ? 'Priorité' : 'Priority'], rows, [CONTENT_W - 60, 30, 30]);
  }
  y = drawJustifiedText(doc, N.plan_actions, y, {
    section: currentSection, org: orgName,
    onNewPage: () => newContentPage(data.lang === 'fr' ? "Plan d'action" : 'Action plan'),
  });
  y = drawIfSparse(doc, y, data.lang === 'fr' ? 'Pilotage recommandé' : 'Recommended governance', [
    data.lang === 'fr' ? 'Nommer un responsable par action et fixer une échéance mesurable.' : 'Assign one owner per action and define a measurable deadline.',
    data.lang === 'fr' ? 'Suivre mensuellement le statut, le budget engagé et les tCO2e évitées.' : 'Track status, committed budget and avoided tCO2e monthly.',
    data.lang === 'fr' ? 'Réviser la trajectoire après chaque clôture annuelle avec les données réellement observées.' : 'Revise the trajectory after each annual closing with observed data.',
  ]);

  // ==== SECTION 5: Conclusion ====
  y = startSection(y, '05', data.lang === 'fr' ? 'Conclusion & perspectives' : 'Conclusion & outlook', data.lang === 'fr' ? 'Conclusion' : 'Conclusion', 62);
  y = drawJustifiedText(doc, N.conclusion, y, {
    section: currentSection, org: orgName,
    onNewPage: () => newContentPage(data.lang === 'fr' ? 'Conclusion' : 'Conclusion'),
  });
  y = drawIfSparse(doc, y, data.lang === 'fr' ? 'Prochaines décisions' : 'Next decisions', [
    data.lang === 'fr' ? 'Valider les priorités de réduction et les budgets associés.' : 'Approve reduction priorities and related budgets.',
    data.lang === 'fr' ? 'Améliorer la collecte des données primaires sur les principaux postes.' : 'Improve primary data collection on the main emission sources.',
    data.lang === 'fr' ? 'Intégrer les indicateurs carbone au reporting de direction.' : 'Integrate carbon indicators into management reporting.',
  ]);

  // ==== SECTION 6: Annexes / methodology ====
  y = startSection(y, '06', data.lang === 'fr' ? 'Méthodologie & annexes' : 'Methodology & appendix', data.lang === 'fr' ? 'Annexes' : 'Appendix', 86);
  // data quality summary compact
  const dqTot = dqReal + dqEst + dqDef || 1;
  y = ensureSpace(doc, y, 40, () => newContentPage(data.lang === 'fr' ? 'Annexes' : 'Appendix'));
  y = drawTable(doc, y,
    [data.lang === 'fr' ? 'Qualité des données' : 'Data quality', 'N', '%'],
    [
      [data.lang === 'fr' ? 'Mesurées' : 'Measured', String(dqReal), `${((dqReal / dqTot) * 100).toFixed(0)}%`],
      [data.lang === 'fr' ? 'Estimées' : 'Estimated', String(dqEst), `${((dqEst / dqTot) * 100).toFixed(0)}%`],
      [data.lang === 'fr' ? 'Par défaut' : 'Default', String(dqDef), `${((dqDef / dqTot) * 100).toFixed(0)}%`],
    ],
    [CONTENT_W - 60, 30, 30],
  );
  y = drawJustifiedText(doc, N.annexes, y, {
    section: currentSection, org: orgName,
    onNewPage: () => newContentPage(data.lang === 'fr' ? 'Annexes' : 'Appendix'),
  });

  // Footers on all pages except cover
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, orgName, data.year, p, totalPages);
  }

  const buf = doc.output('arraybuffer');
  return { pdf: new Uint8Array(buf), pageCount: totalPages };
}

// ============================================================================
// HTTP handler
// ============================================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization') || '';
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;

    const payload = await req.json();
    if (!payload.organization_id || !payload.year) {
      return new Response(JSON.stringify({ error: 'organization_id and year are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const template_id = payload.template_id || 'executive-summary';
    const language = (payload.language || 'fr') as 'fr' | 'en';

    const svc = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: memberRows } = await svc.from('organization_members')
      .select('id').eq('organization_id', payload.organization_id).eq('user_id', userId).limit(1);
    const { data: ownerRows } = await svc.from('organizations')
      .select('id').eq('id', payload.organization_id).eq('user_id', userId).limit(1);
    const { data: roleRows } = await svc.from('user_roles')
      .select('role').eq('user_id', userId).eq('role', 'superadmin').limit(1);
    const isAllowed = (memberRows && memberRows.length > 0) || (ownerRows && ownerRows.length > 0) || (roleRows && roleRows.length > 0);
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: reportRow, error: repErr } = await svc.from('pro_reports').insert({
      organization_id: payload.organization_id,
      year: payload.year,
      template_id,
      language,
      status: 'generating',
      generated_by: userId,
    }).select('id').single();
    if (repErr) throw repErr;
    const reportId = reportRow.id;

    try {
      const { data: org } = await svc.from('organizations').select('*').eq('id', payload.organization_id).single();
      const { data: bilans } = await svc.from('bilans_carbone')
        .select('*').eq('organization_id', payload.organization_id).eq('reference_year', payload.year)
        .order('date_bilan', { ascending: false }).limit(1);
      const bilan = bilans && bilans[0];
      const yearStart = `${payload.year}-01-01`;
      const yearEnd = `${payload.year}-12-31`;
      const { data: activities } = await svc.from('activity_data')
        .select('category, subcategory, calculated_emissions, data_quality')
        .eq('organization_id', payload.organization_id)
        .gte('period_start', yearStart).lte('period_end', yearEnd)
        .limit(5000);
      const { data: actions } = await svc.from('climate_actions')
        .select('title, expected_reduction_kgco2e, priority, status')
        .eq('organization_id', payload.organization_id)
        .limit(20);

      const { pdf, pageCount } = await buildPdf({
        org, year: payload.year, bilan, activities: activities || [], actions: actions || [], lang: language,
      });

      const filePath = `${payload.organization_id}/${reportId}.pdf`;
      const { error: upErr } = await svc.storage.from('pro-reports').upload(filePath, pdf, {
        contentType: 'application/pdf', upsert: true,
      });
      if (upErr) throw upErr;

      await svc.from('pro_reports').update({
        status: 'ready', file_path: filePath, file_size_bytes: pdf.byteLength, page_count: pageCount,
      }).eq('id', reportId);

      const { data: signed } = await svc.storage.from('pro-reports').createSignedUrl(filePath, 60 * 60 * 24 * 7);

      return new Response(JSON.stringify({
        report_id: reportId, file_path: filePath, download_url: signed?.signedUrl, size: pdf.byteLength, pages: pageCount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      const msg = (e as Error).message || String(e);
      await svc.from('pro_reports').update({ status: 'failed', error_message: msg }).eq('id', reportId);
      throw e;
    }
  } catch (e) {
    console.error('generate-report-pro error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
