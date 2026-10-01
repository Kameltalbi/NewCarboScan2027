/**
 * Construction des séries du graphique Transition.
 * Aucune année inventée. Courbe 1,5 °C uniquement depuis un snapshot versionné.
 */
import { NetZeroTrajectoryCalculator } from "@/lib/net-zero/NetZeroTrajectoryCalculator";
import type {
  ClimateObjective,
  ClimateReferenceTrajectory,
  TransitionChartPoint,
  TrajectoryAlignment,
} from "../types";

export function resolveTargetEmissions(objective: ClimateObjective): number | null {
  if (objective.target_value != null && Number.isFinite(Number(objective.target_value))) {
    return Number(objective.target_value);
  }
  if (
    objective.baseline_value != null &&
    objective.reduction_percent != null &&
    Number.isFinite(Number(objective.baseline_value)) &&
    Number.isFinite(Number(objective.reduction_percent))
  ) {
    return Number(objective.baseline_value) * (1 - Number(objective.reduction_percent) / 100);
  }
  return null;
}

export function buildCompanyTargetSeries(
  objective: ClimateObjective | null,
): Array<{ year: number; value: number }> {
  if (!objective) return [];
  const baseline = objective.baseline_value;
  const reduction = objective.reduction_percent;
  if (baseline == null || reduction == null) {
    const target = resolveTargetEmissions(objective);
    if (target == null || objective.baseline_value == null) return [];
    const points = NetZeroTrajectoryCalculator.calculateLinearTrajectory(
      objective.baseline_year,
      Number(objective.baseline_value),
      objective.target_year,
      ((Number(objective.baseline_value) - target) / Number(objective.baseline_value)) * 100,
    );
    return points.map((p) => ({ year: p.year, value: p.target_emissions }));
  }
  return NetZeroTrajectoryCalculator.calculateLinearTrajectory(
    objective.baseline_year,
    Number(baseline),
    objective.target_year,
    Number(reduction),
  ).map((p) => ({ year: p.year, value: p.target_emissions }));
}

export function buildReferenceSeries(
  trajectory: ClimateReferenceTrajectory | null,
): Array<{ year: number; emissionsT: number }> {
  if (!trajectory) return [];
  const points = Array.isArray(trajectory.annual_points) ? trajectory.annual_points : [];
  return points
    .map((p) => ({
      year: Number(p.year),
      emissionsT: Number(
        (p as { emissionsT?: number }).emissionsT ??
          (p as { emissions_t?: number }).emissions_t,
      ),
    }))
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.emissionsT));
}

export function mergeTransitionSeries(input: {
  actuals: Array<{ year: number; emissionsT: number }>;
  companyObjective: ClimateObjective | null;
  scenarioByYear: Array<{ year: number; emissionsT: number }>;
  reference15Enabled: boolean;
  reference15ByYear: Array<{ year: number; emissionsT: number }>;
}): TransitionChartPoint[] {
  const years = new Set<number>();
  for (const a of input.actuals) years.add(a.year);
  for (const s of input.scenarioByYear) years.add(s.year);
  for (const r of input.reference15ByYear) years.add(r.year);

  const companySeries = buildCompanyTargetSeries(input.companyObjective);
  for (const p of companySeries) years.add(p.year);

  if (input.companyObjective) {
    years.add(input.companyObjective.baseline_year);
    years.add(input.companyObjective.target_year);
  }

  const actualMap = new Map(input.actuals.map((a) => [a.year, a.emissionsT]));
  const companyMap = new Map(companySeries.map((p) => [p.year, p.value]));
  const scenarioMap = new Map(input.scenarioByYear.map((s) => [s.year, s.emissionsT]));
  const refMap = input.reference15Enabled
    ? new Map(input.reference15ByYear.map((r) => [r.year, r.emissionsT]))
    : new Map<number, number>();

  return [...years]
    .sort((a, b) => a - b)
    .map((year) => ({
      year,
      actual: actualMap.has(year) ? actualMap.get(year)! : null,
      companyTarget: companyMap.has(year) ? companyMap.get(year)! : null,
      scenario: scenarioMap.has(year) ? scenarioMap.get(year)! : null,
      reference15: refMap.has(year) ? refMap.get(year)! : null,
    }));
}

export function computeSeriesAlignment(
  actuals: Array<{ year: number; emissionsT: number }>,
  targetByYear: Array<{ year: number; value: number }>,
  tolerancePct = 2,
): {
  status: TrajectoryAlignment;
  gapT: number | null;
  gapPct: number | null;
  year: number | null;
  needsNextExercise: boolean;
} {
  if (actuals.length === 0 || targetByYear.length === 0) {
    return {
      status: "unknown",
      gapT: null,
      gapPct: null,
      year: null,
      needsNextExercise: false,
    };
  }

  const latest = [...actuals].sort((a, b) => b.year - a.year)[0];
  const targetPoint = targetByYear.find((p) => p.year === latest.year);
  if (!targetPoint) {
    return {
      status: "unknown",
      gapT: null,
      gapPct: null,
      year: latest.year,
      needsNextExercise: false,
    };
  }

  const minTargetYear = Math.min(...targetByYear.map((p) => p.year));
  const onlyBaselineActual = actuals.length === 1 && latest.year === minTargetYear;

  const gap = latest.emissionsT - targetPoint.value;
  const tol = (Math.abs(targetPoint.value) * tolerancePct) / 100;
  const gapPct =
    Math.abs(targetPoint.value) > 0 ? (gap / targetPoint.value) * 100 : null;

  if (onlyBaselineActual) {
    return {
      status: "on_track",
      gapT: gap,
      gapPct,
      year: latest.year,
      needsNextExercise: true,
    };
  }

  if (Math.abs(gap) <= tol) {
    return {
      status: "on_track",
      gapT: gap,
      gapPct,
      year: latest.year,
      needsNextExercise: false,
    };
  }
  if (gap > 0) {
    return {
      status: "above",
      gapT: gap,
      gapPct,
      year: latest.year,
      needsNextExercise: false,
    };
  }
  return {
    status: "ahead",
    gapT: gap,
    gapPct,
    year: latest.year,
    needsNextExercise: false,
  };
}

export function computeAlignment(
  actuals: Array<{ year: number; emissionsT: number }>,
  companyObjective: ClimateObjective | null,
  tolerancePct = 2,
): { status: TrajectoryAlignment; gapT: number | null; year: number | null } {
  const series = buildCompanyTargetSeries(companyObjective).map((p) => ({
    year: p.year,
    value: p.value,
  }));
  const r = computeSeriesAlignment(actuals, series, tolerancePct);
  return { status: r.status, gapT: r.gapT, year: r.year };
}

export function computeReferenceAlignment(
  actuals: Array<{ year: number; emissionsT: number }>,
  trajectory: ClimateReferenceTrajectory | null,
  tolerancePct = 2,
) {
  const series = buildReferenceSeries(trajectory).map((p) => ({
    year: p.year,
    value: p.emissionsT,
  }));
  return computeSeriesAlignment(actuals, series, tolerancePct);
}

export function alignmentLabel(status: TrajectoryAlignment): string {
  switch (status) {
    case "on_track":
      return "Sur la trajectoire";
    case "above":
      return "Écart à réduire";
    case "ahead":
      return "En avance";
    default:
      return "Données insuffisantes";
  }
}
