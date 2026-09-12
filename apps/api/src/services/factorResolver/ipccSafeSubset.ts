/**
 * IPCC EFDB Safe Subset V1 — stationary combustion defaults (CO2 activity only).
 * Ruleset: IPCC_STATIONARY_COMBUSTION_V1_2026_09
 */
import type { FactorCandidate } from "./types.js";

export const IPCC_EFDB_SOURCE_KEY = "ipcc_efdb";
export const IPCC_SAFE_SUBSET_RULESET = "IPCC_STATIONARY_COMBUSTION_V1_2026_09";

export const IPCC_SAFE_SUBSET_EXPECTED_COUNTS = {
  /** CO2 kgCO2e/TJ net_cv activity — AUTO_GLOBAL_ACTIVITY measured. */
  autoGlobalActivity: 216,
  /** CH4+N2O components in registry (not production activity). */
  ghgComponents: 562,
  operationalRegistry: 778,
  stagingRecords: 27566,
} as const;

export type IpccSafeClass = "AUTO_GLOBAL_ACTIVITY" | "GHG_COMPONENT" | "EXCLUDED";

export function classifyIpccSafeClass(input: {
  sourceKey: string;
  factorKind: string | null;
  unitNumerator: string;
  unitDenominator: string;
  energyBasis: string | null;
  lifecycleBoundary: string | null;
  countryCode: string | null;
  geographicApplicability: string | null;
}): IpccSafeClass {
  if (input.sourceKey !== IPCC_EFDB_SOURCE_KEY) return "EXCLUDED";
  if (
    input.factorKind === "activity_emission_factor" &&
    input.unitNumerator === "kgCO2e" &&
    input.unitDenominator === "TJ" &&
    input.energyBasis === "net_cv" &&
    (input.lifecycleBoundary === "direct" ||
      input.lifecycleBoundary === "outside_of_scopes") &&
    input.countryCode == null &&
    input.geographicApplicability === "IPCC_DEFAULT_UNSPECIFIED"
  ) {
    return "AUTO_GLOBAL_ACTIVITY";
  }
  if (input.factorKind === "ghg_component") return "GHG_COMPONENT";
  return "EXCLUDED";
}

export function isIpccAutoGlobalActivity(c: FactorCandidate): boolean {
  return (
    classifyIpccSafeClass({
      sourceKey: c.sourceKey,
      factorKind: c.factorKind,
      unitNumerator: c.unitNumerator,
      unitDenominator: c.unitDenominator,
      energyBasis: c.energyBasis,
      lifecycleBoundary: c.lifecycleBoundary,
      countryCode: c.countryCode,
      geographicApplicability: c.geographicApplicability ?? null,
    }) === "AUTO_GLOBAL_ACTIVITY"
  );
}

export const IPCC_AUTO_GLOBAL_ACTIVITY_SAFE_SQL = `
  s.source_key = 'ipcc_efdb'
  AND f.status = 'approved'
  AND v.status = 'approved'
  AND v.catalog_status = 'visible'
  AND v.calculation_status = 'enabled'
  AND v.resolver_status = 'enabled'
  AND coalesce(f.metadata->>'normalization_status', '') <> 'review_required'
  AND f.factor_kind = 'activity_emission_factor'
  AND f.unit_numerator = 'kgCO2e'
  AND f.unit_denominator = 'TJ'
  AND f.energy_basis = 'net_cv'
  AND f.lifecycle_boundary IN ('direct', 'outside_of_scopes')
  AND f.country_code IS NULL
  AND f.metadata->'geography'->>'geographic_applicability' = 'IPCC_DEFAULT_UNSPECIFIED'
  AND (
    f.lifecycle_boundary = 'direct'
    OR coalesce(f.metadata->'provenance'->>'biogenicCo2', '') = 'true'
  )
`;

export function buildIpccProvenanceFields(c: FactorCandidate) {
  return {
    ipccSafeSubsetRuleset: IPCC_SAFE_SUBSET_RULESET,
    ipccSafeClass: classifyIpccSafeClass({
      sourceKey: c.sourceKey,
      factorKind: c.factorKind,
      unitNumerator: c.unitNumerator,
      unitDenominator: c.unitDenominator,
      energyBasis: c.energyBasis,
      lifecycleBoundary: c.lifecycleBoundary,
      countryCode: c.countryCode,
      geographicApplicability: c.geographicApplicability ?? null,
    }),
    geographicApplicability: c.geographicApplicability ?? null,
    energyBasis: c.energyBasis,
    lifecycleBoundary: c.lifecycleBoundary,
    noteEmptyRegionIsNotWorld: true,
  };
}
