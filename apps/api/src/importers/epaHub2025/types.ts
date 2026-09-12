/** US EPA GHG Emission Factors Hub 2025 — types (isolated adapter). */

export const EPA_EXPECTED_SHA256 =
  "43afb91d79b2ae765b3a447549d9e1021a144a407cec5eb804be9fcf69a668a7";

/** Pinned after deterministic seed generation — update when adapter changes intentionally. */
export const EPA_EXPECTED_FACTOR_COUNT = 1421;
export const EPA_EXPECTED_SEED_SHA256 =
  "8dace7ec6e486d7f1083802352f4037ebba3d0793342a3144d44f0b1279130ca";

export const EPA_SOURCE_KEY = "epa_ghg_emission_factors_hub";
export const EPA_DATASET_VERSION = "2025";
export const EPA_REPORTING_YEAR = 2025;
export const EPA_VERSION_LABEL = "GHG Emission Factors Hub 2025";
export const EPA_SHEET_NAME = "Emission Factors Hub";

export const EPA_AR5_GWP = { CO2: 1, CH4: 28, N2O: 265 } as const;

export type GeographicApplicability =
  | "US_SPECIFIC"
  | "GLOBAL_APPLICABLE"
  | "REQUIRES_REVIEW";

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
export type GwpBasis = "AR4" | "AR5" | "AR6" | "mixed" | "unknown" | null;
export type FactorKind = "activity_emission_factor" | "ghg_component" | "gwp" | "energy_intensity";
export type FactorType = "physical" | "gwp" | "other";

export type EpaGas = "CO2" | "CH4" | "N2O" | null;

/** Raw factor emitted by table parsers (pre-canonical). */
export type EpaRawFactor = {
  table: number;
  tableName: string;
  /** Deterministic stem parts after epa:2025: */
  stemParts: string[];
  name: string;
  value: number;
  valueText: string;
  unitNumerator: string;
  unitDenominator: string;
  gas: EpaGas;
  factorKind: FactorKind;
  factorType: FactorType;
  lifecycleBoundary: LifecycleBoundary;
  energyBasis: EnergyBasis;
  gwpBasis: GwpBasis;
  geographicApplicability: GeographicApplicability;
  countryCode: string | null;
  sourceCategory: string;
  sourceSubcategory: string | null;
  /** Extra structured fields for metadata.epa */
  dims: Record<string, string | number | boolean | null>;
  /** If true, this is a CarboScan-derived CO2e row (not EPA raw). */
  derived?: boolean;
  derivedFormula?: string;
  derivedFromStems?: string[];
};

export type EpaCanonicalDto = {
  externalCode: string;
  stableFactorId: string;
  name: string;
  value: number;
  originalValue: string;
  unitNumerator: string;
  unitDenominator: string;
  energyBasis: EnergyBasis;
  lifecycleBoundary: LifecycleBoundary;
  gwpBasis: GwpBasis;
  factorKind: FactorKind;
  factorType: FactorType;
  countryCode: string | null;
  region: string | null;
  sourceCategory: string;
  sourceSubcategory: string | null;
  internalCategory: string | null;
  internalSubcategory: string | null;
  geographicApplicability: GeographicApplicability;
  gas: EpaGas;
  table: number;
  tableName: string;
  dims: Record<string, string | number | boolean | null>;
  derived: boolean;
  derivedFormula: string | null;
  derivedFromStems: string[];
};

export type EpaParseStats = {
  sourceRows: number;
  tables: number;
  rawDetected: number;
  naIgnored: number;
  zeros: number;
  negatives: number;
  byTable: Record<string, number>;
};
