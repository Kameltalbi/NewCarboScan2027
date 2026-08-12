// Types pour le module Feuille de route climat

export type RoadmapStatus = 'draft' | 'active' | 'completed' | 'archived';
export type LeverCategory = 'energy_efficiency' | 'renewable_energy' | 'electrification' | 'logistics' | 'waste' | 'material_substitution' | 'recycling' | 'ecodesign' | 'purchasing' | 'mobility' | 'sobriety' | 'industrial_performance' | 'circularity' | 'other';
export type ComplexityLevel = 'low' | 'medium' | 'high' | 'very_high';
export type MaturityLevel = 'concept' | 'study' | 'pilot' | 'deployment' | 'mature';
export type LeverStatus = 'identified' | 'validated' | 'in_progress' | 'completed' | 'abandoned';
export type ActionStatus = 'to_launch' | 'studying' | 'validated' | 'in_progress' | 'suspended' | 'completed' | 'abandoned';
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';
export type ActionType = 'reduction' | 'substitution' | 'efficiency' | 'sobriety' | 'compensation' | 'other';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface ClimateRoadmap {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  baseline_year: number;
  target_year: number;
  reduction_target_percent: number | null;
  baseline_emissions_tco2e: number | null;
  target_emissions_tco2e: number | null;
  status: RoadmapStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClimateLever {
  id: string;
  roadmap_id: string;
  name: string;
  category: string;
  description: string | null;
  scope_concerned: number[] | null;
  site_id: string | null;
  business_unit: string | null;
  source_emission_targeted: string | null;
  estimated_potential_reduction_tco2e: number;
  estimated_cost: number;
  complexity_level: ComplexityLevel;
  implementation_duration_months: number | null;
  maturity_level: MaturityLevel;
  owner: string | null;
  status: LeverStatus;
  created_at: string;
  updated_at: string;
  // Computed
  actions?: ClimateAction[];
  actions_count?: number;
}

export interface ClimateAction {
  id: string;
  lever_id: string;
  roadmap_id: string;
  title: string;
  description: string | null;
  action_type: ActionType;
  site_id: string | null;
  business_unit: string | null;
  scope_concerned: number[] | null;
  source_emission_targeted: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  contributors: string[] | null;
  start_date: string | null;
  target_date: string | null;
  end_date: string | null;
  status: ActionStatus;
  priority: ActionPriority;
  progress_percent: number;
  budget_estimated: number;
  budget_actual: number;
  expected_reduction_tco2e: number;
  realized_reduction_tco2e: number;
  expected_savings: number | null;
  realized_savings: number | null;
  indicator_name: string | null;
  indicator_target: string | null;
  indicator_actual: string | null;
  dependencies: string | null;
  risks: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  lever?: ClimateLever;
  milestones?: ClimateActionMilestone[];
  priority_score?: ClimatePriorityScore;
}

export interface ClimateActionMilestone {
  id: string;
  action_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: MilestoneStatus;
  owner: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClimatePriorityScore {
  id: string;
  action_id: string;
  carbon_impact_score: number;
  cost_score: number;
  feasibility_score: number;
  speed_score: number;
  roi_score: number;
  regulatory_score: number;
  overall_score: number;
  created_at: string;
  updated_at: string;
}

export interface ClimateKPI {
  id: string;
  roadmap_id: string;
  reporting_period: string;
  reporting_date: string;
  baseline_emissions_tco2e: number;
  target_emissions_tco2e: number;
  realized_emissions_tco2e: number;
  total_actions: number;
  completed_actions: number;
  delayed_actions: number;
  total_budget: number;
  consumed_budget: number;
  expected_reduction_tco2e: number;
  realized_reduction_tco2e: number;
  created_at: string;
  updated_at: string;
}

// Dashboard computed types
export interface RoadmapDashboard {
  roadmap: ClimateRoadmap;
  levers_count: number;
  actions_total: number;
  actions_to_launch: number;
  actions_in_progress: number;
  actions_completed: number;
  actions_delayed: number;
  total_expected_reduction: number;
  total_engaged_reduction: number;
  total_realized_reduction: number;
  total_budget_estimated: number;
  total_budget_actual: number;
  progress_percent: number;
  top_actions: ClimateAction[];
  alerts: DashboardAlert[];
}

export interface DashboardAlert {
  type: 'deadline' | 'delay' | 'budget' | 'gap';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action_id?: string;
}

// Labels
export const LEVER_CATEGORY_LABELS: Record<string, string> = {
  energy_efficiency: 'Efficacité énergétique',
  renewable_energy: 'Énergie renouvelable',
  electrification: 'Électrification',
  logistics: 'Optimisation logistique',
  waste: 'Réduction des déchets',
  material_substitution: 'Substitution matière',
  recycling: 'Recyclage',
  ecodesign: 'Écoconception',
  purchasing: 'Achats responsables',
  mobility: 'Mobilité durable',
  sobriety: 'Sobriété',
  industrial_performance: 'Performance industrielle',
  circularity: 'Circularité',
  other: 'Autre',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  to_launch: 'À lancer',
  studying: 'En étude',
  validated: 'Validée',
  in_progress: 'En cours',
  suspended: 'Suspendue',
  completed: 'Terminée',
  abandoned: 'Abandonnée',
};

export const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  to_launch: 'bg-muted text-muted-foreground',
  studying: 'bg-blue-100 text-blue-800',
  validated: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-amber-100 text-amber-800',
  suspended: 'bg-orange-100 text-orange-800',
  completed: 'bg-emerald-100 text-emerald-800',
  abandoned: 'bg-red-100 text-red-800',
};

export const PRIORITY_LABELS: Record<ActionPriority, string> = {
  critical: 'Critique',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

export const PRIORITY_COLORS: Record<ActionPriority, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-blue-100 text-blue-800',
  low: 'bg-muted text-muted-foreground',
};

export const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
  very_high: 'Très élevée',
};

export const MATURITY_LABELS: Record<MaturityLevel, string> = {
  concept: 'Concept',
  study: 'Étude',
  pilot: 'Pilote',
  deployment: 'Déploiement',
  mature: 'Mature',
};
