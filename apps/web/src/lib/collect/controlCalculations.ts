import { ademeFactorNote, parseStoredFactor, type AdemeFactorRef } from "@/lib/factors/ademeFactor";
import { factorDenominator, unitCompatibility } from "@/lib/factors/factorSelection";
import { ACTIVITY_GROUPS } from "@/modules/collect/activityGroups";
import {
  formatEmissionAmount,
  isProvisionalFactor,
  previewLine,
  sourceLabel,
  type PreviewFactor,
} from "@/lib/collect/linePreview";

export type ControlStatus = "calculated" | "provisional" | "uncalculated";

export interface ControlSourceLine {
  id: string;
  designation: string;
  siteName: string;
  periodStart: string | null;
  periodEnd: string | null;
  quantity: number | null;
  unit: string;
  subcategory: string | null;
  activityType: string | null;
  scope: 1 | 2 | 3 | null;
  notes: string | null;
  factor: ControlFactor | null;
}

export interface ControlAssessment {
  status: ControlStatus;
  kg: number | null;
  tonnes: number | null;
  display: string;
  formula: string | null;
  conversion: string | null;
  reason: string | null;
}

export interface ControlSummary {
  count: number;
  calculatedKg: number;
  uncalculated: number;
  partial: boolean;
  totalLabel: string;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function designationFromNotes(notes: string | null | undefined, fallback: string): string {
  const match = (notes || "").match(/^DESIGNATION:\s*(.*)$/m);
  const value = match?.[1]?.trim();
  return value || fallback;
}

export type ControlFactor = PreviewFactor & {
  datasetVersion: string | null;
  region: string | null;
  sourceKey: string | null;
};

export function storedFactor(notes: string | null | undefined): ControlFactor | null {
  const stored = parseStoredFactor(notes);
  if (!stored || !Number.isFinite(stored.value)) return null;
  return {
    id: stored.id,
    name: stored.name,
    value: stored.value,
    unit: stored.unit,
    sourceName: stored.sourceName,
    factorYear: stored.factorYear,
    countryCode: stored.countryCode,
    stableFactorId: stored.stableFactorId,
    datasetVersion: stored.datasetVersion,
    region: stored.region,
    sourceKey: stored.sourceKey,
  };
}

export function activityGroupIdFor(subcategory: string | null | undefined, activityType: string | null | undefined): string {
  const key = (subcategory || "").split(":").pop() || "";
  for (const group of ACTIVITY_GROUPS) {
    if (group.choices.some((choice) => choice.value === key || choice.subcategory === subcategory)) return group.id;
  }
  if (activityType === "fuel") return "fuels";
  if (activityType === "waste") return "waste";
  if (activityType === "transport") return "travel";
  if (activityType === "energy") return "electricity";
  if (activityType === "purchase") return "purchases";
  return "other";
}

export function periodLabel(start: string | null, end: string | null): string {
  if (!start) return "Période non renseignée";
  const startMonth = Number(start.slice(5, 7));
  const endMonth = end ? Number(end.slice(5, 7)) : startMonth;
  const startYear = start.slice(0, 4);
  const endYear = end?.slice(0, 4) || startYear;
  if (startYear === endYear && startMonth === endMonth && startMonth >= 1 && startMonth <= 12) {
    return `${MONTHS[startMonth - 1]} ${startYear}`;
  }
  return `${start.slice(0, 10)}${end ? ` – ${end.slice(0, 10)}` : ""}`;
}

export function assessLine(line: Pick<ControlSourceLine, "quantity" | "unit" | "factor">): ControlAssessment {
  if (line.quantity == null || !Number.isFinite(line.quantity) || line.quantity <= 0 || !line.factor) {
    return emptyAssessment(line.factor ? "Quantité manquante." : "Aucun facteur enregistré sur cette saisie.");
  }
  const compatible = unitCompatibility(line.unit, factorDenominator(line.factor.unit));
  const preview = previewLine({ quantity: line.quantity, unit: line.unit, factor: line.factor });
  if (!compatible.ok || preview.status !== "counted" || preview.kg == null) {
    return emptyAssessment(compatible.ok ? preview.warning : compatible.reason);
  }
  const provisional = isProvisionalFactor(line.factor);
  return {
    status: provisional ? "provisional" : "calculated",
    kg: preview.kg,
    tonnes: preview.kg / 1000,
    display: formatEmissionAmount(preview.kg),
    formula: preview.formula,
    conversion: compatible.multiplier === 1 ? null : `Conversion × ${compatible.multiplier} : les deux unités appartiennent à la même famille.`,
    reason: provisional ? "Facteur provisoire : source, année ou périmètre à documenter." : null,
  };
}

export function proposeEdit(
  saved: ControlSourceLine,
  draft: { quantity: number | null; unit: string; factor: ControlFactor | null },
): { before: ControlAssessment; after: ControlAssessment; blocked: string | null } {
  const before = assessLine(saved);
  const after = assessLine({ quantity: draft.quantity, unit: draft.unit, factor: draft.factor });
  const blocked = draft.quantity == null || !(draft.quantity > 0)
    ? "Saisissez une quantité supérieure à zéro."
    : draft.factor && after.status === "uncalculated"
      ? after.reason
      : null;
  return { before, after, blocked };
}

export function summarize(lines: ControlAssessment[]): ControlSummary {
  const calculatedKg = lines.reduce((sum, line) => sum + (line.kg ?? 0), 0);
  const uncalculated = lines.filter((line) => line.status === "uncalculated").length;
  const partial = uncalculated > 0;
  return {
    count: lines.length,
    calculatedKg,
    uncalculated,
    partial,
    totalLabel: partial && calculatedKg === 0
      ? "Aucune émission comptée · total partiel"
      : partial
        ? `${formatEmissionAmount(calculatedKg)} comptées · total partiel`
        : `${formatEmissionAmount(calculatedKg)} comptées`,
  };
}

export function notesAfterEdit(notes: string | null | undefined, factor: AdemeFactorRef | null): string {
  const rest = (notes || "")
    .replace(/^FE_SNAPSHOT:.*(?:\r?\n|$)/m, "")
    .replace(/^FE_ADEME:.*(?:\r?\n|$)/m, "")
    .replace(/^A_COMPLETER:\s*/m, "")
    .trim();
  if (!factor) return rest ? `A_COMPLETER:\n${rest}` : "A_COMPLETER:";
  return ademeFactorNote(factor, rest) || rest;
}

export function controlFileName(organization: string, year: number, date: string): string {
  const name = (organization || "Organisation").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "_");
  return `CarboScan_Controle_${name}_${year}_${date}.xlsx`;
}

export function editorResult(kg: number): { kg: string; tonnes: string } {
  return {
    kg: `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(kg)} kg CO₂e`,
    tonnes: `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(kg / 1000)} t CO₂e`,
  };
}

function emptyAssessment(reason: string | null): ControlAssessment {
  return {
    status: "uncalculated",
    kg: null,
    tonnes: null,
    display: "Non calculé",
    formula: null,
    conversion: null,
    reason,
  };
}

export function factorMetadata(factor: ControlFactor | null): {
  source: string;
  version: string;
  year: string;
  geography: string;
  boundary: string;
} {
  return {
    source: sourceLabel(factor?.sourceName ?? null),
    version: factor?.datasetVersion || "Version non renseignée",
    year: factor?.factorYear ? String(factor.factorYear) : "Année non renseignée",
    geography: factor?.countryCode || "Géographie non renseignée",
    boundary: factor?.region || "Périmètre non renseigné",
  };
}
