// Logique de calcul de l'empreinte carbone produit

import { 
  ProductCalculation, 
  CalculationResult, 
  LifeCyclePhase,
  TransportMode,
  EndOfLifeScenario
} from '../types';

// Facteurs d'émission pour le transport (kg CO2e / tonne.km)
const TRANSPORT_FACTORS: Record<TransportMode, number> = {
  road: 0.062,      // Camion moyen
  sea: 0.015,       // Cargo maritime
  air: 0.6,         // Avion cargo
  rail: 0.022,      // Train fret
  mixed: 0.04       // Mix moyen
};

// Facteurs d'émission pour l'électricité (kg CO2e / kWh)
const ELECTRICITY_FACTOR = 0.057; // Mix électrique France (à adapter selon pays)

// Facteurs d'émission fin de vie (kg CO2e / kg de déchet)
const END_OF_LIFE_FACTORS: Record<EndOfLifeScenario, number> = {
  recycling: -0.5,      // Évite les émissions (négatif)
  incineration: 0.5,   // Émissions de combustion
  landfill: 0.1,        // Émissions de décomposition
  reuse: -1.0          // Évite la production (négatif)
};

export function calculateProductFootprint(calculation: ProductCalculation): CalculationResult {
  const breakdown: CalculationResult['breakdown'] = [];
  let totalEmissions = 0;
  let realDataCount = 0;
  let estimatedDataCount = 0;

  // 1. Matières premières
  const materialsEmissions = calculation.materials.reduce((sum, material) => {
    const emissions = material.quantity * material.emissionFactor;
    if (material.isEstimated) {
      estimatedDataCount++;
    } else {
      realDataCount++;
    }
    return sum + emissions;
  }, 0);

  breakdown.push({
    phase: 'materials',
    emissions: materialsEmissions,
    percentage: 0, // Sera calculé après
    isEstimated: calculation.materials.some(m => m.isEstimated)
  });

  // 2. Fabrication
  const manufacturingEmissions = 
    calculation.manufacturing.electricity * ELECTRICITY_FACTOR +
    (calculation.manufacturing.otherEnergy?.quantity || 0) * 0.2; // Estimation pour autres énergies

  breakdown.push({
    phase: 'manufacturing',
    emissions: manufacturingEmissions,
    percentage: 0,
    isEstimated: calculation.manufacturing.isEstimated
  });

  if (calculation.manufacturing.isEstimated) {
    estimatedDataCount++;
  } else {
    realDataCount++;
  }

  // 3. Transport
  const transportFactor = TRANSPORT_FACTORS[calculation.transport.mode];
  const transportEmissions = (calculation.transport.distance * calculation.transport.weight / 1000) * transportFactor;

  breakdown.push({
    phase: 'transport',
    emissions: transportEmissions,
    percentage: 0,
    isEstimated: calculation.transport.isEstimated
  });

  if (calculation.transport.isEstimated) {
    estimatedDataCount++;
  } else {
    realDataCount++;
  }

  // 4. Utilisation (si renseignée)
  let usageEmissions = 0;
  if (calculation.usage) {
    const lifetimeYears = calculation.usage.lifetime || 1;
    const usesPerYear = calculation.usage.numberOfUses || 1;
    const consumptionPerUse = calculation.usage.consumptionPerUse || 0;
    
    usageEmissions = lifetimeYears * usesPerYear * consumptionPerUse * ELECTRICITY_FACTOR;

    breakdown.push({
      phase: 'usage',
      emissions: usageEmissions,
      percentage: 0,
      isEstimated: calculation.usage.isEstimated
    });

    if (calculation.usage.isEstimated) {
      estimatedDataCount++;
    } else {
      realDataCount++;
    }
  }

  // 5. Fin de vie (si renseignée)
  let endOfLifeEmissions = 0;
  if (calculation.endOfLife) {
    const totalWeight = calculation.materials.reduce((sum, m) => sum + m.quantity, 0);
    const factor = END_OF_LIFE_FACTORS[calculation.endOfLife.scenario];
    endOfLifeEmissions = totalWeight * (calculation.endOfLife.percentage / 100) * factor;

    breakdown.push({
      phase: 'endOfLife',
      emissions: endOfLifeEmissions,
      percentage: 0,
      isEstimated: calculation.endOfLife.isEstimated
    });

    if (calculation.endOfLife.isEstimated) {
      estimatedDataCount++;
    } else {
      realDataCount++;
    }
  }

  // Calcul du total
  totalEmissions = materialsEmissions + manufacturingEmissions + transportEmissions + usageEmissions + endOfLifeEmissions;

  // Calcul des pourcentages
  breakdown.forEach(item => {
    item.percentage = totalEmissions > 0 ? (item.emissions / totalEmissions) * 100 : 0;
  });

  // Déterminer la phase dominante
  const dominantPhase = breakdown.reduce((max, current) => 
    current.emissions > max.emissions ? current : max
  ).phase;

  // Qualité des données
  const totalDataPoints = realDataCount + estimatedDataCount;
  const dataQuality = {
    realData: totalDataPoints > 0 ? (realDataCount / totalDataPoints) * 100 : 0,
    estimatedData: totalDataPoints > 0 ? (estimatedDataCount / totalDataPoints) * 100 : 0
  };

  return {
    totalEmissions,
    breakdown,
    dominantPhase,
    dataQuality,
    methodology: 'Méthodologie simplifiée basée sur les facteurs d\'émission de la Base Carbone ADEME et estimations sectorielles'
  };
}

// Estimation automatique pour données manquantes
export function estimateMissingData(
  category: string,
  productWeight: number
): Partial<ProductCalculation> {
  const estimates: Partial<ProductCalculation> = {};

  // Estimation fabrication basée sur le poids
  estimates.manufacturing = {
    electricity: productWeight * 2, // Estimation: 2 kWh/kg
    isEstimated: true
  };

  // Estimation transport (distance moyenne 500 km par route)
  estimates.transport = {
    distance: 500,
    mode: 'road',
    weight: productWeight,
    isEstimated: true
  };

  return estimates;
}

