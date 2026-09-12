/** Factor Resolver V1 — shared types, versions, reason codes. */

export const RESOLVER_VERSION = "1";
/** Bumped for IPCC biogenic CO2 memo accounting (031). */
export const RULESET_VERSION = "2026-09-v6";

export type ResolveMode = "shadow" | "production";

export type ResolveStatus =
  | "RESOLVED"
  | "AMBIGUOUS"
  | "NO_MATCH"
  | "REQUIRES_CONTEXT"
  | "REVIEW_REQUIRED";

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

export type EnergyBasis = "gross_cv" | "net_cv";
export type GwpBasis = "AR4" | "AR5" | "AR6" | "mixed" | "unknown";
export type FactorTypeHint = "physical" | "monetary";

export type ResolveFactorInput = {
  activity: string;
  quantity?: string;
  unit: string;
  country?: string;
  region?: string;
  reportingYear?: number;
  internalCategory?: string;
  internalSubcategory?: string;
  lifecycleBoundary?: LifecycleBoundary;
  energyBasis?: EnergyBasis;
  gwpBasis?: GwpBasis;
  preferredSource?: string;
  methodology?: string;
  factorTypeHint?: FactorTypeHint;
  /** V1 API accepts shadow only; production path exists for future enablement. */
  mode: ResolveMode;
  organizationId: string;
};

export type SelectedFactor = {
  id: string;
  stableFactorId: string | null;
  externalCode: string | null;
  source: { key: string; name: string };
  datasetVersion: string | null;
  name: string;
  value: number;
  numeratorUnit: string;
  denominatorUnit: string;
  countryCode: string | null;
  lifecycleBoundary: string | null;
  energyBasis: string | null;
  gwpBasis: string | null;
  factorType: string | null;
  factorKind: string | null;
  factorYear: number | null;
  checksum: string | null;
  reviewRequired: boolean;
};

export type UnitConversionResult = {
  class: "exact" | "safe";
  fromUnit: string;
  toUnit: string;
  multiplier: number;
  normalizedQuantity: string | null;
};

export type RejectedCandidateSummary = {
  id: string;
  stableFactorId: string | null;
  sourceKey: string;
  name: string;
  reasonCode: string;
};

export type CandidateSummary = {
  retrieved: number;
  eligible: number;
  rejectedSamples: RejectedCandidateSummary[];
};

export type ResolveFactorResult = {
  status: ResolveStatus;
  selectedFactor: SelectedFactor | null;
  reasons: string[];
  warnings: string[];
  unitConversion: UnitConversionResult | null;
  candidateSummary: CandidateSummary;
  resolverVersion: string;
  rulesetVersion: string;
  /** Rich object for future ledger provenance — not a DB write. */
  provenance: Record<string, unknown>;
  latencyMs: number;
};

/** Internal candidate row after SQL retrieval. */
export type FactorCandidate = {
  id: string;
  stableFactorId: string | null;
  externalCode: string | null;
  name: string;
  value: number;
  unitNumerator: string;
  unitDenominator: string;
  sourceKey: string;
  sourceName: string;
  datasetVersion: string | null;
  countryCode: string | null;
  region: string | null;
  factorType: string | null;
  factorKind: string | null;
  lifecycleBoundary: string | null;
  energyBasis: string | null;
  gwpBasis: string | null;
  factorYear: number | null;
  internalCategory: string | null;
  internalSubcategory: string | null;
  checksum: string | null;
  reviewRequired: boolean;
  catalogStatus: string;
  calculationStatus: string;
  resolverStatus: string;
  textScore: number;
  /** EPA metadata (null for other sources). */
  geographicApplicability: string | null;
  epaTableNumber: number | null;
  epaDerived: boolean;
};

export type EligibilityOutcome = {
  ok: boolean;
  reasonCode?: string;
  geographyReason?: string;
  warnings?: string[];
};

export type RankedCandidate = {
  candidate: FactorCandidate;
  geographyRank: number;
  unitRank: number;
  taxonomyRank: number;
  sourceRank: number;
  yearRank: number;
  textRank: number;
  unitConversion: UnitConversionResult | null;
  geographyReason?: string;
  warnings: string[];
};
