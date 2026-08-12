export interface EmissionFactorCO2 {
  energy_type: string;
  unit: string;
  ef_co2_t_per_unit: number;
  source_reference?: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  user_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityEnergy {
  id?: string;
  user_id: string;
  organization_id?: string;
  year: number;
  site?: string;
  scope: number;
  category: string;
  subcategory?: string;
  energy_type: string;
  unit: string;
  quantity: number;
  unit_price_baseline: number;
  currency: string;
  emission_factor_co2?: number;
  include_in_simulation: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SimScenario {
  id?: string;
  user_id: string;
  organization_id?: string;
  name: string;
  petroleum_price_multiplier: number;
  gas_price_multiplier: number;
  coal_price_multiplier: number;
  electricity_price_multiplier: number;
  apply_carbon_tax: boolean;
  carbon_tax_price_per_tco2: number;
  internal_carbon_price_per_tco2: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface SimRun {
  id?: string;
  user_id: string;
  scenario_id: string;
  organization_id?: string;
  year: number;
  executed_at?: string;
  base_energy_cost: number;
  base_carbon_cost: number;
  scenario_energy_cost: number;
  scenario_carbon_cost: number;
  delta_total_cost: number;
  total_emissions_tco2: number;
  created_at?: string;
}

export interface SimRunLine {
  id?: string;
  run_id: string;
  activity_id: string;
  energy_type: string;
  baseline_emissions_tco2: number;
  baseline_energy_cost: number;
  scenario_energy_cost: number;
  scenario_carbon_cost: number;
  created_at?: string;
}

export interface SimulationResults {
  run: SimRun;
  lines: SimRunLine[];
  scenario: SimScenario;
  activities: ActivityEnergy[];
}

export const ENERGY_TYPES = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'gasoline', label: 'Essence' },
  { value: 'natural_gas', label: 'Gaz naturel' },
  { value: 'heavy_fuel_oil', label: 'Fioul lourd' },
  { value: 'coal', label: 'Charbon' },
  { value: 'electricity', label: 'Électricité' }
] as const;

export const CATEGORIES = [
  { value: 'mobile_combustion', label: 'Combustion mobile' },
  { value: 'stationary_combustion', label: 'Combustion fixe' },
  { value: 'electricity', label: 'Électricité' }
] as const;

export const UNITS = [
  { value: 'L', label: 'Litres (L)' },
  { value: 'kg', label: 'Kilogrammes (kg)' },
  { value: 'm3', label: 'Mètres cubes (m³)' },
  { value: 'kWh', label: 'Kilowattheures (kWh)' },
  { value: 'MWh', label: 'Mégawattheures (MWh)' }
] as const;

export const CURRENCIES = [
  { value: 'TND', label: 'Dinar tunisien (TND)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar US ($)' }
] as const;