import { d, formatDecimal, multiply } from "./decimal.js";

export const ENGINE_VERSION = "1.1.0-proof";

export type GwpFramework = "AR5" | "AR6";

export interface EmissionCalculationInput {
  activity: {
    value: string;
    unit: string;
  };
  factor: {
    value: string;
    unit: string;
    versionId: string;
  };
  allocationFactor?: string;
  methodologyVersion: string;
  formulaOverride?: string;
}

export interface EmissionCalculationResult {
  emissionsKgCO2e: string;
  formula: string;
  activityValueUsed: string;
  factorValueUsed: string;
  factorVersionId: string;
  allocationFactorUsed: string;
  engineVersion: string;
  methodologyVersion: string;
}

/**
 * Calcul atomique déterministe : activité × facteur × allocation.
 * Aucune IA, aucune dépendance UI.
 */
export function calculateEmission(
  input: EmissionCalculationInput,
): EmissionCalculationResult {
  const alloc = input.allocationFactor ?? "1";
  const result = multiply(
    input.activity.value,
    input.factor.value,
    alloc,
  );
  const formula =
    input.formulaOverride ??
    `${input.activity.value} ${input.activity.unit} × ${input.factor.value} ${input.factor.unit}` +
      (alloc === "1" ? "" : ` × ${alloc}`);

  // Guard: reject non-finite via Decimal constructor already; extra check
  if (!d(result).isFinite()) {
    throw new Error("Non-finite emission result");
  }

  return {
    emissionsKgCO2e: formatDecimal(result),
    formula,
    activityValueUsed: input.activity.value,
    factorValueUsed: input.factor.value,
    factorVersionId: input.factor.versionId,
    allocationFactorUsed: alloc,
    engineVersion: ENGINE_VERSION,
    methodologyVersion: input.methodologyVersion,
  };
}
