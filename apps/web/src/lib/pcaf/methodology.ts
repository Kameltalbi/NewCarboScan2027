/**
 * Lecture des entrées PCAF stockées sur la contrepartie, puis appel du moteur.
 * Les scores et les émissions financées ne sont pas lus comme des données source.
 */
import {
  calculateBusinessLoan,
  weightedDataQualityScore,
  type BusinessLoanInput,
  type BusinessLoanResult,
  type FactorRef,
  type QuantityActivity,
  type ScopeInputs,
} from "./businessLoans.ts";

export type { BusinessLoanInput, BusinessLoanResult };
export { calculateBusinessLoan, weightedDataQualityScore };

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function factorFromRaw(value: unknown): FactorRef | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const tco2ePerUnit = num(row.tco2e_per_unit);
  if (tco2ePerUnit == null) return null;
  return {
    tco2ePerUnit,
    perUnit: String(row.per_unit || ""),
    source: String(row.source || ""),
    year: num(row.year) ?? 0,
    geography: row.geography ? String(row.geography) : null,
    currency: row.currency ? String(row.currency) : null,
  };
}

function activityFromRaw(value: unknown): QuantityActivity | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const factor = factorFromRaw(row.factor);
  const quantity = num(row.quantity);
  if (!factor || quantity == null) return null;
  return {
    quantity,
    unit: String(row.unit || ""),
    factor,
    processEmissionsTco2e: num(row.process_emissions_tco2e),
  };
}

function scopeFromRaw(value: unknown): ScopeInputs | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const scope: ScopeInputs = {};
  if (row.reported && typeof row.reported === "object") {
    const reported = row.reported as Record<string, unknown>;
    const emissions = num(reported.emissions_tco2e);
    if (typeof reported.verified === "boolean" && emissions != null) {
      scope.reported = {
        verified: reported.verified,
        emissionsTco2e: emissions,
        source: reported.source ? String(reported.source) : null,
        year: num(reported.year),
      };
    }
  }
  const energy = activityFromRaw(row.energy);
  const production = activityFromRaw(row.production);
  if (energy) scope.energy = energy;
  if (production) scope.production = production;
  return scope;
}

function intensityFromRaw(value: unknown): BusinessLoanInput["sectorEmissionsPerRevenue"] {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    scope12: factorFromRaw(row.scope12),
    scope3: factorFromRaw(row.scope3),
  };
}

export function businessLoanInputFromRaw(raw: unknown): BusinessLoanInput | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const assetClass = row.asset_class ? String(row.asset_class) : null;
  if (assetClass && assetClass !== "business_loans") {
    return {
      assetClass,
      listing: "unlisted",
      currency: String(row.currency || "TND"),
    };
  }
  if (!row.listing && row.outstanding == null && row.outstanding_tnd == null) return null;
  const listing =
    row.listing === "listed" || row.company_listing === "listed" ? "listed" : "unlisted";
  const instrument =
    row.instrument === "unlisted_equity" ? "unlisted_equity" : "business_loan";
  const turnover = row.sector_asset_turnover;
  let sectorAssetTurnover: BusinessLoanInput["sectorAssetTurnover"] = null;
  if (turnover && typeof turnover === "object") {
    const turn = turnover as Record<string, unknown>;
    const ratio = num(turn.ratio);
    if (ratio != null) {
      sectorAssetTurnover = {
        ratio,
        source: String(turn.source || ""),
        year: num(turn.year) ?? 0,
        geography: turn.geography ? String(turn.geography) : null,
      };
    }
  }
  return {
    assetClass: "business_loans",
    instrument,
    listing,
    outstandingAmount: num(row.outstanding ?? row.outstanding_tnd),
    currency: String(row.currency || "TND"),
    reportingYear: num(row.reporting_year),
    totalEquity: num(row.total_equity ?? row.total_equity_tnd),
    totalDebt: num(row.total_debt ?? row.total_debt_tnd),
    evic: num(row.evic ?? row.evic_tnd),
    totalBalanceSheet: num(row.total_balance_sheet ?? row.total_balance_sheet_tnd),
    equityShare: num(row.equity_share),
    sector: row.sector ? String(row.sector) : null,
    revenue: num(row.revenue),
    revenueCurrency: row.revenue_currency ? String(row.revenue_currency) : null,
    scope12: scopeFromRaw(row.scope12),
    scope3: scopeFromRaw(row.scope3),
    sectorEmissionsPerRevenue: intensityFromRaw(row.sector_emissions_per_revenue),
    sectorEmissionsPerAsset: intensityFromRaw(row.sector_emissions_per_asset),
    sectorAssetTurnover,
  };
}

function factorToRaw(factor: FactorRef | null | undefined): Record<string, unknown> | null {
  if (!factor) return null;
  return {
    tco2e_per_unit: factor.tco2ePerUnit,
    per_unit: factor.perUnit,
    source: factor.source,
    year: factor.year,
    geography: factor.geography ?? null,
    currency: factor.currency ?? null,
  };
}

function activityToRaw(activity: QuantityActivity | null | undefined): Record<string, unknown> | null {
  if (!activity) return null;
  return {
    quantity: activity.quantity,
    unit: activity.unit,
    process_emissions_tco2e: activity.processEmissionsTco2e ?? null,
    factor: factorToRaw(activity.factor),
  };
}

function scopeToRaw(scope: ScopeInputs | null | undefined): Record<string, unknown> | null {
  if (!scope) return null;
  return {
    reported: scope.reported
      ? {
          verified: scope.reported.verified,
          emissions_tco2e: scope.reported.emissionsTco2e,
          source: scope.reported.source ?? null,
          year: scope.reported.year ?? null,
        }
      : null,
    energy: activityToRaw(scope.energy),
    production: activityToRaw(scope.production),
  };
}

export function businessLoanInputToRaw(input: BusinessLoanInput): Record<string, unknown> {
  return {
    pcaf_standard: "PCAF Part A Financed Emissions Third Edition 2025",
    pcaf_section: "5.2",
    asset_class: input.assetClass || "business_loans",
    instrument: input.instrument || "business_loan",
    listing: input.listing,
    outstanding: input.outstandingAmount ?? null,
    currency: input.currency,
    reporting_year: input.reportingYear ?? null,
    total_equity: input.totalEquity ?? null,
    total_debt: input.totalDebt ?? null,
    evic: input.evic ?? null,
    total_balance_sheet: input.totalBalanceSheet ?? null,
    equity_share: input.equityShare ?? null,
    sector: input.sector ?? null,
    revenue: input.revenue ?? null,
    revenue_currency: input.revenueCurrency ?? null,
    scope12: scopeToRaw(input.scope12),
    scope3: scopeToRaw(input.scope3),
    sector_emissions_per_revenue: input.sectorEmissionsPerRevenue
      ? {
          scope12: factorToRaw(input.sectorEmissionsPerRevenue.scope12),
          scope3: factorToRaw(input.sectorEmissionsPerRevenue.scope3),
        }
      : null,
    sector_emissions_per_asset: input.sectorEmissionsPerAsset
      ? {
          scope12: factorToRaw(input.sectorEmissionsPerAsset.scope12),
          scope3: factorToRaw(input.sectorEmissionsPerAsset.scope3),
        }
      : null,
    sector_asset_turnover: input.sectorAssetTurnover
      ? {
          ratio: input.sectorAssetTurnover.ratio,
          source: input.sectorAssetTurnover.source,
          year: input.sectorAssetTurnover.year,
          geography: input.sectorAssetTurnover.geography ?? null,
        }
      : null,
  };
}

export function assessCounterpartyRaw(raw: unknown): BusinessLoanResult | null {
  const input = businessLoanInputFromRaw(raw);
  if (!input) return null;
  return calculateBusinessLoan(input);
}

export function portfolioQuality(results: BusinessLoanResult[]): {
  scope12: number | null;
  scope3: number | null;
} {
  return {
    scope12: weightedDataQualityScore(
      results.map((result) => ({
        outstanding: result.outstandingAmount,
        score: result.scope12.score,
      })),
    ),
    scope3: weightedDataQualityScore(
      results.map((result) => ({
        outstanding: result.outstandingAmount,
        score: result.scope3.score,
      })),
    ),
  };
}
