export interface PlanQuestionnaireConfig {
  sections: string[];
  scopes: number[];
  maxQuestions: number;
  reportTemplate: string;
  autoReport: boolean;
  hasQuestionnaire: boolean;
  features: string[];
}

// Plan Essentiel: Scopes 1 & 2, questionnaire simplifié
const ESSENTIAL_CONFIG: PlanQuestionnaireConfig = {
  sections: ['company_info', 'fleet_general', 'fleet_fuel_types', 'fleet_vehicle_types', 'fleet_usage', 'fuel_consumption', 'energy'],
  scopes: [1, 2],
  maxQuestions: 50,
  reportTemplate: 'essential',
  autoReport: true,
  hasQuestionnaire: true,
  features: ['basic_calculator', 'pdf_report', 'refrigerants_tracking', 'green_electricity', 'alternative_fuels']
};

// Plan Pro: Scopes 1, 2 & 3, questionnaire complet
const CARBO_PRO_CONFIG: PlanQuestionnaireConfig = {
  sections: ['company_info', 'fleet_general', 'fleet_fuel_types', 'fleet_vehicle_types', 'fleet_usage', 'fuel_consumption', 'energy', 'scope3_purchases', 'scope3_equipment', 'scope3_energy_related', 'scope3_upstream_transport', 'scope3_business_travel', 'scope3_commuting', 'scope3_waste', 'scope3_product_use', 'scope3_end_of_life', 'scope3_other', 'supply_chain'],
  scopes: [1, 2, 3],
  maxQuestions: 80,
  reportTemplate: 'pro',
  autoReport: true,
  hasQuestionnaire: true,
  features: ['full_calculator', 'advanced_recommendations', 'excel_export', 'trajectory_planning']
};

// Plan Expert: Accompagnement personnalisé, sans questionnaire
const CARBO_EXPERT_CONFIG: PlanQuestionnaireConfig = {
  sections: [],
  scopes: [],
  maxQuestions: 0,
  reportTemplate: '',
  autoReport: false,
  hasQuestionnaire: false,
  features: ['expert_consultation', 'custom_solution', 'dedicated_support']
};

export const PLAN_QUESTIONNAIRE_CONFIG: Record<string, PlanQuestionnaireConfig> = {
  // Appellations officielles du backend
  essential: ESSENTIAL_CONFIG,
  carbo_pro: CARBO_PRO_CONFIG,
  carbo_expert: CARBO_EXPERT_CONFIG
};

export const getPlanConfig = (planType: string): PlanQuestionnaireConfig => {
  // Normaliser le plan type
  const normalizedPlanType = planType?.toLowerCase().trim();
  return PLAN_QUESTIONNAIRE_CONFIG[normalizedPlanType] || ESSENTIAL_CONFIG;
};

export const shouldShowScope3 = (planType: string): boolean => {
  const config = getPlanConfig(planType);
  return config.scopes.includes(3);
};

export const getMaxQuestions = (planType: string): number => {
  const config = getPlanConfig(planType);
  return config.maxQuestions;
};