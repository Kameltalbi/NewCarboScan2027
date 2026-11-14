/** Identifiants affichés dans la collecte. Alignés sur collectCatalog côté web. */
export const COLLECT_CATEGORY_IDS = [
  "poste-1-1",
  "poste-1-2",
  "poste-1-3",
  "poste-1-4",
  "poste-1-5",
  "poste-2-1",
  "poste-2-2",
  "cat1_purchased_goods",
  "cat2_capital_goods",
  "cat3_fuel_energy",
  "cat4_upstream_transport",
  "cat5_waste",
  "cat6_business_travel",
  "cat7_commuting",
  "cat8_upstream_leased",
  "cat9_downstream_transport",
  "cat10_processing",
  "cat11_use_of_products",
  "cat12_end_of_life",
  "cat13_downstream_leased",
  "cat14_franchises",
  "cat15_investments",
] as const;

const KNOWN = new Set<string>(COLLECT_CATEGORY_IDS);

export function sanitizeCollectCategoryIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const kept: string[] = [];
  for (const item of input) {
    if (typeof item !== "string" || !KNOWN.has(item) || kept.includes(item)) continue;
    kept.push(item);
  }
  return kept;
}
