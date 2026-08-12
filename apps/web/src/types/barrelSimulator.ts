export interface EmissionsTotal {
  id?: string;
  user_id: string;
  organization_id?: string;
  year: number;
  scope1_tco2: number;
  scope2_tco2: number;
  total_tco2?: number; // Calculated field
  created_at?: string;
  updated_at?: string;
}

export interface SimParameters {
  id?: string;
  factor_tco2_per_barrel: number;
  default_barrel_price: number;
  currency: string;
  updated_at?: string;
}

export interface BarrelScenario {
  id?: string;
  user_id: string;
  organization_id?: string;
  name: string;
  barrel_price_multiplier: number;
  apply_carbon_tax: boolean;
  carbon_tax_price_per_tco2: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface BarrelResult {
  id?: string;
  scenario_id: string;
  user_id: string;
  emissions_total_tco2: number;
  equivalent_barrels: number;
  base_cost: number;
  scenario_cost: number;
  carbon_tax: number;
  total_cost: number;
  delta_cost: number;
  created_at?: string;
}

export interface BarrelSimulationResults {
  scenario: BarrelScenario;
  result: BarrelResult;
  parameters: SimParameters;
  emissionsTotal: EmissionsTotal;
}

export const CURRENCIES = [
  { value: 'USD', label: 'Dollar US ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'TND', label: 'Dinar tunisien (TND)' }
] as const;