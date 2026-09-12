import { calculateEmission } from "./calculateEmission.js";
import { ENGINE_VERSION } from "./calculateEmission.js";
import { add, formatDecimal } from "./decimal.js";
import { combineUncertaintyPct } from "./uncertainty.js";

export type Scope = 1 | 2 | 3;

export interface CalculationInputLine {
  lineKey: string;
  scope: Scope;
  evidenceId?: string;
  factorId: string;
  activityQuantity: string;
  activityUnit: string;
  factorValue: string;
  factorUnit: string;
  allocationFactor?: string;
  uncertaintyPct?: string;
  activityUncertaintyPct?: string;
  factorUncertaintyPct?: string;
  formula?: string;
  methodologyVersion?: string;
  /**
   * When "biogenic_co2", the line is calculated and ledgered but excluded from
   * scope1/2/3/total (GHG Protocol biogenic CO2 memo / outside of scopes).
   */
  accountingClass?: "scope" | "biogenic_co2";
}

export interface LedgerLine {
  lineKey: string;
  scope: Scope;
  evidenceId?: string;
  factorId: string;
  formula: string;
  activityQuantity: string;
  activityUnit: string;
  factorValue: string;
  factorUnit: string;
  allocationFactor: string;
  resultKgCo2e: string;
  uncertaintyPct?: string;
  engineVersion: string;
  methodologyVersion: string;
  accountingClass: "scope" | "biogenic_co2";
}

export interface CalculationResult {
  engineVersion: string;
  methodologyVersion: string;
  lines: LedgerLine[];
  totals: {
    scope1: string;
    scope2: string;
    scope3: string;
    total: string;
    /** Biogenic CO2 memo (outside scopes) — conserved, not in total. */
    biogenicCo2: string;
  };
  inputHash: string;
  resultHash: string;
}

function stableHash(payload: unknown): string {
  const json = JSON.stringify(payload);
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Bilan multi-lignes — délègue chaque ligne à calculateEmission (décimal).
 */
export function calculateCarbonBalance(
  lines: CalculationInputLine[],
  methodologyVersion = "ghg-corporate-1.0.0",
): CalculationResult {
  const sorted = [...lines].sort((a, b) => a.lineKey.localeCompare(b.lineKey));
  const ledger: LedgerLine[] = sorted.map((line) => {
    const method = line.methodologyVersion ?? methodologyVersion;
    const emission = calculateEmission({
      activity: {
        value: line.activityQuantity,
        unit: line.activityUnit,
      },
      factor: {
        value: line.factorValue,
        unit: line.factorUnit,
        versionId: line.factorId,
      },
      allocationFactor: line.allocationFactor,
      methodologyVersion: method,
      formulaOverride: line.formula,
    });

    const uncertaintyPct =
      line.uncertaintyPct ??
      combineUncertaintyPct(
        line.activityUncertaintyPct,
        line.factorUncertaintyPct,
      );

    return {
      lineKey: line.lineKey,
      scope: line.scope,
      evidenceId: line.evidenceId,
      factorId: line.factorId,
      formula: emission.formula,
      activityQuantity: emission.activityValueUsed,
      activityUnit: line.activityUnit,
      factorValue: emission.factorValueUsed,
      factorUnit: line.factorUnit,
      allocationFactor: emission.allocationFactorUsed,
      resultKgCo2e: emission.emissionsKgCO2e,
      uncertaintyPct,
      engineVersion: ENGINE_VERSION,
      methodologyVersion: method,
      accountingClass: line.accountingClass ?? "scope",
    };
  });

  const sumScope = (s: Scope) =>
    ledger
      .filter((l) => l.scope === s && l.accountingClass !== "biogenic_co2")
      .reduce((acc, l) => add(acc, l.resultKgCo2e), add(0));

  const biogenicCo2 = ledger
    .filter((l) => l.accountingClass === "biogenic_co2")
    .reduce((acc, l) => add(acc, l.resultKgCo2e), add(0));

  const scope1 = sumScope(1);
  const scope2 = sumScope(2);
  const scope3 = sumScope(3);
  const total = add(scope1, scope2, scope3);

  return {
    engineVersion: ENGINE_VERSION,
    methodologyVersion,
    lines: ledger,
    totals: {
      scope1: formatDecimal(scope1),
      scope2: formatDecimal(scope2),
      scope3: formatDecimal(scope3),
      total: formatDecimal(total),
      biogenicCo2: formatDecimal(biogenicCo2),
    },
    inputHash: stableHash(sorted),
    resultHash: stableHash(ledger),
  };
}
