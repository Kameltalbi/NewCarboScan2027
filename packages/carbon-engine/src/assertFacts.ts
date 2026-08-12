/**
 * Contrôle post-IA : tout nombre dans le texte doit exister dans les faits.
 */
export function assertEveryNumberInTextExistsInStructuredFacts(
  aiText: string,
  facts: string[],
): { ok: boolean; unknownNumbers: string[] } {
  const factSet = new Set(
    facts.map((f) => normalizeNumberToken(f)).filter(Boolean),
  );
  const found = aiText.match(/-?\d[\d\s]*([.,]\d+)?/g) ?? [];
  const unknown: string[] = [];
  for (const raw of found) {
    const n = normalizeNumberToken(raw);
    if (!n) continue;
    if (!factSet.has(n)) unknown.push(raw.trim());
  }
  return { ok: unknown.length === 0, unknownNumbers: unknown };
}

function normalizeNumberToken(value: string): string {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return "";
  // Strip trailing zeros for comparison
  if (!cleaned.includes(".")) return cleaned.replace(/^-0+$/, "0");
  return cleaned.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}
