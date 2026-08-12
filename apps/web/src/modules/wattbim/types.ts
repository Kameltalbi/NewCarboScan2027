export type WattBimBuilding = {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  building_type: 'office' | 'industrial' | 'retail' | 'warehouse' | 'mixed' | string;
  surface_m2: number | null;
  employees_count: number | null;
  year_built: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WattBimMeter = {
  id: string;
  organization_id: string;
  building_id: string;
  name: string;
  meter_type: 'elec' | 'gas' | 'water' | 'heat' | string;
  unit: string;
  provider: string | null;
  contract_ref: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WattBimReading = {
  id: string;
  organization_id: string;
  meter_id: string;
  period_start: string;
  period_end: string;
  value: number;
  unit: string;
  cost_amount: number | null;
  currency: string | null;
  source: 'manual' | 'import' | 'api' | 'iot' | string;
  is_validated: boolean;
  notes: string | null;
  created_at: string;
};

export type WattBimAlert = {
  id: string;
  organization_id: string;
  building_id: string | null;
  meter_id: string | null;
  alert_type: 'night_consumption' | 'peak' | 'drift' | 'overuse' | string;
  severity: 'low' | 'medium' | 'high' | string;
  message: string;
  value_observed: number | null;
  value_expected: number | null;
  status: 'open' | 'resolved' | 'ignored' | string;
  detected_at: string;
};

export type WattBimSaving = {
  id: string;
  organization_id: string;
  building_id: string;
  period_start: string;
  period_end: string;
  baseline_kwh: number;
  actual_kwh: number;
  savings_kwh: number;
  savings_amount: number | null;
  currency: string | null;
  calculation_method: string | null;
};
