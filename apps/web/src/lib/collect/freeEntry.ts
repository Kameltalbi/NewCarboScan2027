import { ademeFactorNote, emissionFactorSourceLabel, type AdemeFactorRef } from "@/lib/factors/ademeFactor";
import { previewLine, type PreviewFactor } from "@/lib/collect/linePreview";
import type { ActivityDataInput } from "@/lib/activity-data/types";

export const FREE_UNITS = ["kWh", "MWh", "L", "m³", "kg", "t", "km", "t.km", "unité"] as const;

export type FreeClass = "unknown" | "direct" | "energy" | "purchase" | "freight" | "travel" | "waste";

export const FREE_CLASSES: Array<{ id: FreeClass; label: string }> = [
  { id: "unknown", label: "Je ne sais pas encore" },
  { id: "direct", label: "Émission directe sur le site" },
  { id: "energy", label: "Énergie achetée" },
  { id: "purchase", label: "Achat de biens ou de services" },
  { id: "freight", label: "Transport de marchandises" },
  { id: "travel", label: "Déplacement de personnes" },
  { id: "waste", label: "Déchets" },
];

const METHOD: Record<FreeClass, {
  determined: boolean;
  scope: 1 | 2 | 3 | null;
  category: ActivityDataInput["category"] | null;
  subcategory: string | null;
  activityType: ActivityDataInput["activity_type"] | null;
  label: string;
}> = {
  unknown: { determined: false, scope: null, category: null, subcategory: null, activityType: null, label: "indéterminé" },
  direct: { determined: true, scope: 1, category: "scope1", subcategory: "libre_direct", activityType: "process", label: "Scope 1 — émission directe sur le site" },
  energy: { determined: true, scope: 2, category: "scope2", subcategory: "libre_energie", activityType: "energy", label: "Scope 2 — énergie achetée" },
  purchase: { determined: true, scope: 3, category: "scope3_upstream", subcategory: "libre_achat", activityType: "purchase", label: "Scope 3 — achat" },
  freight: { determined: true, scope: 3, category: "scope3_upstream", subcategory: "libre_transport", activityType: "transport", label: "Scope 3 — transport de marchandises" },
  travel: { determined: true, scope: 3, category: "scope3_upstream", subcategory: "libre_deplacement", activityType: "transport", label: "Scope 3 — déplacement de personnes" },
  waste: { determined: true, scope: 3, category: "scope3_upstream", subcategory: "libre_dechet", activityType: "waste", label: "Scope 3 — déchets" },
};

export function isDocumentedFactor(factor: AdemeFactorRef | null): boolean {
  if (!factor || !Number.isFinite(factor.value) || factor.value <= 0) return false;
  if (factor.sourceKey === "manual") return Boolean(factor.sourceName?.trim());
  return true;
}

function retainedFactorLine(factor: AdemeFactorRef): string {
  return `FACTEUR_RETENU:${JSON.stringify({
    id: factor.id,
    name: factor.name,
    value: factor.value,
    unit: factor.unit,
    sourceKey: factor.sourceKey ?? null,
    sourceName: factor.sourceName ?? null,
    datasetVersion: factor.datasetVersion ?? null,
    countryCode: factor.countryCode ?? null,
    region: factor.region ?? null,
    factorYear: factor.factorYear ?? null,
    stableFactorId: factor.stableFactorId ?? null,
    replacementReason: factor.replacementReason ?? null,
  })}`;
}

export function buildFreeEntry(input: {
  organizationId: string;
  siteId: string | null;
  designation: string;
  quantity: number;
  unit: string;
  periodStart: string;
  periodEnd: string;
  classification: FreeClass;
  factor: AdemeFactorRef | null;
  notes?: string;
  dataQuality?: ActivityDataInput["data_quality"];
  sourceType?: ActivityDataInput["source_type"];
  uncertaintyPct?: number | null;
}): {
  counted: boolean;
  resultLabel: string;
  warning: string | null;
  payload: ActivityDataInput;
} {
  const method = METHOD[input.classification];
  const preview = previewLine({
    quantity: input.quantity,
    unit: input.unit,
    factor: input.factor ? toPreview(input.factor) : null,
  });
  const counted = method.determined && preview.status === "counted" && isDocumentedFactor(input.factor);
  const trace = [
    `DESIGNATION: ${input.designation.trim()}`,
    `CLASSEMENT: ${method.label}`,
    input.notes?.trim() || "",
  ].filter(Boolean).join("\n");
  const notes = counted && input.factor
    ? ademeFactorNote(input.factor, trace) || trace
    : [
      "A_COMPLETER:",
      trace,
      input.factor && isDocumentedFactor(input.factor) ? retainedFactorLine(input.factor) : "",
    ].filter(Boolean).join("\n");
  const payload = {
    organization_id: input.organizationId,
    site_id: input.siteId,
    activity_type: method.activityType,
    category: method.category,
    subcategory: method.subcategory,
    quantity: input.quantity,
    unit: input.unit,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    notes,
    scope: method.scope,
    scope_hint: method.scope,
    data_method: /tnd|eur|usd|€/i.test(input.unit) ? "monetary" : "physical",
    source_type: input.sourceType ?? null,
    uncertainty_pct: input.uncertaintyPct ?? null,
  } as ActivityDataInput;
  if (input.dataQuality) payload.data_quality = input.dataQuality;
  if (counted && input.factor) payload.emission_factor_source = emissionFactorSourceLabel(input.factor);
  return {
    counted,
    resultLabel: counted ? preview.resultLabel : "Émissions non calculées",
    warning: [
      method.determined ? null : "Le classement n’est pas déterminé : la ligne sera conservée à compléter.",
      preview.warning,
    ].filter(Boolean).join(" ") || null,
    payload,
  };
}

function toPreview(factor: AdemeFactorRef): PreviewFactor {
  return {
    id: factor.id,
    name: factor.name,
    value: factor.value,
    unit: factor.unit,
    sourceName: factor.sourceName ?? null,
    factorYear: factor.factorYear ?? null,
    countryCode: factor.countryCode ?? null,
    stableFactorId: factor.stableFactorId ?? null,
  };
}
