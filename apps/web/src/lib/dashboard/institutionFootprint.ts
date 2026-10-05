/**
 * Périmètre dashboard d'une institution financière.
 * Les émissions financées (Scope 3 catégorie 15) ne font pas partie
 * du total opérations. Elles sont agrégées à part, à partir des
 * contributions des moteurs PCAF déjà implémentés.
 */
import {
  weightedDataQualityScore,
  type BusinessLoanResult,
  type PcafDataQuality,
} from "@/lib/pcaf/businessLoans.ts";

export interface EmissionLineLike {
  category: string;
  subcategory: string;
  emissions: number;
  scope: 1 | 2 | 3;
  dataQuality?: "real" | "estimated" | "default";
  dataMethod?: string | null;
  emissionFactorSource?: string;
  siteId?: string | null;
}

export interface BilanLike {
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  breakdown: { category: string; emissions: number; percentage: number }[];
  detailedBreakdown: EmissionLineLike[];
}

export interface OperationalPerimeter {
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  breakdown: { category: string; emissions: number; percentage: number }[];
  detailedBreakdown: EmissionLineLike[];
  /** True when line-level data allowed category 15 to be removed. */
  separated: boolean;
  excludedCategory15Kg: number;
}

/** GHG Protocol Scope 3 category 15 — investments / financed emissions. */
export function isScope3Category15(
  category?: string | null,
  subcategory?: string | null,
): boolean {
  const blob = `${category ?? ""} ${subcategory ?? ""}`.toLowerCase();
  return /cat\s*15(?!\d)/.test(blob) || /cat[ée]gorie\s*15(?!\d)/.test(blob) || /category\s*15(?!\d)/.test(blob);
}

export function stripCategory15(bilan: BilanLike): OperationalPerimeter {
  const lines = bilan.detailedBreakdown || [];
  if (lines.length === 0) {
    return {
      totalEmissions: bilan.totalEmissions,
      scope1: bilan.scope1,
      scope2: bilan.scope2,
      scope3: bilan.scope3,
      breakdown: bilan.breakdown || [],
      detailedBreakdown: [],
      separated: false,
      excludedCategory15Kg: 0,
    };
  }

  const kept = lines.filter((line) => !isScope3Category15(line.category, line.subcategory));
  const excludedCategory15Kg = lines
    .filter((line) => isScope3Category15(line.category, line.subcategory))
    .reduce((sum, line) => sum + (Number(line.emissions) || 0), 0);

  const scope1 = sumScope(kept, 1);
  const scope2 = sumScope(kept, 2);
  const scope3 = sumScope(kept, 3);
  const totalEmissions = scope1 + scope2 + scope3;

  const byCategory = new Map<string, number>();
  for (const line of kept) {
    if (line.emissions <= 0) continue;
    const key = line.subcategory || line.category || "other";
    if (/^Scope\s*[123]$/i.test(key.trim())) continue;
    byCategory.set(key, (byCategory.get(key) || 0) + line.emissions);
  }
  const breakdown = [...byCategory.entries()]
    .map(([category, emissions]) => ({
      category,
      emissions,
      percentage: totalEmissions > 0 ? (emissions / totalEmissions) * 100 : 0,
    }))
    .sort((a, b) => b.emissions - a.emissions);

  return {
    totalEmissions,
    scope1,
    scope2,
    scope3,
    breakdown,
    detailedBreakdown: kept,
    separated: true,
    excludedCategory15Kg,
  };
}

function sumScope(lines: EmissionLineLike[], scope: 1 | 2 | 3): number {
  return lines
    .filter((line) => line.scope === scope)
    .reduce((sum, line) => sum + (Number(line.emissions) || 0), 0);
}

/**
 * One calculated asset, whatever the PCAF class.
 * Future engines map into this shape. Unimplemented classes stay
 * `implemented: false` and must not contribute emissions.
 */
export interface FinancedAssetContribution {
  assetClass: string;
  implemented: boolean;
  currency: string | null;
  reportingYear: number | null;
  exposure: number | null;
  scope12Tco2e: number | null;
  scope3Tco2e: number | null;
  scope12Score: PcafDataQuality | null;
  scope3Score: PcafDataQuality | null;
}

export interface FinancedPortfolioSummary {
  exposure: number | null;
  currency: string | null;
  mixedCurrencies: boolean;
  scope12Tco2e: number;
  scope3Tco2e: number;
  scope12Score: number | null;
  scope3Score: number | null;
  implementedLines: number;
  scope12Lines: number;
  scope3Lines: number;
  notImplementedLines: number;
  notImplementedClasses: string[];
}

export function contributionFromBusinessLoan(result: BusinessLoanResult): FinancedAssetContribution {
  if (result.status === "not_implemented") {
    return {
      assetClass: result.assetClass,
      implemented: false,
      currency: result.currency || null,
      reportingYear: result.reportingYear,
      exposure: null,
      scope12Tco2e: null,
      scope3Tco2e: null,
      scope12Score: null,
      scope3Score: null,
    };
  }
  return {
    assetClass: result.assetClass,
    implemented: true,
    currency: result.currency || null,
    reportingYear: result.reportingYear,
    exposure: result.outstandingAmount,
    scope12Tco2e:
      result.scope12.status === "calculated" ? result.scope12.financedEmissionsTco2e : null,
    scope3Tco2e:
      result.scope3.status === "calculated" ? result.scope3.financedEmissionsTco2e : null,
    scope12Score: result.scope12.status === "calculated" ? result.scope12.score : null,
    scope3Score: result.scope3.status === "calculated" ? result.scope3.score : null,
  };
}

export function summarizeFinancedPortfolio(
  lines: FinancedAssetContribution[],
  year: number | null,
): FinancedPortfolioSummary {
  const inYear = lines.filter(
    (line) => line.reportingYear == null || year == null || line.reportingYear === year,
  );
  const pending = inYear.filter((line) => !line.implemented);
  const live = inYear.filter((line) => line.implemented);
  const currencies = new Set(
    live.map((line) => line.currency).filter((currency): currency is string => Boolean(currency)),
  );
  const mixedCurrencies = currencies.size > 1;
  const currency = currencies.size === 1 ? [...currencies][0] : null;
  const exposure = mixedCurrencies
    ? null
    : live.reduce((sum, line) => sum + (line.exposure != null && line.exposure > 0 ? line.exposure : 0), 0);

  const scope12 = live.filter((line) => line.scope12Tco2e != null);
  const scope3 = live.filter((line) => line.scope3Tco2e != null);

  return {
    exposure,
    currency,
    mixedCurrencies,
    scope12Tco2e: scope12.reduce((sum, line) => sum + (line.scope12Tco2e as number), 0),
    scope3Tco2e: scope3.reduce((sum, line) => sum + (line.scope3Tco2e as number), 0),
    scope12Score: weightedDataQualityScore(
      live.map((line) => ({ outstanding: line.exposure, score: line.scope12Score })),
    ),
    scope3Score: weightedDataQualityScore(
      live.map((line) => ({ outstanding: line.exposure, score: line.scope3Score })),
    ),
    implementedLines: live.length,
    scope12Lines: scope12.length,
    scope3Lines: scope3.length,
    notImplementedLines: pending.length,
    notImplementedClasses: [...new Set(pending.map((line) => line.assetClass))],
  };
}
