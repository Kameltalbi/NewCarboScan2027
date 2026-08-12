
export interface EmissionCategory {
  name: string;
  value: number;
  scope: number;
}

export interface EmissionsResult {
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  categoryBreakdown: EmissionCategory[];
  majorityScope: number;
}

export interface IntensityMetrics {
  perEmployee: number;      // tCO2e / employé
  perM2: number;            // tCO2e / m²
  perKDT: number;           // tCO2e / KDT (milliers de dinars)
}
