import { sourcePreferenceRank } from "./sourcePolicy.js";
import type { FactorCandidate, RankedCandidate, ResolveFactorInput, UnitConversionResult } from "./types.js";
import {
  applyQuantityConversion,
  compareUnits,
  normalizeResolverUnit,
} from "./unitCompatibility.js";

type Meta = {
  geographyReason?: string;
  warnings: string[];
  unitClass: string;
  unitMultiplier: number | null;
};

/**
 * Deterministic ranking after hard filters.
 * Order: geography → unit → taxonomy → source → year → text → stable tie-break.
 */
export function rankCandidates(
  input: ResolveFactorInput,
  eligible: FactorCandidate[],
  meta: Map<string, Meta>,
): RankedCandidate[] {
  const activityUnit = normalizeResolverUnit(input.unit);

  const ranked: RankedCandidate[] = eligible.map((candidate) => {
    const m = meta.get(candidate.id)!;
    const unit = compareUnits(activityUnit, candidate.unitDenominator);
    const unitRank = unit.class === "EXACT" ? 0 : 1;
    const unitConversion: UnitConversionResult | null =
      unit.class === "EXACT" || unit.class === "SAFE_CONVERSION"
        ? {
            class: unit.class === "EXACT" ? "exact" : "safe",
            fromUnit: unit.fromUnit,
            toUnit: unit.toUnit,
            multiplier: unit.multiplier ?? 1,
            normalizedQuantity: applyQuantityConversion(input.quantity, unit.multiplier),
          }
        : null;

    const taxonomyRank = taxonomyScore(input, candidate);
    const source = sourcePreferenceRank(input, candidate);
    const yearRank = yearScore(input.reportingYear, candidate.factorYear);
    // Higher textScore → lower rank number
    const textRank = Math.round((1 - Math.min(1, Math.max(0, candidate.textScore))) * 1000);

    // Geography rank from policy (already computed as reason); re-derive numeric from reason buckets
    const geographyRank = geographyRankFromReason(m.geographyReason);

    return {
      candidate,
      geographyRank,
      unitRank,
      taxonomyRank,
      sourceRank: source.rank,
      yearRank,
      textRank,
      unitConversion,
      geographyReason: m.geographyReason,
      warnings: [...m.warnings],
    };
  });

  ranked.sort((a, b) => {
    if (a.geographyRank !== b.geographyRank) return a.geographyRank - b.geographyRank;
    if (a.unitRank !== b.unitRank) return a.unitRank - b.unitRank;
    if (a.taxonomyRank !== b.taxonomyRank) return a.taxonomyRank - b.taxonomyRank;
    if (a.sourceRank !== b.sourceRank) return a.sourceRank - b.sourceRank;
    if (a.yearRank !== b.yearRank) return a.yearRank - b.yearRank;
    if (a.textRank !== b.textRank) return a.textRank - b.textRank;
    // Stable tie-break
    const sk = a.candidate.sourceKey.localeCompare(b.candidate.sourceKey);
    if (sk !== 0) return sk;
    const dv = (a.candidate.datasetVersion ?? "").localeCompare(b.candidate.datasetVersion ?? "");
    if (dv !== 0) return dv;
    const sf = (a.candidate.stableFactorId ?? "").localeCompare(b.candidate.stableFactorId ?? "");
    if (sf !== 0) return sf;
    return a.candidate.id.localeCompare(b.candidate.id);
  });

  return ranked;
}

function geographyRankFromReason(reason?: string): number {
  switch (reason) {
    case "GEO_EXACT_COUNTRY":
      return 5;
    case "FR_IMPLIED_BY_SOURCE_POLICY":
      return 15;
    case "GEO_ADEME_GLOBAL":
      return 25;
    case "GEO_UK_NULL_WEAK":
      return 30;
    case "GEO_WEAK":
      return 35;
    case "GEO_INPUT_UNSPECIFIED":
      return 40;
    case "GEO_BOTH_UNSPECIFIED":
      return 45;
    default:
      return 50;
  }
}

function taxonomyScore(
  input: Pick<ResolveFactorInput, "internalCategory" | "internalSubcategory">,
  c: FactorCandidate,
): number {
  if (input.internalSubcategory && c.internalSubcategory === input.internalSubcategory) return 0;
  if (input.internalCategory && c.internalCategory === input.internalCategory) return 5;
  if (input.internalCategory && c.internalCategory && c.internalCategory !== input.internalCategory) {
    return 40;
  }
  return 20;
}

function yearScore(reportingYear: number | undefined, factorYear: number | null): number {
  if (reportingYear === undefined) return 50;
  if (factorYear === null) return 40; // unknown year — neutral-ish, explained later
  return Math.abs(reportingYear - factorYear);
}

/** True when top two are indistinguishable on methodological ranks (before text/tie). */
export function isMethodologicalTie(a: RankedCandidate, b: RankedCandidate): boolean {
  return (
    a.geographyRank === b.geographyRank &&
    a.unitRank === b.unitRank &&
    a.taxonomyRank === b.taxonomyRank &&
    a.sourceRank === b.sourceRank &&
    a.yearRank === b.yearRank
  );
}
