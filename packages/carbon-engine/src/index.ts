/**
 * Moteur carbone unique — Newcarboscan-2027
 * Constitution : docs/SYSTEME_DE_PREUVE.md
 *
 * Structure :
 *   decimal / calculateEmission / calculateCarbonBalance /
 *   uncertainty / assertFacts / commentary
 */

export { ENGINE_VERSION, calculateEmission } from "./calculateEmission.js";
export type {
  EmissionCalculationInput,
  EmissionCalculationResult,
  GwpFramework,
} from "./calculateEmission.js";

export { calculateCarbonBalance } from "./calculateCarbonBalance.js";
export type {
  CalculationInputLine,
  CalculationResult,
  LedgerLine,
  Scope,
} from "./calculateCarbonBalance.js";

export { formatDecimal, Decimal, d } from "./decimal.js";
import { d } from "./decimal.js";

/** Prefer `d()` for official math; this helper returns a finite JS number. */
export function parseDecimal(value: string): number {
  const n = d(value).toNumber();
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid decimal: ${value}`);
  }
  return n;
}
export { combineUncertaintyPct } from "./uncertainty.js";
export { assertEveryNumberInTextExistsInStructuredFacts } from "./assertFacts.js";
export { buildFactualReportCommentary, assertNoInventedClimateClaims } from "./commentary.js";
