// Types pour le module Modélisation de Scénarios

export type ScenarioType = 'reference' | 'prudent' | 'intermediate' | 'ambitious' | 'net_zero' | 'custom';
export type ScenarioStatus = 'draft' | 'active' | 'validated' | 'archived';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type ApplicationMode = 'linear' | 'exponential' | 'step' | 'custom';

export interface ClimateScenario {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  baseline_source_type: string;
  baseline_source_id: string | null;
  baseline_year: number;
  start_year: number;
  target_year: number;
  scenario_type: ScenarioType;
  target_reduction_percent: number | null;
  baseline_emissions_tco2e: number | null;
  target_emissions_tco2e: number | null;
  annual_revenue_eur: number | null;
  net_zero_flag: boolean;
  status: ScenarioStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScenarioLever {
  id: string;
  scenario_id: string;
  roadmap_lever_id: string | null;
  custom_lever_name: string | null;
  category: string;
  description: string | null;
  scope_concerned: number[];
  source_emission_targeted: string | null;
  max_reduction_tco2e: number;
  estimated_cost: number;
  maturity_level: string;
  confidence_level: ConfidenceLevel;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  assumptions?: ScenarioAssumption;
}

export interface ScenarioAssumption {
  id: string;
  scenario_lever_id: string;
  start_year: number;
  ramp_up_end_year: number | null;
  yearly_adoption_rate: Record<string, number>;
  yearly_reduction_factor: number;
  max_coverage_percent: number;
  confidence_level: ConfidenceLevel;
  source_reference: string | null;
  methodological_note: string | null;
  application_mode: ApplicationMode;
  created_at: string;
  updated_at: string;
}

export interface ScenarioResult {
  id: string;
  scenario_id: string;
  year: number;
  projected_emissions_tco2e: number;
  annual_reduction_tco2e: number;
  cumulative_reduction_tco2e: number;
  residual_emissions_tco2e: number;
  reduction_percent_vs_baseline: number;
  projected_revenue_eur: number | null;
  intensity_tco2e_per_meur: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScenarioContribution {
  id: string;
  scenario_id: string;
  scenario_lever_id: string | null;
  year: number;
  contribution_tco2e: number;
  contribution_percent: number;
}

export interface ScenarioTarget {
  id: string;
  scenario_id: string;
  target_year: number;
  target_emissions_tco2e: number | null;
  target_reduction_percent: number | null;
  target_type: string;
}

export interface ScenarioDashboard {
  scenarioCount: number;
  baselineYear: number | null;
  targetYear: number | null;
  baselineEmissions: number | null;
  bestScenarioName: string | null;
  bestReductionPercent: number | null;
  maxReduction: number | null;
  gapToTarget: number | null;
  leversCount: number;
  roadmapActionsCount: number;
  baselineIntensity: number | null;
}

export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  reference: 'Référence (BAU)',
  prudent: 'Prudent',
  intermediate: 'Intermédiaire',
  ambitious: 'Ambitieux',
  net_zero: 'Net Zero',
  custom: 'Personnalisé',
};

export const SCENARIO_TYPE_COLORS: Record<ScenarioType, string> = {
  reference: 'hsl(var(--muted-foreground))',
  prudent: 'hsl(210, 60%, 55%)',
  intermediate: 'hsl(45, 80%, 50%)',
  ambitious: 'hsl(150, 60%, 45%)',
  net_zero: 'hsl(160, 70%, 35%)',
  custom: 'hsl(270, 50%, 55%)',
};

export const LEVER_CATEGORIES = [
  { value: 'energy_efficiency', label: 'Efficacité énergétique' },
  { value: 'renewable_energy', label: 'Énergies renouvelables' },
  { value: 'electrification', label: 'Électrification' },
  { value: 'recycled_material', label: 'Matière recyclée' },
  { value: 'transport_optimization', label: 'Optimisation transport' },
  { value: 'waste_reduction', label: 'Réduction déchets' },
  { value: 'sobriety', label: 'Sobriété' },
  { value: 'ecodesign', label: 'Écoconception' },
  { value: 'supplier_change', label: 'Changements fournisseurs' },
  { value: 'carbon_capture', label: 'Capture / compensation' },
  { value: 'other', label: 'Autre' },
] as const;
