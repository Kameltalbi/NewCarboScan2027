/**
 * Registre de mobilisation (ABC-14).
 * Le module fournisseurs n'est pas recopié ici.
 * Aucune émission n'est calculée.
 */

export const MOBILIZATION_AUDIENCES = [
  { value: "employees", label: "Collaborateurs" },
  { value: "management", label: "Direction" },
  { value: "suppliers", label: "Fournisseurs" },
  { value: "other", label: "Autre" },
] as const;

export type MobilizationAudience = (typeof MOBILIZATION_AUDIENCES)[number]["value"];

export interface MobilizationForm {
  audience: string;
  stakeholders: string;
  title: string;
  occurredOn: string;
  ownerName: string;
  support: string;
  actionId: string;
}

export interface MobilizationPayload {
  audience: MobilizationAudience;
  stakeholders: string;
  title: string;
  occurred_on: string;
  owner_name: string;
  support: string | null;
  action_id: string | null;
}

const AUDIENCES = new Set<string>(MOBILIZATION_AUDIENCES.map((item) => item.value));

export function mobilizationLabel(value: string | null | undefined): string {
  return MOBILIZATION_AUDIENCES.find((item) => item.value === value)?.label ?? "Non renseigné";
}

export function mobilizationDateInput(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function toMobilizationPayload(form: MobilizationForm): MobilizationPayload | { error: string } {
  const stakeholders = form.stakeholders.trim();
  const title = form.title.trim();
  const ownerName = form.ownerName.trim();
  if (!AUDIENCES.has(form.audience)) return { error: "Le public est requis." };
  if (!stakeholders) return { error: "Les parties prenantes sont requises." };
  if (!title) return { error: "L'action réalisée est requise." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.occurredOn)) return { error: "La date est requise." };
  if (!ownerName) return { error: "Le responsable est requis." };
  return {
    audience: form.audience as MobilizationAudience,
    stakeholders,
    title,
    occurred_on: form.occurredOn,
    owner_name: ownerName,
    support: form.support.trim() || null,
    action_id: form.actionId.trim() || null,
  };
}
