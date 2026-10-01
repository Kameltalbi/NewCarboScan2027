/**
 * Intensités carbone (ABC-12).
 * Indicateurs à côté du total. Un dénominateur vide, nul ou négatif n'affiche rien.
 * Aucune valeur de repli (effectif, surface, chiffre d'affaires) n'est inventée.
 */

export interface IntensityInput {
  totalTonnes: number;
  employees?: number | string | null;
  surfaceM2?: number | string | null;
  revenue?: number | string | null;
  currency?: string | null;
  productionLabel?: string | null;
  productionQuantity?: number | string | null;
}

export interface IntensityIndicator {
  id: "employee" | "surface" | "revenue" | "production";
  label: string;
  value: number;
  unit: string;
}

export interface DenominatorSources {
  employees?: number | string | null;
  surfaceM2?: number | string | null;
  revenue?: number | string | null;
}

function positive(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function tonnesPer(totalTonnes: number, denominator: number): number {
  return totalTonnes / denominator;
}

/** L'organisation prime. À défaut, la somme des sites déjà enregistrés. Les deux ne s'additionnent pas. */
export function resolveDenominators(
  organization: DenominatorSources,
  sites: DenominatorSources[],
): { employees: number | null; surfaceM2: number | null; revenue: number | null } {
  const sum = (key: keyof DenominatorSources) =>
    sites.reduce((total, site) => total + (positive(site[key]) ?? 0), 0);
  const pick = (key: keyof DenominatorSources) => positive(organization[key]) ?? positive(sum(key));
  return {
    employees: pick("employees"),
    surfaceM2: pick("surfaceM2"),
    revenue: pick("revenue"),
  };
}

export function carbonIntensities(input: IntensityInput): IntensityIndicator[] {
  if (!Number.isFinite(input.totalTonnes) || input.totalTonnes < 0) return [];
  const indicators: IntensityIndicator[] = [];
  const employees = positive(input.employees);
  const surface = positive(input.surfaceM2);
  const revenue = positive(input.revenue);
  const produced = positive(input.productionQuantity);
  const producedLabel = input.productionLabel?.trim() ?? "";

  if (employees != null) {
    indicators.push({
      id: "employee",
      label: "Par salarié",
      value: tonnesPer(input.totalTonnes, employees),
      unit: "tCO₂e / salarié",
    });
  }
  if (surface != null) {
    indicators.push({
      id: "surface",
      label: "Par m²",
      value: tonnesPer(input.totalTonnes, surface),
      unit: "tCO₂e / m²",
    });
  }
  if (revenue != null) {
    const currency = input.currency?.trim() || "devise";
    indicators.push({
      id: "revenue",
      label: "Par million de chiffre d'affaires",
      value: tonnesPer(input.totalTonnes, revenue / 1_000_000),
      unit: `tCO₂e / M ${currency}`,
    });
  }
  if (produced != null && producedLabel) {
    indicators.push({
      id: "production",
      label: producedLabel,
      value: tonnesPer(input.totalTonnes, produced),
      unit: `tCO₂e / ${producedLabel}`,
    });
  }
  return indicators;
}
