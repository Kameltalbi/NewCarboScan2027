import { SurveyData } from '@/components/empreinte-produit-calculator/types';
import { EmissionsResult, EmissionCategory } from '@/types/empreinteProduit';
import { emissionFactors, conversionFactors } from './emissionFactors';
import { formatEmissions } from './emissionsFormatter';

export interface CarboStartFormData {
  // Scope 1
  flotte: string;
  nb_vehicules: number;
  km_flotte: number;
  carburant: string;
  equipements: string;
  conso_equipements: number;
  
  // Scope 2
  surface_locaux: number;
  conso_electricite: number;
  fournisseur_renouvelable: string;
  mode_chauffage: string;
  conso_chauffage: number;
  
  // Scope 3
  nb_collaborateurs: number;
  jours_site: number;
  transport_collaborateurs: string;
  distance_domicile: number;
  vols_court: number;
  vols_moyen: number;
  vols_long: number;
  voyages_train: number;
  achats_biens: number;
  prestations_sous_traitees: string;
  dechets: number;
  tri_dechets: string;
  postes_info: number;
  telephones: number;
  cloud: string;
  
  // Données générales
  secteur_activite: string;
  nb_sites_filiales: number;
  chiffre_affaires_tnd: number;
  ca_annuel: number;
  email_contact: string;
  
  // Nouvelles données contextuelles
  logo_url?: string;
  objective?: string;
  motivation?: string;
  target_year?: number;
  has_commitments?: boolean;
  commitment_details?: string;
}

// Original emission factors for backward compatibility
const originalEmissionFactors = {
  vehicles: {
    essence: 0.192,
    diesel: 0.173,
    électrique: 0.011,
    hybride: 0.1,
  },
  heating: {
    électricité: { factor: 0.4, consumption: 80 },
    "gaz naturel": { factor: 0.234, consumption: 120 },
    fioul: { factor: 2.52, consumption: 15 },
    bois: { factor: 0.015, consumption: 100 },
    "climatisation réversible": { factor: 0.28, consumption: 60 },
    aucun: { factor: 0, consumption: 0 },
  },
  flights: { short: 255, medium: 500, long: 1700 },
  train: 1.5,
  it: { laptop: 300, mobile: 70, screen: 120, desktop: 450 },
};

export function calculateEmpreinteProduitEmissions(data: CarboStartFormData): EmissionsResult {
  const categories: EmissionCategory[] = [];
  
  let scope1Total = 0;
  
  if (data.flotte === 'Oui' && data.nb_vehicules > 0) {
    let transportEmissions = 0;
    const kmTotal = data.km_flotte || 0;
    
    switch (data.carburant) {
      case 'Diesel':
        transportEmissions = (kmTotal / 100) * 7 * emissionFactors.combustibles.diesel;
        break;
      case 'Essence':
        transportEmissions = (kmTotal / 100) * 8 * emissionFactors.combustibles.essence;
        break;
      case 'Électrique':
        transportEmissions = (kmTotal / 100) * 20 * emissionFactors.electricite.tunisie;
        break;
      case 'Hybride':
        transportEmissions = (kmTotal / 100) * 5 * emissionFactors.combustibles.essence;
        break;
    }
    
    categories.push({ name: 'Transport de flotte', value: transportEmissions, scope: 1 });
    scope1Total += transportEmissions;
  }
  
  if (data.equipements === 'Oui' && data.conso_equipements > 0) {
    const equipmentEmissions = data.conso_equipements * emissionFactors.combustibles.diesel;
    categories.push({ name: 'Équipements fixes', value: equipmentEmissions, scope: 1 });
    scope1Total += equipmentEmissions;
  }
  
  let scope2Total = 0;
  
  const electricityEmissions = data.conso_electricite * emissionFactors.electricite.tunisie;
  categories.push({ name: 'Consommation électricité', value: electricityEmissions, scope: 2 });
  scope2Total += electricityEmissions;
  
  if (data.mode_chauffage && data.conso_chauffage > 0) {
    let heatingEmissions = 0;
    switch (data.mode_chauffage) {
      case 'Électricité':
        heatingEmissions = data.conso_chauffage * emissionFactors.electricite.tunisie;
        break;
      case 'Gaz':
        heatingEmissions = data.conso_chauffage * emissionFactors.combustibles.gaz_naturel;
        break;
      case 'Fioul':
        heatingEmissions = data.conso_chauffage * emissionFactors.combustibles.fioul_lourd;
        break;
    }
    categories.push({ name: 'Chauffage', value: heatingEmissions, scope: 2 });
    scope2Total += heatingEmissions;
  }
  
  let scope3Total = 0;
  
  if (data.nb_collaborateurs > 0 && data.distance_domicile > 0) {
    let transportFactor = 0;
    switch (data.transport_collaborateurs?.toLowerCase()) {
      case 'voiture':
        transportFactor = emissionFactors.transports.voiture_moyenne;
        break;
      case 'transport public':
        transportFactor = emissionFactors.transports.transport_public;
        break;
      default:
        transportFactor = emissionFactors.transports.voiture_moyenne;
    }
    
    const commutingEmissions = data.nb_collaborateurs * 
      data.distance_domicile * 
      conversionFactors.aller_retour * 
      (data.jours_site || 5) * 
      conversionFactors.semainesParAn * 
      transportFactor;
    
    categories.push({ name: 'Transport domicile-travail', value: commutingEmissions, scope: 3 });
    scope3Total += commutingEmissions;
  }
  
  const businessTravelEmissions = 
    (data.vols_court || 0) * 500 * emissionFactors.transports.avion_court +
    (data.vols_moyen || 0) * 1500 * emissionFactors.transports.avion_court +
    (data.vols_long || 0) * 5000 * emissionFactors.transports.avion_long +
    (data.voyages_train || 0) * 500 * emissionFactors.transports.train;
  
  if (businessTravelEmissions > 0) {
    categories.push({ name: 'Voyages d\'affaires', value: businessTravelEmissions, scope: 3 });
    scope3Total += businessTravelEmissions;
  }
  
  if (data.achats_biens > 0) {
    const purchaseEmissions = data.achats_biens * emissionFactors.achats.biens_services;
    categories.push({ name: 'Achats de biens', value: purchaseEmissions, scope: 3 });
    scope3Total += purchaseEmissions;
  }
  
  const itEmissions = 
    (data.postes_info || 0) * (300 / 5) +
    (data.telephones || 0) * (70 / 3);
  
  if (itEmissions > 0) {
    categories.push({ name: 'Équipements informatiques', value: itEmissions, scope: 3 });
    scope3Total += itEmissions;
  }
  
  if (data.dechets > 0) {
    const wasteFactor = data.tri_dechets === 'Oui' 
      ? emissionFactors.dechets.recyclage 
      : emissionFactors.dechets.decharge;
    const wasteEmissions = data.dechets * 1000 * wasteFactor;
    categories.push({ name: 'Gestion des déchets', value: wasteEmissions, scope: 3 });
    scope3Total += wasteEmissions;
  }
  
  if (data.cloud === 'Oui') {
    const cloudEmissions = data.nb_collaborateurs * 50 * 12 * 0.1;
    categories.push({ name: 'Services numériques', value: cloudEmissions, scope: 3 });
    scope3Total += cloudEmissions;
  }
  
  const totalEmissions = scope1Total + scope2Total + scope3Total;
  
  const scopes = [
    { scope: 1, value: scope1Total },
    { scope: 2, value: scope2Total },
    { scope: 3, value: scope3Total }
  ];
  const majorityScope = scopes.reduce((max, current) => 
    current.value > max.value ? current : max
  ).scope;
  
  return {
    totalEmissions,
    scope1: scope1Total,
    scope2: scope2Total,
    scope3: scope3Total,
    categoryBreakdown: categories,
    majorityScope
  };
}

// Utilise la fonction du nouveau module
export { formatEmissions };

export function getEmissionIntensity(emissions: number, revenue: number): number {
  return revenue > 0 ? emissions / revenue : 0;
}

// Main function for the free calculator (mini bilan pro - 25 questions)
export function calculateEmpreinteProduit(data: SurveyData): EmissionsResult {
  const categories: EmissionCategory[] = [];
  
  const safeValue = (value: number | null): number => value === null ? 0 : value;
  
  const getNumericValue = (range: string, type: 'electricity' | 'kilometers' | 'purchases' | 'gas' | 'fuel' | 'wood' | 'waste' | 'subcontracting'): number => {
    if (type === 'electricity') {
      switch (range) {
        case 'moins-5000': return 2500;
        case '5000-15000': return 10000;
        case '15000-50000': return 32500;
        case 'plus-50000': return 75000;
        default: return 0;
      }
    }
    if (type === 'gas') {
      switch (range) {
        case 'moins-1000': return 500;
        case '1000-3000': return 2000;
        case '3000-10000': return 6500;
        case 'plus-10000': return 15000;
        default: return 0;
      }
    }
    if (type === 'fuel') {
      switch (range) {
        case 'moins-500': return 250;
        case '500-1500': return 1000;
        case '1500-5000': return 3250;
        case 'plus-5000': return 7500;
        default: return 0;
      }
    }
    if (type === 'wood') {
      switch (range) {
        case 'moins-5': return 2.5;
        case '5-15': return 10;
        case '15-30': return 22.5;
        case 'plus-30': return 45;
        default: return 0;
      }
    }
    if (type === 'kilometers') {
      switch (range) {
        case 'moins-10000': return 7500;
        case '10000-25000': return 17500;
        case '25000-50000': return 37500;
        case 'plus-50000': return 75000;
        default: return 0;
      }
    }
    if (type === 'purchases') {
      switch (range) {
        case 'moins-100': return 50;
        case '100-500': return 300;
        case '500-2000': return 1250;
        case 'plus-2000': return 3000;
        default: return 0;
      }
    }
    if (type === 'waste') {
      switch (range) {
        case 'moins-1': return 0.5;
        case '1-5': return 3;
        case '5-20': return 12.5;
        case 'plus-20': return 35;
        default: return 0;
      }
    }
    if (type === 'subcontracting') {
      switch (range) {
        case 'aucune': return 0;
        case 'faible': return 25;
        case 'moderee': return 125;
        case 'importante': return 350;
        default: return 0;
      }
    }
    return 0;
  };

  // SCOPE 1 - Émissions directes
  let scope1Total = 0;
  
  // Combustibles pour chauffage
  const heatingSource = data.heatingSource;
  
  if (heatingSource === 'gaz' && data.gasConsumption) {
    const gasConsumption = getNumericValue(data.gasConsumption, 'gas');
    if (gasConsumption > 0) {
      const gasEmissions = gasConsumption * 2.056; // kg CO2e/m³
      categories.push({ name: "Chauffage au gaz", value: gasEmissions, scope: 1 });
      scope1Total += gasEmissions;
    }
  }
  
  if (heatingSource === 'fioul' && data.fuelConsumption) {
    const fuelConsumption = getNumericValue(data.fuelConsumption, 'fuel');
    if (fuelConsumption > 0) {
      const fuelEmissions = (fuelConsumption * 0.85 / 1000) * 3114;
      categories.push({ name: "Chauffage au fioul", value: fuelEmissions, scope: 1 });
      scope1Total += fuelEmissions;
    }
  }
  
  // Transport de flotte
  const vehicleCount = safeValue(data.vehicleCount);
  const averageKm = getNumericValue(data.averageKilometers, 'kilometers');
  
  if (vehicleCount > 0 && averageKm > 0) {
    const dieselVehicles = Math.floor(vehicleCount * 0.8);
    const petrolVehicles = vehicleCount - dieselVehicles;
    const dieselEmissions = (dieselVehicles * averageKm / 100) * 7 * 2.68;
    const petrolEmissions = (petrolVehicles * averageKm / 100) * 8 * 2.31;
    const totalVehicleEmissions = dieselEmissions + petrolEmissions;
    
    categories.push({ name: "Transport de flotte", value: totalVehicleEmissions, scope: 1 });
    scope1Total += totalVehicleEmissions;
  }

  // SCOPE 2 - Émissions indirectes énergie
  let scope2Total = 0;
  
  if (heatingSource === 'électricité' || heatingSource === 'climatisation réversible' || data.electricityConsumption) {
    const electricityConsumption = getNumericValue(data.electricityConsumption, 'electricity');
    if (electricityConsumption > 0) {
      const electricityEmissions = electricityConsumption * 0.523;
      categories.push({ name: "Consommation électricité", value: electricityEmissions, scope: 2 });
      scope2Total += electricityEmissions;
    }
  }
  
  const officeSpace = safeValue(data.officeSpace);
  if (officeSpace > 0 && data.heatingSource && data.heatingSource !== 'aucun') {
    let heatingEmissions = 0;
    switch (data.heatingSource.toLowerCase()) {
      case 'électricité': heatingEmissions = officeSpace * 80 * 0.523; break;
      case 'gaz': heatingEmissions = officeSpace * 120 * 0.234; break;
      case 'fioul': heatingEmissions = officeSpace * 15 * 2.52; break;
      case 'bois': heatingEmissions = officeSpace * 100 * 0.015; break;
      case 'climatisation réversible': heatingEmissions = officeSpace * 60 * 0.28; break;
    }
    if (heatingEmissions > 0) {
      categories.push({ name: "Chauffage", value: heatingEmissions, scope: 2 });
      scope2Total += heatingEmissions;
    }
  }

  // SCOPE 3 - Autres émissions indirectes
  let scope3Total = 0;
  
  // Biomasse
  if (heatingSource === 'bois' && data.woodConsumption) {
    const woodConsumption = getNumericValue(data.woodConsumption, 'wood');
    if (woodConsumption > 0) {
      const woodEmissions = (woodConsumption * 0.7) * 15;
      categories.push({ name: "Chauffage au bois", value: woodEmissions, scope: 3 });
      scope3Total += woodEmissions;
    }
  }
  
  // Transport domicile-travail
  const employeeCount = safeValue(data.employeeCount);
  if (employeeCount > 0) {
    const commutingEmissions = employeeCount * 20 * 220 * 0.2;
    categories.push({ name: "Transport domicile-travail", value: commutingEmissions, scope: 3 });
    scope3Total += commutingEmissions;
  }
  
  // Vols
  const shortFlights = safeValue(data.shortFlights);
  const mediumFlights = safeValue(data.mediumFlights);
  const longFlights = safeValue(data.longFlights);
  
  if (shortFlights > 0 || mediumFlights > 0 || longFlights > 0) {
    const totalFlightEmissions = shortFlights * 255 + mediumFlights * 500 + longFlights * 1700;
    categories.push({ name: "Voyages d'affaires (avion)", value: totalFlightEmissions, scope: 3 });
    scope3Total += totalFlightEmissions;
  }
  
  // Trains
  const trainTrips = safeValue(data.trainTrips);
  if (trainTrips > 0) {
    const trainEmissions = trainTrips * 1.5;
    categories.push({ name: "Voyages d'affaires (train)", value: trainEmissions, scope: 3 });
    scope3Total += trainEmissions;
  }
  
  // Achats de biens et services (KDT → kgCO2e)
  if (data.annualPurchases) {
    const purchasesKDT = getNumericValue(data.annualPurchases, 'purchases');
    if (purchasesKDT > 0) {
      // 0.350 kgCO2e/TND × 1000 TND/KDT = 350 kgCO2e/KDT
      const purchaseEmissions = purchasesKDT * 350;
      categories.push({ name: "Achats de biens et services", value: purchaseEmissions, scope: 3 });
      scope3Total += purchaseEmissions;
    }
  }
  
  // Sous-traitance
  if (data.subcontracting && data.subcontracting !== 'aucune') {
    const subKDT = getNumericValue(data.subcontracting, 'subcontracting');
    if (subKDT > 0) {
      const subEmissions = subKDT * 350; // même FE que achats
      categories.push({ name: "Sous-traitance", value: subEmissions, scope: 3 });
      scope3Total += subEmissions;
    }
  }
  
  // Fret & logistique
  const freightTonKm = safeValue(data.freightTonKm);
  if (freightTonKm > 0) {
    let freightFactor = 0.09; // routier par défaut (kgCO2e/t.km)
    switch (data.freightMode) {
      case 'routier': freightFactor = 0.09; break;
      case 'maritime': freightFactor = 0.0191; break;
      case 'ferroviaire': freightFactor = 0.022; break;
      case 'mixte': freightFactor = 0.05; break;
    }
    const freightEmissions = freightTonKm * freightFactor;
    categories.push({ name: "Fret & logistique", value: freightEmissions, scope: 3 });
    scope3Total += freightEmissions;
  }
  
  // Déchets
  if (data.wasteVolume) {
    const wasteTonnes = getNumericValue(data.wasteVolume, 'waste');
    if (wasteTonnes > 0) {
      let wasteFactor = 110; // kgCO2e/tonne déchets non triés (0.11 × 1000)
      switch (data.wasteRecycling) {
        case 'complet': wasteFactor = 21; break; // recyclage: réduction ~80%
        case 'partiel': wasteFactor = 65; break; // réduction ~40%
        case 'aucun': wasteFactor = 110; break;
      }
      const wasteEmissions = wasteTonnes * wasteFactor;
      categories.push({ name: "Gestion des déchets", value: wasteEmissions, scope: 3 });
      scope3Total += wasteEmissions;
    }
  }
  
  
  // Équipements informatiques
  const laptops = safeValue(data.laptops);
  const desktopComputers = safeValue(data.desktopComputers);
  
  if (laptops > 0 || desktopComputers > 0) {
    const laptopEmissions = laptops * (300 / 5);
    const desktopEmissions = desktopComputers * (450 / 5);
    const totalITEmissions = laptopEmissions + desktopEmissions;
    categories.push({ name: "Équipements informatiques", value: totalITEmissions, scope: 3 });
    scope3Total += totalITEmissions;
  }

  // Total en kg
  const totalEmissionsKg = scope1Total + scope2Total + scope3Total;

  const majorityScope = scope1Total > scope2Total && scope1Total > scope3Total ? 1 : 
                       (scope2Total > scope3Total ? 2 : 3);

  // Convertir kg → tonnes pour l'affichage
  const toTonnes = (kg: number) => kg / 1000;

  return {
    totalEmissions: toTonnes(totalEmissionsKg),
    scope1: toTonnes(scope1Total),
    scope2: toTonnes(scope2Total),
    scope3: toTonnes(scope3Total),
    categoryBreakdown: categories.map(c => ({ ...c, value: toTonnes(c.value) })),
    majorityScope,
  };
}
