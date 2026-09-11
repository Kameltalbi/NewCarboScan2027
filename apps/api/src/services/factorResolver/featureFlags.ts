/**
 * Server feature flags for Factor Resolver production calculation.
 * Default: OFF — flag alone never bypasses DB governance.
 */
export function isResolverCalculationEnabled(): boolean {
  const raw = process.env.FACTOR_RESOLVER_CALCULATION_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export const RESOLVER_CALCULATION_DISABLED_ERROR =
  "Factor Resolver calculation is disabled (FACTOR_RESOLVER_CALCULATION_ENABLED)";
