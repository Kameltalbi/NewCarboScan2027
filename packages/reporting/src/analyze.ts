import { d } from "@newcarboscan/carbon-engine";
import { factorTimeStatus, type FactorTimeStatus } from "./factorTime.js";
import { exact, tonnesFromKg } from "./format.js";
import type {
  ActivityLine,
  AnalysisOptions,
  DataQuality,
  ReportData,
  Scope,
} from "./types.js";

export interface Share {
  exactPct: string;
  displayPct: string;
}

export interface RankedLine {
  id: string;
  factId: string;
  label: string;
  scope: Scope;
  site: string | null;
  category: string;
  kgCo2e: string;
  tonnes: string;
  share: Share;
  cumulative: Share;
  significant: boolean;
  quantity: string;
  quantityUnit: string;
  factorValue: string;
  factorUnit: string;
  factorSource: string;
  factorVersion: string;
  factorId: string;
  dataQuality: DataQuality;
  method: ActivityLine["method"];
  uncertaintyPct: string | null;
  factorTime: FactorTimeStatus;
}

export interface ScopeResult {
  scope: Scope;
  status: "reported" | "not_reported";
  kgCo2e: string | null;
  tonnes: string | null;
  share: Share | null;
}

export interface IntensityResult {
  id: string;
  label: string;
  proseLabel: string;
  displayUnit: string;
  status: "computed" | "not_available";
  reason: string | null;
  exact: string | null;
  /** Arrondi fin, réservé à l'annexe. */
  display: string | null;
  /** Arrondi de lecture, utilisé dans le corps du rapport. */
  executiveDisplay: string | null;
  denominator: string | null;
}

export interface QualitySlice {
  quality: DataQuality;
  status: "reported" | "not_reported";
  kgCo2e: string | null;
  tonnes: string | null;
  share: Share | null;
}

export interface ActionResult {
  id: string;
  title: string;
  text: string;
  quantified: boolean;
  horizon: string;
  indicator: string;
  /** Poste de l'hypothèse, lorsqu'elle en désigne un. */
  lineId: string | null;
  lineLabel: string | null;
  shareDisplayPct: string | null;
  potentialKgCo2e: string | null;
  potentialTonnes: string | null;
}

export interface Analysis {
  totalKgCo2e: string;
  totalTonnes: string;
  scopes: ScopeResult[];
  scopeShareSumDisplayPct: string;
  scopeShareResidualDisplayPct: string;
  ranked: RankedLine[];
  zeros: RankedLine[];
  significant: RankedLine[];
  significantCoverage: Share | null;
  thresholdDisplayPct: string;
  coverageTargetDisplayPct: string;
  intensities: IntensityResult[];
  quality: QualitySlice[];
  qualityShareSumDisplayPct: string | null;
  comparison: {
    status: "available" | "not_available" | "not_comparable" | "rate_not_available";
    priorYear: number | null;
    priorTonnes: string | null;
    rateDisplayPct: string | null;
    basis: string | null;
  };
  actions: ActionResult[];
}

/**
 * Sommes, parts, intensités et classements à partir des résultats déjà déclarés.
 * Une ligne incluse doit vérifier quantité × facteur = résultat. En cas d'écart, on s'arrête.
 */
export function analyze(data: ReportData, options: AnalysisOptions): Analysis {
  for (const line of data.lines) assertLineIdentity(line);

  const included = data.lines.filter((line) => line.inclusion === "included");
  const total = included.reduce((sum, line) => sum.plus(d(line.resultKgCo2e!)), d(0));
  const totalKgCo2e = exact(total);
  const scale = options.shareDisplayScale;
  const totalIsZero = total.isZero();

  const scopes = ([1, 2, 3] as const).map((scope) =>
    scopeResult(included, scope, total, scale, totalIsZero),
  );
  const scopeShares = scopes.flatMap((scope) => (scope.share ? [d(scope.share.displayPct)] : []));
  const scopeSum = scopeShares.reduce((sum, value) => sum.plus(value), d(0));
  const scopeShareSumDisplayPct = scopeSum.toFixed(scale);
  const scopeShareResidualDisplayPct = scopeSum.minus(100).toFixed(scale);

  const rankedSource = included
    .filter((line) => d(line.resultKgCo2e!).gt(0))
    .sort((a, b) => d(b.resultKgCo2e!).cmp(d(a.resultKgCo2e!)));
  const zeroSource = included.filter((line) => d(line.resultKgCo2e!).isZero());

  let running = d(0);
  const ranked = rankedSource.map((line) => {
    running = running.plus(d(line.resultKgCo2e!));
    return toRanked(line, total, running, options, totalIsZero, data.inventory.year);
  });
  const zeros = zeroSource.map((line) => toRanked(line, total, running, options, totalIsZero, data.inventory.year));
  const significant = ranked.filter((line) => line.significant);
  const significantKg = significant.reduce((sum, line) => sum.plus(d(line.kgCo2e)), d(0));
  const significantCoverage = totalIsZero
    ? null
    : shareOf(exact(significantKg), total, scale);

  const quality = (["primary", "estimated", "default"] as const).map((quality) =>
    qualitySlice(included, quality, total, scale, totalIsZero),
  );
  const qualityShares = quality.flatMap((slice) => (slice.share ? [d(slice.share.displayPct)] : []));
  const qualitySum = qualityShares.reduce((sum, value) => sum.plus(value), d(0));

  return {
    totalKgCo2e,
    totalTonnes: tonnesFromKg(totalKgCo2e),
    scopes,
    scopeShareSumDisplayPct,
    scopeShareResidualDisplayPct,
    ranked,
    zeros,
    significant,
    significantCoverage,
    thresholdDisplayPct: exact(d(options.significantShareMin).mul(100)),
    coverageTargetDisplayPct: exact(d(options.cumulativeCoverageTarget).mul(100)),
    intensities: data.denominators.map((item) => intensityOf(item, total)),
    quality,
    qualityShareSumDisplayPct: qualityShares.length === 0 ? null : qualitySum.toFixed(scale),
    comparison: comparisonOf(data, total),
    actions: data.actions.map((action) => actionOf(action, included)),
  };
}

function assertLineIdentity(line: ActivityLine): void {
  if (line.inclusion !== "included") {
    if (line.resultKgCo2e !== null) {
      throw new Error(`${line.id}: résultat présent hors ligne incluse`);
    }
    return;
  }
  if (line.quantity == null || line.factorValue == null || line.resultKgCo2e == null || line.dataQuality == null) {
    throw new Error(`${line.id}: ligne incluse incomplète`);
  }
  const expected = d(line.quantity).mul(d(line.factorValue));
  if (!expected.eq(d(line.resultKgCo2e))) {
    throw new Error(
      `${line.id}: ${line.quantity} × ${line.factorValue} = ${exact(expected)}, résultat déclaré ${line.resultKgCo2e}`,
    );
  }
}

function scopeResult(
  included: ActivityLine[],
  scope: Scope,
  total: ReturnType<typeof d>,
  scale: number,
  totalIsZero: boolean,
): ScopeResult {
  const lines = included.filter((line) => line.scope === scope);
  if (lines.length === 0) {
    return { scope, status: "not_reported", kgCo2e: null, tonnes: null, share: null };
  }
  const kg = lines.reduce((sum, line) => sum.plus(d(line.resultKgCo2e!)), d(0));
  const kgCo2e = exact(kg);
  return {
    scope,
    status: "reported",
    kgCo2e,
    tonnes: tonnesFromKg(kgCo2e),
    share: totalIsZero ? null : shareOf(kgCo2e, total, scale),
  };
}

function toRanked(
  line: ActivityLine,
  total: ReturnType<typeof d>,
  running: ReturnType<typeof d>,
  options: AnalysisOptions,
  totalIsZero: boolean,
  exerciseYear: number,
): RankedLine {
  const kgCo2e = line.resultKgCo2e!;
  const ratio = totalIsZero ? d(0) : d(kgCo2e).div(total);
  return {
    id: line.id,
    factId: line.factId,
    label: line.label,
    scope: line.scope,
    site: line.site,
    category: line.category,
    kgCo2e,
    tonnes: tonnesFromKg(kgCo2e),
    share: totalIsZero
      ? { exactPct: "0", displayPct: d(0).toFixed(options.shareDisplayScale) }
      : shareOf(kgCo2e, total, options.shareDisplayScale),
    cumulative: totalIsZero
      ? { exactPct: "0", displayPct: d(0).toFixed(options.shareDisplayScale) }
      : shareOf(exact(running), total, options.shareDisplayScale),
    significant: !totalIsZero && ratio.gte(d(options.significantShareMin)),
    quantity: line.quantity!,
    quantityUnit: line.quantityUnit!,
    factorValue: line.factorValue!,
    factorUnit: line.factorUnit!,
    factorSource: line.factorSource,
    factorVersion: line.factorVersion,
    factorId: line.factorId,
    dataQuality: line.dataQuality!,
    method: line.method,
    uncertaintyPct: line.uncertaintyPct,
    factorTime: factorTimeStatus(line.factorSource, line.factorVersion, exerciseYear),
  };
}

function qualitySlice(
  included: ActivityLine[],
  quality: DataQuality,
  total: ReturnType<typeof d>,
  scale: number,
  totalIsZero: boolean,
): QualitySlice {
  const lines = included.filter((line) => line.dataQuality === quality);
  if (lines.length === 0) {
    return { quality, status: "not_reported", kgCo2e: null, tonnes: null, share: null };
  }
  const kg = lines.reduce((sum, line) => sum.plus(d(line.resultKgCo2e!)), d(0));
  const kgCo2e = exact(kg);
  return {
    quality,
    status: "reported",
    kgCo2e,
    tonnes: tonnesFromKg(kgCo2e),
    share: totalIsZero ? null : shareOf(kgCo2e, total, scale),
  };
}

function intensityOf(item: ReportData["denominators"][number], total: ReturnType<typeof d>): IntensityResult {
  const base = {
    id: item.id,
    label: item.label,
    proseLabel: item.proseLabel,
    displayUnit: item.displayUnit,
    denominator: item.value,
  };
  if (item.value == null) {
    return { ...base, status: "not_available", reason: "Dénominateur non renseigné.", exact: null, display: null, executiveDisplay: null };
  }
  if (d(item.value).isZero()) {
    return { ...base, status: "not_available", reason: "Dénominateur nul.", exact: null, display: null, executiveDisplay: null };
  }
  const value = total.mul(d(item.numerator)).div(d(item.value));
  return {
    ...base,
    status: "computed",
    reason: null,
    exact: exact(value),
    display: value.toFixed(item.displayScale),
    executiveDisplay: value.toFixed(1),
  };
}

function comparisonOf(data: ReportData, total: ReturnType<typeof d>): Analysis["comparison"] {
  const input = data.comparison;
  if (input.status === "not_available" || input.priorYear == null || input.priorTotalKgCo2e == null) {
    return { status: "not_available", priorYear: input.priorYear, priorTonnes: null, rateDisplayPct: null, basis: input.basis };
  }
  if (input.status === "not_comparable") {
    return {
      status: "not_comparable",
      priorYear: input.priorYear,
      priorTonnes: tonnesFromKg(input.priorTotalKgCo2e),
      rateDisplayPct: null,
      basis: input.basis,
    };
  }
  if (d(input.priorTotalKgCo2e).isZero()) {
    return {
      status: "rate_not_available",
      priorYear: input.priorYear,
      priorTonnes: "0",
      rateDisplayPct: null,
      basis: input.basis,
    };
  }
  const rate = total.minus(d(input.priorTotalKgCo2e)).div(d(input.priorTotalKgCo2e)).mul(100);
  return {
    status: "available",
    priorYear: input.priorYear,
    priorTonnes: tonnesFromKg(input.priorTotalKgCo2e),
    rateDisplayPct: rate.toFixed(1),
    basis: input.basis,
  };
}

function actionOf(action: ReportData["actions"][number], included: ActivityLine[]): ActionResult {
  if (!action.hypothesis) {
    return {
      id: action.id,
      title: action.title,
      text: action.text,
      quantified: false,
      horizon: action.horizon,
      indicator: action.indicator,
      lineId: null,
      lineLabel: null,
      shareDisplayPct: null,
      potentialKgCo2e: null,
      potentialTonnes: null,
    };
  }
  const line = included.find((item) => item.id === action.hypothesis!.lineId);
  if (!line) throw new Error(`${action.id}: poste d'hypothèse introuvable`);
  const share = d(action.hypothesis.share);
  if (share.lt(0) || share.gt(1)) throw new Error(`${action.id}: part d'hypothèse hors de 0 à 1`);
  const potential = d(line.resultKgCo2e!).mul(share);
  const potentialKgCo2e = exact(potential);
  return {
    id: action.id,
    title: action.title,
    text: action.text,
    quantified: true,
    horizon: action.horizon,
    indicator: action.indicator,
    lineId: line.id,
    lineLabel: line.label,
    shareDisplayPct: exact(share.mul(100)),
    potentialKgCo2e,
    potentialTonnes: tonnesFromKg(potentialKgCo2e),
  };
}

function shareOf(part: string, total: ReturnType<typeof d>, scale: number): Share {
  const exactPct = exact(d(part).div(total).mul(100));
  return { exactPct, displayPct: d(exactPct).toFixed(scale) };
}
