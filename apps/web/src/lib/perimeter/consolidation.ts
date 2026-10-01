/**
 * Périmètre organisationnel (ABC-02).
 * Le statut d'exploitation propose un classement. Il n'écrit pas le scope.
 * Le défaut « contrôle opérationnel » reprend la phrase déjà imprimée dans les rapports.
 * Ce défaut n'est pas une validation ABC.
 */

export const CONSOLIDATION_METHODS = [
  { value: "operational_control", label: "contrôle opérationnel" },
  { value: "financial_control", label: "contrôle financier" },
] as const;

export type ConsolidationMethod = (typeof CONSOLIDATION_METHODS)[number]["value"];

export type OperationStatus = "operated" | "not_operated";
export type OperationChoice = OperationStatus | "unspecified";

export const PERIMETER_EXAMPLES =
  "Véhicule en propriété : souvent Scope 1. Site non opéré : souvent Scope 3. Actif loué : l'arbitrage reste le vôtre.";

export function consolidationLabel(value: string | null | undefined): string {
  const found = CONSOLIDATION_METHODS.find((method) => method.value === value);
  return found?.label ?? "contrôle opérationnel";
}

export function isConsolidationMethod(value: string | null | undefined): value is ConsolidationMethod {
  return CONSOLIDATION_METHODS.some((method) => method.value === value);
}

export function toOperationChoice(status: string | null | undefined): OperationChoice {
  if (status === "operated" || status === "not_operated") return status;
  return "unspecified";
}

export function fromOperationChoice(value: OperationChoice): OperationStatus | null {
  if (value === "operated" || value === "not_operated") return value;
  return null;
}

export function operationStatusLabel(status: string | null | undefined): string {
  if (status === "operated") return "Opéré";
  if (status === "not_operated") return "Non opéré";
  return "Non renseigné";
}

/** Proposition affichée seulement. Jamais écrite sur la ligne. */
export function suggestScopeForOperation(status: string | null | undefined): 3 | null {
  return status === "not_operated" ? 3 : null;
}

export function scopeKeptAfterPerimeterChange<T extends { scope: 1 | 2 | 3 }>(line: T): T {
  return { ...line, scope: line.scope };
}
