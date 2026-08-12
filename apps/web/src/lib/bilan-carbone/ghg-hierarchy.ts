// Hiérarchie normée GHG Protocol / Bilan Carbone®
// Structure : Scope > Poste > Catégorie > Sous-catégorie

export type ScopeNumber = 1 | 2 | 3;

export interface GHGPoste {
  id: string;
  scope: ScopeNumber;
  code: string; // Ex: "1.1", "3.4"
  name: string;
  description: string;
  mandatory: boolean; // Obligatoire selon GHG Protocol
  bilan_carbone_ref?: string; // Référence Bilan Carbone® si applicable
}

export interface GHGCategory {
  id: string;
  poste_id: string;
  code: string; // Ex: "1.1.1"
  name: string;
  description: string;
  examples: string[];
}

export interface GHGSubcategory {
  id: string;
  category_id: string;
  code: string; // Ex: "1.1.1.1"
  name: string;
  description: string;
}

// ============================================
// SCOPE 1 - Émissions directes
// ============================================

export const SCOPE_1_POSTES: GHGPoste[] = [
  {
    id: 'poste-1-1',
    scope: 1,
    code: '1.1',
    name: 'Combustion fixe',
    description: 'Émissions des installations fixes (chaudières, fours, etc.)',
    mandatory: true,
    bilan_carbone_ref: 'Poste 1',
  },
  {
    id: 'poste-1-2',
    scope: 1,
    code: '1.2',
    name: 'Combustion mobile',
    description: 'Émissions des véhicules possédés ou contrôlés',
    mandatory: true,
    bilan_carbone_ref: 'Poste 2',
  },
  {
    id: 'poste-1-3',
    scope: 1,
    code: '1.3',
    name: 'Procédés industriels',
    description: 'Émissions des procédés chimiques ou physiques',
    mandatory: true,
    bilan_carbone_ref: 'Poste 3',
  },
  {
    id: 'poste-1-4',
    scope: 1,
    code: '1.4',
    name: 'Émissions fugitives',
    description: 'Fuites de gaz réfrigérants, SF6, etc.',
    mandatory: true,
    bilan_carbone_ref: 'Poste 4',
  },
  {
    id: 'poste-1-5',
    scope: 1,
    code: '1.5',
    name: 'Biomasse',
    description: 'Combustion de biomasse (hors scope mais à reporter)',
    mandatory: false,
    bilan_carbone_ref: 'Poste 5',
  },
];

// ============================================
// SCOPE 2 - Émissions indirectes liées à l'énergie
// ============================================

export const SCOPE_2_POSTES: GHGPoste[] = [
  {
    id: 'poste-2-1',
    scope: 2,
    code: '2.1',
    name: 'Électricité',
    description: 'Consommation d\'électricité achetée',
    mandatory: true,
    bilan_carbone_ref: 'Poste 6',
  },
  {
    id: 'poste-2-2',
    scope: 2,
    code: '2.2',
    name: 'Vapeur, chaleur et froid',
    description: 'Consommation de réseaux de chaleur/froid',
    mandatory: true,
    bilan_carbone_ref: 'Poste 7',
  },
];

// ============================================
// SCOPE 3 - Autres émissions indirectes
// ============================================

export const SCOPE_3_POSTES: GHGPoste[] = [
  {
    id: 'poste-3-1',
    scope: 3,
    code: '3.1',
    name: 'Achats de biens et services',
    description: 'Émissions liées aux achats (matières premières, fournitures, services)',
    mandatory: false,
    bilan_carbone_ref: 'Poste 8',
  },
  {
    id: 'poste-3-2',
    scope: 3,
    code: '3.2',
    name: 'Biens d\'investissement',
    description: 'Émissions liées aux immobilisations (bâtiments, équipements)',
    mandatory: false,
    bilan_carbone_ref: 'Poste 9',
  },
  {
    id: 'poste-3-3',
    scope: 3,
    code: '3.3',
    name: 'Énergie amont',
    description: 'Extraction, production et transport des énergies (hors Scope 1 & 2)',
    mandatory: false,
    bilan_carbone_ref: 'Poste 10',
  },
  {
    id: 'poste-3-4',
    scope: 3,
    code: '3.4',
    name: 'Transport amont',
    description: 'Transport de marchandises achetées',
    mandatory: false,
    bilan_carbone_ref: 'Poste 11',
  },
  {
    id: 'poste-3-5',
    scope: 3,
    code: '3.5',
    name: 'Déchets',
    description: 'Traitement des déchets générés',
    mandatory: false,
    bilan_carbone_ref: 'Poste 12',
  },
  {
    id: 'poste-3-6',
    scope: 3,
    code: '3.6',
    name: 'Déplacements professionnels',
    description: 'Voyages d\'affaires (avion, train, voiture de location)',
    mandatory: false,
    bilan_carbone_ref: 'Poste 13',
  },
  {
    id: 'poste-3-7',
    scope: 3,
    code: '3.7',
    name: 'Déplacements domicile-travail',
    description: 'Trajets des employés',
    mandatory: false,
    bilan_carbone_ref: 'Poste 14',
  },
  {
    id: 'poste-3-8',
    scope: 3,
    code: '3.8',
    name: 'Actifs en location amont',
    description: 'Bâtiments, véhicules loués',
    mandatory: false,
    bilan_carbone_ref: 'Poste 15',
  },
  {
    id: 'poste-3-9',
    scope: 3,
    code: '3.9',
    name: 'Transport aval',
    description: 'Distribution des produits vendus',
    mandatory: false,
    bilan_carbone_ref: 'Poste 16',
  },
  {
    id: 'poste-3-10',
    scope: 3,
    code: '3.10',
    name: 'Transformation des produits vendus',
    description: 'Émissions de la transformation par les clients',
    mandatory: false,
    bilan_carbone_ref: 'Poste 17',
  },
  {
    id: 'poste-3-11',
    scope: 3,
    code: '3.11',
    name: 'Utilisation des produits vendus',
    description: 'Phase d\'usage des produits',
    mandatory: false,
    bilan_carbone_ref: 'Poste 18',
  },
  {
    id: 'poste-3-12',
    scope: 3,
    code: '3.12',
    name: 'Fin de vie des produits vendus',
    description: 'Traitement en fin de vie',
    mandatory: false,
    bilan_carbone_ref: 'Poste 19',
  },
  {
    id: 'poste-3-13',
    scope: 3,
    code: '3.13',
    name: 'Actifs en location aval',
    description: 'Actifs loués à des tiers',
    mandatory: false,
    bilan_carbone_ref: 'Poste 20',
  },
  {
    id: 'poste-3-14',
    scope: 3,
    code: '3.14',
    name: 'Franchises',
    description: 'Émissions des franchises',
    mandatory: false,
    bilan_carbone_ref: 'Poste 21',
  },
  {
    id: 'poste-3-15',
    scope: 3,
    code: '3.15',
    name: 'Investissements',
    description: 'Émissions des investissements financiers',
    mandatory: false,
    bilan_carbone_ref: 'Poste 22',
  },
];

// ============================================
// Catégories détaillées (exemples pour Scope 1 & 2)
// ============================================

export const GHG_CATEGORIES: GHGCategory[] = [
  // Scope 1 - Combustion fixe
  {
    id: 'cat-1-1-1',
    poste_id: 'poste-1-1',
    code: '1.1.1',
    name: 'Gaz naturel',
    description: 'Consommation de gaz naturel',
    examples: ['Chaudières gaz', 'Chauffage gaz'],
  },
  {
    id: 'cat-1-1-2',
    poste_id: 'poste-1-1',
    code: '1.1.2',
    name: 'Fioul',
    description: 'Consommation de fioul domestique ou lourd',
    examples: ['Chaudières fioul', 'Groupes électrogènes'],
  },
  {
    id: 'cat-1-1-3',
    poste_id: 'poste-1-1',
    code: '1.1.3',
    name: 'Charbon',
    description: 'Consommation de charbon',
    examples: ['Chaudières charbon', 'Procédés industriels'],
  },
  {
    id: 'cat-1-1-4',
    poste_id: 'poste-1-1',
    code: '1.1.4',
    name: 'GPL',
    description: 'Gaz de pétrole liquéfié',
    examples: ['Chauffage GPL', 'Procédés'],
  },

  // Scope 1 - Combustion mobile
  {
    id: 'cat-1-2-1',
    poste_id: 'poste-1-2',
    code: '1.2.1',
    name: 'Véhicules légers essence',
    description: 'Voitures et utilitaires essence',
    examples: ['Voitures de société', 'Utilitaires légers'],
  },
  {
    id: 'cat-1-2-2',
    poste_id: 'poste-1-2',
    code: '1.2.2',
    name: 'Véhicules légers diesel',
    description: 'Voitures et utilitaires diesel',
    examples: ['Voitures de société diesel', 'Utilitaires diesel'],
  },
  {
    id: 'cat-1-2-3',
    poste_id: 'poste-1-2',
    code: '1.2.3',
    name: 'Poids lourds',
    description: 'Camions et véhicules lourds',
    examples: ['Camions de livraison', 'Semi-remorques'],
  },
  {
    id: 'cat-1-2-4',
    poste_id: 'poste-1-2',
    code: '1.2.4',
    name: 'Engins de chantier',
    description: 'Engins mobiles non routiers',
    examples: ['Pelleteuses', 'Chariots élévateurs'],
  },

  // Scope 1 - Émissions fugitives
  {
    id: 'cat-1-4-1',
    poste_id: 'poste-1-4',
    code: '1.4.1',
    name: 'Gaz réfrigérants',
    description: 'Fuites de fluides frigorigènes',
    examples: ['Climatisation', 'Chambres froides', 'Pompes à chaleur'],
  },
  {
    id: 'cat-1-4-2',
    poste_id: 'poste-1-4',
    code: '1.4.2',
    name: 'Autres gaz fluorés',
    description: 'SF6, PFC, etc.',
    examples: ['Équipements électriques', 'Extincteurs'],
  },

  // Scope 2 - Électricité
  {
    id: 'cat-2-1-1',
    poste_id: 'poste-2-1',
    code: '2.1.1',
    name: 'Électricité réseau',
    description: 'Consommation électrique du réseau national',
    examples: ['Bureaux', 'Usines', 'Éclairage'],
  },
  {
    id: 'cat-2-1-2',
    poste_id: 'poste-2-1',
    code: '2.1.2',
    name: 'Électricité renouvelable',
    description: 'Électricité avec garanties d\'origine',
    examples: ['Contrats verts', 'Certificats verts'],
  },

  // Scope 2 - Chaleur/Froid
  {
    id: 'cat-2-2-1',
    poste_id: 'poste-2-2',
    code: '2.2.1',
    name: 'Réseau de chaleur',
    description: 'Chauffage urbain',
    examples: ['Chauffage collectif', 'Réseau de chaleur'],
  },
  {
    id: 'cat-2-2-2',
    poste_id: 'poste-2-2',
    code: '2.2.2',
    name: 'Réseau de froid',
    description: 'Climatisation urbaine',
    examples: ['Réseau de froid urbain'],
  },

  // Scope 3 - Achats
  {
    id: 'cat-3-1-1',
    poste_id: 'poste-3-1',
    code: '3.1.1',
    name: 'Matières premières',
    description: 'Achats de matières premières',
    examples: ['Métaux', 'Plastiques', 'Bois'],
  },
  {
    id: 'cat-3-1-2',
    poste_id: 'poste-3-1',
    code: '3.1.2',
    name: 'Fournitures',
    description: 'Fournitures de bureau et consommables',
    examples: ['Papier', 'Fournitures', 'Consommables'],
  },
  {
    id: 'cat-3-1-3',
    poste_id: 'poste-3-1',
    code: '3.1.3',
    name: 'Services',
    description: 'Prestations de services',
    examples: ['Conseil', 'Maintenance', 'Nettoyage'],
  },

  // Scope 3 - Déplacements professionnels
  {
    id: 'cat-3-6-1',
    poste_id: 'poste-3-6',
    code: '3.6.1',
    name: 'Avion',
    description: 'Voyages en avion',
    examples: ['Vols court-courrier', 'Vols long-courrier'],
  },
  {
    id: 'cat-3-6-2',
    poste_id: 'poste-3-6',
    code: '3.6.2',
    name: 'Train',
    description: 'Voyages en train',
    examples: ['TGV', 'Train régional'],
  },
  {
    id: 'cat-3-6-3',
    poste_id: 'poste-3-6',
    code: '3.6.3',
    name: 'Voiture de location',
    description: 'Véhicules de location',
    examples: ['Location courte durée', 'Location longue durée'],
  },

  // Scope 3 - Déplacements domicile-travail
  {
    id: 'cat-3-7-1',
    poste_id: 'poste-3-7',
    code: '3.7.1',
    name: 'Voiture personnelle',
    description: 'Trajets en voiture personnelle',
    examples: ['Trajets domicile-travail'],
  },
  {
    id: 'cat-3-7-2',
    poste_id: 'poste-3-7',
    code: '3.7.2',
    name: 'Transports en commun',
    description: 'Bus, métro, tramway',
    examples: ['Abonnements transports'],
  },

  // Scope 3 - Déchets
  {
    id: 'cat-3-5-1',
    poste_id: 'poste-3-5',
    code: '3.5.1',
    name: 'Déchets non dangereux',
    description: 'DIB, cartons, etc.',
    examples: ['Déchets industriels banals', 'Cartons'],
  },
  {
    id: 'cat-3-5-2',
    poste_id: 'poste-3-5',
    code: '3.5.2',
    name: 'Déchets dangereux',
    description: 'DIS, DEEE, etc.',
    examples: ['Déchets chimiques', 'Équipements électriques'],
  },
];

// ============================================
// Helpers
// ============================================

export const getAllPostes = (): GHGPoste[] => {
  return [...SCOPE_1_POSTES, ...SCOPE_2_POSTES, ...SCOPE_3_POSTES];
};

export const getPostesByScope = (scope: ScopeNumber): GHGPoste[] => {
  return getAllPostes().filter((p) => p.scope === scope);
};

export const getPosteById = (id: string): GHGPoste | undefined => {
  return getAllPostes().find((p) => p.id === id);
};

export const getPosteByCode = (code: string): GHGPoste | undefined => {
  return getAllPostes().find((p) => p.code === code);
};

export const getCategoriesByPoste = (posteId: string): GHGCategory[] => {
  return GHG_CATEGORIES.filter((c) => c.poste_id === posteId);
};

export const getCategoryById = (id: string): GHGCategory | undefined => {
  return GHG_CATEGORIES.find((c) => c.id === id);
};

export const getCategoryByCode = (code: string): GHGCategory | undefined => {
  return GHG_CATEGORIES.find((c) => c.code === code);
};

// Mapping depuis activity_data.category vers GHG Poste
export const mapActivityCategoryToGHGPoste = (
  activityCategory: string
): string | null => {
  const mapping: Record<string, string> = {
    // Scope 1
    energy_gas: 'poste-1-1',
    energy_fuel: 'poste-1-1',
    energy_coal: 'poste-1-1',
    transport_vehicle_owned: 'poste-1-2',
    refrigerants: 'poste-1-4',

    // Scope 2
    energy_electricity: 'poste-2-1',
    energy_heating: 'poste-2-2',
    energy_cooling: 'poste-2-2',

    // Scope 3
    purchases: 'poste-3-1',
    purchases_services: 'poste-3-1',
    capital_goods: 'poste-3-2',
    transport_upstream: 'poste-3-4',
    waste: 'poste-3-5',
    business_travel: 'poste-3-6',
    commuting: 'poste-3-7',
    transport_downstream: 'poste-3-9',
  };

  return mapping[activityCategory] || null;
};
