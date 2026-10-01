/**
 * Libellés d'affichage dashboard — n'altère pas les IDs du moteur.
 * Format fréquent dans le breakdown : "Cat7 Employee Commuting:Cat7 Car Solo"
 */

import { getSubcategoryLabel } from "@/lib/scope3/subcategories";

const EXACT: Record<string, string> = {
  // Scope 1 / 2
  electricity: "Électricité réseau",
  electricity_grid: "Électricité réseau",
  grid_electricity: "Électricité réseau",
  electricite: "Électricité réseau",
  electricite_reseau: "Électricité réseau",
  diesel: "Carburant — Diesel",
  gasoil: "Carburant — Diesel",
  fuel_diesel: "Carburant — Diesel",
  "fuel diesel": "Carburant — Diesel",
  fossil_gas: "Gaz naturel",
  natural_gas: "Gaz naturel",
  purchased_electricity: "Électricité réseau",
  electricity_consumption: "Électricité réseau",
  "electricity grid": "Électricité réseau",
  // GHG Protocol cats
  cat1_purchased_goods: "Achats de biens et services",
  cat1_outsourced_services: "Prestations de services",
  cat1_services: "Prestations de services",
  cat2_capital_goods: "Immobilisations & équipements",
  cat2_capex_general: "Immobilisations & équipements",
  cat2_capex_equipment: "Équipements",
  cat2_capex_it: "Équipements informatiques",
  cat2_it_equipment: "Équipements informatiques",
  cat7_employee_commuting: "Trajets domicile-travail",
  cat7_car_solo: "Trajets domicile-travail — voiture",
  cat7_car_km: "Trajets domicile-travail — voiture",
  cat6_business_travel: "Déplacements professionnels",
  cat3_fuel_energy: "Énergie amont",
  cat4_upstream_transport: "Transport amont",
  cat5_waste: "Déchets",
  scope_1: "Émissions directes (Scope 1)",
  scope_2: "Électricité & énergie (Scope 2)",
  scope_3: "Autres émissions indirectes (Scope 3)",
  "scope 1": "Émissions directes (Scope 1)",
  "scope 2": "Électricité & énergie (Scope 2)",
  "scope 3": "Autres émissions indirectes (Scope 3)",
};

/** Alias catalogue → libellé dashboard plus lisible. */
const CATALOG_OVERRIDE: Record<string, string> = {
  "CAPEX Équipements": "Immobilisations & équipements",
  "Services sous-traités": "Prestations de services",
  "Trajets domicile-travail (voiture solo)": "Trajets domicile-travail — voiture",
};

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function normalizeKey(raw: string): string {
  return stripDiacritics(raw)
    .trim()
    .toLowerCase()
    .replace(/^cat(\d+)\s+/, "cat$1_")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_:.-]/g, "");
}

function looksAlreadyHuman(raw: string): boolean {
  // Libellé FR déjà soigné : accents, pas de préfixe CatN / clé snakecase / composite
  if (/^cat\d+/i.test(raw.trim())) return false;
  if (raw.includes(":")) return false;
  if (/_/.test(raw) && !/\s/.test(raw)) return false;
  // Conservateur : ne court-circuiter que les chaînes déjà localisées (accents)
  return /[àâäéèêëïîôùûüçœæÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/.test(raw);
}

function titleCaseFallback(raw: string): string {
  return raw
    .replace(/[_:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\p{L}/gu, (m) => m.toLocaleUpperCase("fr-FR"));
}

function resolvePart(part: string): string | null {
  const key = normalizeKey(part);
  if (EXACT[key]) return EXACT[key];

  // "Cat7 Employee Commuting" → cat7_employee_commuting
  const catMatch = part.match(/^cat\s*(\d+)\s+(.+)$/i);
  if (catMatch) {
    const rebuilt = `cat${catMatch[1]}_${normalizeKey(catMatch[2])}`;
    if (EXACT[rebuilt]) return EXACT[rebuilt];
    const labeled = getSubcategoryLabel(rebuilt);
    if (labeled) return CATALOG_OVERRIDE[labeled] || labeled;
  }

  const fromCatalog =
    getSubcategoryLabel(part) ||
    getSubcategoryLabel(key) ||
    (catMatch
      ? getSubcategoryLabel(
          `cat${catMatch[1]}_${catMatch[2].trim().toLowerCase().replace(/\s+/g, "_")}`,
        )
      : null);
  if (fromCatalog) return CATALOG_OVERRIDE[fromCatalog] || fromCatalog;

  return null;
}

/**
 * Convertit une clé technique (ou composite `A:B`) en libellé client.
 */
export function categoryDisplayLabel(raw: string | null | undefined): string {
  if (!raw) return "Poste non identifié";
  const trimmed = raw.trim();
  if (!trimmed) return "Poste non identifié";

  if (looksAlreadyHuman(trimmed)) return trimmed;

  const parts = trimmed.split(":").map((p) => p.trim()).filter(Boolean);
  const candidates = [...parts].reverse(); // privilégier la sous-catégorie

  for (const part of candidates) {
    const resolved = resolvePart(part);
    if (resolved) return resolved;
  }

  const fullKey = normalizeKey(trimmed);
  if (EXACT[fullKey]) return EXACT[fullKey];

  // Dernier recours : partie la plus spécifique, humanisée
  const tip = parts[parts.length - 1] || trimmed;
  return titleCaseFallback(tip.replace(/^cat\d+\s*/i, ""));
}
