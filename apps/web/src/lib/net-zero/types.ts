// Types pour le module Trajectoire Net Zéro (alignée SBTi)

export type ScopeInclusion = 1 | 2 | 3 | '1,2' | '1,2,3';

export type ObjectiveType = 'absolute' | 'intensity';

export type ObjectiveHorizon = 'near-term' | 'net-zero';

export type ReductionLeverCategory = 
  | 'energy' 
  | 'transport' 
  | 'purchases' 
  | 'products' 
  | 'organization'
  | 'waste'
  | 'other';

export type ScenarioType = 'conservative' | 'ambitious' | 'accelerated';

export type MilestoneStatus = 'achieved' | 'on-track' | 'at-risk' | 'planned';

export interface NetZeroReference {
  reference_year: number;
  reference_emissions: number; // tCO₂e
  scopes_included: ScopeInclusion;
  calculation_method: string; // 'GHG Protocol' | 'ISO 14064'
  locked: boolean;
  locked_at?: string;
}

export interface NetZeroObjective {
  id: string;
  type: ObjectiveType;
  horizon: ObjectiveHorizon;
  target_year: number;
  target_reduction_percent: number; // %
  baseline_year: number;
  baseline_emissions: number; // tCO₂e
  intensity_metric?: string; // Pour objectifs d'intensité (ex: 'tCO₂e/M€')
  intensity_value?: number;
}

export interface AnnualTrajectoryPoint {
  year: number;
  target_emissions: number; // tCO₂e (trajectoire cible)
  actual_emissions?: number; // tCO₂e (émissions réelles si année passée)
  reduction_percent: number; // % de réduction vs année de référence
  gap?: number; // Écart vs trajectoire (tCO₂e)
  status?: MilestoneStatus;
}

export type ActionType = 'sobriete' | 'efficacite' | 'substitution' | 'compensation';
export type PriorityLevel = 'quick_win' | 'high' | 'medium' | 'low';

export interface ReductionLever {
  id: string;
  category: ReductionLeverCategory;
  name: string;
  description: string;
  
  // Impact carbone
  estimated_impact: number; // tCO₂e/an
  
  // Coûts (pour MACC)
  estimated_cost?: number; // € (investissement total)
  annual_savings?: number; // € (économies annuelles, peut être négatif si coûts récurrents)
  cost_per_tonne?: number; // €/tCO₂e (calculé automatiquement)
  roi_years?: number; // Années de retour sur investissement (calculé automatiquement)
  
  // Type d'action
  action_type?: ActionType;
  is_compensation?: boolean; // True si c'est de la compensation (à distinguer clairement)
  
  // Temporalité
  start_year: number;
  end_year: number;
  
  // Priorisation
  priority: PriorityLevel; // Peut être calculé automatiquement depuis cost_per_tonne
  priority_score?: number; // Score calculé automatiquement pour tri
  macc_rank?: number; // Position dans la MACC (1 = meilleur ratio coût/impact)
  
  // Statut
  status: 'planned' | 'in-progress' | 'completed';
  enabled: boolean;
  
  // Rattachement au Bilan Carbone (optionnel pour v1)
  scope_target?: 1 | 2 | 3;
  poste_target?: string;
  baseline_emissions?: number; // Émissions du poste avant action
}

export interface NetZeroScenario {
  id: string;
  name: string;
  type: ScenarioType;
  levers_enabled: string[]; // IDs des leviers activés
  trajectory: AnnualTrajectoryPoint[];
  total_reduction: number; // tCO₂e total
  feasibility_score: number; // 0-100
}

export interface NetZeroTrajectory {
  reference: NetZeroReference;
  objectives: NetZeroObjective[];
  levers: ReductionLever[];
  base_trajectory: AnnualTrajectoryPoint[]; // Trajectoire sans leviers
  scenarios: NetZeroScenario[];
  current_scenario_id?: string; // Scénario sélectionné
  annual_tracking: Array<{
    year: number;
    actual_emissions: number;
    target_emissions: number;
    gap: number;
    status: MilestoneStatus;
  }>;
}

export interface NetZeroOverview {
  reference_year: number;
  reference_emissions: number;
  target_year: number;
  current_year: number;
  current_emissions?: number;
  reduction_achieved_percent: number;
  trajectory_gap?: number; // Écart vs trajectoire cible
  milestones: Array<{
    year: number;
    target: number;
    actual?: number;
    status: MilestoneStatus;
  }>;
}

// ============================================
// MACC (Marginal Abatement Cost Curve)
// ============================================

export interface MACCPoint {
  lever_id: string;
  lever_name: string;
  lever_category: ReductionLeverCategory;
  
  // Potentiel de réduction
  reduction_potential: number; // tCO₂e
  
  // Coûts
  cost_total: number; // € (investissement)
  cost_per_tonne: number; // €/tCO₂e
  annual_savings: number; // € (économies annuelles)
  
  // Position dans la MACC
  macc_rank: number; // 1 = meilleur ratio
  cumulative_reduction: number; // tCO₂e cumulé
  cumulative_cost: number; // € cumulé
  
  // Classification
  priority: PriorityLevel;
  is_quick_win: boolean; // True si cost_per_tonne < 0 (économies)
  is_no_regret: boolean; // True si cost_per_tonne < 100 €/tCO₂e
  
  // Temporalité
  start_year: number;
  end_year: number;
  duration_years: number;
}
