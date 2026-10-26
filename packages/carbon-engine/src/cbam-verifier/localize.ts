import table from "./translations.json" with { type: "json" };

export type VerifierLocale = "fr" | "en" | "de" | "es";

const DICTIONARIES: Record<Exclude<VerifierLocale, "fr">, Record<string, string>> = {
  en: Object.fromEntries(Object.entries(table).map(([fr, row]) => [fr, row.en])),
  de: Object.fromEntries(Object.entries(table).map(([fr, row]) => [fr, row.de])),
  es: Object.fromEntries(Object.entries(table).map(([fr, row]) => [fr, row.es])),
};

/** Keys that carry rules, codes or identifiers. Their text must stay identical in every language. */
export const STRUCTURAL_KEYS = new Set([
  "value", "id", "field", "family", "code", "verdict", "tone", "path", "version", "locale",
  "in", "exclusions", "thresholdExemptFamilies", "fallbackVerdict", "href",
  "consolidatedDate", "checkedDate",
]);

export function normalizeVerifierLocale(value?: string): VerifierLocale {
  const code = (value || "fr").toLowerCase().slice(0, 2);
  return code === "en" || code === "de" || code === "es" ? code : "fr";
}

export function localizeTree<T>(source: T, locale?: string): T {
  const code = normalizeVerifierLocale(locale);
  if (code === "fr") return source;
  return apply(source, DICTIONARIES[code]) as T;
}

export function missingTranslations(source: unknown, locale: Exclude<VerifierLocale, "fr">): string[] {
  const missing = new Set<string>();
  collect(source, "", DICTIONARIES[locale], missing);
  return [...missing];
}

function apply(source: unknown, dictionary: Record<string, string>, key = ""): unknown {
  if (STRUCTURAL_KEYS.has(key) || isStable(source)) return source;
  if (typeof source === "string") return dictionary[source] ?? source;
  if (Array.isArray(source)) return source.map((item) => apply(item, dictionary));
  if (source && typeof source === "object") {
    return Object.fromEntries(Object.entries(source).map(([child, value]) => [child, apply(value, dictionary, child)]));
  }
  return source;
}

function collect(source: unknown, key: string, dictionary: Record<string, string>, missing: Set<string>) {
  if (STRUCTURAL_KEYS.has(key) || isStable(source)) return;
  if (typeof source === "string") {
    if (source.trim() && dictionary[source] === undefined) missing.add(source);
    return;
  }
  if (Array.isArray(source)) {
    for (const item of source) collect(item, "", dictionary, missing);
    return;
  }
  if (source && typeof source === "object") {
    for (const [child, value] of Object.entries(source)) collect(value, child, dictionary, missing);
  }
}

function isStable(source: unknown) {
  return typeof source === "string" && /^https?:\/\//.test(source);
}
