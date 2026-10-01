/**
 * Synthèse d'incertitude du bilan (ABC-03).
 * Les trois qualités real / estimated / default restent telles quelles.
 * Le total n'est calculé que pour deux lignes qui ont chacune un taux,
 * avec la même somme quadratique que le moteur. Sinon : non renseigné.
 */
import { combineUncertaintyPct } from "../../../../../packages/carbon-engine/src/uncertainty.ts";

export const SOURCE_TYPES = [
  { value: "measured", label: "Mesuré" },
  { value: "invoice", label: "Facture" },
  { value: "supplier", label: "Fournisseur" },
  { value: "estimate", label: "Estimation" },
  { value: "extrapolation", label: "Extrapolation" },
  { value: "monetary_ratio", label: "Ratio monétaire" },
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number]["value"];
export type CollectionQuality = "real" | "estimated" | "default";

export function keepCollectionQuality(quality: CollectionQuality): CollectionQuality {
  return quality;
}

export function sourceTypeLabel(value: string | null | undefined): string {
  const found = SOURCE_TYPES.find((item) => item.value === value);
  return found?.label ?? "Non renseigné";
}

export function parseOptionalUncertainty(
  raw: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const text = raw.trim();
  if (!text) return { ok: true, value: null };
  const n = Number(text.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { ok: false, message: "L'incertitude doit être un pourcentage entre 0 et 100, ou rester vide." };
  }
  return { ok: true, value: n };
}

export interface UncertaintyLine {
  label: string;
  kg: number;
  quality?: string | null;
  uncertaintyPct?: number | null;
}

export interface UncertaintySummary {
  status: "empty" | "partial" | "combined" | "withheld";
  totalLabel: string;
  combinedPct: string | null;
  quality: Record<CollectionQuality, number>;
  contributors: Array<{ label: string; uncertaintyPct: number; kg: number }>;
  hints: string[];
}

export function summarizeUncertainty(lines: UncertaintyLine[]): UncertaintySummary {
  const quality: Record<CollectionQuality, number> = { real: 0, estimated: 0, default: 0 };
  const active = lines.filter((line) => Number(line.kg) > 0);
  for (const line of active) {
    if (line.quality === "real" || line.quality === "estimated" || line.quality === "default") {
      quality[line.quality] += 1;
    }
  }

  const rated = active.filter(
    (line) => line.uncertaintyPct != null && Number.isFinite(Number(line.uncertaintyPct)),
  );
  const contributors = rated
    .map((line) => ({
      label: line.label,
      uncertaintyPct: Number(line.uncertaintyPct),
      kg: Number(line.kg),
    }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 3);

  const hints: string[] = [];
  if (quality.default > 0) {
    hints.push("Remplacer les données par défaut par une mesure ou une facture.");
  }
  if (quality.estimated > 0) {
    hints.push("Préciser la source des données estimées.");
  }

  if (active.length === 0 || rated.length === 0) {
    return {
      status: "empty",
      totalLabel: "Aucune incertitude saisie",
      combinedPct: null,
      quality,
      contributors: [],
      hints,
    };
  }

  if (rated.length === active.length && rated.length === 2) {
    const combined = combineUncertaintyPct(
      String(rated[0].uncertaintyPct),
      String(rated[1].uncertaintyPct),
    );
    return {
      status: "combined",
      totalLabel: combined ? `${combined} %` : "non renseigné",
      combinedPct: combined ?? null,
      quality,
      contributors,
      hints,
    };
  }

  if (rated.length < active.length) {
    hints.push("L'incertitude du total reste non renseignée tant que chaque ligne n'a pas de taux.");
  } else {
    hints.push("L'incertitude du total reste non renseignée : elle n'est combinée que pour deux lignes.");
  }

  return {
    status: rated.length < active.length ? "partial" : "withheld",
    totalLabel: "non renseigné",
    combinedPct: null,
    quality,
    contributors,
    hints,
  };
}
