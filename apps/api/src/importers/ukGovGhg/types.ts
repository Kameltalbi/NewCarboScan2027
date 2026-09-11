/** UK Government GHG Conversion Factors 2026 — types (source adapter, isolated). */

export const UK_EXPECTED_SHA256 =
  "a9a455ab396dae226d510c7be6233748416d490c41a5d20f3dc7a0c45feecd5e";

export const UK_SOURCE_KEY = "uk_gov_ghg";
export const UK_DATASET_VERSION = "2026-flat-1.2";
export const UK_FLAT_VERSION = "1.2";
export const UK_REPORTING_YEAR = 2026;
export const UK_VERSION_LABEL = "2026 Flat File v1.2";

export type UkRawRow = {
  id: string;
  scope: string | null;
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  columnText: string | null;
  uom: string | null;
  ghgUnit: string | null;
  /** Parsed number, or null if blank; never coerced from blank. */
  value: number | null;
  /**
   * Exact textual representation used for registry insert (no magnitude conversion).
   * Prefer Excel formatted text when available; never invent zeros from blank.
   */
  valueText: string | null;
  /** True when source cell was blank/null (not zero). */
  valueIsNull: boolean;
  /** True when source cell was exactly zero. */
  valueIsZero: boolean;
};

export type UkReconcileStats = {
  sourceRowsWithId: number;
  distinctIds: number;
  ghgUnitDistribution: Record<string, number>;
  nullValues: number;
  zeroValues: number;
  negativeValues: number;
  kgCo2eTotalRows: number;
  kgCo2eValuedRows: number;
};

export type LifecycleBoundary =
  | "direct"
  | "wtt"
  | "td"
  | "wtw"
  | "cradle_to_gate"
  | "material_use"
  | "waste_treatment"
  | "outside_of_scopes"
  | "other"
  | "unknown";

export type EnergyBasis = "gross_cv" | "net_cv" | null;
export type GwpBasis = "AR4" | "AR5" | "AR6" | "mixed" | "unknown";
export type MappingStatus = "mapped" | "ambiguous" | "unmapped";

export type UkCanonicalDto = {
  externalCode: string;
  stem: string;
  stableFactorId: string;
  name: string;
  value: number;
  unitNumerator: string;
  unitDenominator: string;
  energyBasis: EnergyBasis;
  lifecycleBoundary: LifecycleBoundary;
  lifecycleRule: string;
  gwpBasis: GwpBasis;
  gwpRule: string;
  factorKind: "activity_emission_factor";
  factorType: "physical";
  countryCode: string | null;
  geographyRule: string;
  sourceCategory: string;
  sourceSubcategory: string | null;
  internalCategory: string | null;
  internalSubcategory: string | null;
  taxonomyStatus: MappingStatus;
  taxonomyRule: string;
  normalizationStatus: "ok" | "review_required";
  sourceScope: string | null;
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  columnText: string | null;
  originalUom: string | null;
  originalGhgUnit: string;
  originalValue: string;
  ghgComponents: {
    co2_co2e: number | null;
    ch4_co2e: number | null;
    n2o_co2e: number | null;
  } | null;
};

export type UkImportResult = {
  inserted: number;
  updated: number;
  imported: number;
  registryBefore: number;
  registryAfter: number;
  ukCount: number;
  catalogVisible: number;
  legacyInternal: number;
  reconcile: UkReconcileStats;
  gwpCounts: Record<string, number>;
  countryCounts: Record<string, number>;
  lifecycleCounts: Record<string, number>;
  reviewRequired: number;
  taxonomy: { mapped: number; ambiguous: number; unmapped: number };
  skippedNullCo2e: number;
  componentsNotImported: number;
  secrNotImported: number;
  zerosImported: number;
};
