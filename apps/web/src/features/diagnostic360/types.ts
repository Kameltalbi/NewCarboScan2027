export type DiagnosticAnswer =
  | { kind: "choice"; value: string }
  | { kind: "multi"; values: string[] }
  | { kind: "unknown" }
  | { kind: "number"; value: number };

export type PublicQuestion = {
  code: string;
  type: "single" | "multi" | "number";
  labelFr: string;
  labelEn: string;
  axisId: string | null;
  axisLabelFr: string | null;
  axisLabelEn: string | null;
  options: Array<{ value: string; labelFr: string; labelEn: string }>;
};

export type DiagnosticProgress = { answered: number; total: number };

export type FrozenRecommendation = {
  id: string;
  axisId: string;
  priority: "high" | "medium" | "low";
  module: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
};

export type AxisScore = { axisId: string; maturity: number | null };

export type MaturityPresentation = {
  scoreQualifierFr: string;
  scoreQualifierEn: string;
  level: string | null;
  levelLabelFr: string | null;
  levelLabelEn: string | null;
  reliabilityWarningFr: string | null;
  reliabilityWarningEn: string | null;
  displayLevelFr: string | null;
  displayLevelEn: string | null;
};

export type PublicSnapshot = {
  templateVersion: string;
  maturityScore: number | null;
  maturityLevel: string | null;
  presentation: MaturityPresentation;
  dataReadinessScore: number | null;
  reliability: "high" | "medium" | "low";
  reliabilityLimited: boolean;
  axisScores: AxisScore[];
  recommendations: FrozenRecommendation[];
  roadmap?: {
    now: string[];
    months0to3: string[];
    months3to12: string[];
  };
  applicableAnswers: Record<string, DiagnosticAnswer>;
};

export type SessionView = {
  sessionId: string;
  templateVersion: string;
  status: "in_progress" | "completed" | "abandoned";
  language: string;
  shownQuestions: PublicQuestion[];
  answers: Record<string, DiagnosticAnswer>;
  progress: DiagnosticProgress;
  completedAt?: string | null;
  result: PublicSnapshot | null;
};

export type OrgDiagnosticSummary = {
  sessionId: string;
  templateVersion: string;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  maturityScore: number | null;
  dataReadinessScore: number | null;
  reliability: "high" | "medium" | "low" | null;
  maturityLevel: string | null;
  displayLevelFr: string | null;
  reliabilityLimited: boolean | null;
};

export type CreatedSession = SessionView & { resumeToken: string };
