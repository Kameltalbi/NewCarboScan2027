// Types pour les questions conditionnelles de CarboScan Collect

export interface ConditionalRule {
  // Condition à vérifier
  condition: {
    question_key: string; // Question de référence
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
    value?: any; // Valeur de comparaison
  };
  // Action si la condition est vraie
  action: 'show' | 'hide' | 'require' | 'optional';
}

export interface CollectQuestion {
  key: string;
  label: string;
  description?: string;
  unit?: string;
  category: string;
  scope: number | null;
  input_type: 'number' | 'text' | 'select' | 'boolean' | 'date';
  options?: string[]; // Pour les select
  is_required: boolean;
  default_value?: any;
  placeholder?: string;
  help_text?: string;
  example?: string; // Exemple contextuel pour guider l'utilisateur
  allow_comment?: boolean; // Permet d'ajouter un commentaire à cette entrée
  // Règles conditionnelles
  conditional_rules?: ConditionalRule[];
  // Ordre d'affichage (peut changer selon les conditions)
  order_index: number;
}

/**
 * Exemple de questions avec règles conditionnelles
 */
export const COLLECT_QUESTIONS: CollectQuestion[] = [
  {
    key: 'total_surface',
    label: 'Surface totale des locaux',
    unit: 'm²',
    category: 'general',
    scope: null,
    input_type: 'number',
    is_required: true,
    order_index: 1,
  },
  {
    key: 'nb_collaborateurs',
    label: 'Nombre de collaborateurs',
    unit: 'personnes',
    category: 'general',
    scope: null,
    input_type: 'number',
    is_required: true,
    order_index: 2,
  },
  {
    key: 'utilise_gaz',
    label: 'Utilisez-vous du gaz naturel ?',
    category: 'scope1',
    scope: 1,
    input_type: 'boolean',
    is_required: true,
    order_index: 3,
  },
  {
    key: 'gaz_naturel_quantite',
    label: 'Consommation de gaz naturel',
    unit: 'm³',
    category: 'scope1',
    scope: 1,
    input_type: 'number',
    is_required: false,
    order_index: 4,
    conditional_rules: [
      {
        condition: {
          question_key: 'utilise_gaz',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'utilise_fioul',
    label: 'Utilisez-vous du fioul ?',
    category: 'scope1',
    scope: 1,
    input_type: 'boolean',
    is_required: true,
    order_index: 5,
  },
  {
    key: 'fioul_quantite',
    label: 'Consommation de fioul',
    unit: 'litres',
    category: 'scope1',
    scope: 1,
    input_type: 'number',
    is_required: false,
    order_index: 6,
    conditional_rules: [
      {
        condition: {
          question_key: 'utilise_fioul',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'electricite_quantite',
    label: 'Consommation d\'électricité',
    unit: 'kWh',
    category: 'scope2',
    scope: 2,
    input_type: 'number',
    is_required: true,
    order_index: 7,
  },
  {
    key: 'nb_vehicules',
    label: 'Nombre de véhicules',
    unit: 'véhicules',
    category: 'scope1',
    scope: 1,
    input_type: 'number',
    is_required: false,
    order_index: 8,
  },
  {
    key: 'km_flotte',
    label: 'Kilométrage total de la flotte',
    unit: 'km',
    category: 'scope1',
    scope: 1,
    input_type: 'number',
    is_required: false,
    order_index: 9,
    conditional_rules: [
      {
        condition: {
          question_key: 'nb_vehicules',
          operator: 'greater_than',
          value: 0,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'a_des_dechets',
    label: 'Gérez-vous des déchets ?',
    category: 'scope3',
    scope: 3,
    input_type: 'boolean',
    is_required: true,
    order_index: 10,
  },
  {
    key: 'dechets',
    label: 'Quantité de déchets',
    unit: 'tonnes',
    category: 'scope3',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 11,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_des_dechets',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'type_dechets',
    label: 'Type de déchets',
    category: 'scope3',
    scope: 3,
    input_type: 'select',
    options: ['Déchets ménagers', 'Déchets industriels', 'Déchets dangereux', 'Autre'],
    is_required: false,
    order_index: 12,
    help_text: 'Sélectionnez le type principal de déchets que vous gérez',
    conditional_rules: [
      {
        condition: {
          question_key: 'a_des_dechets',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },

  // ===== VAPEUR (Scope 1) =====
  {
    key: 'utilise_vapeur',
    label: 'Utilisez-vous de la vapeur pour vos processus industriels ?',
    category: 'vapeur',
    scope: 1,
    input_type: 'boolean',
    is_required: true,
    order_index: 13,
    help_text: 'La vapeur est souvent utilisée pour le chauffage, la stérilisation ou les processus industriels',
  },
  {
    key: 'vapeur_quantite',
    label: 'Consommation de vapeur',
    unit: 'MWh',
    category: 'vapeur',
    scope: 1,
    input_type: 'number',
    is_required: false,
    order_index: 14,
    help_text: 'Consommation annuelle de vapeur en MWh (Mégawattheures)',
    example: 'Exemple : 500 MWh/an pour une usine moyenne',
    allow_comment: true,
    conditional_rules: [
      {
        condition: {
          question_key: 'utilise_vapeur',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'vapeur_source',
    label: 'Source de production de vapeur',
    category: 'vapeur',
    scope: 1,
    input_type: 'select',
    options: ['Chaudière gaz', 'Chaudière fioul', 'Chaudière biomasse', 'Cogénération', 'Récupération de chaleur', 'Autre'],
    is_required: false,
    order_index: 15,
    help_text: 'Comment est produite la vapeur dans votre installation',
    conditional_rules: [
      {
        condition: {
          question_key: 'utilise_vapeur',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },

  // ===== FRET AMONT ET AVAL (Scope 3) =====
  {
    key: 'a_fret_amont',
    label: 'Avez-vous des émissions liées au fret amont (approvisionnement) ?',
    category: 'fret',
    scope: 3,
    input_type: 'boolean',
    is_required: true,
    order_index: 16,
    help_text: 'Transport des matières premières et fournitures vers votre entreprise',
  },
  {
    key: 'fret_amont_tonnes',
    label: 'Volume de fret amont',
    unit: 'tonnes.km',
    category: 'fret',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 17,
    help_text: 'Volume transporté multiplié par la distance (tonnes × kilomètres)',
    example: 'Exemple : 1000 tonnes transportées sur 500 km = 500 000 tonnes.km',
    allow_comment: true,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_fret_amont',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'fret_amont_mode',
    label: 'Mode de transport du fret amont',
    category: 'fret',
    scope: 3,
    input_type: 'select',
    options: ['Route', 'Ferroviaire', 'Maritime', 'Aérien', 'Mixte'],
    is_required: false,
    order_index: 18,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_fret_amont',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'a_fret_aval',
    label: 'Avez-vous des émissions liées au fret aval (livraison produits) ?',
    category: 'fret',
    scope: 3,
    input_type: 'boolean',
    is_required: true,
    order_index: 19,
    help_text: 'Transport de vos produits finis vers les clients',
  },
  {
    key: 'fret_aval_tonnes',
    label: 'Volume de fret aval',
    unit: 'tonnes.km',
    category: 'fret',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 20,
    help_text: 'Volume transporté multiplié par la distance (tonnes × kilomètres)',
    example: 'Exemple : 500 tonnes transportées sur 300 km = 150 000 tonnes.km',
    allow_comment: true,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_fret_aval',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'fret_aval_mode',
    label: 'Mode de transport du fret aval',
    category: 'fret',
    scope: 3,
    input_type: 'select',
    options: ['Route', 'Ferroviaire', 'Maritime', 'Aérien', 'Mixte'],
    is_required: false,
    order_index: 21,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_fret_aval',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },

  // ===== EAU (Scope 3) =====
  {
    key: 'eau_consommation',
    label: 'Consommation d\'eau',
    unit: 'm³',
    category: 'eau',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 22,
    help_text: 'Consommation annuelle d\'eau (eau potable, eau de process, etc.)',
    example: 'Exemple : 5000 m³/an pour une PME moyenne',
    allow_comment: true,
  },
  {
    key: 'eau_traitement',
    label: 'Traitement des eaux usées',
    category: 'eau',
    scope: 3,
    input_type: 'select',
    options: ['Station d\'épuration publique', 'Station d\'épuration interne', 'Pas de traitement', 'Autre'],
    is_required: false,
    order_index: 23,
    help_text: 'Comment sont traitées vos eaux usées',
  },
  {
    key: 'eau_recyclage',
    label: 'Avez-vous un système de recyclage/réutilisation de l\'eau ?',
    category: 'eau',
    scope: 3,
    input_type: 'boolean',
    is_required: false,
    order_index: 24,
    help_text: 'Réutilisation de l\'eau dans vos processus',
  },

  // ===== CONSTRUCTION ET TRAVAUX (Scope 3) =====
  {
    key: 'a_travaux_construction',
    label: 'Avez-vous réalisé des travaux de construction ou rénovation ?',
    category: 'construction',
    scope: 3,
    input_type: 'boolean',
    is_required: true,
    order_index: 25,
    help_text: 'Travaux de construction, rénovation, extension de bâtiments',
  },
  {
    key: 'travaux_montant',
    label: 'Montant des travaux de construction/rénovation',
    unit: '€',
    category: 'construction',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 26,
    help_text: 'Montant total des travaux réalisés dans l\'année',
    example: 'Exemple : 150 000 € de travaux de rénovation',
    allow_comment: true,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_travaux_construction',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'travaux_type',
    label: 'Type de travaux',
    category: 'construction',
    scope: 3,
    input_type: 'select',
    options: ['Construction neuve', 'Rénovation', 'Extension', 'Isolation', 'Autre'],
    is_required: false,
    order_index: 27,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_travaux_construction',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'travaux_surface',
    label: 'Surface concernée par les travaux',
    unit: 'm²',
    category: 'construction',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 28,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_travaux_construction',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },

  // ===== IMMOBILIER (Scope 3) =====
  {
    key: 'a_immobilier',
    label: 'Avez-vous des actifs immobiliers (bureaux, entrepôts, locaux) ?',
    category: 'immobilier',
    scope: 3,
    input_type: 'boolean',
    is_required: true,
    order_index: 29,
    help_text: 'Locaux que vous possédez ou louez pour votre activité',
  },
  {
    key: 'immobilier_surface_totale',
    label: 'Surface totale des locaux',
    unit: 'm²',
    category: 'immobilier',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 30,
    help_text: 'Surface totale de tous vos locaux (bureaux, entrepôts, ateliers, etc.)',
    example: 'Exemple : 2000 m² de bureaux + 5000 m² d\'entrepôt = 7000 m²',
    allow_comment: true,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_immobilier',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'immobilier_type',
    label: 'Type de locaux',
    category: 'immobilier',
    scope: 3,
    input_type: 'select',
    options: ['Bureaux', 'Entrepôts', 'Ateliers', 'Usines', 'Magasins', 'Mixte'],
    is_required: false,
    order_index: 31,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_immobilier',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'immobilier_propriete',
    label: 'Statut de propriété',
    category: 'immobilier',
    scope: 3,
    input_type: 'select',
    options: ['Propriétaire', 'Locataire', 'Mixte'],
    is_required: false,
    order_index: 32,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_immobilier',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },

  // ===== LOGISTIQUE INTERNE (Scope 1/3) =====
  {
    key: 'a_logistique_interne',
    label: 'Avez-vous une activité de logistique interne (manutention, stockage) ?',
    category: 'logistique',
    scope: 3,
    input_type: 'boolean',
    is_required: true,
    order_index: 33,
    help_text: 'Gestion des stocks, manutention, entreposage',
  },
  {
    key: 'logistique_engins',
    label: 'Nombre d\'engins de manutention',
    unit: 'engins',
    category: 'logistique',
    scope: 1,
    input_type: 'number',
    is_required: false,
    order_index: 34,
    help_text: 'Chariots élévateurs, transpalettes, etc.',
    example: 'Exemple : 5 chariots élévateurs électriques',
    allow_comment: true,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_logistique_interne',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'logistique_energie',
    label: 'Type d\'énergie des engins',
    category: 'logistique',
    scope: 1,
    input_type: 'select',
    options: ['Électrique', 'Diesel', 'GPL', 'Mixte'],
    is_required: false,
    order_index: 35,
    conditional_rules: [
      {
        condition: {
          question_key: 'a_logistique_interne',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
      {
        condition: {
          question_key: 'logistique_engins',
          operator: 'greater_than',
          value: 0,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'logistique_stockage',
    label: 'Surface de stockage',
    unit: 'm²',
    category: 'logistique',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 36,
    help_text: 'Surface totale dédiée au stockage',
    conditional_rules: [
      {
        condition: {
          question_key: 'a_logistique_interne',
          operator: 'equals',
          value: true,
        },
        action: 'show',
      },
    ],
  },

  // ===== DONNÉES RH DÉTAILLÉES (Scope 3) =====
  {
    key: 'rh_teletravail',
    label: 'Pourcentage de télétravail',
    unit: '%',
    category: 'rh',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 37,
    help_text: 'Pourcentage moyen de jours en télétravail par collaborateur',
    example: 'Exemple : 40% = 2 jours par semaine en moyenne',
    allow_comment: true,
  },
  {
    key: 'rh_distance_moyenne',
    label: 'Distance moyenne domicile-travail',
    unit: 'km',
    category: 'rh',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 38,
    help_text: 'Distance moyenne parcourue par les collaborateurs pour se rendre au travail',
    example: 'Exemple : 15 km en moyenne par collaborateur',
    allow_comment: true,
  },
  {
    key: 'rh_mode_transport',
    label: 'Mode de transport principal des collaborateurs',
    category: 'rh',
    scope: 3,
    input_type: 'select',
    options: ['Voiture', 'Transport en commun', 'Vélo', 'Marche', 'Mixte'],
    is_required: false,
    order_index: 39,
    help_text: 'Mode de transport le plus utilisé par vos collaborateurs',
  },
  {
    key: 'rh_deplacements_pro',
    label: 'Nombre de déplacements professionnels par an',
    unit: 'déplacements',
    category: 'rh',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 40,
    help_text: 'Déplacements professionnels (missions, rendez-vous clients, etc.)',
    example: 'Exemple : 200 déplacements professionnels par an',
    allow_comment: true,
  },
  {
    key: 'rh_deplacements_distance',
    label: 'Distance moyenne des déplacements professionnels',
    unit: 'km',
    category: 'rh',
    scope: 3,
    input_type: 'number',
    is_required: false,
    order_index: 41,
    help_text: 'Distance moyenne d\'un déplacement professionnel',
    conditional_rules: [
      {
        condition: {
          question_key: 'rh_deplacements_pro',
          operator: 'greater_than',
          value: 0,
        },
        action: 'show',
      },
    ],
  },
  {
    key: 'rh_deplacements_mode',
    label: 'Mode de transport des déplacements professionnels',
    category: 'rh',
    scope: 3,
    input_type: 'select',
    options: ['Voiture de service', 'Train', 'Avion', 'Voiture personnelle', 'Mixte'],
    is_required: false,
    order_index: 42,
    conditional_rules: [
      {
        condition: {
          question_key: 'rh_deplacements_pro',
          operator: 'greater_than',
          value: 0,
        },
        action: 'show',
      },
    ],
  },
];

