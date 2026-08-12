/**
 * Générateur de graphiques SVG inline pour les rapports PDF.
 *
 * Ces fonctions retournent des chaînes SVG pures (pas de React)
 * qui sont injectées directement dans le HTML des templates.
 * Avantage : html2canvas les capture parfaitement, zéro espace vide.
 *
 * Palette CarboScan :
 *   Scope 1 → #0EA5E9  (Bleu Énergie)
 *   Scope 2 → #F59E0B  (Ambre Électrique)
 *   Scope 3 → #6366F1  (Indigo Industriel)
 */

const COLORS = {
  scope1: '#0EA5E9',
  scope2: '#F59E0B',
  scope3: '#6366F1',
  success: '#10B981',
  alert: '#EF4444',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  bgLight: '#F8FAFC',
  gradient: ['#0EA5E9', '#38BDF8', '#F59E0B', '#FBBF24', '#6366F1', '#818CF8', '#A5B4FC'],
};

// ─── Helpers ────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncateLabel(label: string, maxLen = 20): string {
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen - 1) + '…';
}

function formatNumber(n: number): string {
  if (n >= 1000) return n.toLocaleString('fr-FR');
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

// ─── Doughnut / Pie Chart ───────────────────────────────────

interface DoughnutSlice {
  label: string;
  value: number;
  color: string;
}

export function svgDoughnutChart(
  slices: DoughnutSlice[],
  opts: { width?: number; height?: number; title?: string; showLegend?: boolean; innerRadius?: number } = {}
): string {
  const { width = 460, height = 300, title, showLegend = true, innerRadius = 55 } = opts;
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '';

  const cx = showLegend ? 140 : width / 2;
  const cy = height / 2 + (title ? 10 : 0);
  const outerR = 100;
  const innerR = innerRadius;

  let cumulAngle = -90; // start at top
  const paths: string[] = [];

  slices.forEach((slice) => {
    const pct = slice.value / total;
    const angle = pct * 360;
    const startAngle = cumulAngle;
    const endAngle = cumulAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1o = cx + outerR * Math.cos(startRad);
    const y1o = cy + outerR * Math.sin(startRad);
    const x2o = cx + outerR * Math.cos(endRad);
    const y2o = cy + outerR * Math.sin(endRad);

    const x1i = cx + innerR * Math.cos(endRad);
    const y1i = cy + innerR * Math.sin(endRad);
    const x2i = cx + innerR * Math.cos(startRad);
    const y2i = cy + innerR * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const d = [
      `M ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      'Z',
    ].join(' ');

    paths.push(`<path d="${d}" fill="${slice.color}" stroke="white" stroke-width="2"/>`);

    // Label on arc if slice is big enough
    if (pct > 0.08) {
      const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
      const labelR = (outerR + innerR) / 2;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      paths.push(
        `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="12" font-weight="600">${Math.round(pct * 100)}%</text>`
      );
    }

    cumulAngle = endAngle;
  });

  // Center text
  paths.push(
    `<text x="${cx}" y="${cy - 8}" text-anchor="middle" dominant-baseline="central" fill="${COLORS.textPrimary}" font-size="20" font-weight="700">${formatNumber(total)}</text>`
  );
  paths.push(
    `<text x="${cx}" y="${cy + 14}" text-anchor="middle" dominant-baseline="central" fill="${COLORS.textSecondary}" font-size="11">tCO₂e</text>`
  );

  // Legend
  let legendHtml = '';
  if (showLegend) {
    const legendX = 280;
    let legendY = title ? 50 : 30;
    slices.forEach((slice) => {
      const pct = ((slice.value / total) * 100).toFixed(0);
      legendHtml += `
        <rect x="${legendX}" y="${legendY}" width="12" height="12" rx="3" fill="${slice.color}"/>
        <text x="${legendX + 20}" y="${legendY + 10}" fill="${COLORS.textPrimary}" font-size="12" font-weight="500">${escapeHtml(truncateLabel(slice.label, 18))}</text>
        <text x="${legendX + 20}" y="${legendY + 26}" fill="${COLORS.textSecondary}" font-size="11">${formatNumber(slice.value)} tCO₂e (${pct}%)</text>
      `;
      legendY += 48;
    });
  }

  const titleSvg = title
    ? `<text x="${width / 2}" y="20" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="14" font-weight="600">${escapeHtml(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Inter, -apple-system, sans-serif;">
    ${titleSvg}
    ${paths.join('\n')}
    ${legendHtml}
  </svg>`;
}

// ─── Horizontal Bar Chart ───────────────────────────────────

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

export function svgHorizontalBarChart(
  items: BarItem[],
  opts: { width?: number; height?: number; title?: string; unit?: string; color?: string } = {}
): string {
  if (items.length === 0) return '';
  const { width = 600, title, unit = 'tCO₂e', color = COLORS.scope1 } = opts;

  const barHeight = 32;
  const gap = 12;
  const labelWidth = 180;
  const valueWidth = 80;
  const barAreaWidth = width - labelWidth - valueWidth - 40;
  const topPadding = title ? 40 : 10;
  const height = topPadding + items.length * (barHeight + gap) + 20;

  const maxVal = Math.max(...items.map((i) => i.value), 1);

  let bars = '';
  items.forEach((item, idx) => {
    const y = topPadding + idx * (barHeight + gap);
    const barW = Math.max((item.value / maxVal) * barAreaWidth, 4);
    const barColor = item.color || color;

    bars += `
      <text x="${labelWidth - 8}" y="${y + barHeight / 2 + 1}" text-anchor="end" dominant-baseline="central" fill="${COLORS.textPrimary}" font-size="12" font-weight="500">${escapeHtml(truncateLabel(item.label, 24))}</text>
      <rect x="${labelWidth}" y="${y}" width="${barW}" height="${barHeight}" rx="4" fill="${barColor}" opacity="0.9"/>
      <text x="${labelWidth + barW + 8}" y="${y + barHeight / 2 + 1}" dominant-baseline="central" fill="${COLORS.textPrimary}" font-size="12" font-weight="600">${formatNumber(item.value)} ${unit}</text>
    `;
  });

  const titleSvg = title
    ? `<text x="${width / 2}" y="22" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="14" font-weight="600">${escapeHtml(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Inter, -apple-system, sans-serif;">
    ${titleSvg}
    ${bars}
  </svg>`;
}

// ─── Vertical Bar Chart ─────────────────────────────────────

export function svgVerticalBarChart(
  items: BarItem[],
  opts: { width?: number; height?: number; title?: string; unit?: string; colors?: string[] } = {}
): string {
  if (items.length === 0) return '';
  const { width = 500, height = 320, title, unit = 'tCO₂e', colors = [COLORS.scope1, COLORS.scope2, COLORS.scope3] } = opts;

  const topPadding = title ? 45 : 15;
  const bottomPadding = 60;
  const leftPadding = 60;
  const rightPadding = 20;
  const chartW = width - leftPadding - rightPadding;
  const chartH = height - topPadding - bottomPadding;

  const maxVal = Math.max(...items.map((i) => i.value), 1);
  const barWidth = Math.min(60, (chartW / items.length) * 0.6);
  const barGap = (chartW - barWidth * items.length) / (items.length + 1);

  // Y-axis ticks
  const tickCount = 4;
  let yAxis = '';
  for (let i = 0; i <= tickCount; i++) {
    const val = (maxVal / tickCount) * i;
    const y = topPadding + chartH - (i / tickCount) * chartH;
    yAxis += `
      <line x1="${leftPadding}" y1="${y}" x2="${width - rightPadding}" y2="${y}" stroke="${COLORS.border}" stroke-dasharray="4 4"/>
      <text x="${leftPadding - 8}" y="${y + 4}" text-anchor="end" fill="${COLORS.textMuted}" font-size="10">${formatNumber(Math.round(val))}</text>
    `;
  }

  let bars = '';
  items.forEach((item, idx) => {
    const barH = (item.value / maxVal) * chartH;
    const x = leftPadding + barGap + idx * (barWidth + barGap);
    const y = topPadding + chartH - barH;
    const barColor = item.color || colors[idx % colors.length];

    bars += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${barColor}"/>
      <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="11" font-weight="600">${formatNumber(item.value)}</text>
      <text x="${x + barWidth / 2}" y="${topPadding + chartH + 18}" text-anchor="middle" fill="${COLORS.textSecondary}" font-size="10">${escapeHtml(truncateLabel(item.label, 12))}</text>
    `;
  });

  // Unit label
  const unitLabel = `<text x="${leftPadding - 8}" y="${topPadding - 8}" text-anchor="end" fill="${COLORS.textMuted}" font-size="10">${unit}</text>`;

  const titleSvg = title
    ? `<text x="${width / 2}" y="22" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="14" font-weight="600">${escapeHtml(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Inter, -apple-system, sans-serif;">
    ${titleSvg}
    ${yAxis}
    ${unitLabel}
    <line x1="${leftPadding}" y1="${topPadding + chartH}" x2="${width - rightPadding}" y2="${topPadding + chartH}" stroke="${COLORS.border}"/>
    ${bars}
  </svg>`;
}

// ─── Scope KPI Cards (inline HTML, not SVG) ─────────────────

export function htmlScopeCards(data: {
  scope1: number;
  scope2: number;
  scope3: number;
  scope1Percent: number;
  scope2Percent: number;
  scope3Percent: number;
  hasScope3: boolean;
}): string {
  const card = (label: string, icon: string, value: number, pct: number, color: string, borderColor: string) => `
    <div style="display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid ${borderColor};">
      <div style="width: 44px; height: 44px; background: ${borderColor}15; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">${icon}</div>
      <div style="flex: 1;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">${label}</div>
        <div style="font-size: 22px; font-weight: 700; color: ${color};">${formatNumber(value)} <span style="font-size: 13px; font-weight: 500;">tCO₂e</span></div>
      </div>
      <div style="padding: 5px 12px; background: ${borderColor}12; border-radius: 20px;">
        <span style="font-size: 14px; font-weight: 600; color: ${color};">${pct}%</span>
      </div>
    </div>
  `;

  let html = card('Scope 1 — Émissions directes', '🔥', data.scope1, data.scope1Percent, COLORS.scope1, COLORS.scope1);
  html += card('Scope 2 — Énergie achetée', '⚡', data.scope2, data.scope2Percent, COLORS.scope2, COLORS.scope2);
  if (data.hasScope3) {
    html += card('Scope 3 — Chaîne de valeur', '🔗', data.scope3, data.scope3Percent, COLORS.scope3, COLORS.scope3);
  }

  return `<div style="display: flex; flex-direction: column; gap: 12px;">${html}</div>`;
}

// ─── Intensity KPI Row ──────────────────────────────────────

export function htmlIntensityCards(data: {
  intensityPerEmployee: number;
  intensityPerM2: number;
  intensityPerRevenue?: number;
  hasRevenue: boolean;
}): string {
  const kpi = (label: string, value: number, unit: string) => `
    <div style="flex: 1; background: white; padding: 18px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0;">
      <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">${label}</div>
      <div style="font-size: 28px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums;">${formatNumber(value)}</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">${unit}</div>
    </div>
  `;

  let html = kpi('Par collaborateur', data.intensityPerEmployee, 'tCO₂e/pers');
  html += kpi('Par m² de surface', data.intensityPerM2, 'kgCO₂e/m²');
  if (data.hasRevenue && data.intensityPerRevenue !== undefined) {
    html += kpi('Par k€ de CA', data.intensityPerRevenue, 'kgCO₂e/k€');
  }

  return `<div style="display: flex; gap: 16px;">${html}</div>`;
}

// ─── Top Posts Ranking Table ────────────────────────────────

export function htmlTopPostsTable(
  posts: Array<{ name: string; value: number; percent: number; scope: number }>,
  opts: { title?: string } = {}
): string {
  if (posts.length === 0) return '';
  const { title = 'Principaux postes émetteurs' } = opts;

  const scopeColor = (s: number) => s === 1 ? COLORS.scope1 : s === 2 ? COLORS.scope2 : COLORS.scope3;
  const scopeLabel = (s: number) => `Scope ${s}`;
  const maxVal = Math.max(...posts.map((p) => p.value), 1);

  const rows = posts
    .map(
      (p, i) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px 8px; font-size: 13px; font-weight: 600; color: #0f172a; width: 30px; text-align: center;">${i + 1}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #334155;">${escapeHtml(p.name)}</td>
      <td style="padding: 12px 8px; width: 200px;">
        <div style="background: #f1f5f9; border-radius: 4px; height: 20px; position: relative; overflow: hidden;">
          <div style="background: ${scopeColor(p.scope)}; height: 100%; width: ${Math.round((p.value / maxVal) * 100)}%; border-radius: 4px;"></div>
        </div>
      </td>
      <td style="padding: 12px 8px; font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; white-space: nowrap;">${formatNumber(p.value)} tCO₂e</td>
      <td style="padding: 12px 8px; font-size: 12px; text-align: center;">
        <span style="padding: 3px 8px; background: ${scopeColor(p.scope)}15; color: ${scopeColor(p.scope)}; border-radius: 12px; font-weight: 500;">${scopeLabel(p.scope)}</span>
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <div style="margin: 16px 0;">
      <h3 style="font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px;">${escapeHtml(title)}</h3>
      <table style="width: 100%; border-collapse: collapse; font-family: Inter, -apple-system, sans-serif;">
        <thead>
          <tr style="border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px 8px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">#</th>
            <th style="padding: 10px 8px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Poste</th>
            <th style="padding: 10px 8px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Répartition</th>
            <th style="padding: 10px 8px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Émissions</th>
            <th style="padding: 10px 8px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Scope</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ─── Trajectory / Projection Line Chart ─────────────────────

export function svgTrajectoryChart(
  currentYear: number,
  currentEmissions: number,
  targetYear: number,
  reductionPercent: number,
  opts: { width?: number; height?: number; title?: string } = {}
): string {
  if (currentEmissions <= 0) return '';
  const { width = 560, height = 300, title } = opts;

  const topPad = title ? 50 : 20;
  const bottomPad = 50;
  const leftPad = 70;
  const rightPad = 30;
  const chartW = width - leftPad - rightPad;
  const chartH = height - topPad - bottomPad;

  const targetEmissions = Math.round(currentEmissions * (1 - reductionPercent / 100));
  const maxY = currentEmissions * 1.1;

  const toX = (year: number) => leftPad + ((year - currentYear) / (targetYear - currentYear)) * chartW;
  const toY = (val: number) => topPad + chartH - (val / maxY) * chartH;

  const x1 = toX(currentYear);
  const y1 = toY(currentEmissions);
  const x2 = toX(targetYear);
  const y2 = toY(targetEmissions);

  // BAU line (flat)
  const bauY = toY(currentEmissions);

  // Grid
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const val = (maxY / 4) * i;
    const y = toY(val);
    grid += `<line x1="${leftPad}" y1="${y}" x2="${width - rightPad}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="4 4"/>`;
    grid += `<text x="${leftPad - 10}" y="${y + 4}" text-anchor="end" fill="#94a3b8" font-size="10">${formatNumber(Math.round(val))}</text>`;
  }

  const titleSvg = title
    ? `<text x="${width / 2}" y="26" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="14" font-weight="600">${escapeHtml(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Inter, -apple-system, sans-serif;">
    ${titleSvg}
    ${grid}
    <!-- X axis -->
    <line x1="${leftPad}" y1="${topPad + chartH}" x2="${width - rightPad}" y2="${topPad + chartH}" stroke="#e2e8f0"/>
    <text x="${x1}" y="${topPad + chartH + 20}" text-anchor="middle" fill="${COLORS.textSecondary}" font-size="11" font-weight="500">${currentYear}</text>
    <text x="${x2}" y="${topPad + chartH + 20}" text-anchor="middle" fill="${COLORS.textSecondary}" font-size="11" font-weight="500">${targetYear}</text>
    <!-- Y axis label -->
    <text x="${leftPad - 10}" y="${topPad - 10}" text-anchor="end" fill="${COLORS.textMuted}" font-size="10">tCO₂e</text>
    <!-- BAU line (dashed) -->
    <line x1="${x1}" y1="${bauY}" x2="${x2}" y2="${bauY}" stroke="#EF4444" stroke-width="2" stroke-dasharray="8 4" opacity="0.5"/>
    <text x="${x2 + 4}" y="${bauY + 4}" fill="#EF4444" font-size="10" opacity="0.7">Statu quo</text>
    <!-- Target area -->
    <polygon points="${x1},${y1} ${x2},${y2} ${x2},${topPad + chartH} ${x1},${topPad + chartH}" fill="${COLORS.success}" opacity="0.08"/>
    <!-- Target line -->
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.success}" stroke-width="3"/>
    <!-- Dots -->
    <circle cx="${x1}" cy="${y1}" r="6" fill="${COLORS.scope1}" stroke="white" stroke-width="2"/>
    <circle cx="${x2}" cy="${y2}" r="6" fill="${COLORS.success}" stroke="white" stroke-width="2"/>
    <!-- Labels -->
    <text x="${x1}" y="${y1 - 14}" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="12" font-weight="600">${formatNumber(currentEmissions)} tCO₂e</text>
    <text x="${x2}" y="${y2 - 14}" text-anchor="middle" fill="${COLORS.success}" font-size="12" font-weight="600">${formatNumber(targetEmissions)} tCO₂e</text>
    <text x="${x2}" y="${y2 + 18}" text-anchor="middle" fill="${COLORS.success}" font-size="10">(-${reductionPercent}%)</text>
    <!-- Legend -->
    <line x1="${leftPad}" y1="${topPad + chartH + 36}" x2="${leftPad + 20}" y2="${topPad + chartH + 36}" stroke="${COLORS.success}" stroke-width="2"/>
    <text x="${leftPad + 26}" y="${topPad + chartH + 40}" fill="${COLORS.textSecondary}" font-size="10">Trajectoire cible (Accord de Paris)</text>
    <line x1="${leftPad + 260}" y1="${topPad + chartH + 36}" x2="${leftPad + 280}" y2="${topPad + chartH + 36}" stroke="#EF4444" stroke-width="2" stroke-dasharray="4 2"/>
    <text x="${leftPad + 286}" y="${topPad + chartH + 40}" fill="${COLORS.textSecondary}" font-size="10">Scénario statu quo</text>
  </svg>`;
}

// ─── Stacked Bar Chart (Scope 3 categories) ────────────────

export function svgStackedBarChart(
  data: Array<{ label: string; value: number; color: string }>,
  opts: { title?: string; width?: number; height?: number; total?: number } = {}
): string {
  const { title, width = 520, height = 200 } = opts;
  if (!data.length) return '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:20px;">Aucune donnée disponible</div>';

  const total = opts.total || data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:20px;">Aucune donnée disponible</div>';

  const barY = 50;
  const barH = 36;
  const barW = width - 40;
  let currentX = 20;

  let bars = '';
  let labels = '';
  const legendY = barY + barH + 30;

  data.forEach((d, i) => {
    const w = (d.value / total) * barW;
    if (w < 1) return;
    const pct = Math.round((d.value / total) * 100);
    bars += `<rect x="${currentX}" y="${barY}" width="${w}" height="${barH}" fill="${d.color}" rx="${i === 0 ? '6' : '0'}"/>`;
    if (w > 30) {
      bars += `<text x="${currentX + w / 2}" y="${barY + barH / 2 + 5}" text-anchor="middle" fill="white" font-size="11" font-weight="600">${pct}%</text>`;
    }
    // Legend item
    const legendX = 20 + i * Math.min(180, (width - 40) / data.length);
    labels += `<rect x="${legendX}" y="${legendY}" width="10" height="10" rx="2" fill="${d.color}"/>`;
    labels += `<text x="${legendX + 14}" y="${legendY + 9}" fill="${COLORS.textSecondary}" font-size="10">${truncateLabel(d.label, 22)} (${formatNumber(d.value)})</text>`;
    currentX += w;
  });

  const titleSvg = title
    ? `<text x="${width / 2}" y="26" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="14" font-weight="600">${escapeHtml(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Inter, -apple-system, sans-serif;">
    ${titleSvg}
    ${bars}
    ${labels}
  </svg>`;
}

// ─── Gauge / Progress Ring ──────────────────────────────────

export function svgGaugeChart(
  value: number,
  maxValue: number,
  opts: { label?: string; color?: string; size?: number; unit?: string } = {}
): string {
  const { label, color = COLORS.scope1, size = 120, unit = '%' } = opts;
  const pct = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - pct);
  const displayVal = unit === '%' ? Math.round(pct * 100) : Math.round(value);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + (label ? 24 : 0)}" viewBox="0 0 ${size} ${size + (label ? 24 : 0)}" style="font-family: Inter, -apple-system, sans-serif;">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="8"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy + 6}" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="${size > 100 ? 22 : 16}" font-weight="700">${displayVal}${unit}</text>
    ${label ? `<text x="${cx}" y="${size + 16}" text-anchor="middle" fill="${COLORS.textSecondary}" font-size="11">${escapeHtml(label)}</text>` : ''}
  </svg>`;
}

// ─── Grouped Bar Chart (Site Comparison) ────────────────────

interface SiteEmissions {
  name: string;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}

export function svgSiteComparisonChart(
  sites: SiteEmissions[],
  opts: { width?: number; height?: number; title?: string } = {}
): string {
  if (sites.length === 0) return '';
  const { width = 560, height = 340, title } = opts;

  const topPadding = title ? 50 : 20;
  const bottomPadding = 70;
  const leftPadding = 70;
  const rightPadding = 20;
  const chartW = width - leftPadding - rightPadding;
  const chartH = height - topPadding - bottomPadding;

  const maxVal = Math.max(...sites.map(s => s.total), 1);

  const groupWidth = chartW / sites.length;
  const barWidth = Math.min(28, (groupWidth - 20) / 3);
  const barGap = 4;

  // Y-axis ticks
  const tickCount = 4;
  let yAxis = '';
  for (let i = 0; i <= tickCount; i++) {
    const val = (maxVal / tickCount) * i;
    const y = topPadding + chartH - (i / tickCount) * chartH;
    yAxis += `
      <line x1="${leftPadding}" y1="${y}" x2="${width - rightPadding}" y2="${y}" stroke="${COLORS.border}" stroke-dasharray="4 4"/>
      <text x="${leftPadding - 8}" y="${y + 4}" text-anchor="end" fill="${COLORS.textMuted}" font-size="10">${formatNumber(Math.round(val))}</text>
    `;
  }

  let bars = '';
  sites.forEach((site, idx) => {
    const groupX = leftPadding + idx * groupWidth + groupWidth / 2;
    const scopes = [
      { value: site.scope1, color: COLORS.scope1 },
      { value: site.scope2, color: COLORS.scope2 },
      { value: site.scope3, color: COLORS.scope3 },
    ];

    const totalBarsWidth = scopes.length * barWidth + (scopes.length - 1) * barGap;
    const startX = groupX - totalBarsWidth / 2;

    scopes.forEach((scope, sIdx) => {
      const barH = maxVal > 0 ? (scope.value / maxVal) * chartH : 0;
      const x = startX + sIdx * (barWidth + barGap);
      const y = topPadding + chartH - barH;
      if (scope.value > 0) {
        bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="3" fill="${scope.color}" opacity="0.9"/>`;
        if (barH > 20) {
          bars += `<text x="${x + barWidth / 2}" y="${y - 4}" text-anchor="middle" fill="${COLORS.textSecondary}" font-size="9" font-weight="500">${formatNumber(Math.round(scope.value))}</text>`;
        }
      }
    });

    // Site name label
    bars += `<text x="${groupX}" y="${topPadding + chartH + 18}" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="11" font-weight="600">${escapeHtml(truncateLabel(site.name, 16))}</text>`;
    // Total label
    bars += `<text x="${groupX}" y="${topPadding + chartH + 34}" text-anchor="middle" fill="${COLORS.textSecondary}" font-size="10">${formatNumber(Math.round(site.total))} tCO₂e</text>`;
  });

  // Legend
  const legendY = height - 18;
  const legend = `
    <rect x="${leftPadding}" y="${legendY}" width="10" height="10" rx="2" fill="${COLORS.scope1}"/>
    <text x="${leftPadding + 14}" y="${legendY + 9}" fill="${COLORS.textSecondary}" font-size="10">Scope 1</text>
    <rect x="${leftPadding + 75}" y="${legendY}" width="10" height="10" rx="2" fill="${COLORS.scope2}"/>
    <text x="${leftPadding + 89}" y="${legendY + 9}" fill="${COLORS.textSecondary}" font-size="10">Scope 2</text>
    <rect x="${leftPadding + 150}" y="${legendY}" width="10" height="10" rx="2" fill="${COLORS.scope3}"/>
    <text x="${leftPadding + 164}" y="${legendY + 9}" fill="${COLORS.textSecondary}" font-size="10">Scope 3</text>
  `;

  const titleSvg = title
    ? `<text x="${width / 2}" y="24" text-anchor="middle" fill="${COLORS.textPrimary}" font-size="14" font-weight="600">${escapeHtml(title)}</text>`
    : '';

  // Y-axis label
  const yLabel = `<text x="14" y="${topPadding + chartH / 2}" text-anchor="middle" fill="${COLORS.textMuted}" font-size="10" transform="rotate(-90, 14, ${topPadding + chartH / 2})">tCO₂e</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Inter, -apple-system, sans-serif;">
    ${titleSvg}
    ${yAxis}
    ${yLabel}
    <line x1="${leftPadding}" y1="${topPadding + chartH}" x2="${width - rightPadding}" y2="${topPadding + chartH}" stroke="${COLORS.border}"/>
    ${bars}
    ${legend}
  </svg>`;
}

export default {
  svgDoughnutChart,
  svgHorizontalBarChart,
  svgVerticalBarChart,
  svgTrajectoryChart,
  svgStackedBarChart,
  svgGaugeChart,
  svgSiteComparisonChart,
  htmlScopeCards,
  htmlIntensityCards,
  htmlTopPostsTable,
};
