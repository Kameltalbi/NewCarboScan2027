/**
 * Formalized safe-subset criteria from FACTOR_RESOLVER_PRODUCTION_AUDIT.
 * These define future auto-resolution eligibility — they do NOT force RESOLVED
 * and are NOT activated in Phase 1 (ADEME/UK remain calculation/resolver disabled).
 */

/** Core TN — all 8 internal approved factors when governance allows. */
export const CORE_TN_SAFE_SQL = `
  s.source_key = 'internal'
  AND f.status = 'approved'
  AND v.status = 'approved'
`;

/** ADEME safe candidate subset (~2570): physical energy+transport, FR/NULL/GLOBAL. */
export const ADEME_SAFE_SUBSET_SQL = `
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
      AND f.unit_denominator IN ('km', 'passenger.km', 't.km', 'kg', 't', 'L'))
  )
`;

/** UK safe candidate subset (~1260): direct, GB, known GWP, not review_required. */
export const UK_SAFE_SUBSET_SQL = `
  s.source_key = 'uk_gov_ghg'
  AND f.status = 'approved'
  AND v.status = 'approved'
  AND v.catalog_status = 'visible'
  AND coalesce(f.metadata->>'normalization_status', '') <> 'review_required'
  AND f.factor_kind = 'activity_emission_factor'
  AND f.gwp_basis IN ('AR4', 'AR5', 'AR6')
  AND f.lifecycle_boundary = 'direct'
  AND f.country_code = 'GB'
`;

export const EXPECTED_SUBSET_COUNTS = {
  coreTn: 8,
  ademeSafe: 2570,
  ukSafe: 1260,
} as const;
