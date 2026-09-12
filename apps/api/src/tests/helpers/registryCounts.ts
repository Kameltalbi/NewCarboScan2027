/**
 * Canonical registry counts after IPCC EFDB operational promote (028–030).
 * Pre-IPCC (EPA catalog on): 11445.
 */
export const CORE_TN_COUNT = 8;
export const ADEME_COUNT = 7394;
export const UK_COUNT = 2622;
export const EPA_COUNT = 1421;
export const IPCC_EFDB_OPERATIONAL_COUNT = 778;

/** All emission_factors rows (includes IPCC operational subset). */
export const REGISTRY_TOTAL =
  CORE_TN_COUNT + ADEME_COUNT + UK_COUNT + EPA_COUNT + IPCC_EFDB_OPERATIONAL_COUNT; // 12223

/**
 * Approved + catalog_status=visible after IPCC catalog activation (029).
 */
export const CATALOG_VISIBLE_TOTAL = REGISTRY_TOTAL; // 12223

/** Pre-IPCC registry (Core + ADEME + UK + EPA). */
export const REGISTRY_TOTAL_PRE_IPCC = CORE_TN_COUNT + ADEME_COUNT + UK_COUNT + EPA_COUNT; // 11445

/** Pre-EPA catalog activation (Core + ADEME + UK). */
export const CATALOG_VISIBLE_PRE_EPA = CORE_TN_COUNT + ADEME_COUNT + UK_COUNT; // 10024

/** Pre-UK catalog activation (ADEME + Core TN only). */
export const CATALOG_VISIBLE_PRE_UK = CORE_TN_COUNT + ADEME_COUNT; // 7402

export const EPA_SOURCE_KEY = "epa_ghg_emission_factors_hub";
export const IPCC_EFDB_SOURCE_KEY = "ipcc_efdb";

/** EPA Safe Subset V1 pinned counts. */
export const EPA_AUTO_US = 258;
export const EPA_GLOBAL_GWP = 62;
export const EPA_AUTO_GLOBAL_ACTIVITY = 0;
export const EPA_REVIEW_REQUIRED = 1101;

/** IPCC stationary combustion V1. */
export const IPCC_AUTO_GLOBAL_ACTIVITY = 216;
export const IPCC_GHG_COMPONENTS = 562;
