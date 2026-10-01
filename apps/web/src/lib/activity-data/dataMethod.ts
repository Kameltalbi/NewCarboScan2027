/**
 * Méthode de donnée d'une ligne de bilan (ABC-04).
 * Une ligne sans méthode n'est pas comptée comme physique.
 * Les ratios TND du calculateur écran restent des nombres inchangés, non validés ABC.
 */

export const DATA_METHODS = [
  "physical",
  "monetary",
  "direct_emission",
  "supplier_specific",
  "other",
] as const;

export type DataMethod = (typeof DATA_METHODS)[number];

export const DATA_METHOD_LABELS: Record<DataMethod, string> = {
  physical: "Donnée physique",
  monetary: "Ratio monétaire",
  direct_emission: "Émission directe",
  supplier_specific: "Donnée fournisseur",
  other: "Autre",
};

export const UNVALIDATED_MONETARY_LABEL = "Ratio monétaire non validé ABC";

export const PHYSICAL_PREFERENCE =
  "Une donnée physique (quantité, masse, énergie) est préférable à un ratio monétaire.";

/** Clés dont le commentaire du calculateur écran dit kgCO2e/TND ou ratio monétaire. */
export const UNVALIDATED_TND_DEFAULT_KEYS = [
  "cat9_warehousing",
  "cat1_outsourced_services",
  "cat1_raw_materials",
  "cat1_imported_spare_parts",
  "cat1_workshop_equipment",
  "cat1_it_servers",
  "cat1_packaging",
  "cat1_consumables",
  "cat1_office_supplies",
  "services_sous_traites",
  "achat_services",
  "externalisation_service",
  "cat2_capex_general",
  "cat2_it_equipment",
  "cat2_machinery",
  "cat2_furniture",
  "cat2_other",
  "cat1_moyens_generaux",
  "cat1_it_consumables",
  "cat1_maintenance_services",
  "cat1_food_beverages",
  "cat1_other",
  "cat4_warehousing",
  "cat8_leased_equipment",
  "cat10_processing",
  "cat13_leased_equipment",
  "cat14_franchise_operations",
  "cat14_spare_parts_sold",
  "cat14_oils_products_sold",
  "cat15_equity",
  "cat15_debt",
  "cat15_project_finance",
] as const;

const TND_KEYS = new Set<string>(UNVALIDATED_TND_DEFAULT_KEYS);

export function isDataMethod(value: string | null | undefined): value is DataMethod {
  return DATA_METHODS.includes(value as DataMethod);
}

export function dataMethodLabel(value: string | null | undefined): string {
  if (isDataMethod(value)) return DATA_METHOD_LABELS[value];
  return "Non renseigné";
}

export function isUnvalidatedMonetaryDefault(subcategory: string | null | undefined): boolean {
  const key = (subcategory || "").split(":").pop()?.trim().toLowerCase() || "";
  return TND_KEYS.has(key);
}

export interface MethodShareLine {
  method?: string | null;
  kg: number;
}

export interface MethodShare {
  totalKg: number;
  kg: Record<DataMethod | "unspecified", number>;
  percent: Record<DataMethod | "unspecified", number>;
}

function emptyBuckets(): Record<DataMethod | "unspecified", number> {
  return {
    physical: 0,
    monetary: 0,
    direct_emission: 0,
    supplier_specific: 0,
    other: 0,
    unspecified: 0,
  };
}

export function shareByMethod(lines: MethodShareLine[]): MethodShare {
  const kg = emptyBuckets();
  let totalKg = 0;
  for (const line of lines) {
    const amount = Number(line.kg);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    totalKg += amount;
    const key = isDataMethod(line.method) ? line.method : "unspecified";
    kg[key] += amount;
  }
  const percent = emptyBuckets();
  (Object.keys(percent) as Array<DataMethod | "unspecified">).forEach((key) => {
    percent[key] = totalKg === 0 ? 0 : Math.round((kg[key] / totalKg) * 1000) / 10;
  });
  return { totalKg, kg, percent };
}
