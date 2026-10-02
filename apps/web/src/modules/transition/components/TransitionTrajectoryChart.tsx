/**
 * Graphique interactif Transition — visualisation uniquement.
 * Aucun calcul SBTi/ACA ici : lit les points déjà produits (snapshots, objectifs, scénarios, réalisé).
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TransitionChartPoint } from "../types";

export interface TrajectoryChartMeta {
  /** Année de référence (trajectoire ou premier réalisé). */
  baselineYear: number | null;
  baselineEmissionsT: number | null;
  /** Année cible de la trajectoire 1,5 °C. */
  targetYear: number | null;
  targetEmissionsT: number | null;
  /** Taux annuel linéaire (dLARR) si disponible. */
  dlarrPercent: number | null;
  onOpenMethod?: () => void;
}

interface Props {
  points: TransitionChartPoint[];
  showActual: boolean;
  showCompany: boolean;
  showScenario: boolean;
  showReference15: boolean;
  meta?: TrajectoryChartMeta | null;
}

const fmt = (n: number, digits = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n);

const fmtOrDash = (n: number | null | undefined, digits = 0) =>
  n == null || !Number.isFinite(n) ? "—" : `${fmt(n, digits)} tCO₂e`;

function nearestYear(years: number[], candidate: number): number {
  if (years.length === 0) return candidate;
  return years.reduce((best, y) =>
    Math.abs(y - candidate) < Math.abs(best - candidate) ? y : best,
  );
}

function reductionVsBaseline(
  value: number | null | undefined,
  baseline: number | null | undefined,
): { pct: number | null; delta: number | null } {
  if (
    value == null ||
    baseline == null ||
    !Number.isFinite(value) ||
    !Number.isFinite(baseline) ||
    baseline <= 0
  ) {
    return { pct: null, delta: null };
  }
  return {
    pct: ((baseline - value) / baseline) * 100,
    delta: baseline - value,
  };
}

export const TransitionTrajectoryChart: React.FC<Props> = ({
  points,
  showActual,
  showCompany,
  showScenario,
  showReference15,
  meta = null,
}) => {
  const years = useMemo(
    () => [...new Set(points.map((p) => p.year))].sort((a, b) => a - b),
    [points],
  );

  const defaultYear = useMemo(() => {
    if (years.length === 0) return null;
    const withActual = [...points].reverse().find((p) => p.actual != null)?.year;
    if (withActual != null) return withActual;
    if (meta?.targetYear != null && years.includes(meta.targetYear)) return meta.targetYear;
    return years[Math.min(years.length - 1, Math.floor(years.length / 2))];
  }, [years, points, meta?.targetYear]);

  const [cursorYear, setCursorYear] = useState<number | null>(defaultYear);

  useEffect(() => {
    if (defaultYear == null) {
      setCursorYear(null);
      return;
    }
    setCursorYear((prev) =>
      prev != null && years.includes(prev) ? prev : defaultYear,
    );
  }, [defaultYear, years]);

  const pointByYear = useMemo(() => {
    const map = new Map<number, TransitionChartPoint>();
    for (const p of points) map.set(p.year, p);
    return map;
  }, [points]);

  const active = cursorYear != null ? pointByYear.get(cursorYear) ?? null : null;

  const baselineEmissions =
    meta?.baselineEmissionsT ??
    points.find((p) => p.year === meta?.baselineYear)?.actual ??
    points.find((p) => p.actual != null)?.actual ??
    null;

  const baselineYear =
    meta?.baselineYear ??
    points.find((p) => p.actual != null)?.year ??
    years[0] ??
    null;

  const refAtCursor = showReference15 ? active?.reference15 ?? null : null;
  const companyAtCursor = showCompany ? active?.companyTarget ?? null : null;
  const actualAtCursor = showActual ? active?.actual ?? null : null;
  const scenarioAtCursor = showScenario ? active?.scenario ?? null : null;

  const reduction = reductionVsBaseline(
    refAtCursor ?? companyAtCursor ?? actualAtCursor,
    baselineEmissions,
  );

  const summaryHorizons = useMemo(() => {
    const horizons = [2030, 2035].filter((y) => years.includes(y));
    // Si 2030/2035 absents, prendre targetYear de la trajectoire + milieu éventuel
    if (horizons.length === 0 && meta?.targetYear != null && years.includes(meta.targetYear)) {
      horizons.push(meta.targetYear);
    }
    return horizons.map((y) => {
      const p = pointByYear.get(y);
      const value = p?.reference15 ?? p?.companyTarget ?? null;
      const red = reductionVsBaseline(value, baselineEmissions);
      return { year: y, value, pct: red.pct };
    });
  }, [years, pointByYear, meta?.targetYear, baselineEmissions]);

  const snapFromEvent = (label: unknown) => {
    const y = Number(label);
    if (!Number.isFinite(y) || years.length === 0) return;
    setCursorYear(nearestYear(years, y));
  };

  if (points.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
        Aucune série à afficher pour le moment.
      </div>
    );
  }

  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  return (
    <div className="space-y-4" data-testid="transition-trajectory-chart">
      <div className="relative overflow-hidden rounded-xl border border-emerald-100/80 bg-gradient-to-b from-emerald-50/70 via-teal-50/30 to-white p-3 sm:p-4">
        <div className="h-[22rem] w-full sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 28, right: 20, left: 4, bottom: 8 }}
              onMouseMove={(state) => {
                if (state?.activeLabel != null) snapFromEvent(state.activeLabel);
              }}
              onClick={(state) => {
                if (state?.activeLabel != null) snapFromEvent(state.activeLabel);
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
                opacity={0.7}
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={64}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${fmt(v / 1000, 1)}k` : fmt(v))}
              />

              {/* Zone avant curseur — très subtile */}
              {cursorYear != null && firstYear != null && cursorYear > firstYear && (
                <ReferenceArea
                  x1={firstYear}
                  x2={cursorYear}
                  fill="#10b981"
                  fillOpacity={0.05}
                  strokeOpacity={0}
                />
              )}
              {cursorYear != null && lastYear != null && cursorYear < lastYear && (
                <ReferenceArea
                  x1={cursorYear}
                  x2={lastYear}
                  fill="#94a3b8"
                  fillOpacity={0.03}
                  strokeOpacity={0}
                />
              )}

              {cursorYear != null && (
                <ReferenceLine
                  x={cursorYear}
                  stroke="#0f766e"
                  strokeWidth={1.75}
                  strokeDasharray="4 3"
                  label={{
                    value: String(cursorYear),
                    position: "top",
                    fill: "#0f766e",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
              )}

              <Tooltip
                cursor={false}
                content={() =>
                  cursorYear == null ? null : (
                    <CursorCard
                      year={cursorYear}
                      actual={actualAtCursor}
                      reference15={refAtCursor}
                      company={companyAtCursor}
                      scenario={scenarioAtCursor}
                      showActual={showActual}
                      showReference15={showReference15}
                      showCompany={showCompany}
                      showScenario={showScenario}
                      reductionPct={reduction.pct}
                      reductionDelta={reduction.delta}
                    />
                  )
                }
              />

              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />

              {showActual && (
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Réalisé"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0f766e" }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              )}
              {showReference15 && (
                <Line
                  type="monotone"
                  dataKey="reference15"
                  name="Trajectoire 1,5 °C"
                  stroke="#7c3aed"
                  strokeWidth={2.25}
                  strokeDasharray="8 4"
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              )}
              {showCompany && (
                <Line
                  type="monotone"
                  dataKey="companyTarget"
                  name="Objectif entreprise"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              )}
              {showScenario && (
                <Line
                  type="monotone"
                  dataKey="scenario"
                  name="Scénario What-If"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="2 4"
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          Glissez le curseur ou cliquez une année · alignement automatique sur l&apos;exercice
        </p>
      </div>

      {/* Synthèse sous le graphique */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card/80 px-3 py-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCell
          label="Année de référence"
          primary={baselineYear != null ? String(baselineYear) : "—"}
          secondary={fmtOrDash(baselineEmissions, 1)}
        />
        {summaryHorizons.map((h) => (
          <SummaryCell
            key={h.year}
            label={`Objectif ${h.year}`}
            primary={fmtOrDash(h.value, 1)}
            secondary={
              h.pct != null ? `−${fmt(Math.abs(h.pct), 1)} %` : "—"
            }
          />
        ))}
        <SummaryCell
          label="Taux annuel"
          primary={
            meta?.dlarrPercent != null && Number.isFinite(meta.dlarrPercent)
              ? `${fmt(Number(meta.dlarrPercent), 2)} %`
              : "—"
          }
          secondary="dLARR · ACA"
        />
        <SummaryCell
          label="Période"
          primary={
            baselineYear != null && (meta?.targetYear ?? lastYear) != null
              ? `${baselineYear} → ${meta?.targetYear ?? lastYear}`
              : "—"
          }
          secondary={
            meta?.targetEmissionsT != null
              ? `Cible ${fmt(meta.targetEmissionsT, 1)} tCO₂e`
              : undefined
          }
        />
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          Cette trajectoire de référence 1,5&nbsp;°C est calculée avec la méthode SBTi –
          Absolute Contraction Approach (ACA) utilisée par CarboScan.
        </p>
        {meta?.onOpenMethod && (
          <button
            type="button"
            className="font-medium text-emerald-700 hover:text-emerald-800"
            onClick={meta.onOpenMethod}
          >
            Voir la méthode de calcul →
          </button>
        )}
        <p className="pt-1">
          Trajectoire de référence calculée par CarboScan — distincte de toute validation SBTi
          de l&apos;entreprise.
        </p>
      </div>
    </div>
  );
};

function CursorCard({
  year,
  actual,
  reference15,
  company,
  scenario,
  showActual,
  showReference15,
  showCompany,
  showScenario,
  reductionPct,
  reductionDelta,
}: {
  year: number;
  actual: number | null;
  reference15: number | null;
  company: number | null;
  scenario: number | null;
  showActual: boolean;
  showReference15: boolean;
  showCompany: boolean;
  showScenario: boolean;
  reductionPct: number | null;
  reductionDelta: number | null;
}) {
  return (
    <div className="min-w-[200px] rounded-xl border border-emerald-200/80 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur-sm">
      <p className="text-sm font-bold tabular-nums text-emerald-900">{year}</p>
      <div className="mt-2 space-y-1.5 text-xs">
        {showReference15 && (
          <Row label="Trajectoire 1,5 °C" value={fmtOrDash(reference15, 1)} accent="#7c3aed" />
        )}
        {showCompany && (
          <Row label="Objectif entreprise" value={fmtOrDash(company, 1)} accent="#2563eb" />
        )}
        {showActual && (
          <Row label="Réalisé" value={fmtOrDash(actual, 1)} accent="#0f766e" />
        )}
        {showScenario && (
          <Row label="Scénario What-If" value={fmtOrDash(scenario, 1)} accent="#d97706" />
        )}
      </div>
      {(reductionPct != null || reductionDelta != null) && (
        <div className="mt-2 border-t border-border pt-2 text-xs">
          <p className="text-muted-foreground">Réduction vs année de référence</p>
          <p className="font-semibold tabular-nums text-foreground">
            {reductionPct != null ? `−${fmt(Math.abs(reductionPct), 1)} %` : "—"}
            {reductionDelta != null && (
              <span className="ml-2 font-medium text-muted-foreground">
                −{fmt(Math.abs(reductionDelta), 1)} tCO₂e
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        {label}
      </span>
      <span className="tabular-nums font-medium text-foreground">{value}</span>
    </div>
  );
}

function SummaryCell({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">
        {primary}
      </p>
      {secondary && (
        <p className="truncate text-xs tabular-nums text-muted-foreground">{secondary}</p>
      )}
    </div>
  );
}

export default TransitionTrajectoryChart;
