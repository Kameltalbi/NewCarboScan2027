import { d, formatDecimal } from "@newcarboscan/carbon-engine";

/** Chaîne canonique, zéros de queue retirés, arrondi half-up au-delà de l'échelle. */
export function exact(value: Parameters<typeof d>[0], scale = 24): string {
  return formatDecimal(d(value), scale);
}

/** Affichage français : espace insécable, virgule décimale. */
export function formatFr(canonical: string): string {
  const negative = canonical.startsWith("-");
  const absolute = negative ? canonical.slice(1) : canonical;
  const [intRaw, frac] = absolute.split(".");
  const grouped = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const body = frac !== undefined && frac !== "" ? `${grouped},${frac}` : grouped;
  return negative ? `-${body}` : body;
}

export function tonnesFromKg(kg: string): string {
  return exact(d(kg).div(1000));
}

export function percentPhrase(canonical: string): string {
  return `${formatFr(canonical)}\u00a0%`;
}

export function tonnesPhrase(canonical: string): string {
  return `${formatFr(canonical)}\u00a0tCO₂e`;
}

/** Met les nombres décimaux et les milliers au format français, sans arrondir ni toucher aux années. */
export function frenchifyNumbers(text: string): string {
  const tokens = [...new Set(text.match(/\d+\.\d+|\d{4,}/g) ?? [])].sort((left, right) => right.length - left.length);
  let out = text;
  for (const token of tokens) {
    if (/^(19|20)\d{2}$/.test(token)) continue;
    out = out.split(token).join(formatFr(token));
  }
  return out.replace(/tCO2e/gi, "tCO₂e").replace(/(\d)\s*%/g, "$1\u00a0%").replace(/(\d)%/g, "$1\u00a0%");
}

export function frenchList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}
