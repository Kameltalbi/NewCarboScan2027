/**
 * Propagation d'incertitude documentée (méthode RSS simplifiée).
 * Racine de la somme des carrés des incertitudes activité et facteur.
 * Interdit : inventer une fourchette globale arbitraire.
 */
import { d, formatDecimal } from "./decimal.js";

export function combineUncertaintyPct(
  activityUncertaintyPct: string | undefined,
  factorUncertaintyPct: string | undefined,
): string | undefined {
  if (activityUncertaintyPct == null && factorUncertaintyPct == null) {
    return undefined;
  }
  const a = d(activityUncertaintyPct ?? "0");
  const f = d(factorUncertaintyPct ?? "0");
  const combined = a.pow(2).plus(f.pow(2)).sqrt();
  return formatDecimal(combined, 4);
}
