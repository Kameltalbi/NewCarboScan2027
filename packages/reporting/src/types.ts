export const SCHEMA_VERSION = "1.0" as const;

export type Scope = 1 | 2 | 3;
export type Inclusion = "included" | "excluded" | "not_applicable" | "not_reported";
export type DataQuality = "primary" | "estimated" | "default";
export type LineMethod =
  | "invoice"
  | "measured_zero"
  | "proxy_monetary"
  | "modeled"
  | "extrapolated"
  | "maintenance_estimate";

/** Ligne d'inventaire. Le résultat déclaré est la source. Le module le contrôle, il ne le remplace pas. */
export interface ActivityLine {
  id: string;
  factId: string;
  label: string;
  scope: Scope;
  category: string;
  site: string | null;
  inclusion: Inclusion;
  quantity: string | null;
  quantityUnit: string | null;
  factorValue: string | null;
  factorUnit: string | null;
  factorSource: string;
  factorVersion: string;
  factorId: string;
  resultKgCo2e: string | null;
  dataQuality: DataQuality | null;
  uncertaintyPct: string | null;
  method: LineMethod;
}

/** Catégorie hors somme. Une absence n'est pas une émission nulle. */
export interface BoundaryItem {
  id: string;
  label: string;
  status: Exclude<Inclusion, "included">;
  reason: string;
}

export interface Denominator {
  id: string;
  label: string;
  proseLabel: string;
  value: string | null;
  unit: string;
  /** Intensité = totalKg × numerator / value. */
  numerator: string;
  displayUnit: string;
  displayScale: number;
}

export interface ComparisonInput {
  status: "available" | "not_available" | "not_comparable";
  priorYear: number | null;
  priorTotalKgCo2e: string | null;
  categories: "available" | "not_available";
  basis: string | null;
}

export interface ReductionHypothesis {
  kind: "share_of_line";
  lineId: string;
  /** Part décimale du poste, par exemple "0.40". */
  share: string;
}

export interface ReductionAction {
  id: string;
  title: string;
  /** Texte sans chiffre ajouté : les montants calculés sont injectés à part. */
  text: string;
  horizon: string;
  indicator: string;
  hypothesis: ReductionHypothesis | null;
}

export interface ReportData {
  schemaVersion: typeof SCHEMA_VERSION;
  company: {
    name: string;
    country: string;
    sector: string;
    sites: string[];
  };
  inventory: {
    year: number;
    periodLabel: string;
    methodology: string;
    methodologyVersion: string;
    consolidation: string;
    electricityAccounting: string;
  };
  lines: ActivityLine[];
  boundary: BoundaryItem[];
  denominators: Denominator[];
  comparison: ComparisonInput;
  assumptions: string[];
  actions: ReductionAction[];
  biogenic: { status: "not_reported" | "reported"; kgCo2e: string | null };
}

export interface AnalysisOptions {
  /** Part minimale du total pour qualifier un poste de significatif. Ex. "0.05". */
  significantShareMin: string;
  /** Cible éditoriale de couverture cumulative. Ex. "0.80". */
  cumulativeCoverageTarget: string;
  /** Décimales des parts affichées. */
  shareDisplayScale: number;
}

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  significantShareMin: "0.05",
  cumulativeCoverageTarget: "0.80",
  shareDisplayScale: 1,
};
