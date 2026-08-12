import { getPlanConfig } from './planQuestionnaireConfig';
import { DynamicEmissionFactorsService } from './dynamicEmissionFactorsService';

export interface CarbonCalculationResult {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  breakdown: Record<string, number>;
  recommendations: string[];
  intensity: {
    perEmployee: number;
    perSquareMeter: number;
    perRevenue: number;
  };
  companyInfo: {
    numberOfEmployees: number;
    surfaceArea: number;
    annualRevenue: number;
  };
}

export const calculateCarbonFootprint = async (
  responses: Record<string, any>,
  planType: string
): Promise<CarbonCalculationResult> => {
  const planConfig = getPlanConfig(planType);
  let scope1 = 0;
  let scope2 = 0;
  let scope3 = 0;
  const breakdown: Record<string, number> = {};

  // Récupérer les facteurs d'émissions de la base de données
  const emissionFactors = await DynamicEmissionFactorsService.fetchAllEmissionFactors();
  
  // Helper function pour obtenir un facteur d'émission
  const getEmissionFactor = (slug: string): number => {
    const factor = emissionFactors[slug];
    return factor ? factor.emission_factor : 0;
  };

  // Calculs Scope 1 - Émissions directes
  
  // Consommation de carburants (flotte)
  if (responses.fleet_gasoline_consumption) {
    const factor = getEmissionFactor('gasoline');
    const emissions = responses.fleet_gasoline_consumption * factor / 1000;
    scope1 += emissions;
    breakdown['Carburant essence flotte'] = emissions;
  }

  if (responses.fleet_diesel_consumption) {
    const factor = getEmissionFactor('diesel');
    const emissions = responses.fleet_diesel_consumption * factor / 1000;
    scope1 += emissions;
    breakdown['Carburant diesel flotte'] = emissions;
  }

  if (responses.fleet_other_fuel_consumption) {
    const factor = getEmissionFactor('lpg');
    const emissions = responses.fleet_other_fuel_consumption * factor / 1000;
    scope1 += emissions;
    breakdown['Autres carburants flotte'] = emissions;
  }

  // Gaz naturel et combustibles fixes
  if (responses.gas_consumption) {
    const factor = getEmissionFactor('natural_gas');
    const gasEmissions = responses.gas_consumption * factor / 1000;
    scope1 += gasEmissions;
    breakdown['Gaz naturel'] = gasEmissions;
  }

  if (responses.heating_oil_consumption) {
    const factor = getEmissionFactor('heating_oil');
    const emissions = responses.heating_oil_consumption * factor / 1000;
    scope1 += emissions;
    breakdown['Fioul domestique'] = emissions;
  }

  if (responses.propane_consumption) {
    const factor = getEmissionFactor('propane');
    const emissions = responses.propane_consumption * factor / 1000;
    scope1 += emissions;
    breakdown['Propane'] = emissions;
  }

  // Calculs alternatifs par kilométrage si pas de données de consommation
  if (responses.annual_km_total && !responses.fleet_gasoline_consumption && !responses.fleet_diesel_consumption) {
    let kmEmissions = 0;
    
    // Calcul selon la répartition des véhicules
    if (responses.vehicles_gasoline) {
      const factor = getEmissionFactor('vehicle_km_gasoline');
      const avgKmPerVehicle = responses.annual_km_total / (responses.total_vehicles || 1);
      kmEmissions += responses.vehicles_gasoline * avgKmPerVehicle * factor / 1000;
    }
    
    if (responses.vehicles_diesel) {
      const factor = getEmissionFactor('vehicle_km_diesel');
      const avgKmPerVehicle = responses.annual_km_total / (responses.total_vehicles || 1);
      kmEmissions += responses.vehicles_diesel * avgKmPerVehicle * factor / 1000;
    }
    
    if (responses.vehicles_hybrid_gasoline || responses.vehicles_hybrid_diesel) {
      const factor = getEmissionFactor('vehicle_km_hybrid');
      const hybridCount = (responses.vehicles_hybrid_gasoline || 0) + (responses.vehicles_hybrid_diesel || 0);
      const avgKmPerVehicle = responses.annual_km_total / (responses.total_vehicles || 1);
      kmEmissions += hybridCount * avgKmPerVehicle * factor / 1000;
    }
    
    if (responses.vehicles_electric) {
      const factor = getEmissionFactor('vehicle_km_electric');
      const avgKmPerVehicle = responses.annual_km_total / (responses.total_vehicles || 1);
      kmEmissions += responses.vehicles_electric * avgKmPerVehicle * factor / 1000;
    }
    
    if (kmEmissions > 0) {
      scope1 += kmEmissions;
      breakdown['Transport véhicules (km)'] = kmEmissions;
    } else if (responses.annual_km_total) {
      // Calcul par défaut si pas de répartition
      const factor = getEmissionFactor('vehicle_km_diesel');
      const defaultEmissions = responses.annual_km_total * factor / 1000;
      scope1 += defaultEmissions;
      breakdown['Transport véhicules'] = defaultEmissions;
    }
  }

  // Calculs Scope 2 - Électricité
  if (responses.electricity_consumption) {
    const factor = getEmissionFactor('electricity');
    const electricityEmissions = responses.electricity_consumption * factor / 1000;
    scope2 += electricityEmissions;
    breakdown['Électricité'] = electricityEmissions;
  }

  // Calculs Scope 3 (seulement si le plan le permet)
  if (planConfig.scopes.includes(3)) {
    if (responses.paper_consumption) {
      const factor = getEmissionFactor('paper');
      const paperEmissions = responses.paper_consumption * factor / 1000;
      scope3 += paperEmissions;
      breakdown['Papier'] = paperEmissions;
    }

    if (responses.waste_production) {
      const factor = getEmissionFactor('waste');
      const wasteEmissions = responses.waste_production * 1000 * factor / 1000;
      scope3 += wasteEmissions;
      breakdown['Déchets'] = wasteEmissions;
    }

    if (responses.business_trips) {
      // Estimation: 500km par voyage d'affaires
      const factor = getEmissionFactor('business_trip');
      const businessTripEmissions = responses.business_trips * 500 * factor / 1000;
      scope3 += businessTripEmissions;
      breakdown['Voyages d\'affaires'] = businessTripEmissions;
    }

    if (responses.employee_commuting && responses.employees) {
      // Estimation: 50 semaines * 5 jours * distance * 2 (aller-retour)
      const factor = getEmissionFactor('employee_commuting');
      const employeeCount = getEmployeeCount(responses.employees);
      const commutingEmissions = responses.employee_commuting * 2 * 250 * employeeCount * factor / 1000;
      scope3 += commutingEmissions;
      breakdown['Déplacements domicile-travail'] = commutingEmissions;
    }
  }

  const total = scope1 + scope2 + scope3;

  // Extraire les informations de l'entreprise des réponses
  const numberOfEmployees = ((responses.nb_employes_permanents as number) || 0) + 
                           ((responses.nb_employes_temporaires as number) || 0) || 1;
  const surfaceArea = (responses.surface_totale as number) || 100;
  const annualRevenue = (responses.ca_annuel as number) || 1000000; // Use real CA or default 1M DT

  // Calculer l'intensité carbone
  const intensity = {
    perEmployee: total / numberOfEmployees, // tCO2e/employé
    perSquareMeter: (total * 1000) / surfaceArea, // kgCO2e/m²
    perRevenue: total / (annualRevenue / 1000000) // tCO2e/MDT
  };

  const companyInfo = {
    numberOfEmployees,
    surfaceArea,
    annualRevenue
  };

  // Recommandations selon le plan
  const recommendations = generateRecommendations(planType, { scope1, scope2, scope3, total, breakdown });

  return {
    scope1: Math.round(scope1 * 100) / 100,
    scope2: Math.round(scope2 * 100) / 100,
    scope3: Math.round(scope3 * 100) / 100,
    total: Math.round(total * 100) / 100,
    breakdown,
    recommendations,
    intensity: {
      perEmployee: Math.round(intensity.perEmployee * 100) / 100,
      perSquareMeter: Math.round(intensity.perSquareMeter * 10) / 10,
      perRevenue: Math.round(intensity.perRevenue * 100) / 100
    },
    companyInfo
  };
};

const getEmployeeCount = (employeeRange: string): number => {
  switch (employeeRange) {
    case '1-10': return 5;
    case '11-50': return 30;
    case '51-200': return 125;
    case '201-500': return 350;
    case '500+': return 750;
    default: return 10;
  }
};

const generateRecommendations = (
  planType: string,
  results: { scope1: number; scope2: number; scope3: number; total: number; breakdown: Record<string, number> }
): string[] => {
  const recommendations: string[] = [];
  const { scope1, scope2, scope3, total, breakdown } = results;

  // Recommandations de base (tous plans)
  if (scope2 > scope1) {
    recommendations.push("Priorisez la transition vers les énergies renouvelables pour réduire vos émissions liées à l'électricité.");
  }

  if (breakdown['Transport véhicules (km)'] > 1 || breakdown['Transport véhicules'] > 1) {
    recommendations.push("Considérez l'électrification de votre flotte de véhicules pour réduire les émissions directes.");
  }

  // Recommandations avancées (plan Plus)
  if (planType === 'plus') {
    if (scope3 > 0) {
      recommendations.push("Engagez vos fournisseurs dans une démarche de réduction carbone pour diminuer vos émissions indirectes.");
    }

    if (breakdown['Déplacements domicile-travail'] > 2) {
      recommendations.push("Développez le télétravail et les transports en commun pour réduire l'impact des déplacements domicile-travail.");
    }

    recommendations.push("Établissez une stratégie de décarbonation avec des objectifs chiffrés et un plan d'action détaillé.");
    recommendations.push("Sensibilisez vos équipes aux enjeux carbone et intégrez ces objectifs dans la stratégie d'entreprise.");
  }

  // Recommandation de base si peu d'émissions
  if (total < 5) {
    recommendations.push("Votre empreinte carbone est relativement faible. Concentrez-vous sur la sensibilisation et les bonnes pratiques.");
  }

  return recommendations.slice(0, planType === 'start' ? 3 : 8);
};

export const generateReportData = async (
  responses: Record<string, any>,
  planType: string
): Promise<any> => {
  const calculations = await calculateCarbonFootprint(responses, planType);
  const planConfig = getPlanConfig(planType);

  return {
    planType,
    planConfig,
    responses,
    calculations,
    generatedAt: new Date().toISOString(),
    reportTemplate: planConfig.reportTemplate,
    features: planConfig.features
  };
};