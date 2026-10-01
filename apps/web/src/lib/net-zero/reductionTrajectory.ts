/**
 * Trajectoire de réduction du bilan (ABC-07).
 * La courbe n'existe que si l'année de référence, les émissions, l'année cible
 * et le pourcentage sont enregistrés. Aucun pourcentage n'est substitué.
 * La trajectoire de référence reprend la droite déjà calculée par
 * NetZeroTrajectoryCalculator. Une trajectoire nommée (SBTi ou autre)
 * reste À VALIDER ABC.
 * Les jalons personnalisés sont ceux saisis. Les actions ne sont pas soustraites.
 */
import { NetZeroTrajectoryCalculator } from "./NetZeroTrajectoryCalculator";

export type TrajectoryKind = "reference" | "personalized";

export interface IntermediateTarget {
  year: number;
  reductionPercent: number;
}

export interface ReductionTrajectoryInput {
  referenceYear: number | null;
  referenceEmissionsT: number | null;
  targetYear: number | null;
  reductionPercent: number | null;
  kind: TrajectoryKind | null;
  intermediates: IntermediateTarget[];
  actuals: Array<{ year: number; emissionsT: number }>;
}

export interface TrajectoryPoint {
  year: number;
  targetT: number;
  actualT: number | null;
}

export interface ReductionTrajectory {
  status: "empty" | "ready";
  kind: TrajectoryKind | null;
  points: TrajectoryPoint[];
}

function finite(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(Number(value));
}

export function buildReductionTrajectory(input: ReductionTrajectoryInput): ReductionTrajectory {
  const kind = input.kind === "personalized" ? "personalized" : input.kind === "reference" ? "reference" : null;
  const empty: ReductionTrajectory = { status: "empty", kind, points: [] };

  if (
    !finite(input.referenceYear) ||
    !finite(input.referenceEmissionsT) ||
    !finite(input.targetYear) ||
    !finite(input.reductionPercent)
  ) {
    return empty;
  }

  const referenceYear = Math.trunc(input.referenceYear);
  const targetYear = Math.trunc(input.targetYear);
  const referenceEmissionsT = Number(input.referenceEmissionsT);
  const reductionPercent = Number(input.reductionPercent);

  if (targetYear <= referenceYear) return empty;
  if (referenceEmissionsT <= 0) return empty;
  if (reductionPercent < 0 || reductionPercent > 100) return empty;

  const intermediates = [...input.intermediates]
    .map((item) => ({
      year: Math.trunc(Number(item.year)),
      reductionPercent: Number(item.reductionPercent),
    }))
    .filter((item) => Number.isFinite(item.year) && Number.isFinite(item.reductionPercent));

  if (kind === "personalized") {
    const years = new Set<number>();
    for (const item of intermediates) {
      if (item.year <= referenceYear || item.year >= targetYear) return empty;
      if (item.reductionPercent < 0 || item.reductionPercent > 100) return empty;
      if (years.has(item.year)) return empty;
      years.add(item.year);
    }
  }

  const actualByYear = new Map<number, number>();
  for (const actual of input.actuals) {
    if (!finite(actual.year) || !finite(actual.emissionsT)) continue;
    actualByYear.set(Math.trunc(actual.year), Number(actual.emissionsT));
  }

  const linear = NetZeroTrajectoryCalculator.calculateLinearTrajectory(
    referenceYear,
    referenceEmissionsT,
    targetYear,
    reductionPercent,
  );

  const targets = kind === "personalized" && intermediates.length > 0
    ? piecewiseTargets(referenceYear, referenceEmissionsT, targetYear, reductionPercent, intermediates)
    : linear.map((point) => point.target_emissions);

  const points: TrajectoryPoint[] = [];
  for (let index = 0; index <= targetYear - referenceYear; index += 1) {
    const year = referenceYear + index;
    points.push({
      year,
      targetT: targets[index] ?? linear[index]?.target_emissions ?? 0,
      actualT: actualByYear.has(year) ? actualByYear.get(year)! : null,
    });
  }

  return { status: "ready", kind: kind ?? "reference", points };
}

function piecewiseTargets(
  referenceYear: number,
  referenceEmissionsT: number,
  targetYear: number,
  reductionPercent: number,
  intermediates: IntermediateTarget[],
): number[] {
  const anchors = [
    { year: referenceYear, emissionsT: referenceEmissionsT },
    ...intermediates
      .slice()
      .sort((a, b) => a.year - b.year)
      .map((item) => ({
        year: item.year,
        emissionsT: referenceEmissionsT * (1 - item.reductionPercent / 100),
      })),
    {
      year: targetYear,
      emissionsT: referenceEmissionsT * (1 - reductionPercent / 100),
    },
  ];

  const targets: number[] = [];
  for (let year = referenceYear; year <= targetYear; year += 1) {
    let left = anchors[0];
    let right = anchors[anchors.length - 1];
    for (let i = 0; i < anchors.length - 1; i += 1) {
      if (year >= anchors[i].year && year <= anchors[i + 1].year) {
        left = anchors[i];
        right = anchors[i + 1];
        break;
      }
    }
    const span = right.year - left.year;
    const ratio = span === 0 ? 0 : (year - left.year) / span;
    targets.push(left.emissionsT + (right.emissionsT - left.emissionsT) * ratio);
  }
  return targets;
}

export function latestActualByYear(
  rows: Array<{ year: number | null; emissionsT: number | null; updatedAt?: string | null }>,
): Array<{ year: number; emissionsT: number }> {
  const byYear = new Map<number, { emissionsT: number; updatedAt: string }>();
  for (const row of rows) {
    if (row.year == null || row.emissionsT == null) continue;
    const year = Math.trunc(Number(row.year));
    const emissionsT = Number(row.emissionsT);
    if (!Number.isFinite(year) || !Number.isFinite(emissionsT) || emissionsT <= 0) continue;
    const updatedAt = row.updatedAt ?? "";
    const current = byYear.get(year);
    if (!current || updatedAt >= current.updatedAt) {
      byYear.set(year, { emissionsT, updatedAt });
    }
  }
  return [...byYear.entries()]
    .map(([year, value]) => ({ year, emissionsT: value.emissionsT }))
    .sort((a, b) => a.year - b.year);
}
