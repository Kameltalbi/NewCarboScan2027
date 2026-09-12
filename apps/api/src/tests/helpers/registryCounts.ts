/**
 * Canonical registry counts after EPA Hub 2025 bootstrap (025).
 * EPA remains catalog-hidden / calc+resolver disabled.
 */
export const CORE_TN_COUNT = 8;
export const ADEME_COUNT = 7394;
export const UK_COUNT = 2622;
export const EPA_COUNT = 1421;

/** All emission_factors rows (includes hidden EPA). */
export const REGISTRY_TOTAL = CORE_TN_COUNT + ADEME_COUNT + UK_COUNT + EPA_COUNT; // 11445

/** Approved + catalog_status=visible (EPA excluded). */
export const CATALOG_VISIBLE_TOTAL = CORE_TN_COUNT + ADEME_COUNT + UK_COUNT; // 10024

/** Pre-UK catalog activation (ADEME + Core TN only). */
export const CATALOG_VISIBLE_PRE_UK = CORE_TN_COUNT + ADEME_COUNT; // 7402

export const EPA_SOURCE_KEY = "epa_ghg_emission_factors_hub";
