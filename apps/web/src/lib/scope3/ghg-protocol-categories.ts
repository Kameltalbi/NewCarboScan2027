/**
 * GHG PROTOCOL SCOPE 3 - 15 CATÉGORIES OFFICIELLES
 * 
 * Structure immuable selon le GHG Protocol Corporate Value Chain (Scope 3) Standard
 * Applicable à TOUS types d'entreprises
 * 
 * @see https://ghgprotocol.org/standards/scope-3-standard
 */

export type Scope3CategoryId = 
  | 'cat1_purchased_goods'
  | 'cat2_capital_goods'
  | 'cat3_fuel_energy'
  | 'cat4_upstream_transport'
  | 'cat5_waste'
  | 'cat6_business_travel'
  | 'cat7_commuting'
  | 'cat8_upstream_leased'
  | 'cat9_downstream_transport'
  | 'cat10_processing'
  | 'cat11_use_of_products'
  | 'cat12_end_of_life'
  | 'cat13_downstream_leased'
  | 'cat14_franchises'
  | 'cat15_investments';

export type DataQualityStatus = 'measured' | 'estimated' | 'not_available';

export interface Scope3Category {
  id: Scope3CategoryId;
  number: number;
  name: string;
  description: string;
  scope3Type: 'upstream' | 'downstream';
  
  // Logique d'activation
  activationQuestion: string;
  activationHint: string;
  
  // Calcul
  isAutoCalculated: boolean;
  calculationMethod: 'activity_based' | 'spend_based' | 'hybrid' | 'auto';
  acceptedInputTypes: string[];
  
  // Métadonnées
  isRequired: boolean;
  defaultActive: boolean;
}

/**
 * LES 15 CATÉGORIES SCOPE 3 (DÉFINITION OFFICIELLE)
 */
export const GHG_SCOPE3_CATEGORIES: Scope3Category[] = [
  // ============================================================
  // UPSTREAM (Catégories 1 à 8)
  // ============================================================
  
  {
    id: 'cat1_purchased_goods',
    number: 1,
    name: 'Biens et services achetés',
    description: 'Extraction, production et transport de tous les biens et services achetés ou acquis par l\'entreprise',
    scope3Type: 'upstream',
    activationQuestion: 'Votre entreprise achète-t-elle des biens ou des services pour son fonctionnement ?',
    activationHint: 'Fournitures de bureau, matières premières, services sous-traités, consommables...',
    isAutoCalculated: false,
    calculationMethod: 'hybrid',
    acceptedInputTypes: ['quantity', 'mass', 'monetary'],
    isRequired: true,
    defaultActive: false,
  },
  
  {
    id: 'cat2_capital_goods',
    number: 2,
    name: 'Biens d\'équipement',
    description: 'Extraction, production et transport de biens immobilisés (machines, véhicules, équipements, bâtiments...)',
    scope3Type: 'upstream',
    activationQuestion: 'Votre entreprise achète-t-elle des biens d\'équipement ou immobilisations ?',
    activationHint: 'Ordinateurs, serveurs, véhicules de société, machines, mobilier...',
    isAutoCalculated: false,
    calculationMethod: 'spend_based',
    acceptedInputTypes: ['monetary', 'quantity'],
    isRequired: false,
    defaultActive: false,
  },
  
  {
    id: 'cat3_fuel_energy',
    number: 3,
    name: 'Énergie non incluse dans les scopes 1 et 2',
    description: 'Extraction et transport des combustibles, pertes réseau électrique',
    scope3Type: 'upstream',
    activationQuestion: 'Votre entreprise vend-elle ou transporte-t-elle de l\'énergie (électricité, gaz, combustibles) ?',
    activationHint: 'Cette catégorie concerne les sociétés qui vendent ou transportent tout type d\'énergie : producteurs d\'électricité, distributeurs de gaz, raffineries, transporteurs d\'énergie...',
    isAutoCalculated: true, // 🔴 CALCUL AUTOMATIQUE
    calculationMethod: 'auto',
    acceptedInputTypes: [],
    isRequired: true,
    defaultActive: false,
  },
  
  {
    id: 'cat4_upstream_transport',
    number: 4,
    name: 'Transport et distribution amont',
    description: 'Transport et distribution de produits achetés entre fournisseurs et sites de l\'entreprise',
    scope3Type: 'upstream',
    activationQuestion: 'Vos fournisseurs livrent-ils des produits sur vos sites ?',
    activationHint: 'Livraisons de marchandises, transport de matières premières...',
    isAutoCalculated: false,
    calculationMethod: 'activity_based',
    acceptedInputTypes: ['distance', 'tonkm', 'monetary'],
    isRequired: false,
    defaultActive: false,
  },
  
  {
    id: 'cat5_waste',
    number: 5,
    name: 'Déchets générés',
    description: 'Traitement et élimination des déchets générés par les opérations de l\'entreprise',
    scope3Type: 'upstream',
    activationQuestion: 'Votre entreprise génère-t-elle des déchets ?',
    activationHint: 'Déchets industriels, de bureau, déchets dangereux, recyclage...',
    isAutoCalculated: false,
    calculationMethod: 'activity_based',
    acceptedInputTypes: ['mass'],
    isRequired: true,
    defaultActive: false,
  },
  
  {
    id: 'cat6_business_travel',
    number: 6,
    name: 'Déplacements professionnels',
    description: 'Transport des employés pour des activités professionnelles (avion, train, voiture de location...)',
    scope3Type: 'upstream',
    activationQuestion: 'Vos employés effectuent-ils des déplacements professionnels ?',
    activationHint: 'Vols d\'affaires, trajets en train, locations de voiture, taxis, hôtels...',
    isAutoCalculated: false,
    calculationMethod: 'activity_based',
    acceptedInputTypes: ['distance', 'trips', 'nights', 'monetary'],
    isRequired: true,
    defaultActive: false,
  },
  
  {
    id: 'cat7_commuting',
    number: 7,
    name: 'Déplacements domicile-travail',
    description: 'Transport des employés entre leur domicile et leur lieu de travail',
    scope3Type: 'upstream',
    activationQuestion: 'Vos employés se déplacent-ils pour venir travailler ?',
    activationHint: 'Voitures personnelles, transports en commun, vélos...',
    isAutoCalculated: false,
    calculationMethod: 'activity_based',
    acceptedInputTypes: ['distance', 'employees'],
    isRequired: true,
    defaultActive: false,
  },
  
  {
    id: 'cat8_upstream_leased',
    number: 8,
    name: 'Actifs loués en amont',
    description: 'Exploitation d\'actifs loués par l\'entreprise (non inclus dans Scope 1 & 2)',
    scope3Type: 'upstream',
    activationQuestion: 'Votre entreprise loue-t-elle des actifs (bâtiments, véhicules, équipements) ?',
    activationHint: 'Locaux loués, véhicules de fonction en leasing...',
    isAutoCalculated: false,
    calculationMethod: 'spend_based',
    acceptedInputTypes: ['monetary', 'surface', 'quantity'],
    isRequired: false,
    defaultActive: false,
  },
  
  // ============================================================
  // DOWNSTREAM (Catégories 9 à 15)
  // ============================================================
  
  {
    id: 'cat9_downstream_transport',
    number: 9,
    name: 'Transport et distribution aval',
    description: 'Transport et distribution de produits vendus entre les sites de l\'entreprise et le consommateur final',
    scope3Type: 'downstream',
    activationQuestion: 'Votre entreprise vend-elle des produits livrés à des clients ?',
    activationHint: 'Livraisons de produits finis, logistique e-commerce...',
    isAutoCalculated: false,
    calculationMethod: 'activity_based',
    acceptedInputTypes: ['distance', 'tonkm', 'monetary'],
    isRequired: false,
    defaultActive: false,
  },
  
  {
    id: 'cat10_processing',
    number: 10,
    name: 'Transformation de produits vendus',
    description: 'Transformation de produits intermédiaires vendus par des tiers (B2B)',
    scope3Type: 'downstream',
    activationQuestion: 'Votre entreprise vend-elle des produits intermédiaires transformés par d\'autres entreprises ?',
    activationHint: 'Vente de composants, matières premières, produits semi-finis...',
    isAutoCalculated: false,
    calculationMethod: 'spend_based',
    acceptedInputTypes: ['monetary', 'mass'],
    isRequired: false,
    defaultActive: false,
  },
  
  {
    id: 'cat11_use_of_products',
    number: 11,
    name: 'Utilisation des produits vendus',
    description: 'Utilisation des produits vendus pendant leur durée de vie (consommation d\'énergie, recharges...)',
    scope3Type: 'downstream',
    activationQuestion: 'Votre entreprise vend-elle des produits qui consomment de l\'énergie pendant leur utilisation ?',
    activationHint: 'Véhicules, électroménager, équipements électriques...',
    isAutoCalculated: false,
    calculationMethod: 'activity_based',
    acceptedInputTypes: ['quantity', 'energy', 'lifetime'],
    isRequired: false,
    defaultActive: false,
  },
  
  {
    id: 'cat12_end_of_life',
    number: 12,
    name: 'Fin de vie des produits vendus',
    description: 'Traitement et élimination des produits vendus en fin de vie',
    scope3Type: 'downstream',
    activationQuestion: 'Vos produits génèrent-ils des déchets en fin de vie ?',
    activationHint: 'Recyclage, incinération, enfouissement de produits vendus...',
    isAutoCalculated: false,
    calculationMethod: 'activity_based',
    acceptedInputTypes: ['mass', 'quantity'],
    isRequired: false,
    defaultActive: false,
  },
  
  {
    id: 'cat13_downstream_leased',
    number: 13,
    name: 'Actifs loués en aval',
    description: 'Exploitation d\'actifs appartenant à l\'entreprise et loués à des tiers',
    scope3Type: 'downstream',
    activationQuestion: 'Votre entreprise loue-t-elle des actifs à des tiers (bâtiments, véhicules, équipements) ?',
    activationHint: 'Location de locaux, véhicules en leasing...',
    isAutoCalculated: false,
    calculationMethod: 'spend_based',
    acceptedInputTypes: ['monetary', 'surface', 'quantity'],
    isRequired: false,
    defaultActive: false,
  },
  
  {
    id: 'cat14_franchises',
    number: 14,
    name: 'Franchises',
    description: 'Exploitation de franchises non contrôlées par l\'entreprise',
    scope3Type: 'downstream',
    activationQuestion: 'Votre entreprise possède-t-elle un réseau de franchises ?',
    activationHint: 'Émissions des franchisés indépendants...',
    isAutoCalculated: false,
    calculationMethod: 'spend_based',
    acceptedInputTypes: ['monetary', 'quantity'],
    isRequired: false,
    defaultActive: false,
  },
  
  {
    id: 'cat15_investments',
    number: 15,
    name: 'Investissements',
    description: 'Exploitation d\'investissements financiers (actions, obligations, prêts...)',
    scope3Type: 'downstream',
    activationQuestion: 'Votre entreprise détient-elle des investissements financiers ou des participations ?',
    activationHint: 'Portefeuille d\'actions, obligations, participations dans d\'autres entreprises...',
    isAutoCalculated: false,
    calculationMethod: 'spend_based',
    acceptedInputTypes: ['monetary'],
    isRequired: false,
    defaultActive: false,
  },
];

/**
 * Récupérer une catégorie par son ID
 */
export function getScope3Category(id: Scope3CategoryId): Scope3Category | undefined {
  return GHG_SCOPE3_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Récupérer toutes les catégories amont
 */
export function getUpstreamCategories(): Scope3Category[] {
  return GHG_SCOPE3_CATEGORIES.filter(cat => cat.scope3Type === 'upstream');
}

/**
 * Récupérer toutes les catégories aval
 */
export function getDownstreamCategories(): Scope3Category[] {
  return GHG_SCOPE3_CATEGORIES.filter(cat => cat.scope3Type === 'downstream');
}

/**
 * Récupérer les catégories actives par défaut
 */
export function getDefaultActiveCategories(): Scope3Category[] {
  return GHG_SCOPE3_CATEGORIES.filter(cat => cat.defaultActive);
}
