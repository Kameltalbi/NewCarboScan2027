/** IPCC Emission Factor Database (EFDB) export — types. */

export const IPCC_EFDB_EXPECTED_SHA256 =
  "4b9c071cb247fab8a4ec80df695d28f77f8dcfe585992adba9dd797f266aa038";

export const IPCC_EFDB_EXPECTED_RECORD_COUNT = 27566;
export const IPCC_EFDB_EXPECTED_DISTINCT_EF_IDS = 27566;

/** Pinned after deterministic seed generation — update when adapter changes intentionally. */
export const IPCC_EFDB_EXPECTED_OPERATIONAL_FACTOR_COUNT = 778;
export const IPCC_EFDB_EXPECTED_AUTO_GLOBAL_ACTIVITY = 216;
export const IPCC_EFDB_EXPECTED_SEED_SHA256 =
  "26f332283b8c9590ef26f2201514ca855962225de0b36b2fbb26808270762e53";

export const IPCC_EFDB_SOURCE_KEY = "ipcc_efdb";
export const IPCC_EFDB_DATASET_VERSION = "efdb_snapshot_2026_09";
export const IPCC_EFDB_VERSION_LABEL = "IPCC EFDB export Sheet1 (EFDB_output.xlsx)";
/** Snapshot date of this export file — distinct from scientific reference years. */
export const IPCC_EFDB_SNAPSHOT_DATE = "2026-09-12";
export const IPCC_EFDB_SHEET_NAME = "Sheet1";
export const IPCC_EFDB_HEADER_ROW = 1;
export const IPCC_EFDB_DATA_START_ROW = 2;
export const IPCC_EFDB_DATA_END_ROW = 27567;
export const IPCC_EFDB_COLUMN_COUNT = 21;

export const IPCC_EFDB_PARAM_TYPE_COUNTS = {
  "2019 Refinement default": 7203,
  "2006 IPCC default": 5887,
  "1996 & 2006 IPCC default": 1045,
  "1996 IPCC default": 6302,
  "2013 WS default": 112,
  "2013 KP default": 12,
  Measured: 3239,
  Modeled: 797,
  "Other (e.g. compiled)": 2969,
} as const;

export const IPCC_EFDB_HEADERS = [
  "EF ID",
  "IPCC 1996 Source/Sink Category",
  "IPCC 2006 Source/Sink Category",
  "Gas",
  "Fuel 1996",
  "Fuel 2006",
  "C pool",
  "Type of parameter",
  "Description",
  "Technologies / Practices",
  "Parameters / Conditions",
  "Region / Regional Conditions",
  "Abatement / Control Technologies",
  "Other properties",
  "Value",
  "Unit",
  "Equation",
  "IPCC Worksheet",
  "Technical Reference",
  "Source of data",
  "Data provider",
] as const;

export type IpccEfdbHeader = (typeof IPCC_EFDB_HEADERS)[number];

export type ValueParseClass =
  | "number"
  | "simple_interval"
  | "central_with_bounds"
  | "inequality"
  | "missing"
  | "other_text";

export type ValueParseResult = {
  class: ValueParseClass;
  raw: string | null;
  /** Set only when class === "number" and fully consumed. */
  number: number | null;
  lower: number | null;
  upper: number | null;
  inequalityOp: "<" | "<=" | ">" | ">=" | null;
  notes: string[];
};

/**
 * Semantic role — orthogonal to EFDB "Type of parameter" (origin/default).
 * Never infer factor_kind from Type of parameter alone.
 */
export type IpccSemanticClass =
  | "ghg_component"
  | "activity_emission_factor_co2e_candidate"
  | "auxiliary_parameter"
  | "activity_data"
  | "multi_gas_unsplit"
  | "non_calculable_other";

export type GeographicApplicability =
  | "IPCC_DEFAULT_UNSPECIFIED"
  | "COUNTRY_SPECIFIC"
  | "REQUIRES_REVIEW";

export type IpccGasCode = "CO2" | "CH4" | "N2O" | "OTHER" | "MULTI" | "NONE";

export type IpccRawRecord = {
  efId: string;
  ipcc1996Category: string | null;
  ipcc2006Category: string | null;
  gasRaw: string | null;
  gases: string[];
  fuel1996: string | null;
  fuel2006: string | null;
  cPool: string | null;
  typeOfParameter: string | null;
  description: string | null;
  technologies: string | null;
  parametersConditions: string | null;
  region: string | null;
  abatement: string | null;
  otherProperties: string | null;
  valueRaw: string | null;
  unitRaw: string | null;
  equation: string | null;
  ipccWorksheet: string | null;
  technicalReference: string | null;
  sourceOfData: string | null;
  dataProvider: string | null;
};

export type IpccClassifiedRecord = IpccRawRecord & {
  valueParse: ValueParseResult;
  semanticClass: IpccSemanticClass;
  gasCode: IpccGasCode;
  geographicApplicability: GeographicApplicability;
  exclusionReason: string | null;
  /** Eligible for emission_factors promotion (operational stationary combustion V1). */
  operationalPromote: boolean;
  operationalRole: "activity_co2" | "ghg_component" | null;
};

export type IpccFactorDto = {
  externalCode: string;
  stableFactorId: string;
  name: string;
  value: number;
  originalValue: string;
  unitNumerator: string;
  unitDenominator: string;
  energyBasis: "net_cv" | null;
  lifecycleBoundary: "direct";
  gwpBasis: null;
  factorKind: "activity_emission_factor" | "ghg_component";
  factorType: "physical";
  countryCode: string | null;
  region: string | null;
  sourceCategory: string;
  sourceSubcategory: string | null;
  internalCategory: string;
  internalSubcategory: string | null;
  geographicApplicability: GeographicApplicability;
  gasCode: IpccGasCode;
  efId: string;
  typeOfParameter: string;
  fuel: string | null;
  semanticClass: IpccSemanticClass;
};
