/**
 * CBAM Calculation Engine
 * Computes emissions from energy, materials, transport, and process data
 */

import {
  getEnergyFactor,
  getMaterialFactor,
  getTransportFactor,
} from './feFactors.ts';

export interface CBAMEnergyData {
  type: string;
  unit: string;
  quantity: number;
  FE?: number;
}

export interface CBAMMaterialData {
  type: string;
  unit: string;
  quantity: number;
  FE?: number;
}

export interface CBAMTransportData {
  mode: string;
  distance_km: number;
  tonnage: number;
  FE?: number;
}

export interface CBAMProcessData {
  process_name: string;
  unit: string;
  value: number;
}

export interface CBAMCalculationResult {
  energyEm: number;
  materialsEm: number;
  transportEm: number;
  processEm: number;
  total: number;
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

/**
 * Calculate CBAM emissions from payload data
 */
export function calculateCBAM(data: {
  energy: CBAMEnergyData[];
  materials: CBAMMaterialData[];
  transport: CBAMTransportData[];
  process: CBAMProcessData[];
}): CBAMCalculationResult {
  const breakdown = {
    energy: [] as Array<{ type: string; quantity: number; FE: number; emissions: number }>,
    materials: [] as Array<{ type: string; quantity: number; FE: number; emissions: number }>,
    transport: [] as Array<{ mode: string; distance: number; tonnage: number; FE: number; emissions: number }>,
    process: [] as Array<{ name: string; value: number; emissions: number }>,
  };

  // Calculate energy emissions: Σ(quantity × FE)
  let totalEnergyEm = 0;
  for (const item of data.energy) {
    // Convert quantity to standard unit if needed
    let quantityInStandardUnit = item.quantity;
    
    // Convert kWh to MWh for electricity if needed
    if (item.unit.toLowerCase() === 'kwh' && item.type.toLowerCase() === 'electricity') {
      quantityInStandardUnit = item.quantity / 1000; // Convert to MWh
    }
    
    const FE = getEnergyFactor(item.type, item.FE);
    const emissions = quantityInStandardUnit * FE;
    
    breakdown.energy.push({
      type: item.type,
      quantity: item.quantity,
      FE,
      emissions,
    });
    
    totalEnergyEm += emissions;
  }

  // Calculate materials emissions: Σ(quantity × FE)
  let totalMaterialsEm = 0;
  for (const item of data.materials) {
    // Ensure quantity is in tonnes
    let quantityInTonnes = item.quantity;
    if (item.unit.toLowerCase() === 'kg') {
      quantityInTonnes = item.quantity / 1000;
    }
    
    const FE = getMaterialFactor(item.type, item.FE);
    const emissions = quantityInTonnes * FE;
    
    breakdown.materials.push({
      type: item.type,
      quantity: item.quantity,
      FE,
      emissions,
    });
    
    totalMaterialsEm += emissions;
  }

  // Calculate transport emissions: Σ(distance × tonnage × FE)
  let totalTransportEm = 0;
  for (const item of data.transport) {
    const FE = getTransportFactor(item.mode, item.FE);
    // FE is per tonne-kilometer, so: distance × tonnage × FE
    const emissions = item.distance_km * item.tonnage * FE;
    
    breakdown.transport.push({
      mode: item.mode,
      distance: item.distance_km,
      tonnage: item.tonnage,
      FE,
      emissions,
    });
    
    totalTransportEm += emissions;
  }

  // Calculate process emissions: Σ(value)
  // Process values are already in tCO2e
  let totalProcessEm = 0;
  for (const item of data.process) {
    breakdown.process.push({
      name: item.process_name,
      value: item.value,
      emissions: item.value,
    });
    
    totalProcessEm += item.value;
  }

  // Calculate total
  const total = totalEnergyEm + totalMaterialsEm + totalTransportEm + totalProcessEm;

  return {
    energyEm: Math.round(totalEnergyEm * 10000) / 10000, // Round to 4 decimals
    materialsEm: Math.round(totalMaterialsEm * 10000) / 10000,
    transportEm: Math.round(totalTransportEm * 10000) / 10000,
    processEm: Math.round(totalProcessEm * 10000) / 10000,
    total: Math.round(total * 10000) / 10000,
    breakdown,
  };
}




