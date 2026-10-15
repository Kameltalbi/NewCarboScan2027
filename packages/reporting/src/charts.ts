const INK = "#1A2421";
const MUTED = "#5C6763";
const TRACK = "#E4E9E6";

export const SCOPE_COLOR = {
  1: "#073F35",
  2: "#2A6A5C",
  3: "#8C7340",
} as const;

function frNumber(value: string): string {
  return value.replace(".", ",");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgWrap(label: string, width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeXml(label)}">
    <title>${escapeXml(label)}</title>
    <g font-family="Source Sans 3, sans-serif">${body}</g>
  </svg>`;
}

export function scopeDonut(options: {
  label: string;
  center: string;
  centerUnit: string;
  slices: { label: string; share: string; color: string }[];
}): string {
  const cx = 150;
  const cy = 86;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const rings = options.slices
    .map((slice) => {
      const share = Number(slice.share);
      const length = (share / 100) * circumference;
      const dash = `${length.toFixed(2)} ${(circumference - length).toFixed(2)}`;
      const circle = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${slice.color}" stroke-width="22" stroke-dasharray="${dash}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += length;
      return circle;
    })
    .join("");
  const legend = options.slices
    .map((slice, index) => {
      const y = 188 + index * 28;
      return `<rect x="28" y="${y}" width="12" height="12" rx="2" fill="${slice.color}"/>
        <text x="48" y="${y + 11}" fill="${INK}" font-size="15">${escapeXml(slice.label)}</text>
        <text x="272" y="${y + 11}" text-anchor="end" fill="${INK}" font-size="15" font-weight="600">${escapeXml(frNumber(slice.share))} %</text>`;
    })
    .join("");
  return svgWrap(
    options.label,
    300,
    276,
    `${rings}
    <circle cx="${cx}" cy="${cy}" r="46" fill="#F7F6F3"/>
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" fill="${INK}" font-size="14" font-weight="600">${escapeXml(options.center)}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="${MUTED}" font-size="12">${escapeXml(options.centerUnit)}</text>
    ${legend}`,
  );
}

export function rankedPosts(options: {
  label: string;
  rows: { label: string; display: string; share: string; magnitude: string; color: string }[];
}): string {
  const width = 360;
  const rowH = 52;
  const height = 6 + options.rows.length * rowH;
  const max = Math.max(...options.rows.map((row) => Number(row.magnitude)), 1);
  const barMax = 214;
  const bars = options.rows
    .map((row, index) => {
      const y = 2 + index * rowH;
      const barW = Math.max(6, (Number(row.magnitude) / max) * barMax);
      return `<text x="0" y="${y + 13}" fill="${INK}" font-size="14" font-weight="600">${index + 1}. ${escapeXml(row.label)}</text>
        <rect x="0" y="${y + 22}" width="${barMax}" height="11" rx="2" fill="${TRACK}"/>
        <rect x="0" y="${y + 22}" width="${barW.toFixed(2)}" height="11" rx="2" fill="${row.color}"/>
        <text x="${width}" y="${y + 32}" text-anchor="end" fill="${INK}" font-size="12">${escapeXml(row.display)} · ${escapeXml(frNumber(row.share))} %</text>`;
    })
    .join("");
  return svgWrap(options.label, width, height, bars);
}

export function compositionBar(options: {
  label: string;
  segments: { label: string; share: string; color: string }[];
}): string {
  const width = 640;
  const usable = 640;
  let x = 0;
  const parts = options.segments
    .map((segment) => {
      const w = (Number(segment.share) / 100) * usable;
      const rect = `<rect x="${x.toFixed(2)}" y="8" width="${Math.max(w, 1).toFixed(2)}" height="28" fill="${segment.color}"/>`;
      x += w;
      return rect;
    })
    .join("");
  const legend = options.segments
    .map((segment, index) => {
      const lx = index * 220;
      return `<rect x="${lx}" y="52" width="10" height="10" rx="2" fill="${segment.color}"/>
        <text x="${lx + 16}" y="62" fill="${INK}" font-size="12">${escapeXml(segment.label)} · ${escapeXml(frNumber(segment.share))} %</text>`;
    })
    .join("");
  return svgWrap(options.label, width, 78, `${parts}${legend}`);
}

export function yearComparison(options: {
  label: string;
  priorYear: string;
  prior: string;
  priorMagnitude: string;
  currentYear: string;
  current: string;
  currentMagnitude: string;
}): string {
  const max = Math.max(Number(options.priorMagnitude), Number(options.currentMagnitude), 1);
  const bar = (magnitude: string) => Math.max(8, (Number(magnitude) / max) * 420);
  return svgWrap(
    options.label,
    640,
    88,
    `<text x="0" y="22" fill="${MUTED}" font-size="13">${escapeXml(options.priorYear)}</text>
    <rect x="70" y="10" width="${bar(options.priorMagnitude).toFixed(2)}" height="16" rx="2" fill="#9AABA6"/>
    <text x="640" y="22" text-anchor="end" fill="${INK}" font-size="13">${escapeXml(options.prior)}</text>
    <text x="0" y="62" fill="${INK}" font-size="13" font-weight="600">${escapeXml(options.currentYear)}</text>
    <rect x="70" y="50" width="${bar(options.currentMagnitude).toFixed(2)}" height="16" rx="2" fill="#073F35"/>
    <text x="640" y="62" text-anchor="end" fill="${INK}" font-size="13">${escapeXml(options.current)}</text>`,
  );
}
