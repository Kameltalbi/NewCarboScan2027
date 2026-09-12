import type { FactorCandidate, ResolveFactorInput } from "./types.js";
import { EPA_SOURCE_KEY, isEpaEgridFactor } from "./epaSafeSubset.js";

export type GeographyEval = {
  eligible: boolean;
  rank: number; // lower = better
  reasonCode: string;
  warning?: string;
};

/**
 * Geography policy V1 (+ EPA Safe Subset V1 activation).
 * ADEME NULL + requested FR → eligible (FR_IMPLIED_BY_SOURCE_POLICY).
 * UK GB never auto-applies to FR/TN.
 * EPA AUTO_US requires effective country=US (never TN/FR/GB/WORLD/missing).
 * eGRID requires matching US subregion — never pick arbitrary US region.
 */
export function evaluateGeography(
  input: Pick<ResolveFactorInput, "country" | "region">,
  candidate: Pick<
    FactorCandidate,
    "countryCode" | "region" | "sourceKey" | "stableFactorId" | "name"
  > & {
    geographicApplicability?: string | null;
    epaTableNumber?: number | null;
  },
): GeographyEval {
  const requested = normalizeCountry(input.country);
  const factorCountry = normalizeCountry(candidate.countryCode);
  const source = candidate.sourceKey;

  // EPA: never auto-apply without an effective national geography
  if (source === EPA_SOURCE_KEY) {
    if (!requested || requested === "WORLD" || requested === "GLOBAL") {
      return {
        eligible: false,
        rank: 999,
        reasonCode: "GEO_EPA_COUNTRY_REQUIRED",
      };
    }
  }

  // No requested country → weak geo for non-EPA; don't hard-reject
  if (!requested) {
    if (factorCountry) {
      return {
        eligible: true,
        rank: 40,
        reasonCode: "GEO_INPUT_UNSPECIFIED",
        warning: "Requested country unspecified; geography weakly constrained",
      };
    }
    return { eligible: true, rank: 45, reasonCode: "GEO_BOTH_UNSPECIFIED" };
  }

  // WORLD/GLOBAL activity geography: never match national EPA AUTO_US
  if (
    source === EPA_SOURCE_KEY &&
    (requested === "WORLD" || requested === "GLOBAL")
  ) {
    return {
      eligible: false,
      rank: 999,
      reasonCode: "GEO_EPA_COUNTRY_REQUIRED",
    };
  }

  // Explicit contradiction: UK GB vs non-GB request
  if (source === "uk_gov_ghg" && factorCountry === "GB" && requested !== "GB") {
    return {
      eligible: false,
      rank: 999,
      reasonCode: "GEO_UK_INCOMPATIBLE",
    };
  }

  // EPA: US-specific (incl. eGRID) never applies outside US
  if (source === EPA_SOURCE_KEY) {
    const geoApp = candidate.geographicApplicability ?? null;
    const egrid = isEpaEgridFactor(candidate);

    if (egrid) {
      if (requested !== "US") {
        return {
          eligible: false,
          rank: 999,
          reasonCode: "GEO_EPA_EGRID_US_ONLY",
        };
      }
      const reqRegion = input.region?.trim() ?? "";
      const facRegion = candidate.region?.trim() ?? "";
      if (!reqRegion || !facRegion) {
        return {
          eligible: false,
          rank: 999,
          reasonCode: "GEO_EPA_EGRID_REGION_REQUIRED",
        };
      }
      if (!sameRegion(reqRegion, facRegion)) {
        return {
          eligible: false,
          rank: 999,
          reasonCode: "GEO_EPA_EGRID_REGION_MISMATCH",
        };
      }
    }

    if (
      (geoApp === "US_SPECIFIC" || factorCountry === "US") &&
      requested !== "US"
    ) {
      return {
        eligible: false,
        rank: 999,
        reasonCode: "GEO_EPA_US_INCOMPATIBLE",
      };
    }

    // Import-time REQUIRES_REVIEW geography: never auto geo-match (TN proxy etc.)
    if (geoApp === "REQUIRES_REVIEW") {
      return {
        eligible: false,
        rank: 999,
        reasonCode: "GEO_EPA_REQUIRES_REVIEW",
      };
    }

    // GLOBAL_APPLICABLE on EPA is GWP-only — never activity auto geo-match
    if (geoApp === "GLOBAL_APPLICABLE") {
      return {
        eligible: false,
        rank: 999,
        reasonCode: "GEO_EPA_GWP_NOT_ACTIVITY",
      };
    }
  }

  // Explicit country mismatch (both known and different)
  if (factorCountry && factorCountry !== "GLOBAL" && factorCountry !== requested) {
    // Core TN must not apply outside TN
    if (source === "internal" && factorCountry === "TN" && requested !== "TN") {
      return { eligible: false, rank: 999, reasonCode: "GEO_TN_INCOMPATIBLE" };
    }
    // ADEME with explicit non-matching country
    if (source === "ademe") {
      return { eligible: false, rank: 999, reasonCode: "GEO_COUNTRY_MISMATCH" };
    }
    // Other sources with explicit other country
    return { eligible: false, rank: 999, reasonCode: "GEO_COUNTRY_MISMATCH" };
  }

  // Exact country match
  if (factorCountry && factorCountry === requested) {
    let rank = 10;
    if (input.region && candidate.region && sameRegion(input.region, candidate.region)) {
      rank = 5;
    }
    return { eligible: true, rank, reasonCode: "GEO_EXACT_COUNTRY" };
  }

  // ADEME GLOBAL
  if (source === "ademe" && factorCountry === "GLOBAL") {
    return { eligible: true, rank: 25, reasonCode: "GEO_ADEME_GLOBAL" };
  }

  // ADEME NULL country
  if (source === "ademe" && !factorCountry) {
    if (requested === "FR") {
      return {
        eligible: true,
        rank: 15,
        reasonCode: "FR_IMPLIED_BY_SOURCE_POLICY",
        warning:
          "ADEME country_code NULL interpreted as FR-eligible by source policy (not written to DB)",
      };
    }
    return {
      eligible: false,
      rank: 999,
      reasonCode: "GEO_ADEME_NULL_NOT_APPLICABLE",
    };
  }

  // Factor country NULL (non-ADEME)
  if (!factorCountry) {
    if (source === "uk_gov_ghg" && requested === "GB") {
      return {
        eligible: true,
        rank: 30,
        reasonCode: "GEO_UK_NULL_WEAK",
        warning: "UK factor missing country_code",
      };
    }
    return {
      eligible: false,
      rank: 999,
      reasonCode: "GEO_FACTOR_COUNTRY_UNKNOWN",
    };
  }

  return { eligible: true, rank: 35, reasonCode: "GEO_WEAK" };
}

function normalizeCountry(raw?: string | null): string | null {
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  if (!c) return null;
  if (c === "UK") return "GB";
  if (c === "FRA") return "FR";
  if (c === "TUN") return "TN";
  if (c === "USA") return "US";
  return c;
}

function sameRegion(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
