/**
 * Types pour les exports CBAM (PDF et Excel)
 */

export interface CBAMExportData {
  general: {
    company_name?: string;
    product_name: string;
    hs_code: string;
    country_origin: string;
    imported_quantity_tons: number;
    total_production_tons: number;
    reporting_period: string;
  };
  energy: {
    electricity_kwh: number;
    electricity_emission_factor: number;
    fuel_type?: string;
    fuel_quantity?: number;
    fuel_emission_factor?: number;
    total_fuel_emissions?: number;
  };
  materials: Array<{
    material_name: string;
    quantity: number;
    emission_factor: number;
    total_emissions: number;
  }>;
  transport: Array<{
    transport_mode: string;
    distance_km: number;
    emission_factor: number;
    emissions_tco2e: number;
  }>;
  process: Array<{
    process_name: string;
    emissions_tco2e: number;
  }>;
  results: {
    directEmissions: number;
    indirectEmissions: number;
    totalPlantEmissions: number;
    emissionsPerTon: number;
    declarableEmissions: number;
    cbamDue: number;
    etsPrice: number;
    localCarbonPrice: number;
  };
}

