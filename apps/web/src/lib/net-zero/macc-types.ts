// Types pour la MACC (Marginal Abatement Cost Curve)

import { ReductionLeverCategory, PriorityLevel } from './types';

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

export interface MACCStats {
  total_reduction: number;
  total_cost: number;
  average_cost_per_tonne: number;
  quick_wins_count: number;
  quick_wins_reduction: number;
  quick_wins_savings: number;
  no_regret_count: number;
  no_regret_reduction: number;
}
