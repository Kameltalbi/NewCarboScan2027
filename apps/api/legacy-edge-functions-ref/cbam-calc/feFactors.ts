/**
 * Emission Factors (FE) for CBAM Calculations
 * Default factors used when not provided in Excel
 */

export interface EmissionFactors {
  energy: Record<string, number>;
  materials: Record<string, number>;
  transport: Record<string, number>;
}

/**
 * Default emission factors for energy sources
 * Units: tCO2e per unit
 */
export const ENERGY_FACTORS: Record<string, number> = {
  electricity: 0.435, // tCO2e per MWh (EU average)
  gas: 0.002, // tCO2e per m³
  steam: 0.0001, // tCO2e per MJ
  fuel: 0.0025, // tCO2e per liter
  diesel: 0.00268, // tCO2e per liter
  gasoline: 0.00231, // tCO2e per liter
  coal: 0.0025, // tCO2e per kg
  natural_gas: 0.002, // tCO2e per m³
};

/**
 * Default emission factors for materials
 * Units: tCO2e per tonne
 */
export const MATERIAL_FACTORS: Record<string, number> = {
  steel: 1.85, // tCO2e per tonne
  aluminium: 8.24, // tCO2e per tonne
  lime: 1.2, // tCO2e per tonne
  coke: 3.2, // tCO2e per tonne
  cement: 0.766, // tCO2e per tonne
  plastic: 2.5, // tCO2e per tonne
  glass: 0.85, // tCO2e per tonne
  paper: 0.9, // tCO2e per tonne
};

/**
 * Default emission factors for transport modes
 * Units: tCO2e per tonne-kilometer
 */
export const TRANSPORT_FACTORS: Record<string, number> = {
  truck: 0.0001, // tCO2e per t-km (diesel truck)
  train: 0.000022, // tCO2e per t-km (electric train)
  ship: 0.00001, // tCO2e per t-km (cargo ship)
  plane: 0.0006, // tCO2e per t-km (air freight)
  barge: 0.000015, // tCO2e per t-km (inland waterway)
};

/**
 * Get emission factor for energy type
 */
export function getEnergyFactor(type: string, customFE?: number): number {
  if (customFE !== undefined && customFE > 0) {
    return customFE;
  }
  
  const normalizedType = type.toLowerCase().trim();
  return ENERGY_FACTORS[normalizedType] || ENERGY_FACTORS.electricity;
}

/**
 * Get emission factor for material type
 */
export function getMaterialFactor(type: string, customFE?: number): number {
  if (customFE !== undefined && customFE > 0) {
    return customFE;
  }
  
  const normalizedType = type.toLowerCase().trim();
  return MATERIAL_FACTORS[normalizedType] || 1.0; // Default 1.0 tCO2e/tonne
}

/**
 * Get emission factor for transport mode
 */
export function getTransportFactor(mode: string, customFE?: number): number {
  if (customFE !== undefined && customFE > 0) {
    return customFE;
  }
  
  const normalizedMode = mode.toLowerCase().trim();
  return TRANSPORT_FACTORS[normalizedMode] || TRANSPORT_FACTORS.truck;
}

/**
 * Export all factors as a single object
 */
export function getAllFactors(): EmissionFactors {
  return {
    energy: ENERGY_FACTORS,
    materials: MATERIAL_FACTORS,
    transport: TRANSPORT_FACTORS,
  };
}




