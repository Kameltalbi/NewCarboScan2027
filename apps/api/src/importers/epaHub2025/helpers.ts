/** Shared helpers for EPA Hub 2025 parsers. */

export function slug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

export function cleanCell(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

export function isNaToken(v: unknown): boolean {
  const s = cleanCell(v);
  if (!s) return false;
  return /^na$/i.test(s) || /^n\/a$/i.test(s);
}

/** Parse numeric EPA cell; returns null for blank/NA (never coerce NA→0). */
export function parseNumeric(v: unknown): { value: number; text: string } | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return null;
    // Prefer compact text that matches typical PG numeric::text for decimals
    const text = Object.is(v, -0) ? "0" : String(v);
    return { value: v, text };
  }
  const s = cleanCell(v);
  if (!s || isNaToken(s)) return null;
  const normalized = s.replace(/,/g, "");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return { value: n, text: normalized };
}

export function isSectionHeader(label: string | null): boolean {
  if (!label) return true;
  const l = label.toLowerCase();
  if (l.startsWith("source:") || l.startsWith("notes:") || l.startsWith("http")) return true;
  if (l.includes("please see") || l.includes("federal register")) return true;
  // Category banners without numeric data (e.g. "Coal and Coke")
  return false;
}

export function looksLikeFuelOrMaterialRow(label: string | null, hasNumeric: boolean): boolean {
  if (!label || isSectionHeader(label)) return false;
  return hasNumeric;
}
