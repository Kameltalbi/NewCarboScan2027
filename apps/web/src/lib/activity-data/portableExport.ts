import { dataMethodLabel } from "./dataMethod";
import { isClosedBilanStatus } from "@/lib/calculators/frozenBilan";
import { SOURCE_TYPES } from "./uncertaintySummary";

/**
 * Lignes portables d'un bilan (ABC-17).
 * Un bilan clos est lu dans son snapshot. Le catalogue vivant n'est pas consulté.
 * Une case vide reste vide.
 */

export interface PortableFactor {
  factorId?: string | null;
  factorName?: string | null;
  factorValue?: number | null;
  factorUnit?: string | null;
  factorSource?: string | null;
  factorVersion?: string | null;
  factorYear?: number | null;
  factorGeography?: string | null;
  usedAt?: string | null;
  resultKgCo2e?: number | null;
  quantity?: number | null;
  activityUnit?: string | null;
  scope?: number | null;
  category?: string | null;
  name?: string | null;
  lineKey?: string | null;
}

export interface ExportActivity {
  id?: string;
  site_id?: string | null;
  product_id?: string | null;
  activity_type?: string | null;
  category?: string | null;
  subcategory?: string | null;
  quantity?: number | null;
  unit?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  data_quality?: string | null;
  confidence_score?: number | null;
  scope_hint?: number | null;
  notes?: string | null;
  source_document?: string | null;
  data_method?: string | null;
  source_type?: string | null;
  uncertainty_pct?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  evidence_id?: string | null;
  evidence_label?: string | null;
}

export interface ClosedSnapshot {
  bilanName?: string | null;
  frozenAt?: string | null;
  lines: PortableFactor[];
}

export interface PortableExportInput {
  organizationName?: string | null;
  sitesById?: Record<string, string>;
  activities: ExportActivity[];
  snapshotsByYear?: Record<number, ClosedSnapshot>;
  currentByActivityId?: Record<string, PortableFactor>;
}

export const FROZEN_FACTOR_ORIGIN = "Figé à la clôture";
export const CURRENT_FACTOR_ORIGIN = "Facteur du calcul courant, non figé";

export const PORTABLE_HEADERS = [
  "Organisation",
  "Bilan",
  "Année",
  "Site",
  "ID",
  "Identifiant de ligne",
  "Date de l'activité",
  "Période début",
  "Période fin",
  "Scope",
  "Catégorie",
  "Sous-catégorie",
  "Type d'activité",
  "Libellé",
  "Quantité",
  "Unité",
  "Méthode de donnée",
  "Identifiant du facteur",
  "Nom du facteur",
  "Valeur du facteur",
  "Unité du facteur",
  "Source du facteur",
  "Version du facteur",
  "Année du facteur",
  "Géographie du facteur",
  "Date du snapshot",
  "Origine du facteur",
  "Émissions kgCO2e",
  "Émissions tCO2e",
  "Qualité",
  "Type de source",
  "Incertitude (%)",
  "Justificatif",
  "Référence de preuve",
  "Libellé du justificatif",
  "Score confiance",
  "Site ID",
  "Produit ID",
  "Notes",
  "Créé le",
  "Modifié le",
] as const;

export type PortableRow = Record<(typeof PORTABLE_HEADERS)[number], string | number | null>;

const QUALITY_LABELS: Record<string, string> = {
  real: "Réelle",
  estimated: "Estimée",
  default: "Par défaut",
};

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value: string | null | undefined): string {
  const raw = text(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw;
}

function yearOf(activity: ExportActivity): number | null {
  const match = isoDate(activity.period_start).match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function scopeOf(activity: ExportActivity): number | null {
  if (activity.scope_hint === 1 || activity.scope_hint === 2 || activity.scope_hint === 3) {
    return activity.scope_hint;
  }
  const category = text(activity.category).toLowerCase();
  if (category.startsWith("scope1")) return 1;
  if (category.startsWith("scope2")) return 2;
  if (category.startsWith("scope3")) return 3;
  return null;
}

function sourceLabel(value: string | null | undefined): string {
  const raw = text(value);
  if (!raw) return "";
  return SOURCE_TYPES.find((item) => item.value === raw)?.label ?? raw;
}

function qualityLabel(value: string | null | undefined): string {
  const raw = text(value);
  if (!raw) return "";
  return QUALITY_LABELS[raw] ?? raw;
}

function matchKey(scope: unknown, unit: unknown, quantity: unknown): string | null {
  const quantityValue = num(quantity);
  if (quantityValue == null) return null;
  return `${scope ?? ""}|${text(unit).toLowerCase()}|${quantityValue}`;
}

function blankRow(): PortableRow {
  return Object.fromEntries(PORTABLE_HEADERS.map((header) => [header, header.endsWith("kgCO2e") || header.endsWith("tCO2e") || header === "Valeur du facteur" || header === "Quantité" || header === "Année" || header === "Année du facteur" || header === "Incertitude (%)" || header === "Score confiance" || header === "Scope" ? null : ""])) as PortableRow;
}

function applyFactor(row: PortableRow, factor: PortableFactor, origin: string, snapshotDate?: string | null) {
  row["Identifiant du facteur"] = text(factor.factorId);
  row["Nom du facteur"] = text(factor.factorName || factor.name);
  row["Valeur du facteur"] = num(factor.factorValue);
  row["Unité du facteur"] = text(factor.factorUnit);
  row["Source du facteur"] = text(factor.factorSource);
  row["Version du facteur"] = text(factor.factorVersion);
  row["Année du facteur"] = num(factor.factorYear);
  row["Géographie du facteur"] = text(factor.factorGeography);
  row["Date du snapshot"] = origin === FROZEN_FACTOR_ORIGIN ? text(snapshotDate || factor.usedAt) : "";
  row["Origine du facteur"] = origin;
  const kg = num(factor.resultKgCo2e);
  row["Émissions kgCO2e"] = kg;
  row["Émissions tCO2e"] = kg == null ? null : kg / 1000;
}

function rowFromActivity(
  activity: ExportActivity,
  input: PortableExportInput,
  factor: PortableFactor | null,
  origin: string,
  snapshotDate?: string | null,
): PortableRow {
  const row = blankRow();
  const year = yearOf(activity);
  const siteId = text(activity.site_id);
  const scope = scopeOf(activity);
  const lineId = text(activity.id);
  row["Organisation"] = text(input.organizationName);
  row["Bilan"] = year != null ? text(input.snapshotsByYear?.[year]?.bilanName) : "";
  row["Année"] = year;
  row["Site"] = siteId ? text(input.sitesById?.[siteId]) : "";
  row["ID"] = lineId;
  row["Identifiant de ligne"] = lineId;
  row["Date de l'activité"] = isoDate(activity.period_start);
  row["Période début"] = isoDate(activity.period_start);
  row["Période fin"] = isoDate(activity.period_end);
  row["Scope"] = scope;
  row["Catégorie"] = text(activity.category);
  row["Sous-catégorie"] = text(activity.subcategory);
  row["Type d'activité"] = text(activity.activity_type);
  row["Libellé"] = text(activity.subcategory || activity.activity_type);
  row["Quantité"] = num(activity.quantity);
  row["Unité"] = text(activity.unit);
  row["Méthode de donnée"] = dataMethodLabel(activity.data_method);
  row["Qualité"] = qualityLabel(activity.data_quality);
  row["Type de source"] = sourceLabel(activity.source_type);
  row["Incertitude (%)"] = num(activity.uncertainty_pct);
  row["Justificatif"] = text(activity.source_document);
  row["Référence de preuve"] = text(activity.evidence_id);
  row["Libellé du justificatif"] = text(activity.evidence_label);
  row["Score confiance"] = num(activity.confidence_score);
  row["Site ID"] = siteId;
  row["Produit ID"] = text(activity.product_id);
  row["Notes"] = text(activity.notes);
  row["Créé le"] = text(activity.created_at);
  row["Modifié le"] = text(activity.updated_at);
  if (factor) applyFactor(row, factor, origin, snapshotDate);
  return row;
}

function rowFromSnapshot(
  factor: PortableFactor,
  input: PortableExportInput,
  year: number,
  bilanName: string,
): PortableRow {
  const row = blankRow();
  row["Organisation"] = text(input.organizationName);
  row["Bilan"] = text(bilanName);
  row["Année"] = year;
  row["Scope"] = num(factor.scope);
  row["Catégorie"] = text(factor.category);
  row["Sous-catégorie"] = text(factor.name || factor.factorName);
  row["Libellé"] = text(factor.name || factor.factorName || factor.lineKey);
  row["Quantité"] = num(factor.quantity);
  row["Unité"] = text(factor.activityUnit);
  row["Méthode de donnée"] = "Non renseigné";
  row["Identifiant de ligne"] = text(factor.lineKey);
  row["ID"] = text(factor.lineKey);
  applyFactor(row, factor, FROZEN_FACTOR_ORIGIN, input.snapshotsByYear?.[year]?.frozenAt);
  return row;
}

export function closedSnapshotsByYear(
  bilans: Array<Record<string, unknown>>,
): Record<number, ClosedSnapshot> {
  const ranked = [...bilans].sort((left, right) => {
    const leftDate = String(left.published_at || "");
    const rightDate = String(right.published_at || "");
    return rightDate.localeCompare(leftDate);
  });
  const snapshots: Record<number, ClosedSnapshot> = {};
  for (const bilan of ranked) {
    if (!isClosedBilanStatus(bilan.status)) continue;
    const year = Number(bilan.year);
    if (!Number.isInteger(year) || snapshots[year]) continue;
    const published = bilan.published_snapshot as { frozenAt?: string; lines?: PortableFactor[] } | null;
    const lines = published?.lines;
    if (!Array.isArray(lines) || lines.length === 0) continue;
    snapshots[year] = {
      bilanName: text(bilan.name) || `Bilan ${year}`,
      frozenAt: text(published?.frozenAt) || null,
      lines,
    };
  }
  return snapshots;
}

export function buildPortableExportRows(input: PortableExportInput): PortableRow[] {
  const rows: PortableRow[] = [];
  const used = new Map<number, Set<PortableFactor>>();

  for (const activity of input.activities) {
    const year = yearOf(activity);
    const snapshot = year == null ? undefined : input.snapshotsByYear?.[year];
    if (snapshot) {
      const key = matchKey(scopeOf(activity), activity.unit, activity.quantity);
      const candidates = key
        ? snapshot.lines.filter((line) => matchKey(line.scope, line.activityUnit, line.quantity) === key)
        : [];
      const factor = candidates.length === 1 ? candidates[0] : null;
      if (factor) {
        const bucket = used.get(year!) ?? new Set<PortableFactor>();
        bucket.add(factor);
        used.set(year!, bucket);
      }
      rows.push(rowFromActivity(activity, input, factor, FROZEN_FACTOR_ORIGIN, snapshot.frozenAt));
      continue;
    }
    const current = activity.id ? input.currentByActivityId?.[activity.id] : undefined;
    rows.push(rowFromActivity(activity, input, current ?? null, current ? CURRENT_FACTOR_ORIGIN : ""));
  }

  for (const [yearText, snapshot] of Object.entries(input.snapshotsByYear ?? {})) {
    const year = Number(yearText);
    const consumed = used.get(year) ?? new Set<PortableFactor>();
    for (const line of snapshot.lines) {
      if (consumed.has(line)) continue;
      rows.push(rowFromSnapshot(line, input, year, text(snapshot.bilanName)));
    }
  }

  return rows;
}

export function sumExportedEmissionsKg(rows: PortableRow[]): number {
  return rows.reduce((sum, row) => sum + (num(row["Émissions kgCO2e"]) ?? 0), 0);
}

export function sumRecordedEmissionsKg(lines: Array<{ resultKgCo2e?: number | null }>): number {
  return lines.reduce((sum, line) => sum + (num(line.resultKgCo2e) ?? 0), 0);
}
