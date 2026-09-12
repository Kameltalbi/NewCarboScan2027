/**
 * EPA GHG Emission Factors Hub 2025 — Safe Subset V1 (conservative).
 *
 * Deterministic policy from metadata (no UUID allowlists).
 * AUTO_GLOBAL_ACTIVITY is intentionally empty: Hub activity factors are
 * US-bound or carry US methodological assumptions (HHV, short ton, scf, eGRID…).
 *
 * Ruleset id recorded in Resolver/ledger provenance when an EPA factor is used:
 *   EPA_SAFE_SUBSET_V1_2026_09
 */
import type { FactorCandidate } from "./types.js";

export const EPA_SOURCE_KEY = "epa_ghg_emission_factors_hub";
export const EPA_DATASET_VERSION = "2025";
export const EPA_SAFE_SUBSET_RULESET = "EPA_SAFE_SUBSET_V1_2026_09";

/** Safe-subset classification classes (V1). */
export type EpaSafeClass =
  | "AUTO_US"
  | "AUTO_GLOBAL_ACTIVITY"
  | "GLOBAL_GWP"
  | "REVIEW_REQUIRED";

export type EpaSafeSubsetCounts = {
  total: number;
  autoUs: number;
  autoGlobalActivity: number;
  globalGwp: number;
  reviewRequired: number;
};

/** Pinned counts after Hub 2025 import + Safe Subset V1 policy. */
export const EPA_SAFE_SUBSET_EXPECTED_COUNTS: EpaSafeSubsetCounts = {
  total: 1421,
  autoUs: 258,
  autoGlobalActivity: 0,
  globalGwp: 62,
  reviewRequired: 1101,
};

export type EpaClassificationInput = {
  factorKind: string | null;
  countryCode: string | null;
  gwpBasis: string | null;
  lifecycleBoundary: string | null;
  reviewRequired: boolean;
  geographicApplicability: string | null;
  epaTableNumber: number | null;
  epaDerived: boolean;
};

/**
 * Classify a single EPA factor into the Safe Subset V1 class.
 * Non-EPA callers should not use this — returns REVIEW_REQUIRED if geo missing.
 */
export function classifyEpaSafeClass(input: EpaClassificationInput): EpaSafeClass {
  const kind = input.factorKind;
  const geo = input.geographicApplicability;

  // Tables 11–12: IPCC AR5 GWP references — never activity auto-resolve.
  if (kind === "gwp" || geo === "GLOBAL_APPLICABLE") {
    if (kind === "gwp" && geo === "GLOBAL_APPLICABLE") {
      return "GLOBAL_GWP";
    }
    // Defensive: unexpected combo stays review.
    return "REVIEW_REQUIRED";
  }

  // Explicit import review / unknown geography → never auto.
  if (input.reviewRequired || geo === "REQUIRES_REVIEW" || !geo) {
    return "REVIEW_REQUIRED";
  }

  // GHG components are never activity emission factors for the Resolver.
  if (kind === "ghg_component") {
    return "REVIEW_REQUIRED";
  }

  // US activity CO2e (incl. derived eGRID / T&D / travel; waste already CO2e).
  if (
    kind === "activity_emission_factor" &&
    geo === "US_SPECIFIC" &&
    input.countryCode === "US" &&
    input.gwpBasis === "AR5" &&
    (input.lifecycleBoundary === "direct" ||
      input.lifecycleBoundary === "waste_treatment")
  ) {
    // V1: no AUTO_GLOBAL_ACTIVITY path from Hub activity rows.
    return "AUTO_US";
  }

  return "REVIEW_REQUIRED";
}

/** True if candidate is EPA AUTO_US (production activity allowlist). */
export function isEpaAutoUsActivity(c: FactorCandidate & Partial<EpaMetaFields>): boolean {
  if (c.sourceKey !== EPA_SOURCE_KEY) return false;
  return (
    classifyEpaSafeClass({
      factorKind: c.factorKind,
      countryCode: c.countryCode,
      gwpBasis: c.gwpBasis,
      lifecycleBoundary: c.lifecycleBoundary,
      reviewRequired: c.reviewRequired,
      geographicApplicability: c.geographicApplicability ?? null,
      epaTableNumber: c.epaTableNumber ?? null,
      epaDerived: Boolean(c.epaDerived),
    }) === "AUTO_US"
  );
}

export type EpaMetaFields = {
  geographicApplicability: string | null;
  epaTableNumber: number | null;
  epaDerived: boolean;
};

/** eGRID = EPA table 6 — US only, never world fallback. */
export function isEpaEgridFactor(
  c: Pick<FactorCandidate, "sourceKey" | "stableFactorId" | "name"> &
    Partial<Pick<EpaMetaFields, "epaTableNumber">>,
): boolean {
  if (c.sourceKey !== EPA_SOURCE_KEY) return false;
  if (c.epaTableNumber === 6) return true;
  const sid = (c.stableFactorId ?? "").toLowerCase();
  const name = (c.name ?? "").toLowerCase();
  return sid.includes(":t6:") || name.includes("egrid");
}

/**
 * SQL predicate (aliases f/v/s) for EPA AUTO_US activity factors.
 * Mirrors classifyEpaSafeClass AUTO_US — used by PRODUCTION_SAFE_FACTOR_SQL.
 */
export const EPA_AUTO_US_SAFE_SQL = `
  s.source_key = '${EPA_SOURCE_KEY}'
  AND f.status = 'approved'
  AND v.status = 'approved'
  AND v.catalog_status = 'visible'
  AND coalesce(f.metadata->>'normalization_status', '') <> 'review_required'
  AND f.factor_kind = 'activity_emission_factor'
  AND f.gwp_basis = 'AR5'
  AND f.lifecycle_boundary IN ('direct', 'waste_treatment')
  AND f.country_code = 'US'
  AND f.metadata->'geography'->>'geographic_applicability' = 'US_SPECIFIC'
`;

/** SQL for GLOBAL_GWP class (documentation / counts — not activity allowlist). */
export const EPA_GLOBAL_GWP_SQL = `
  s.source_key = '${EPA_SOURCE_KEY}'
  AND f.factor_kind = 'gwp'
  AND f.metadata->'geography'->>'geographic_applicability' = 'GLOBAL_APPLICABLE'
`;

/**
 * Provenance fields when an EPA factor is selected (Resolver / ledger).
 */
export function buildEpaProvenanceFields(
  c: FactorCandidate & Partial<EpaMetaFields>,
): Record<string, unknown> {
  const safeClass = classifyEpaSafeClass({
    factorKind: c.factorKind,
    countryCode: c.countryCode,
    gwpBasis: c.gwpBasis,
    lifecycleBoundary: c.lifecycleBoundary,
    reviewRequired: c.reviewRequired,
    geographicApplicability: c.geographicApplicability ?? null,
    epaTableNumber: c.epaTableNumber ?? null,
    epaDerived: Boolean(c.epaDerived),
  });
  return {
    epaSafeSubsetRuleset: EPA_SAFE_SUBSET_RULESET,
    epaSafeClass: safeClass,
    geographicApplicability: c.geographicApplicability ?? null,
    originalGeography: {
      countryCode: c.countryCode,
      region: c.region,
    },
    lifecycleBoundary: c.lifecycleBoundary,
    gwpBasis: c.gwpBasis,
    derived: Boolean(c.epaDerived),
    epaTableNumber: c.epaTableNumber ?? null,
    egrid: isEpaEgridFactor(c),
  };
}
