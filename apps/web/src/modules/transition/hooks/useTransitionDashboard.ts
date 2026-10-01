/**
 * Données partagées Vue d'ensemble / Trajectoires Transition.
 * Aucune année inventée. Courbe 1,5 °C uniquement via snapshot versionné.
 */
import { useEffect, useMemo, useState } from "react";
import { useAvailableDataSources } from "@/modules/climate-roadmap/hooks/useAvailableBaselineData";
import { useOrganizationSites } from "@/hooks/useOrganizationSites";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { useOrganizationYears } from "@/hooks/useOrganizationYears";
import { latestActualByYear } from "@/lib/net-zero/reductionTrajectory";
import { api } from "@/integrations/api/client";
import { computeTrajectory, useScenarioLevers } from "@/modules/scenarios/hooks/useScenarios";
import type { ClimateScenario, ScenarioAssumption, ScenarioLever } from "@/modules/scenarios/types";
import { useClimateObjectives } from "./useClimateObjectives";
import { useClimateReferenceTrajectories } from "./useClimateReferenceTrajectories";
import {
  buildReferenceSeries,
  computeAlignment,
  computeReferenceAlignment,
  mergeTransitionSeries,
  resolveTargetEmissions,
} from "../lib/trajectoryComparison";
import type { ClimateObjective } from "../types";

export function useTransitionDashboard() {
  const dataSources = useAvailableDataSources();
  const { organizationId } = useOrganizationId();
  const { defaultYear } = useOrganizationYears(organizationId);
  const { sites } = useOrganizationSites(organizationId ?? undefined);
  const { objectives, primary, frameworks, loading: objLoading } = useClimateObjectives();
  const {
    active: referenceTrajectory,
    loading: refLoading,
    create: createReferenceTrajectory,
    reload: reloadReference,
  } = useClimateReferenceTrajectories();

  const [scenarios, setScenarios] = useState<ClimateScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const { levers } = useScenarioLevers(selectedScenarioId);
  const [assumptions, setAssumptions] = useState<Map<string, ScenarioAssumption>>(new Map());

  const [actionStats, setActionStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    loading: true,
  });

  useEffect(() => {
    void api
      .listClimateScenarios()
      .then(({ items }) => {
        const list = ((items || []) as unknown as ClimateScenario[]).filter(
          (s) => s.status !== "archived",
        );
        setScenarios(list);
        setSelectedScenarioId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch(() => setScenarios([]));
  }, []);

  useEffect(() => {
    if (levers.length === 0) {
      setAssumptions(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const map = new Map<string, ScenarioAssumption>();
      for (const lever of levers) {
        try {
          const { items } = await api.listClimateScenarioAssumptions(lever.id);
          if (items?.[0]) map.set(lever.id, items[0] as unknown as ScenarioAssumption);
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setAssumptions(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [levers]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { items: roadmaps } = await api.listClimateRoadmaps();
        const active =
          (roadmaps || []).find((r) => String(r.status) === "active") || (roadmaps || [])[0];
        if (!active?.id) {
          if (!cancelled) {
            setActionStats({ total: 0, inProgress: 0, completed: 0, loading: false });
          }
          return;
        }
        const { items } = await api.listClimateActions({ roadmapId: String(active.id) });
        const actions = items || [];
        const inProgress = actions.filter((a) =>
          ["in_progress", "studying", "validated"].includes(String(a.status || "")),
        ).length;
        const completed = actions.filter((a) => String(a.status) === "completed").length;
        if (!cancelled) {
          setActionStats({
            total: actions.length,
            inProgress,
            completed,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setActionStats({ total: 0, inProgress: 0, completed: 0, loading: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Réalisé Aligné sur le périmètre S1+2 si objectif / référence S1+2 — jamais d'années inventées. */
  const actuals = useMemo(() => {
    const scopes = primary?.scopes?.length
      ? primary.scopes
      : referenceTrajectory?.scope_boundary?.length
        ? referenceTrajectory.scope_boundary
        : [1, 2, 3];
    const useS12 =
      scopes.includes(1) &&
      scopes.includes(2) &&
      !scopes.includes(3) &&
      scopes.length === 2;

    return latestActualByYear(
      dataSources.bilans
        .filter((b) => b.year != null && Number.isFinite(b.year))
        .map((b) => {
          const emissionsT = useS12 ? b.scope1 + b.scope2 : b.totalEmissions;
          return {
            year: b.year as number,
            emissionsT,
            updatedAt: b.date,
          };
        })
        .filter((b) => b.emissionsT > 0),
    );
  }, [dataSources.bilans, primary, referenceTrajectory]);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) || null;

  const scenarioSeries = useMemo(() => {
    if (!selectedScenario || levers.length === 0) return [];
    return computeTrajectory(
      selectedScenario.baseline_emissions_tco2e || 0,
      selectedScenario.baseline_year,
      selectedScenario.target_year,
      levers as ScenarioLever[],
      assumptions,
    ).map((r) => ({ year: r.year, emissionsT: r.projected_emissions_tco2e }));
  }, [selectedScenario, levers, assumptions]);

  const referenceFrameworkVersion =
    frameworks
      .find((f) => f.code === "sbti")
      ?.versions?.find((v) => v.method_key === "aca_near_term_1_5c_cnzs_v1_3_1") ??
    frameworks.find((f) => f.code === "sbti")?.versions?.find((v) => v.status === "active") ??
    frameworks.find((f) => f.code === "sbti")?.versions?.[0] ??
    null;

  const referenceTrajectoryReady = Boolean(referenceTrajectory);

  const reference15ByYear = useMemo(
    () => buildReferenceSeries(referenceTrajectory),
    [referenceTrajectory],
  );

  const chartPoints = useMemo(
    () =>
      mergeTransitionSeries({
        actuals,
        companyObjective: primary,
        scenarioByYear: scenarioSeries,
        reference15Enabled: referenceTrajectoryReady,
        reference15ByYear,
      }),
    [actuals, primary, scenarioSeries, referenceTrajectoryReady, reference15ByYear],
  );

  const alignment = useMemo(() => computeAlignment(actuals, primary), [actuals, primary]);

  const referenceAlignment = useMemo(
    () => computeReferenceAlignment(actuals, referenceTrajectory),
    [actuals, referenceTrajectory],
  );

  const referenceEmissions = useMemo(() => {
    if (primary?.baseline_value != null) return Number(primary.baseline_value);
    if (referenceTrajectory?.baseline_emissions != null) {
      return Number(referenceTrajectory.baseline_emissions);
    }
    if (actuals.length === 0) return null;
    const byYear = new Map(actuals.map((a) => [a.year, a.emissionsT]));
    const y =
      primary?.baseline_year ??
      defaultYear ??
      Math.max(...actuals.map((a) => a.year));
    return byYear.get(y) ?? [...actuals].sort((a, b) => b.year - a.year)[0]?.emissionsT ?? null;
  }, [primary, referenceTrajectory, actuals, defaultYear]);

  const targetEmissions = primary ? resolveTargetEmissions(primary) : null;

  const objectiveProgress = useMemo(
    () => computeObjectiveProgress(primary, actuals),
    [primary, actuals],
  );

  const suggestBaseline = (year: number, scopes: number[]) => {
    const bilan = dataSources.bilans.find((b) => b.year === year);
    if (!bilan) return null;
    const useAll =
      scopes.length === 0 ||
      (scopes.includes(1) && scopes.includes(2) && scopes.includes(3));
    if (useAll) return bilan.totalEmissions;
    let sum = 0;
    if (scopes.includes(1)) sum += bilan.scope1;
    if (scopes.includes(2)) sum += bilan.scope2;
    if (scopes.includes(3)) sum += bilan.scope3;
    return sum;
  };

  const suggestScopeSplit = (year: number) => {
    const bilan = dataSources.bilans.find((b) => b.year === year);
    if (!bilan) return null;
    return { scope1: bilan.scope1, scope2: bilan.scope2, scope3: bilan.scope3, total: bilan.totalEmissions };
  };

  return {
    loading: dataSources.loading || objLoading || refLoading,
    dataSources,
    sites,
    defaultYear: defaultYear ?? new Date().getFullYear(),
    actuals,
    objectives,
    primary,
    frameworks,
    referenceFrameworkVersion,
    referenceTrajectory,
    referenceTrajectoryReady,
    reference15ByYear,
    referenceAlignment,
    createReferenceTrajectory,
    reloadReference,
    scenarios,
    selectedScenarioId,
    setSelectedScenarioId,
    selectedScenario,
    scenarioSeries,
    scenarioSimulationPersisted: false,
    chartPoints,
    alignment,
    referenceEmissions,
    targetEmissions,
    objectiveProgress,
    actionStats,
    suggestBaseline,
    suggestScopeSplit,
  };
}

function computeObjectiveProgress(
  objective: ClimateObjective | null,
  actuals: Array<{ year: number; emissionsT: number }>,
): number | null {
  if (!objective || objective.baseline_value == null) return null;
  const baseline = Number(objective.baseline_value);
  const target = resolveTargetEmissions(objective);
  if (target == null || baseline <= target) return null;
  const latest = [...actuals]
    .filter((a) => a.year >= objective.baseline_year && a.year <= objective.target_year)
    .sort((a, b) => b.year - a.year)[0];
  if (!latest) return null;
  const progress = ((baseline - latest.emissionsT) / (baseline - target)) * 100;
  if (!Number.isFinite(progress)) return null;
  return Math.max(0, Math.min(100, progress));
}
