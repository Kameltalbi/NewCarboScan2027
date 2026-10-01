/**
 * Saisie générique Scope 1 « procédé / autre émission directe » (ABC-01).
 * Une seule fiche, stockée sur activity_data. Pas de formulaire par industrie.
 * Le facteur ou l'émission saisie est déjà en CO2e : aucun PRG n'est appliqué ici.
 */

export const PROCESS_SUBCATEGORY_PREFIX = "process_other";
export const PROCESS_MARKER = "PROCESS_V1 ";

export const GHG_OPTIONS = [
  "CO2",
  "CH4",
  "N2O",
  "HFC",
  "PFC",
  "SF6",
  "NF3",
  "CO2e",
  "Autre",
] as const;

export type ProcessMode = "activity_factor" | "direct_emission";
export type FactorScale = "kg" | "t";

export interface ProcessEmissionDraft {
  processName: string;
  ghg: string;
  description: string;
  comment: string;
  justification: string;
  mode: ProcessMode;
  activityQuantity: string;
  activityUnit: string;
  factorValue: string;
  factorScale: FactorScale;
  factorSource: string;
  directValue: string;
  directScale: FactorScale;
  uncertaintyPct: string;
}

export interface ProcessEmissionRecord {
  v: 1;
  processName: string;
  ghg: string;
  description: string;
  comment: string;
  mode: ProcessMode;
  activityQuantity: number | null;
  activityUnit: string | null;
  factorKgPerUnit: number | null;
  factorUnit: string | null;
  factorSource: string | null;
  directKgCO2e: number | null;
  uncertaintyPct: number | null;
}

export interface PreparedProcessEmission {
  record: ProcessEmissionRecord;
  quantity: number;
  unit: string;
  subcategory: string;
  factorSource: string;
  kgCO2e: number;
  notes: string;
}

export type ProcessValidation =
  | ({ ok: true } & PreparedProcessEmission)
  | { ok: false; message: string };

export type ProcessMatch =
  | { kind: "skip" }
  | { kind: "missing" }
  | {
      kind: "ok";
      kgCO2e: number;
      factor: number;
      factorUnit: string;
      factorSource: string;
    };

function parsePositive(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function buildSubcategory(name: string): string {
  const safe = name.replace(/:/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  return `${PROCESS_SUBCATEGORY_PREFIX}:${safe}`;
}

export function encodeProcessNotes(record: ProcessEmissionRecord): string {
  const summary = `Procédé : ${record.processName} | GES : ${record.ghg}`;
  return `${summary}\n${PROCESS_MARKER}${JSON.stringify(record)}`;
}

export function decodeProcessNotes(notes: string | null | undefined): ProcessEmissionRecord | null {
  if (!notes) return null;
  const idx = notes.indexOf(PROCESS_MARKER);
  if (idx < 0) return null;
  const raw = notes.slice(idx + PROCESS_MARKER.length).trim();
  try {
    const parsed = JSON.parse(raw) as ProcessEmissionRecord;
    if (parsed?.v !== 1) return null;
    if (parsed.mode !== "activity_factor" && parsed.mode !== "direct_emission") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isProcessSubcategory(subcategory: string | null | undefined): boolean {
  const s = (subcategory || "").toLowerCase();
  return s === PROCESS_SUBCATEGORY_PREFIX || s.startsWith(`${PROCESS_SUBCATEGORY_PREFIX}:`);
}

export function validateProcessEmission(draft: ProcessEmissionDraft): ProcessValidation {
  const processName = draft.processName.trim();
  if (!processName) {
    return { ok: false, message: "Indiquez le nom du procédé." };
  }
  const ghg = draft.ghg.trim();
  if (!ghg) {
    return { ok: false, message: "Indiquez le gaz à effet de serre." };
  }
  if (draft.description.trim().length > 1000) {
    return { ok: false, message: "La description dépasse 1 000 caractères." };
  }
  if (draft.comment.trim().length > 1000) {
    return { ok: false, message: "Le commentaire dépasse 1 000 caractères." };
  }
  if (draft.justification.trim().length > 500) {
    return { ok: false, message: "Le justificatif dépasse 500 caractères." };
  }

  let uncertaintyPct: number | null = null;
  if (draft.uncertaintyPct.trim()) {
    const u = Number(draft.uncertaintyPct.replace(",", ".").trim());
    if (!Number.isFinite(u) || u < 0 || u > 100) {
      return {
        ok: false,
        message: "L'incertitude doit être un pourcentage entre 0 et 100, ou rester vide.",
      };
    }
    uncertaintyPct = u;
  }

  const base = {
    v: 1 as const,
    processName,
    ghg,
    description: draft.description.trim(),
    comment: draft.comment.trim(),
    uncertaintyPct,
  };

  if (draft.mode === "activity_factor") {
    const qty = parsePositive(draft.activityQuantity);
    const factor = parsePositive(draft.factorValue);
    const activityUnit = draft.activityUnit.trim();
    const factorSource = draft.factorSource.trim();
    if (qty == null || factor == null) {
      return {
        ok: false,
        message: "Indiquez une donnée d'activité et un facteur supérieurs à 0, ou une émission déjà connue.",
      };
    }
    if (!activityUnit) {
      return { ok: false, message: "Indiquez l'unité de la donnée d'activité." };
    }
    if (!factorSource) {
      return { ok: false, message: "Indiquez la source du facteur." };
    }
    if (factorSource.length > 500) {
      return { ok: false, message: "La source du facteur dépasse 500 caractères." };
    }
    const factorKgPerUnit = draft.factorScale === "t" ? factor * 1000 : factor;
    const kgCO2e = qty * factorKgPerUnit;
    const record: ProcessEmissionRecord = {
      ...base,
      mode: "activity_factor",
      activityQuantity: qty,
      activityUnit,
      factorKgPerUnit,
      factorUnit: `kgCO2e/${activityUnit}`,
      factorSource,
      directKgCO2e: null,
    };
    const notes = encodeProcessNotes(record);
    if (notes.length > 4000) {
      return { ok: false, message: "La fiche est trop longue pour être enregistrée." };
    }
    return {
      ok: true,
      record,
      quantity: qty,
      unit: activityUnit,
      subcategory: buildSubcategory(processName),
      factorSource,
      kgCO2e,
      notes,
    };
  }

  if (draft.mode === "direct_emission") {
    const direct = parsePositive(draft.directValue);
    if (direct == null) {
      return {
        ok: false,
        message: "Indiquez une émission déjà connue supérieure à 0, ou un facteur d'émission.",
      };
    }
    const kgCO2e = draft.directScale === "t" ? direct * 1000 : direct;
    const record: ProcessEmissionRecord = {
      ...base,
      mode: "direct_emission",
      activityQuantity: null,
      activityUnit: null,
      factorKgPerUnit: null,
      factorUnit: null,
      factorSource: null,
      directKgCO2e: kgCO2e,
    };
    const notes = encodeProcessNotes(record);
    if (notes.length > 4000) {
      return { ok: false, message: "La fiche est trop longue pour être enregistrée." };
    }
    return {
      ok: true,
      record,
      quantity: kgCO2e,
      unit: "kgCO2e",
      subcategory: buildSubcategory(processName),
      factorSource: "Saisie directe",
      kgCO2e,
      notes,
    };
  }

  return {
    ok: false,
    message: "Indiquez une donnée d'activité et un facteur, ou une émission déjà connue.",
  };
}

export function matchProcessEmission(activity: {
  subcategory?: string | null;
  notes?: string | null;
}): ProcessMatch {
  if (!isProcessSubcategory(activity.subcategory)) return { kind: "skip" };
  const record = decodeProcessNotes(activity.notes);
  if (!record) return { kind: "missing" };

  if (record.mode === "direct_emission") {
    const kg = record.directKgCO2e;
    if (kg == null || !(kg > 0)) return { kind: "missing" };
    return {
      kind: "ok",
      kgCO2e: kg,
      factor: 1,
      factorUnit: "kgCO2e/kgCO2e",
      factorSource: "Saisie directe",
    };
  }

  const qty = record.activityQuantity;
  const factor = record.factorKgPerUnit;
  if (qty == null || factor == null || !(qty > 0) || !(factor > 0)) return { kind: "missing" };
  return {
    kind: "ok",
    kgCO2e: qty * factor,
    factor,
    factorUnit: record.factorUnit || "kgCO2e/unité",
    factorSource: record.factorSource
      ? `Saisie utilisateur : ${record.factorSource}`
      : "Saisie utilisateur",
  };
}
