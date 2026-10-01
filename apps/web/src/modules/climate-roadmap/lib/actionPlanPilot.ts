/**
 * Helpers de statut UX Plan d'actions (pilotage décarbonation).
 * Les valeurs DB restent inchangées ; l'affichage suit le libellé métier.
 */
import type { ActionStatus, ClimateAction } from "../types";

/** Statuts visibles dans le tableau de pilotage */
export const PILOT_STATUSES = [
  "studying",
  "validated",
  "in_progress",
  "completed",
] as const;

export type PilotStatus = (typeof PILOT_STATUSES)[number];

export const PILOT_STATUS_LABELS: Record<PilotStatus, string> = {
  studying: "À étudier",
  validated: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
};

/** Mappe un statut DB vers un statut pilotage affichable */
export function toPilotStatus(status: ActionStatus | string): PilotStatus {
  switch (status) {
    case "validated":
      return "validated";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "to_launch":
    case "studying":
    case "suspended":
    default:
      return "studying";
  }
}

export function isQuantifiedReduction(value: unknown): value is number {
  return value != null && Number.isFinite(Number(value)) && Number(value) > 0;
}

export function formatReductionT(value: unknown): string {
  if (!isQuantifiedReduction(value)) return "À évaluer";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(Number(value))} tCO₂e/an`;
}

/** Actions encore dans le plan (hors abandonnées) */
export function isActivePlanAction(action: ClimateAction): boolean {
  return action.status !== "abandoned";
}

/** Statuts considérés pour la couverture d'objectif */
export function isPlannedForCoverage(action: ClimateAction): boolean {
  return ["to_launch", "studying", "validated", "in_progress", "completed"].includes(
    action.status,
  );
}

export function sumQuantifiedReductions(actions: ClimateAction[]): {
  totalT: number;
  quantifiedCount: number;
} {
  let totalT = 0;
  let quantifiedCount = 0;
  for (const a of actions) {
    if (!isPlannedForCoverage(a)) continue;
    if (isQuantifiedReduction(a.expected_reduction_tco2e)) {
      totalT += Number(a.expected_reduction_tco2e);
      quantifiedCount += 1;
    }
  }
  return { totalT, quantifiedCount };
}

/**
 * Couverture = réduction quantifiée planifiée / réduction nécessaire pour l'objectif.
 * Retourne null si non calculable (pas d'objectif chiffré ou aucune réduction quantifiée).
 */
export function computeObjectiveCoverage(input: {
  baselineT: number | null;
  targetT: number | null;
  plannedReductionT: number;
  quantifiedActionCount: number;
}): { percent: number; neededT: number; plannedT: number } | null {
  const { baselineT, targetT, plannedReductionT, quantifiedActionCount } = input;
  if (
    baselineT == null ||
    targetT == null ||
    !Number.isFinite(baselineT) ||
    !Number.isFinite(targetT) ||
    baselineT <= targetT
  ) {
    return null;
  }
  if (quantifiedActionCount === 0 || !(plannedReductionT > 0)) return null;
  const neededT = baselineT - targetT;
  if (!(neededT > 0)) return null;
  return {
    percent: Math.round((plannedReductionT / neededT) * 1000) / 10,
    neededT,
    plannedT: plannedReductionT,
  };
}
