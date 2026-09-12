/**
 * Canonical registry counts after EPA Hub 2025 catalog activation (026).
 * EPA: catalog visible; calculation + resolver still disabled.
 */
export const CORE_TN_COUNT = 8;
export const ADEME_COUNT = 7394;
export const UK_COUNT = 2622;
export const EPA_COUNT = 1421;

/** All emission_factors rows. */
export const REGISTRY_TOTAL = CORE_TN_COUNT + ADEME_COUNT + UK_COUNT + EPA_COUNT; // 11445

/**
 * Approved + catalog_status=visible after 026 (includes EPA).
 * Pre-026 (hidden EPA): 10024.
 */
export const CATALOG_VISIBLE_TOTAL = REGISTRY_TOTAL; // 11445

/** Pre-EPA catalog activation (Core + ADEME + UK). */
export const CATALOG_VISIBLE_PRE_EPA = CORE_TN_COUNT + ADEME_COUNT + UK_COUNT; // 10024

/** Pre-UK catalog activation (ADEME + Core TN only). */
export const CATALOG_VISIBLE_PRE_UK = CORE_TN_COUNT + ADEME_COUNT; // 7402

export const EPA_SOURCE_KEY = "epa_ghg_emission_factors_hub";

/** EPA Safe Subset V1 pinned counts. */
export const EPA_AUTO_US = 258;
export const EPA_GLOBAL_GWP = 62;
export const EPA_AUTO_GLOBAL_ACTIVITY = 0;
export const EPA_REVIEW_REQUIRED = 1101;
