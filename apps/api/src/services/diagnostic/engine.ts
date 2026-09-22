import {
  AXES,
  LEVEL_LABELS,
  MATURITY_BANDS,
  QUESTIONS,
  RECOMMENDATIONS,
  RELIABILITY_THRESHOLDS,
  RELIABILITY_WARNING,
} from "./catalog.js";
import {
  DIAGNOSTIC_TEMPLATE_VERSION,
  type AnswerMap,
  type AxisId,
  type CarboScanModule,
  type DiagnosticAnswer,
  type DiagnosticQuestion,
  type DiagnosticSnapshot,
  type FrozenRecommendation,
  type MaturityLevel,
  type MaturityPresentation,
  type ReliabilityLevel,
  type VisibilityKey,
} from "./types.js";

const STRUCTURED_HEADCOUNT = new Set(["50_249", "250_999", "ge1000"]);
const ASSESSMENT_DONE = new Set(["once", "regular", "multi_year"]);
const GOODS_EXPORT_EU = new Set(["goods_eu", "both_eu"]);
const EXPORT_EU = new Set(["services_eu", "goods_eu", "both_eu"]);

export function choiceValue(answers: AnswerMap, code: string): string | null {
  const answer = answers[code];
  if (!answer || answer.kind !== "choice") return null;
  return answer.value;
}

export function isVisible(code: string, answers: AnswerMap): boolean {
  const question = QUESTIONS.find((item) => item.code === code);
  if (!question) return false;
  return matchesVisibility(question.visibility, answers);
}

export function shownQuestions(answers: AnswerMap): DiagnosticQuestion[] {
  return QUESTIONS.filter((question) => matchesVisibility(question.visibility, answers));
}

export function evaluateDiagnostic(answers: AnswerMap): DiagnosticSnapshot {
  const shown = shownQuestions(answers);
  const shownCodes = new Set(shown.map((question) => question.code));
  const axisScores = AXES.map((axis) => ({
    axisId: axis.id,
    maturity: scoreAxis(axis.id, shown, answers),
  }));
  const maturityScore = ratio(
    shown.filter((question) => question.maturityMax != null),
    answers,
    "maturity",
  );
  const dataReadinessScore = ratio(
    shown.filter((question) => question.dataMax != null),
    answers,
    "data",
  );
  const unknownStats = countUnknowns(shown, answers);
  const reliability = reliabilityLevel(unknownStats.count, unknownStats.ratio, dataReadinessScore);
  const reliabilityLimited = reliability === "low";
  const level = maturityScore == null ? null : maturityLevel(maturityScore);
  const recommendations = freezeRecommendations(answers, shownCodes, maturityScore);
  const rankedAxes = axisScores
    .filter((axis): axis is { axisId: AxisId; maturity: number } => axis.maturity != null)
    .slice()
    .sort((a, b) => b.maturity - a.maturity || a.axisId.localeCompare(b.axisId));
  const strengths = rankedAxes.filter((axis) => axis.maturity >= 60).slice(0, 3).map((axis) => axis.axisId);
  const weaknesses = rankedAxes
    .slice()
    .reverse()
    .filter((axis) => axis.maturity < 60)
    .slice(0, 3)
    .map((axis) => axis.axisId);

  return {
    templateVersion: DIAGNOSTIC_TEMPLATE_VERSION,
    maturityScore,
    maturityLevel: level,
    presentation: presentMaturity(level, reliabilityLimited),
    dataReadinessScore,
    reliability,
    reliabilityLimited,
    unknownCount: unknownStats.count,
    unknownRatio: unknownStats.ratio,
    axisScores,
    strengths,
    weaknesses,
    recommendations,
    roadmap: {
      now: recommendations.filter((item) => item.priority === "high").map((item) => item.id),
      months0to3: recommendations.filter((item) => item.priority === "medium").map((item) => item.id),
      months3to12: recommendations.filter((item) => item.priority === "low").map((item) => item.id),
    },
    shownQuestionCodes: shown.map((question) => question.code),
    internal: qualifyLead(answers, maturityScore, dataReadinessScore, recommendations),
  };
}

function matchesVisibility(key: VisibilityKey, answers: AnswerMap): boolean {
  const assessment = choiceValue(answers, "carbon_assessment_status");
  const employees = choiceValue(answers, "employees");
  const industrialSite = choiceValue(answers, "has_industrial_site") === "yes";
  const assessmentExists = assessment != null && ASSESSMENT_DONE.has(assessment);
  const scope3Slot =
    assessmentExists &&
    (industrialSite || (employees != null && STRUCTURED_HEADCOUNT.has(employees)));
  const exportStatus = choiceValue(answers, "export_status");
  const cbamSlot = exportStatus != null && GOODS_EXPORT_EU.has(exportStatus);
  switch (key) {
    case "always":
      return true;
    case "assessment_exists":
      return assessmentExists;
    case "industrial_site":
      return industrialSite;
    case "no_industrial_site":
      return choiceValue(answers, "has_industrial_site") === "no";
    case "has_fleet":
      return choiceValue(answers, "has_fleet") === "yes";
    case "no_fleet":
      return choiceValue(answers, "has_fleet") === "no";
    case "scope3_slot":
      return scope3Slot;
    case "review_slot":
      return !scope3Slot;
    case "cbam_slot":
      return cbamSlot;
    case "reporting_slot":
      return !cbamSlot;
    default:
      return false;
  }
}

function presentMaturity(level: MaturityLevel | null, reliabilityLimited: boolean): MaturityPresentation {
  const levelLabelFr = level ? LEVEL_LABELS[level].fr : null;
  const levelLabelEn = level ? LEVEL_LABELS[level].en : null;
  const warningFr = reliabilityLimited ? RELIABILITY_WARNING.fr : null;
  const warningEn = reliabilityLimited ? RELIABILITY_WARNING.en : null;
  return {
    scoreQualifierFr: reliabilityLimited ? "Maturité estimée" : "Maturité",
    scoreQualifierEn: reliabilityLimited ? "Estimated maturity" : "Maturity",
    level,
    levelLabelFr,
    levelLabelEn,
    reliabilityWarningFr: warningFr,
    reliabilityWarningEn: warningEn,
    displayLevelFr: levelLabelFr && warningFr ? `${levelLabelFr}. ${warningFr}` : levelLabelFr ?? warningFr,
    displayLevelEn: levelLabelEn && warningEn ? `${levelLabelEn}. ${warningEn}` : levelLabelEn ?? warningEn,
  };
}

function scoreAxis(axisId: AxisId, shown: DiagnosticQuestion[], answers: AnswerMap): number | null {
  return ratio(
    shown.filter((question) => question.axisId === axisId && question.maturityMax != null),
    answers,
    "maturity",
  );
}

function ratio(
  questions: DiagnosticQuestion[],
  answers: AnswerMap,
  mode: "maturity" | "data",
): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const question of questions) {
    const max = mode === "maturity" ? question.maturityMax : question.dataMax;
    if (max == null) continue;
    const answer = answers[question.code];
    if (!answer) continue;
    if (mode === "maturity" && answer.kind === "unknown" && question.unknownExcludesMaturity) continue;
    const points = mode === "maturity" ? maturityPoints(question, answer) : dataPoints(question, answer);
    numerator += points * question.weight;
    denominator += max * question.weight;
  }
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function maturityPoints(question: DiagnosticQuestion, answer: DiagnosticAnswer): number {
  if (answer.kind === "unknown" || answer.kind === "number") return 0;
  if (answer.kind === "choice") {
    return question.options.find((option) => option.value === answer.value)?.maturity ?? 0;
  }
  return answer.values.reduce((sum, value) => {
    const option = question.options.find((item) => item.value === value);
    return sum + (option?.maturity ?? 0);
  }, 0);
}

function dataPoints(question: DiagnosticQuestion, answer: DiagnosticAnswer): number {
  if (answer.kind === "unknown") return 0;
  if (answer.kind === "number") return Number.isFinite(answer.value) && answer.value > 0 ? 2 : 0;
  if (answer.kind === "choice") {
    return question.options.find((option) => option.value === answer.value)?.data ?? 0;
  }
  return 0;
}

function countUnknowns(
  shown: DiagnosticQuestion[],
  answers: AnswerMap,
): { count: number; ratio: number | null } {
  const scored = shown.filter((question) => question.maturityMax != null);
  let answered = 0;
  let unknown = 0;
  for (const question of scored) {
    const answer = answers[question.code];
    if (!answer) continue;
    answered += 1;
    if (answer.kind === "unknown") unknown += 1;
  }
  return { count: unknown, ratio: answered === 0 ? null : unknown / answered };
}

function reliabilityLevel(
  unknownCount: number,
  unknownRatio: number | null,
  dataScore: number | null,
): ReliabilityLevel {
  const ratio = unknownRatio ?? 0;
  const data = dataScore ?? 0;
  if (
    unknownCount >= RELIABILITY_THRESHOLDS.lowUnknownCount ||
    ratio >= RELIABILITY_THRESHOLDS.lowUnknownRatio ||
    data < RELIABILITY_THRESHOLDS.lowDataReadiness
  ) {
    return "low";
  }
  if (
    unknownCount >= RELIABILITY_THRESHOLDS.mediumUnknownCount ||
    ratio >= RELIABILITY_THRESHOLDS.mediumUnknownRatio ||
    data < RELIABILITY_THRESHOLDS.mediumDataReadiness
  ) {
    return "medium";
  }
  return "high";
}

function maturityLevel(score: number): MaturityLevel {
  const band = MATURITY_BANDS.find((item) => score <= item.max);
  return band?.level ?? "advanced";
}

function freezeRecommendations(
  answers: AnswerMap,
  visible: Set<string>,
  maturityScore: number | null,
): FrozenRecommendation[] {
  const matched = RECOMMENDATIONS.filter((rule) => rule.id !== "maintain_cycle" && rule.when(answers, { visible }));
  if ((maturityScore ?? 0) >= 80 && matched.every((rule) => rule.priority !== "high")) {
    const keep = RECOMMENDATIONS.find((rule) => rule.id === "maintain_cycle");
    if (keep) matched.push(keep);
  }
  const rank = { high: 0, medium: 1, low: 2 };
  return matched
    .slice()
    .sort((a, b) => rank[a.priority] - rank[b.priority])
    .slice(0, 3)
    .map((rule) => ({
      id: rule.id,
      axisId: rule.axisId,
      priority: rule.priority,
      module: resolveModule(rule, choiceValue(answers, "sector"), choiceValue(answers, "has_industrial_site") === "yes"),
      titleFr: rule.titleFr,
      titleEn: rule.titleEn,
      bodyFr: rule.bodyFr,
      bodyEn: rule.bodyEn,
    }));
}

function resolveModule(
  rule: { module: CarboScanModule; moduleIfSector?: Partial<Record<string, CarboScanModule>>; moduleIfIndustrialSite?: CarboScanModule },
  sector: string | null,
  industrialSite: boolean,
): CarboScanModule {
  if (industrialSite && rule.moduleIfIndustrialSite) return rule.moduleIfIndustrialSite;
  if (sector && rule.moduleIfSector?.[sector]) return rule.moduleIfSector[sector];
  return rule.module;
}

function qualifyLead(
  answers: AnswerMap,
  maturityScore: number | null,
  dataScore: number | null,
  recommendations: FrozenRecommendation[],
) {
  const employees = choiceValue(answers, "employees");
  const exportStatus = choiceValue(answers, "export_status");
  const exportEu = exportStatus != null && EXPORT_EU.has(exportStatus);
  const goodsExportEu = exportStatus != null && GOODS_EXPORT_EU.has(exportStatus);
  const contractual = choiceValue(answers, "client_requirements") === "contractual";
  const noInventory = choiceValue(answers, "carbon_assessment_status") === "never";
  const sizeWeight: Record<string, number> = { lt10: 5, "10_49": 15, "50_249": 25, "250_999": 35, ge1000: 40 };
  let lead = employees ? sizeWeight[employees] ?? 0 : 0;
  if (noInventory) lead += 20;
  if ((dataScore ?? 100) < 40) lead += 15;
  if (exportEu) lead += 15;
  if (contractual) lead += 15;
  if ((maturityScore ?? 100) < 40) lead += 10;
  const commercialPotential: "low" | "medium" | "high" =
    lead >= 55 ? "high" : lead >= 30 ? "medium" : "low";
  return {
    leadScore: Math.min(100, lead),
    companySize: employees,
    commercialPotential,
    urgentNeed: noInventory && (exportEu || contractual),
    regulatoryPressure: goodsExportEu || contractual,
    exportEu,
    needsConsulting: (maturityScore ?? 0) < 40 && employees !== "lt10" && employees != null,
    recommendedModule: recommendations[0]?.module ?? null,
  };
}
