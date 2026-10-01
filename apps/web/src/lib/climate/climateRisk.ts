/**
 * Registre de risques climatiques (ABC-13).
 * Le niveau est la qualification saisie. Aucune matrice n'est calculée.
 * Une matrice nommée reste à valider ABC. Le bilan n'est pas modifié.
 */

export const RISK_CATEGORIES = [
  { value: "physical", label: "Physique" },
  { value: "transition", label: "Transition" },
  { value: "other", label: "Autre" },
] as const;

export const RISK_LEVELS = [
  { value: "low", label: "Faible" },
  { value: "medium", label: "Moyen" },
  { value: "high", label: "Élevé" },
] as const;

export type RiskCategory = (typeof RISK_CATEGORIES)[number]["value"];
export type RiskLevel = (typeof RISK_LEVELS)[number]["value"];

export interface ClimateRiskForm {
  title: string;
  category: string;
  probability: string;
  impact: string;
  riskLevel: string;
  measure: string;
  actionId: string;
}

export interface ClimateRiskPayload {
  title: string;
  category: RiskCategory;
  probability: RiskLevel;
  impact: RiskLevel;
  risk_level: RiskLevel;
  measure: string | null;
  action_id: string | null;
}

const CATEGORIES = new Set<string>(RISK_CATEGORIES.map((item) => item.value));
const LEVELS = new Set<string>(RISK_LEVELS.map((item) => item.value));

export function riskLabel(list: ReadonlyArray<{ value: string; label: string }>, value: string | null | undefined): string {
  return list.find((item) => item.value === value)?.label ?? "Non renseigné";
}

export function toClimateRiskPayload(form: ClimateRiskForm): ClimateRiskPayload | { error: string } {
  const title = form.title.trim();
  if (!title) return { error: "Le risque est requis." };
  if (!CATEGORIES.has(form.category)) return { error: "La catégorie est requise." };
  if (!LEVELS.has(form.probability)) return { error: "La probabilité est requise." };
  if (!LEVELS.has(form.impact)) return { error: "L'impact est requis." };
  if (!LEVELS.has(form.riskLevel)) return { error: "Le niveau de risque est requis." };
  return {
    title,
    category: form.category as RiskCategory,
    probability: form.probability as RiskLevel,
    impact: form.impact as RiskLevel,
    risk_level: form.riskLevel as RiskLevel,
    measure: form.measure.trim() || null,
    action_id: form.actionId.trim() || null,
  };
}
