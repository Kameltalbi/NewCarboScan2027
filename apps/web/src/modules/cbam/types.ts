/**
 * CBAM Module Types
 * Types for Excel import, calculation, and reporting
 */

export interface CBAMGeneralData {
  product_name: string;
  hs_code: string;
  country: string;
  period: string;
  unit: string;
  quantity_imported: number;
}

export interface CBAMEnergyData {
  type: string; // electricity, gas, steam, fuel
  unit: string;
  quantity: number;
  FE?: number; // Emission factor (optional, will use default if not provided)
}

export interface CBAMMaterialData {
  type: string; // steel, aluminium, lime, coke, etc.
  unit: string;
  quantity: number;
  FE?: number; // Emission factor (optional)
}

export interface CBAMTransportData {
  mode: string; // truck, train, ship, plane
  distance_km: number;
  tonnage: number;
  FE?: number; // Emission factor (optional)
}

export interface CBAMProcessData {
  process_name: string;
  unit: string;
  value: number;
}

export interface CBAMPayload {
  general: CBAMGeneralData;
  energy: CBAMEnergyData[];
  materials: CBAMMaterialData[];
  transport: CBAMTransportData[];
  process: CBAMProcessData[];
}

export interface CBAMCalculationResult {
  energyEm: number; // tCO2e
  materialsEm: number; // tCO2e
  transportEm: number; // tCO2e
  processEm: number; // tCO2e
  total: number; // tCO2e
  breakdown: {
    energy: Array<{
      type: string;
      quantity: number;
      FE: number;
      emissions: number;
    }>;
    materials: Array<{
      type: string;
      quantity: number;
      FE: number;
      emissions: number;
    }>;
    transport: Array<{
      mode: string;
      distance: number;
      tonnage: number;
      FE: number;
      emissions: number;
    }>;
    process: Array<{
      name: string;
      value: number;
      emissions: number;
    }>;
  };
}

export interface CBAMReport {
  id: string;
  created_at: string;
  product_name: string;
  country: string;
  period: string;
  energy_em: number;
  materials_em: number;
  transport_em: number;
  process_em: number;
  total_em: number;
  pdf_url: string | null;
  raw_json: CBAMPayload;
}




