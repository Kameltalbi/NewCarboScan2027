import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/api/client";
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { ClimateScenario, ScenarioLever, ScenarioAssumption, ScenarioResult, ScenarioContribution, ScenarioDashboard } from '../types';

export function useScenarios() {
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const [scenarios, setScenarios] = useState<ClimateScenario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScenarios = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from('climate_scenarios')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (data) setScenarios(data as unknown as ClimateScenario[]);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    if (!orgLoading && organizationId) fetchScenarios();
    else if (!orgLoading) setLoading(false);
  }, [orgLoading, organizationId, fetchScenarios]);

  const createScenario = async (scenario: Partial<ClimateScenario>) => {
    if (!organizationId) return null;
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('climate_scenarios')
      .insert({ ...scenario, organization_id: organizationId, created_by: userData.user?.id } as any)
      .select()
      .single();
    if (!error && data) { await fetchScenarios(); return data as unknown as ClimateScenario; }
    return null;
  };

  const updateScenario = async (id: string, updates: Partial<ClimateScenario>) => {
    const { error } = await supabase.from('climate_scenarios').update(updates as any).eq('id', id);
    if (!error) await fetchScenarios();
    return !error;
  };

  const deleteScenario = async (id: string) => {
    const { error } = await supabase.from('climate_scenarios').delete().eq('id', id);
    if (!error) await fetchScenarios();
    return !error;
  };

  const duplicateScenario = async (id: string, newName: string) => {
    const source = scenarios.find(s => s.id === id);
    if (!source) return null;
    const { id: _, created_at, updated_at, ...rest } = source;
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
    const { data } = await supabase
      .from('climate_scenario_levers')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('category');
    if (data) setLevers(data as unknown as ScenarioLever[]);
    setLoading(false);
  }, [scenarioId]);

  useEffect(() => { fetchLevers(); }, [fetchLevers]);

  const addLever = async (lever: Partial<ScenarioLever>) => {
    if (!scenarioId) return null;
    const { data, error } = await supabase
      .from('climate_scenario_levers')
      .insert({ ...lever, scenario_id: scenarioId } as any)
      .select()
      .single();
    if (!error && data) { await fetchLevers(); return data as unknown as ScenarioLever; }
    return null;
  };

  const updateLever = async (id: string, updates: Partial<ScenarioLever>) => {
    const { error } = await supabase.from('climate_scenario_levers').update(updates as any).eq('id', id);
    if (!error) await fetchLevers();
    return !error;
  };

  const deleteLever = async (id: string) => {
    const { error } = await supabase.from('climate_scenario_levers').delete().eq('id', id);
    if (!error) await fetchLevers();
    return !error;
  };

  return { levers, loading, fetchLevers, addLever, updateLever, deleteLever };
}

export function useScenarioAssumptions(scenarioLeverId: string | null) {
  const [assumption, setAssumption] = useState<ScenarioAssumption | null>(null);

  const fetchAssumption = useCallback(async () => {
    if (!scenarioLeverId) return;
    const { data } = await supabase
      .from('climate_scenario_assumptions')
      .select('*')
      .eq('scenario_lever_id', scenarioLeverId)
      .maybeSingle();
    if (data) setAssumption(data as unknown as ScenarioAssumption);
  }, [scenarioLeverId]);

  useEffect(() => { fetchAssumption(); }, [fetchAssumption]);

  const upsertAssumption = async (values: Partial<ScenarioAssumption>) => {
    if (!scenarioLeverId) return;
    if (assumption) {
      await supabase.from('climate_scenario_assumptions').update(values as any).eq('id', assumption.id);
    } else {
      await supabase.from('climate_scenario_assumptions').insert({ ...values, scenario_lever_id: scenarioLeverId } as any);
    }
    await fetchAssumption();
  };

  return { assumption, upsertAssumption };
}

// Trajectory computation engine — pure client-side
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
