export const DIAGNOSTIC_TEMPLATE_VERSION = "diag-360-2026.1";

export type AxisId =
  | "measure"
  | "energy"
  | "mobility"
  | "purchases"
  | "steering"
  | "governance";

export type MaturityLevel =
  | "initial"
  | "starting"
  | "structuring"
  | "managed"
  | "advanced";

export type ReliabilityLevel = "high" | "medium" | "low";

export type Priority = "high" | "medium" | "low";

export type CarboScanModule =
  | "bilan"
  | "collect"
  | "history"
  | "pcf"
  | "pcaf"
  | "wattbim"
  | "cbam"
  | "contact";

export type VisibilityKey =
  | "always"
  | "assessment_exists"
  | "industrial_site"
  | "no_industrial_site"
  | "has_fleet"
  | "no_fleet"
  | "scope3_slot"
  | "review_slot"
  | "cbam_slot"
  | "reporting_slot";

export type ChoiceAnswer = { kind: "choice"; value: string };
export type MultiAnswer = { kind: "multi"; values: string[] };
export type UnknownAnswer = { kind: "unknown" };
export type NumberAnswer = { kind: "number"; value: number };
export type DiagnosticAnswer = ChoiceAnswer | MultiAnswer | UnknownAnswer | NumberAnswer;
export type AnswerMap = Record<string, DiagnosticAnswer>;

export type QuestionOption = {
  value: string;
  maturity: number | null;
  data: number | null;
  labelFr: string;
  labelEn: string;
};

export type DiagnosticQuestion = {
  code: string;
  axisId: AxisId | null;
  type: "single" | "multi" | "number";
  weight: number;
  /** Max maturity points before weight. Null = not a maturity question. */
  maturityMax: number | null;
  /** Max data-readiness points before weight. Null = not a data question. */
  dataMax: number | null;
  /** Unknown drops the question from the maturity ratio. */
  unknownExcludesMaturity: boolean;
  visibility: VisibilityKey;
  options: QuestionOption[];
  labelFr: string;
  labelEn: string;
};

export type RecommendationRule = {
  id: string;
  axisId: AxisId;
  priority: Priority;
  module: CarboScanModule;
  /** Stable name of the rule condition, locked with the SQL seed. */
  conditionKey: string;
  /** When set, module becomes this value if the sector matches. */
  moduleIfSector?: Partial<Record<string, CarboScanModule>>;
  /** When the profile declares a production site, workshop or technical installation. */
  moduleIfIndustrialSite?: CarboScanModule;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  when: (answers: AnswerMap, ctx: { visible: Set<string> }) => boolean;
};

export type FrozenRecommendation = {
  id: string;
  axisId: AxisId;
  priority: Priority;
  module: CarboScanModule;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
};

export type AxisScore = {
  axisId: AxisId;
  maturity: number | null;
};

export type MaturityPresentation = {
  /** "Maturité estimée" when reliability is limited. */
  scoreQualifierFr: "Maturité estimée" | "Maturité";
  scoreQualifierEn: "Estimated maturity" | "Maturity";
  level: MaturityLevel | null;
  levelLabelFr: string | null;
  levelLabelEn: string | null;
  /** Present whenever the level must not be shown on its own. */
  reliabilityWarningFr: string | null;
  reliabilityWarningEn: string | null;
  /** String to display for the level. Includes the warning when reliability is limited. */
  displayLevelFr: string | null;
  displayLevelEn: string | null;
};

export type DiagnosticSnapshot = {
  templateVersion: string;
  maturityScore: number | null;
  maturityLevel: MaturityLevel | null;
  presentation: MaturityPresentation;
  dataReadinessScore: number | null;
  reliability: ReliabilityLevel;
  reliabilityLimited: boolean;
  unknownCount: number;
  unknownRatio: number | null;
  axisScores: AxisScore[];
  strengths: AxisId[];
  weaknesses: AxisId[];
  recommendations: FrozenRecommendation[];
  roadmap: {
    now: string[];
    months0to3: string[];
    months3to12: string[];
  };
  shownQuestionCodes: string[];
  internal: {
    leadScore: number;
    companySize: string | null;
    commercialPotential: "low" | "medium" | "high";
    urgentNeed: boolean;
    regulatoryPressure: boolean;
    exportEu: boolean;
    needsConsulting: boolean;
    recommendedModule: CarboScanModule | null;
  };
};
