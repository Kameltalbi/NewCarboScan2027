/**
 * Production auto-resolution allowlist (FE V1).
 * Version-level calculation/resolver flags may cover whole ADEME/UK versions;
 * only candidates matching these criteria may be auto-RESOLVED / calculated.
 * Shadow mode ignores this filter.
 */
import type { FactorCandidate } from "./types.js";

const ADEME_ENERGY_DENOMS = new Set([
  "kWh",
  "L",
  "kg",
  "t",
  "GJ",
  "MJ",
  "m3",
  "Nm3",
]);

const ADEME_TRANSPORT_DENOMS = new Set([
  "km",
  "passenger.km",
  "t.km",
  "tonne.km",
  "kg",
  "t",
  "L",
]);

const UK_GWP = new Set(["AR4", "AR5", "AR6"]);

/**
 * Returns true if the candidate is in the FE V1 production safe subset.
 * Does not by itself imply RESOLVED — eligibility / ranking still apply.
 */
export function isProductionSafeCandidate(c: FactorCandidate): boolean {
  if (c.sourceKey === "internal") {
    return true;
  }

  if (c.sourceKey === "ademe") {
    if (c.reviewRequired) return false;
    if (c.factorType !== "physical") return false;
    if (c.countryCode != null && c.countryCode !== "FR" && c.countryCode !== "GLOBAL") {
      return false;
    }
    if (c.internalCategory === "energy") {
      return ADEME_ENERGY_DENOMS.has(c.unitDenominator);
    }
    if (c.internalCategory === "transport" || c.internalCategory === "freight") {
      return ADEME_TRANSPORT_DENOMS.has(c.unitDenominator);
    }
    return false;
  }

  if (c.sourceKey === "uk_gov_ghg") {
    if (c.reviewRequired) return false;
    if (c.factorKind !== "activity_emission_factor") return false;
    if (!c.gwpBasis || !UK_GWP.has(c.gwpBasis)) return false;
    if (c.lifecycleBoundary !== "direct") return false;
    if (c.countryCode !== "GB") return false;
    return true;
  }

  return false;
}

/**
 * SQL predicate (alias f/v/s) matching Core TN + ADEME safe + UK safe.
 * Used for authoritative reload belt-and-suspenders.
 */
export const PRODUCTION_SAFE_FACTOR_SQL = `
  (
    (
      s.source_key = 'internal'
      AND f.status = 'approved'
      AND v.status = 'approved'
    )
    OR
    (
      s.source_key = 'ademe'
      AND f.status = 'approved'
      AND v.status = 'approved'
      AND v.catalog_status = 'visible'
      AND f.factor_type = 'physical'
      AND coalesce(f.metadata->>'normalization_status', '') <> 'review_required'
      AND (f.country_code IS NULL OR f.country_code IN ('FR', 'GLOBAL'))
      AND (
        (f.internal_category = 'energy'
          AND f.unit_denominator IN ('kWh', 'L', 'kg', 't', 'GJ', 'MJ', 'm3', 'Nm3'))
        OR
        (f.internal_category IN ('transport', 'freight')
          AND f.unit_denominator IN ('km', 'passenger.km', 't.km', 'tonne.km', 'kg', 't', 'L'))
      )
    )
    OR
    (
      s.source_key = 'uk_gov_ghg'
      AND f.status = 'approved'
      AND v.status = 'approved'
      AND v.catalog_status = 'visible'
      AND coalesce(f.metadata->>'normalization_status', '') <> 'review_required'
      AND f.factor_kind = 'activity_emission_factor'
      AND f.gwp_basis IN ('AR4', 'AR5', 'AR6')
      AND f.lifecycle_boundary = 'direct'
      AND f.country_code = 'GB'
    )
  )
`;
