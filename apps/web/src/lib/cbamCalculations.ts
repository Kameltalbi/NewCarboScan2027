import { supabase } from "@/integrations/api/client";
import { CBAMData, CBAMResults } from '@/types/cbam';

// Prix carbone ETS actuel
const CARBON_PRICE_ETS = 85; // €/tCO₂e

// Cache pour les facteurs d'émission (TTL 5 minutes pour éviter les données stale)
let emissionFactorsCache: { [slug: string]: any } | null = null;
let emissionFactorsCacheTimestamp = 0;
const CBAM_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Invalider le cache CBAM (à appeler si les FE sont modifiés)
 */
export function invalidateCBAMCache(): void {
  emissionFactorsCache = null;
  emissionFactorsCacheTimestamp = 0;
}

// Fonction pour récupérer les facteurs d'émission depuis la base de données
const getEmissionFactors = async () => {
  if (emissionFactorsCache && (Date.now() - emissionFactorsCacheTimestamp < CBAM_CACHE_TTL)) {
    return emissionFactorsCache;
  }

  try {
    const { data, error } = await supabase
      .from('emission_factors')
      .select('*');

    if (error) {
      console.error('Erreur lors de la récupération des facteurs d\'émission:', error);
      return getDefaultEmissionFactors();
    }

    // Organiser les facteurs par slug pour un accès facile
    const factorsMap: { [slug: string]: any } = {};
    data?.forEach(factor => {
      if (factor.slug) {
        factorsMap[factor.slug] = factor;
      }
    });

    emissionFactorsCache = factorsMap;
    emissionFactorsCacheTimestamp = Date.now();
    return factorsMap;
  } catch (error) {
    console.error('Erreur lors de la récupération des facteurs d\'émission:', error);
    return getDefaultEmissionFactors();
  }
};

// Facteurs d'émission par défaut en cas d'erreur de base de données
const getDefaultEmissionFactors = () => {
  return {
    // Secteurs
    'cbam_cement': { emission_factor: 0.766, unit: 'tCO2e/tonne' },
    'cbam_steel': { emission_factor: 2.1, unit: 'tCO2e/tonne' },
    'cbam_aluminum': { emission_factor: 11.5, unit: 'tCO2e/tonne' },
    'cbam_fertilizer': { emission_factor: 3.5, unit: 'tCO2e/tonne' },
    'cbam_electricity': { emission_factor: 0.435, unit: 'tCO2e/MWh' },
    'cbam_hydrogen': { emission_factor: 9.6, unit: 'tCO2e/tonne' },
    
    // Électricité par pays
    'electricity_tunisia': { emission_factor: 0.45, unit: 'tCO2e/MWh' },
    'electricity_morocco': { emission_factor: 0.72, unit: 'tCO2e/MWh' },
    'electricity_turkey': { emission_factor: 0.49, unit: 'tCO2e/MWh' },
    'electricity_china': { emission_factor: 0.57, unit: 'tCO2e/MWh' },
    'electricity_default': { emission_factor: 0.55, unit: 'tCO2e/MWh' },
    
    // Énergie
    'natural_gas': { emission_factor: 0.184, unit: 'tCO2e/MWh' },
    'liquid_fuel': { emission_factor: 2.31, unit: 'tCO2e/m3' },
    
    // Transport
    'transport_truck': { emission_factor: 0.000062, unit: 'tCO2e/tonne/km' },
    'transport_ship': { emission_factor: 0.000014, unit: 'tCO2e/tonne/km' },
    'transport_air': { emission_factor: 0.000602, unit: 'tCO2e/tonne/km' }
  };
};

export const calculateCBAMEmissions = async (data: CBAMData): Promise<CBAMResults> => {
  const emissionFactors = await getEmissionFactors();

  // Émissions de production (Scope 1)
  let productionFactor = 1.5; // Valeur par défaut
  
  switch (data.sector) {
    case 'cement':
      productionFactor = emissionFactors['cbam_cement']?.emission_factor || 0.766;
      break;
    case 'steel':
      productionFactor = emissionFactors['cbam_steel']?.emission_factor || 2.1;
      break;
    case 'aluminum':
      productionFactor = emissionFactors['cbam_aluminum']?.emission_factor || 11.5;
      break;
    case 'fertilizer':
      productionFactor = emissionFactors['cbam_fertilizer']?.emission_factor || 3.5;
      break;
    case 'electricity':
      productionFactor = emissionFactors['cbam_electricity']?.emission_factor || 0.435;
      break;
    case 'hydrogen':
      productionFactor = emissionFactors['cbam_hydrogen']?.emission_factor || 9.6;
      break;
    default:
      productionFactor = 1.5;
  }

  const productionEmissions = data.annualVolume * productionFactor;

  // Émissions énergétiques (Scope 2)
  let energyEmissions = 0;
  
  if (!data.useDefaultData) {
    // Utiliser les données réelles
    const electricityFactorSlug = `electricity_${data.exportCountry}`;
    const countryElectricityFactor = emissionFactors[electricityFactorSlug]?.emission_factor || 
                                   emissionFactors['electricity_default']?.emission_factor || 0.55;
    
    const gasFactor = emissionFactors['natural_gas']?.emission_factor || 0.184;
    const fuelFactor = emissionFactors['liquid_fuel']?.emission_factor || 2.31;
    
    energyEmissions = 
      (data.electricity / 1000) * countryElectricityFactor + // Conversion kWh → MWh
      (data.gas * 10 / 1000) * gasFactor + // Conversion m³ → MWh
      (data.fuel / 1000) * fuelFactor; // Conversion L → m³
  } else {
    // Utiliser les valeurs par défaut UE (plus conservatrices)
    energyEmissions = productionEmissions * 0.3; // 30% supplémentaires pour l'énergie
  }

  // Émissions de transport (Scope 3)
  let transportEmissions = 0;
  
  if (!data.useAverageTransport) {
    const truckFactor = emissionFactors['transport_truck']?.emission_factor || 0.000062;
    const shipFactor = emissionFactors['transport_ship']?.emission_factor || 0.000014;
    const airFactor = emissionFactors['transport_air']?.emission_factor || 0.000602;
    
    transportEmissions = 
      data.truckDistance * data.annualVolume * truckFactor +
      data.shipDistance * data.annualVolume * shipFactor +
      data.airDistance * data.annualVolume * airFactor;
  } else {
    // Utiliser moyennes sectorielles (Tunisie → UE)
    const averageDistance = data.exportCountry === 'tunisia' ? 1500 : 2000; // km
    const shipFactor = emissionFactors['transport_ship']?.emission_factor || 0.000014;
    transportEmissions = averageDistance * data.annualVolume * shipFactor;
  }

  const totalEmissions = productionEmissions + energyEmissions + transportEmissions;
  const emissionsPerTonne = data.annualVolume > 0 ? totalEmissions / data.annualVolume : 0;
  const cbamCost = totalEmissions * CARBON_PRICE_ETS;

  // Calcul comparatif avec valeurs par défaut UE
  const defaultEmissions = data.annualVolume * productionFactor * 1.5; // UE applique une majoration
  const savings = Math.max(0, (defaultEmissions - totalEmissions) * CARBON_PRICE_ETS);

  // Recommandations automatiques
  const recommendations = generateRecommendations(data, totalEmissions, emissionsPerTonne);

  return {
    totalEmissions,
    emissionsPerTonne,
    cbamCost,
    emissionsBySource: {
      production: productionEmissions,
      energy: energyEmissions,
      transport: transportEmissions
    },
    recommendations,
    comparisonWithDefaults: {
      realData: totalEmissions,
      defaultData: defaultEmissions,
      savings
    }
  };
};

const generateRecommendations = (data: CBAMData, totalEmissions: number, emissionsPerTonne: number): string[] => {
  const recommendations: string[] = [];

  // Recommandations selon les émissions par tonne
  if (emissionsPerTonne > 3) {
    recommendations.push("Vos émissions par tonne sont élevées. Optimisez vos procédés de production.");
  }

  // Recommandations énergétiques
  if (!data.useDefaultData && data.electricity > data.gas * 10) {
    recommendations.push("Votre consommation électrique est importante. Explorez les énergies renouvelables.");
  }

  // Recommandations transport
  if (data.airDistance > 0) {
    recommendations.push("Le transport aérien génère des émissions importantes. Privilégiez le transport maritime.");
  }

  // Recommandations sectorielles
  const sectorRecommendations = {
    cement: "Investissez dans des technologies de capture carbone pour réduire les émissions du processus.",
    steel: "Adoptez l'hydrogène vert ou l'électrification des fours pour décarboner votre production.",
    aluminum: "Optimisez votre mix électrique et recyclez davantage d'aluminium secondaire.",
    fertilizer: "Utilisez des procédés catalytiques plus efficaces et de l'ammoniac vert."
  };

  const sectorRec = sectorRecommendations[data.sector as keyof typeof sectorRecommendations];
  if (sectorRec) {
    recommendations.push(sectorRec);
  }

  if (recommendations.length === 0) {
    recommendations.push("Votre profil carbone est déjà optimisé. Maintenez vos bonnes pratiques.");
  }

  return recommendations;
};

export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatEmissions = (emissions: number): string => {
  if (emissions >= 1000) {
    return `${(emissions / 1000).toFixed(1)} kt CO₂e`;
  }
  return `${emissions.toFixed(1)} t CO₂e`;
};