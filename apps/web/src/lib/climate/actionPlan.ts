/**
 * Champs du plan d'actions (ABC-08).
 * Le potentiel tCO₂e est une estimation. Il ne modifie pas le total du bilan.
 * Le type « fournisseurs » repère une action du plan. Les plans fournisseurs
 * détaillés restent dans le module fournisseurs (ABC-14).
 */

export const PLAN_ACTION_TYPES = [
  { value: "reduction", label: "Réduction" },
  { value: "data_quality", label: "Qualité des données" },
  { value: "awareness", label: "Sensibilisation" },
  { value: "suppliers", label: "Fournisseurs" },
  { value: "substitution", label: "Substitution" },
  { value: "efficiency", label: "Efficacité" },
  { value: "sobriety", label: "Sobriété" },
  { value: "compensation", label: "Compensation" },
  { value: "other", label: "Autre" },
] as const;

export type PlanActionType = (typeof PLAN_ACTION_TYPES)[number]["value"];

export const ESTIMATION_METHODS = [
  { value: "measure", label: "Mesure" },
  { value: "invoice", label: "Facture" },
  { value: "supplier_quote", label: "Devis fournisseur" },
  { value: "internal_estimate", label: "Estimation interne" },
] as const;

export type EstimationMethod = (typeof ESTIMATION_METHODS)[number]["value"];

export interface ActionPlanForm {
  title: string;
  description: string;
  actionType: string;
  leverId: string;
  poste: string;
  siteId: string;
  ownerName: string;
  startDate: string;
  targetDate: string;
  priority: string;
  status: string;
  budget: string;
  indicatorName: string;
  indicatorTarget: string;
  potentialT: string;
  estimationMethod: string;
}

export interface ClimateActionPayload {
  title: string;
  description: string | null;
  action_type: PlanActionType;
  lever_id: string | null;
  source_emission_targeted: string | null;
  site_id: string | null;
  owner_name: string | null;
  start_date: string | null;
  target_date: string | null;
  priority: string;
  status: string;
  budget_estimated: number | null;
  indicator_name: string | null;
  indicator_target: string | null;
  expected_reduction_tco2e: number | null;
  estimation_method: EstimationMethod | null;
}

const TYPE_VALUES = new Set<string>(PLAN_ACTION_TYPES.map((item) => item.value));
const METHOD_VALUES = new Set<string>(ESTIMATION_METHODS.map((item) => item.value));

function blank(value: string): string | null {
  const text = value.trim();
  return text ? text : null;
}

function optionalNumber(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const n = Number(text.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function toClimateActionPayload(form: ActionPlanForm): ClimateActionPayload | { error: string } {
  if (!form.title.trim()) return { error: "Le titre est requis." };
  if (!TYPE_VALUES.has(form.actionType)) return { error: "Le type d'action est requis." };
  const potential = optionalNumber(form.potentialT);
  if (form.potentialT.trim() && potential == null) {
    return { error: "Le potentiel estimé doit être un nombre positif, ou rester vide." };
  }
  const method = form.estimationMethod.trim();
  return {
    title: form.title.trim(),
    description: blank(form.description),
    action_type: form.actionType as PlanActionType,
    lever_id: blank(form.leverId),
    source_emission_targeted: blank(form.poste),
    site_id: blank(form.siteId),
    owner_name: blank(form.ownerName),
    start_date: blank(form.startDate),
    target_date: blank(form.targetDate),
    priority: form.priority || "medium",
    status: form.status || "to_launch",
    budget_estimated: optionalNumber(form.budget),
    indicator_name: blank(form.indicatorName),
    indicator_target: blank(form.indicatorTarget),
    expected_reduction_tco2e: potential,
    estimation_method: METHOD_VALUES.has(method) ? (method as EstimationMethod) : null,
  };
}

export function actionTypeLabel(value: string | null | undefined): string {
  return PLAN_ACTION_TYPES.find((item) => item.value === value)?.label ?? "Non renseigné";
}

/** Le potentiel d'une action reste hors du total du bilan. */
export function bilanTotalAfterPlan(bilanT: number, _potentialT: number | null): number {
  return bilanT;
}
