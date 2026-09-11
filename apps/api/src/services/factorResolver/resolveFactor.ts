import type { Pool } from "pg";
import { retrieveCandidates } from "./candidateRepository.js";
import { applyHardFilters } from "./eligibility.js";
import { detectEnergyBasisAmbiguity } from "./energyBasisPolicy.js";
import { detectLifecycleAmbiguity } from "./lifecyclePolicy.js";
import { isMethodologicalTie, rankCandidates } from "./ranker.js";
import type {
  FactorCandidate,
  RejectedCandidateSummary,
  ResolveFactorInput,
  ResolveFactorResult,
  SelectedFactor,
} from "./types.js";
import { RESOLVER_VERSION, RULESET_VERSION } from "./types.js";
import { isMonetaryUnit, normalizeResolverUnit } from "./unitCompatibility.js";

type Queryable = Pick<Pool, "query">;

const WEAK_TEXT_THRESHOLD = 0.12;

export async function resolveFactor(
  pool: Queryable,
  input: ResolveFactorInput,
): Promise<ResolveFactorResult> {
  const started = Date.now();
  const reasons: string[] = [];
  const warnings: string[] = [];

  const activity = input.activity?.trim() ?? "";
  const unit = input.unit?.trim() ?? "";

  if (!activity || !unit) {
    return finalize({
      status: "REQUIRES_CONTEXT",
      selectedFactor: null,
      reasons: ["INPUT_INSUFFICIENT: activity and unit are required"],
      warnings: [],
      unitConversion: null,
      retrieved: 0,
      eligible: 0,
      rejectedSamples: [],
      input,
      started,
    });
  }

  if (input.mode !== "shadow" && input.mode !== "production") {
    return finalize({
      status: "REQUIRES_CONTEXT",
      selectedFactor: null,
      reasons: ["INVALID_MODE"],
      warnings: [],
      unitConversion: null,
      retrieved: 0,
      eligible: 0,
      rejectedSamples: [],
      input,
      started,
    });
  }

  if (input.mode === "shadow") {
    reasons.push("MODE_SHADOW: evaluating catalog-visible sources without requiring resolver_status=enabled");
    warnings.push("Shadow mode: resolution must not trigger calculation or ledger writes");
  }

  // Monetary without clear monetary unit/hint
  const normUnit = normalizeResolverUnit(unit);
  if (input.factorTypeHint === "monetary" && !isMonetaryUnit(normUnit)) {
    return finalize({
      status: "REQUIRES_CONTEXT",
      selectedFactor: null,
      reasons: ["MONETARY_CONTEXT_INCOMPLETE: monetary hint requires monetary unit (EUR/kEUR/TND)"],
      warnings: [],
      unitConversion: null,
      retrieved: 0,
      eligible: 0,
      rejectedSamples: [],
      input,
      started,
    });
  }

  const retrieved = await retrieveCandidates(pool, { ...input, activity, unit: normUnit });
  if (retrieved.length === 0) {
    return finalize({
      status: "NO_MATCH",
      selectedFactor: null,
      reasons: ["NO_CANDIDATES_RETRIEVED"],
      warnings: [],
      unitConversion: null,
      retrieved: 0,
      eligible: 0,
      rejectedSamples: [],
      input,
      started,
    });
  }

  const { eligible, rejected, meta } = applyHardFilters(
    { ...input, activity, unit: normUnit },
    retrieved,
  );

  const rejectedSamples = pickRejectedSamples(rejected);

  if (eligible.length === 0) {
    // If only review_required blocked the best path — check retrieved
    const reviewOnly = retrieved.filter((c) => c.reviewRequired);
    const nonReviewRejected = rejected.filter((r) => !r.candidate.reviewRequired);
    if (reviewOnly.length > 0 && nonReviewRejected.length === rejected.length - reviewOnly.length) {
      // fall through handled below after ranking review candidates specially
    }
    return finalize({
      status: "NO_MATCH",
      selectedFactor: null,
      reasons: [
        ...reasons,
        "NO_ELIGIBLE_CANDIDATES",
        ...summarizeRejectReasons(rejected),
      ],
      warnings,
      unitConversion: null,
      retrieved: retrieved.length,
      eligible: 0,
      rejectedSamples,
      input,
      started,
    });
  }

  // Split review_required out of auto-resolve pool but keep awareness
  const autoPool = eligible.filter((c) => !c.reviewRequired);
  const reviewPool = eligible.filter((c) => c.reviewRequired);

  if (autoPool.length === 0 && reviewPool.length > 0) {
    const rankedReview = rankCandidates({ ...input, activity, unit: normUnit }, reviewPool, meta);
    const top = rankedReview[0]!;
    return finalize({
      status: "REVIEW_REQUIRED",
      selectedFactor: toSelected(top.candidate),
      reasons: [
        ...reasons,
        "BEST_CANDIDATE_REVIEW_REQUIRED",
        top.geographyReason ?? "GEO",
      ],
      warnings: [...warnings, ...top.warnings, "Automatic resolution blocked for review_required factors"],
      unitConversion: top.unitConversion,
      retrieved: retrieved.length,
      eligible: eligible.length,
      rejectedSamples,
      input,
      started,
      topCandidate: top.candidate,
    });
  }

  // Ambiguity checks on auto pool before picking
  if (!input.lifecycleBoundary && detectLifecycleAmbiguity(autoPool)) {
    return finalize({
      status: "REQUIRES_CONTEXT",
      selectedFactor: null,
      reasons: [
        ...reasons,
        "LIFECYCLE_AMBIGUOUS: multiple distinct lifecycle boundaries among eligible candidates; provide lifecycleBoundary",
      ],
      warnings,
      unitConversion: null,
      retrieved: retrieved.length,
      eligible: autoPool.length,
      rejectedSamples,
      input,
      started,
    });
  }

  if (!input.energyBasis && detectEnergyBasisAmbiguity(autoPool)) {
    return finalize({
      status: "REQUIRES_CONTEXT",
      selectedFactor: null,
      reasons: [
        ...reasons,
        "ENERGY_BASIS_AMBIGUOUS: both gross_cv and net_cv remain eligible; provide energyBasis",
      ],
      warnings,
      unitConversion: null,
      retrieved: retrieved.length,
      eligible: autoPool.length,
      rejectedSamples,
      input,
      started,
    });
  }

  if (!input.country) {
    const countries = new Set(
      autoPool.map((c) => c.countryCode).filter((x): x is string => Boolean(x) && x !== "GLOBAL"),
    );
    // Also ADEME null counts as FR-implied potential — if mix of GB and FR-implied, need country
    const hasAdemeNull = autoPool.some((c) => c.sourceKey === "ademe" && !c.countryCode);
    const hasUk = autoPool.some((c) => c.sourceKey === "uk_gov_ghg");
    const hasTn = autoPool.some((c) => c.sourceKey === "internal" || c.countryCode === "TN");
    if (countries.size > 1 || (hasAdemeNull && (hasUk || hasTn || countries.size > 0))) {
      return finalize({
        status: "REQUIRES_CONTEXT",
        selectedFactor: null,
        reasons: [
          ...reasons,
          "GEOGRAPHY_AMBIGUOUS: country required to choose among geographically distinct candidates",
        ],
        warnings,
        unitConversion: null,
        retrieved: retrieved.length,
        eligible: autoPool.length,
        rejectedSamples,
        input,
        started,
      });
    }
  }

  const ranked = rankCandidates({ ...input, activity, unit: normUnit }, autoPool, meta);
  const top = ranked[0]!;
  const second = ranked[1];

  if (top.candidate.textScore < WEAK_TEXT_THRESHOLD && !strongTaxonomy(input, top.candidate)) {
    return finalize({
      status: "NO_MATCH",
      selectedFactor: null,
      reasons: [...reasons, "TEXT_RELEVANCE_TOO_WEAK"],
      warnings,
      unitConversion: null,
      retrieved: retrieved.length,
      eligible: autoPool.length,
      rejectedSamples,
      input,
      started,
    });
  }

  if (second && isMethodologicalTie(top, second) && top.candidate.textScore === second.candidate.textScore) {
    // Still may differ on stable id tie-break — if methodological ranks equal, check name ambiguity
    if (
      top.geographyRank === second.geographyRank &&
      top.unitRank === second.unitRank &&
      top.sourceRank === second.sourceRank &&
      top.yearRank === second.yearRank &&
      Math.abs(top.candidate.textScore - second.candidate.textScore) < 0.05
    ) {
      return finalize({
        status: "AMBIGUOUS",
        selectedFactor: null,
        reasons: [
          ...reasons,
          "AMBIGUOUS_TOP_CANDIDATES",
          `tie:${top.candidate.stableFactorId ?? top.candidate.id}|${second.candidate.stableFactorId ?? second.candidate.id}`,
        ],
        warnings,
        unitConversion: null,
        retrieved: retrieved.length,
        eligible: autoPool.length,
        rejectedSamples,
        input,
        started,
      });
    }
  }

  // Build reasons for success
  const successReasons = [
    ...reasons,
    top.geographyReason ?? "GEO",
    top.unitConversion?.class === "exact" ? "UNIT_EXACT" : "UNIT_SAFE_CONVERSION",
    `SOURCE_${top.candidate.sourceKey}`,
  ];
  if (top.candidate.factorYear == null) {
    warnings.push("Selected factor has no factor_year");
  } else if (input.reportingYear !== undefined) {
    successReasons.push(`YEAR_DELTA_${Math.abs(input.reportingYear - top.candidate.factorYear)}`);
  }
  if (top.candidate.lifecycleBoundary) {
    successReasons.push(`LIFECYCLE_${top.candidate.lifecycleBoundary}`);
  }
  warnings.push(...top.warnings);

  return finalize({
    status: "RESOLVED",
    selectedFactor: toSelected(top.candidate),
    reasons: successReasons,
    warnings: dedupe(warnings),
    unitConversion: top.unitConversion,
    retrieved: retrieved.length,
    eligible: autoPool.length,
    rejectedSamples,
    input,
    started,
    topCandidate: top.candidate,
  });
}

function strongTaxonomy(input: ResolveFactorInput, c: FactorCandidate): boolean {
  return Boolean(
    (input.internalCategory && c.internalCategory === input.internalCategory) ||
      (input.internalSubcategory && c.internalSubcategory === input.internalSubcategory) ||
      (c.stableFactorId && input.activity && c.stableFactorId.includes(input.activity)),
  );
}

function toSelected(c: FactorCandidate): SelectedFactor {
  return {
    id: c.id,
    stableFactorId: c.stableFactorId,
    externalCode: c.externalCode,
    source: { key: c.sourceKey, name: c.sourceName },
    datasetVersion: c.datasetVersion,
    name: c.name,
    value: c.value,
    numeratorUnit: c.unitNumerator,
    denominatorUnit: c.unitDenominator,
    countryCode: c.countryCode,
    lifecycleBoundary: c.lifecycleBoundary,
    energyBasis: c.energyBasis,
    gwpBasis: c.gwpBasis,
    factorType: c.factorType,
    factorKind: c.factorKind,
    factorYear: c.factorYear,
    checksum: c.checksum,
    reviewRequired: c.reviewRequired,
  };
}

function pickRejectedSamples(
  rejected: Array<{ candidate: FactorCandidate; reasonCode: string }>,
): RejectedCandidateSummary[] {
  const byReason = new Map<string, (typeof rejected)[0]>();
  for (const r of rejected) {
    if (!byReason.has(r.reasonCode)) byReason.set(r.reasonCode, r);
  }
  return [...byReason.values()].slice(0, 8).map((r) => ({
    id: r.candidate.id,
    stableFactorId: r.candidate.stableFactorId,
    sourceKey: r.candidate.sourceKey,
    name: r.candidate.name.slice(0, 120),
    reasonCode: r.reasonCode,
  }));
}

function summarizeRejectReasons(
  rejected: Array<{ reasonCode: string }>,
): string[] {
  const counts = new Map<string, number>();
  for (const r of rejected) {
    counts.set(r.reasonCode, (counts.get(r.reasonCode) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, n]) => `REJECT_${code}:${n}`);
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}

function finalize(args: {
  status: ResolveFactorResult["status"];
  selectedFactor: SelectedFactor | null;
  reasons: string[];
  warnings: string[];
  unitConversion: ResolveFactorResult["unitConversion"];
  retrieved: number;
  eligible: number;
  rejectedSamples: RejectedCandidateSummary[];
  input: ResolveFactorInput;
  started: number;
  topCandidate?: FactorCandidate;
}): ResolveFactorResult {
  const latencyMs = Date.now() - args.started;
  const provenance = {
    resolverVersion: RESOLVER_VERSION,
    rulesetVersion: RULESET_VERSION,
    mode: args.input.mode,
    organizationId: args.input.organizationId,
    inputNormalized: {
      activity: args.input.activity?.trim(),
      unit: normalizeResolverUnit(args.input.unit ?? ""),
      quantity: args.input.quantity ?? null,
      country: args.input.country ?? null,
      region: args.input.region ?? null,
      reportingYear: args.input.reportingYear ?? null,
      lifecycleBoundary: args.input.lifecycleBoundary ?? null,
      energyBasis: args.input.energyBasis ?? null,
      gwpBasis: args.input.gwpBasis ?? null,
      preferredSource: args.input.preferredSource ?? null,
      methodology: args.input.methodology ?? null,
      factorTypeHint: args.input.factorTypeHint ?? null,
    },
    status: args.status,
    selectedStableFactorId: args.selectedFactor?.stableFactorId ?? null,
    selectedFactorId: args.selectedFactor?.id ?? null,
    sourceKey: args.selectedFactor?.source.key ?? null,
    datasetVersion: args.selectedFactor?.datasetVersion ?? null,
    factorChecksum: args.selectedFactor?.checksum ?? null,
    unitConversion: args.unitConversion,
    reasons: args.reasons,
    warnings: args.warnings,
    shadow: args.input.mode === "shadow",
    // Future: organization overrides reserved — not used in V1
    organizationOverride: null,
  };

  return {
    status: args.status,
    selectedFactor: args.selectedFactor,
    reasons: args.reasons,
    warnings: args.warnings,
    unitConversion: args.unitConversion,
    candidateSummary: {
      retrieved: args.retrieved,
      eligible: args.eligible,
      rejectedSamples: args.rejectedSamples,
    },
    resolverVersion: RESOLVER_VERSION,
    rulesetVersion: RULESET_VERSION,
    provenance,
    latencyMs,
  };
}
