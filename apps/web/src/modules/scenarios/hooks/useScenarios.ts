import { useState, useEffect, useCallback } from 'react';
import { api } from '@/integrations/api/client';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { ClimateScenario, ScenarioLever, ScenarioAssumption, ScenarioResult, ScenarioDashboard } from '../types';

export function useScenarios() {
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const [scenarios, setScenarios] = useState<ClimateScenario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScenarios = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { items } = await api.listClimateScenarios();
      setScenarios((items || []) as unknown as ClimateScenario[]);
    } catch {
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!orgLoading && organizationId) fetchScenarios();
    else if (!orgLoading) setLoading(false);
  }, [orgLoading, organizationId, fetchScenarios]);

  const createScenario = async (scenario: Partial<ClimateScenario>) => {
    if (!organizationId) return null;
    try {
      const { item } = await api.createClimateScenario(scenario as Record<string, unknown>);
      await fetchScenarios();
      return item as unknown as ClimateScenario;
    } catch {
      return null;
    }
  };

  const updateScenario = async (id: string, updates: Partial<ClimateScenario>) => {
    try {
      await api.patchClimateScenario(id, updates as Record<string, unknown>);
      await fetchScenarios();
      return true;
    } catch {
      return false;
    }
  };

  const deleteScenario = async (id: string) => {
    try {
      await api.deleteClimateScenario(id);
      await fetchScenarios();
      return true;
    } catch {
      return false;
    }
  };

  const duplicateScenario = async (id: string, newName: string) => {
    const source = scenarios.find(s => s.id === id);
    if (!source) return null;
    const { id: _id, created_at, updated_at, ...rest } = source;
    return createScenario({ ...rest, name: newName, status: 'draft' });
  };

  return { scenarios, loading, fetchScenarios, createScenario, updateScenario, deleteScenario, duplicateScenario };
}

export function useScenarioLevers(scenarioId: string | null) {
  const [levers, setLevers] = useState<ScenarioLever[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLevers = useCallback(async () => {
    if (!scenarioId) return;
    setLoading(true);
    try {
      const { items } = await api.listClimateScenarioLevers(scenarioId);
      setLevers((items || []) as unknown as ScenarioLever[]);
    } catch {
      setLevers([]);
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => { fetchLevers(); }, [fetchLevers]);

  const addLever = async (lever: Partial<ScenarioLever>) => {
    if (!scenarioId) return null;
    try {
      const { item } = await api.createClimateScenarioLever({
        ...(lever as Record<string, unknown>),
        scenario_id: scenarioId,
      });
      await fetchLevers();
      return item as unknown as ScenarioLever;
    } catch {
      return null;
    }
  };

  const updateLever = async (id: string, updates: Partial<ScenarioLever>) => {
    try {
      await api.patchClimateScenarioLever(id, updates as Record<string, unknown>);
      await fetchLevers();
      return true;
    } catch {
      return false;
    }
  };

  const deleteLever = async (id: string) => {
    try {
      await api.deleteClimateScenarioLever(id);
      await fetchLevers();
      return true;
    } catch {
      return false;
    }
  };

  return { levers, loading, fetchLevers, addLever, updateLever, deleteLever };
}

export function useScenarioAssumptions(scenarioLeverId: string | null) {
  const [assumption, setAssumption] = useState<ScenarioAssumption | null>(null);

  const fetchAssumption = useCallback(async () => {
    if (!scenarioLeverId) return;
    try {
      const { items } = await api.listClimateScenarioAssumptions(scenarioLeverId);
      setAssumption((items?.[0] as unknown as ScenarioAssumption) ?? null);
    } catch {
      setAssumption(null);
    }
  }, [scenarioLeverId]);

  useEffect(() => { fetchAssumption(); }, [fetchAssumption]);

  const upsertAssumption = async (values: Partial<ScenarioAssumption>) => {
    if (!scenarioLeverId) return;
    if (assumption) {
      await api.patchClimateScenarioAssumption(assumption.id, values as Record<string, unknown>);
    } else {
      await api.createClimateScenarioAssumption({
        ...(values as Record<string, unknown>),
        scenario_lever_id: scenarioLeverId,
      });
    }
    await fetchAssumption();
  };

  return { assumption, upsertAssumption };
}

export function computeTrajectory(
  baselineEmissions: number,
  baselineYear: number,
  targetYear: number,
  levers: ScenarioLever[],
  assumptions: Map<string, ScenarioAssumption>
): ScenarioResult[] {
  const results: ScenarioResult[] = [];
  let cumulativeReduction = 0;

  for (let year = baselineYear; year <= targetYear; year++) {
    let annualReduction = 0;

    for (const lever of levers) {
      if (!lever.enabled) continue;
      const a = assumptions.get(lever.id);
      if (!a || year < a.start_year) continue;

      const yearKey = String(year);
      let adoptionRate: number;

      if (a.yearly_adoption_rate && a.yearly_adoption_rate[yearKey] !== undefined) {
        adoptionRate = a.yearly_adoption_rate[yearKey];
      } else if (a.application_mode === 'linear' && a.ramp_up_end_year) {
        const totalYears = a.ramp_up_end_year - a.start_year;
        const elapsed = Math.min(year - a.start_year, totalYears);
        adoptionRate = totalYears > 0 ? Math.min((elapsed / totalYears) * (a.max_coverage_percent / 100), a.max_coverage_percent / 100) : a.max_coverage_percent / 100;
      } else {
        adoptionRate = a.max_coverage_percent / 100;
      }

      annualReduction += lever.max_reduction_tco2e * adoptionRate * a.yearly_reduction_factor;
    }

    cumulativeReduction += annualReduction;
    const projected = Math.max(baselineEmissions - cumulativeReduction, 0);
    const reductionPct = baselineEmissions > 0 ? ((baselineEmissions - projected) / baselineEmissions) * 100 : 0;

    results.push({
      id: '',
      scenario_id: '',
      year,
      projected_emissions_tco2e: projected,
      annual_reduction_tco2e: annualReduction,
      cumulative_reduction_tco2e: cumulativeReduction,
      residual_emissions_tco2e: projected,
      reduction_percent_vs_baseline: reductionPct,
      projected_revenue_eur: null,
      intensity_tco2e_per_meur: null,
      created_at: '',
      updated_at: '',
    });
  }

  return results;
}

export function useScenarioDashboard(scenarios: ClimateScenario[]): ScenarioDashboard {
  if (scenarios.length === 0) {
    return { scenarioCount: 0, baselineYear: null, targetYear: null, baselineEmissions: null, bestScenarioName: null, bestReductionPercent: null, maxReduction: null, gapToTarget: null, leversCount: 0, roadmapActionsCount: 0, baselineIntensity: null };
  }

  const best = scenarios.reduce((a, b) => ((a.target_reduction_percent || 0) > (b.target_reduction_percent || 0) ? a : b));
  const baseline = scenarios[0];

  const baselineIntensity = baseline.annual_revenue_eur && baseline.baseline_emissions_tco2e
    ? baseline.baseline_emissions_tco2e / (baseline.annual_revenue_eur / 1_000_000)
    : null;

  return {
    scenarioCount: scenarios.length,
    baselineYear: baseline.baseline_year,
    targetYear: baseline.target_year,
    baselineEmissions: baseline.baseline_emissions_tco2e,
    bestScenarioName: best.name,
    bestReductionPercent: best.target_reduction_percent,
    maxReduction: best.baseline_emissions_tco2e && best.target_reduction_percent
      ? best.baseline_emissions_tco2e * (best.target_reduction_percent / 100) : null,
    gapToTarget: null,
    leversCount: 0,
    roadmapActionsCount: 0,
    baselineIntensity,
  };
}
