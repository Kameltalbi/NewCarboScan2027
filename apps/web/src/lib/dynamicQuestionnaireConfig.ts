import { DynamicQuestion, SectorMapping } from '@/types/dynamicQuestionnaire';

// Function to get translated countries
export const getTranslatedCountries = (t: any) => [
  { value: 'TN', label: t("questionnaire.dynamicQuestionnaire.countries.TN") },
  { value: 'MA', label: t("questionnaire.dynamicQuestionnaire.countries.MA") },
  { value: 'DZ', label: t("questionnaire.dynamicQuestionnaire.countries.DZ") },
  { value: 'SN', label: t("questionnaire.dynamicQuestionnaire.countries.SN") },
  { value: 'CI', label: t("questionnaire.dynamicQuestionnaire.countries.CI") },
  { value: 'CM', label: t("questionnaire.dynamicQuestionnaire.countries.CM") },
  { value: 'FR', label: t("questionnaire.dynamicQuestionnaire.countries.FR") },
  { value: 'BE', label: t("questionnaire.dynamicQuestionnaire.countries.BE") },
  { value: 'CH', label: t("questionnaire.dynamicQuestionnaire.countries.CH") },
  { value: 'CA', label: t("questionnaire.dynamicQuestionnaire.countries.CA") },
  { value: 'OTHER', label: t("questionnaire.dynamicQuestionnaire.countries.OTHER") }
];

// Available countries (fallback)
export const COUNTRIES = [
  { value: 'TN', label: 'Tunisie' },
  { value: 'MA', label: 'Maroc' },
  { value: 'DZ', label: 'Algérie' },
  { value: 'SN', label: 'Sénégal' },
  { value: 'CI', label: 'Côte d\'Ivoire' },
  { value: 'CM', label: 'Cameroun' },
  { value: 'FR', label: 'France' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CH', label: 'Suisse' },
  { value: 'CA', label: 'Canada' },
  { value: 'OTHER', label: 'Autre' }
];

// Function to get translated sectors
export const getTranslatedSectors = (t: any) => [
  { value: 'agriculture', label: t("questionnaire.dynamicQuestionnaire.sectors.agriculture") },
  { value: 'automotive', label: t("questionnaire.dynamicQuestionnaire.sectors.automotive") },
  { value: 'btp', label: t("questionnaire.dynamicQuestionnaire.sectors.btp") },
  { value: 'chemicals', label: t("questionnaire.dynamicQuestionnaire.sectors.chemicals") },
  { value: 'textile', label: t("questionnaire.dynamicQuestionnaire.sectors.textile") },
  { value: 'tourism', label: t("questionnaire.dynamicQuestionnaire.sectors.tourism") },
  { value: 'finance', label: t("questionnaire.dynamicQuestionnaire.sectors.finance") },
  { value: 'it', label: t("questionnaire.dynamicQuestionnaire.sectors.it") },
  { value: 'retail', label: t("questionnaire.dynamicQuestionnaire.sectors.retail") },
  { value: 'mining', label: t("questionnaire.dynamicQuestionnaire.sectors.mining") },
  { value: 'healthcare', label: t("questionnaire.dynamicQuestionnaire.sectors.healthcare") },
  { value: 'education', label: t("questionnaire.dynamicQuestionnaire.sectors.education") },
  { value: 'media', label: t("questionnaire.dynamicQuestionnaire.sectors.media") },
  { value: 'gaming', label: t("questionnaire.dynamicQuestionnaire.sectors.gaming") },
  { value: 'aerospace', label: t("questionnaire.dynamicQuestionnaire.sectors.aerospace") },
  { value: 'fishing', label: t("questionnaire.dynamicQuestionnaire.sectors.fishing") },
  { value: 'artisanat', label: t("questionnaire.dynamicQuestionnaire.sectors.artisanat") },
  { value: 'blockchain', label: t("questionnaire.dynamicQuestionnaire.sectors.blockchain") },
  { value: 'industrial_equipment', label: t("questionnaire.dynamicQuestionnaire.sectors.industrial_equipment") },
  { value: 'other', label: t("questionnaire.dynamicQuestionnaire.sectors.other") }
];

// Available sectors (fallback)
export const SECTORS = [
  { value: 'agriculture', label: 'Agriculture & Agroalimentaire' },
  { value: 'automotive', label: 'Automobile & Transport' },
  { value: 'btp', label: 'BTP & Construction' },
  { value: 'chemicals', label: 'Chimie & Plastique' },
  { value: 'textile', label: 'Textile & Mode' },
  { value: 'tourism', label: 'Tourisme & Hôtellerie' },
  { value: 'finance', label: 'Finance & Banques' },
  { value: 'it', label: 'Informatique & Numérique' },
  { value: 'retail', label: 'Commerce & Distribution' },
  { value: 'mining', label: 'Mines & Extraction' },
  { value: 'healthcare', label: 'Santé & Pharmaceutique' },
  { value: 'education', label: 'Éducation & Formation' },
  { value: 'media', label: 'Médias & Communication' },
  { value: 'gaming', label: 'Jeux Vidéo & Gaming' },
  { value: 'aerospace', label: 'Aéronautique & Spatial' },
  { value: 'fishing', label: 'Pêche & Aquaculture' },
  { value: 'artisanat', label: 'Artisanat & Métiers' },
  { value: 'blockchain', label: 'Blockchain & Crypto' },
  { value: 'industrial_equipment', label: 'Équipements Industriels' },
  { value: 'other', label: 'Autre secteur' }
];

// Function to get translated default questions
export const getTranslatedDefaultQuestions = (t: any): DynamicQuestion[] => [
  // SCOPE 1 - DIRECT EMISSIONS
  {
    id: 'electricity_consumption',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.electricity_consumption"),
    unit: 'kWh',
    emissionFactorSlug: 'electricite_kwh',
    category: 'energy',
    required: true,
    inputType: 'number',
    placeholder: 'Ex: 100000',
    helpText: 'Consultez vos factures d\'électricité de l\'année précédente'
  },
  {
    id: 'natural_gas_consumption',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.natural_gas_consumption"),
    unit: 'm³',
    emissionFactorSlug: 'gaz_naturel_m3',
    category: 'energy',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 15000',
    helpText: 'Chauffage, eau chaude, processus industriels'
  },
  {
    id: 'fleet_diesel_consumption',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.fleet_diesel_consumption"),
    unit: 'litre',
    emissionFactorSlug: 'diesel_litre',
    category: 'energy',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 5000',
    helpText: 'Incluez le diesel pour véhicules, générateurs de la flotte'
  },
  {
    id: 'heating_oil_consumption',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.heating_oil_consumption"),
    unit: 'litre',
    emissionFactorSlug: 'fioul_litre',
    category: 'energy',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 3000',
    helpText: 'Fioul domestique pour chauffage des locaux'
  },

  // SCOPE 1 - TRANSPORT
  {
    id: 'company_vehicles_gasoline',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.company_vehicles_gasoline"),
    unit: 'km',
    emissionFactorSlug: 'voiture',
    category: 'transport',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 30000',
    helpText: 'Véhicules de fonction, livraisons, déplacements professionnels'
  },
  {
    id: 'company_vehicles_diesel',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.company_vehicles_diesel"),
    unit: 'km',
    emissionFactorSlug: 'voiture_diesel',
    category: 'transport',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 50000',
    helpText: 'Véhicules utilitaires, camions, véhicules de service'
  },
  {
    id: 'fleet_trucks',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.fleet_trucks"),
    unit: 'km',
    emissionFactorSlug: 'transport_fourgon',
    category: 'transport',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 25000',
    helpText: 'Véhicules propres à votre société : camions de livraison, transport de marchandises, poids lourds'
  },

  // SCOPE 2 - INDIRECT ENERGY
  {
    id: 'steam_purchased',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.steam_purchased"),
    unit: 'tonnes',
    emissionFactorSlug: 'vapeur_tonne',
    category: 'energy',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 100',
    helpText: 'Vapeur industrielle achetée à des fournisseurs externes'
  },
  {
    id: 'cooling_purchased',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.cooling_purchased"),
    unit: 'kWh',
    emissionFactorSlug: 'froid_kwh',
    category: 'energy',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 10000',
    helpText: 'Réseaux de froid urbain, climatisation centralisée'
  },

  // SCOPE 3 - BUSINESS TRAVEL
  {
    id: 'business_flights_domestic',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.business_flights_domestic"),
    unit: 'km',
    emissionFactorSlug: 'avion_domestique_km',
    category: 'transport',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 15000',
    helpText: 'Vols nationaux pour déplacements professionnels'
  },
  {
    id: 'business_flights_international',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.business_flights_international"),
    unit: 'km',
    emissionFactorSlug: 'avion_international_km',
    category: 'transport',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 25000',
    helpText: 'Vols intercontinentaux pour déplacements professionnels'
  },
  {
    id: 'train_travel',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.train_travel"),
    unit: 'km',
    emissionFactorSlug: 'train_km',
    category: 'transport',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 8000',
    helpText: 'Déplacements professionnels en train'
  },

  {
    id: 'delivery_services',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.delivery_services"),
    unit: 'colis',
    emissionFactorSlug: 'livraison_urbaine',
    category: 'transport',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 200',
    helpText: 'Nombre total de livraisons/colis reçus de vos fournisseurs (matières premières, fournitures, équipements)'
  },

  {
    id: 'hotel_nights',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.hotel_nights"),
    unit: 'nuit',
    emissionFactorSlug: 'nuit_hotel',
    category: 'other',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 200',
    helpText: 'Hébergement lors de déplacements d\'affaires'
  },

  // SCOPE 3 - DIGITAL & IT
  {
    id: 'cloud_data_usage',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.cloud_data_usage"),
    unit: 'GB',
    emissionFactorSlug: 'cloud_gb',
    category: 'other',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 10000',
    helpText: 'Stockage cloud, serveurs, applications SaaS'
  },
  {
    id: 'emails_sent',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.emails_sent"),
    unit: 'emails',
    emissionFactorSlug: 'email_envoye',
    category: 'other',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 100000',
    helpText: 'Estimation basée sur le nombre d\'employés et d\'emails par jour'
  },
  {
    id: 'video_conferences',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.video_conferences"),
    unit: 'heures',
    emissionFactorSlug: 'visioconference_heure',
    category: 'other',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 2000',
    helpText: 'Zoom, Teams, Meet - estimation totale entreprise'
  },
  {
    id: 'website_visits',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.website_visits"),
    unit: 'visiteurs',
    emissionFactorSlug: 'site_web_visiteur',
    category: 'other',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 5000',
    helpText: 'Trafic web moyen mensuel'
  },

  // SCOPE 3 - WASTE & MATERIALS
  {
    id: 'paper_consumption',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.paper_consumption"),
    unit: 'kg',
    emissionFactorSlug: 'papier_bureau_kg',
    category: 'materials',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 500',
    helpText: 'Papier A4, documents, impressions'
  },
  {
    id: 'paper_waste',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.paper_waste"),
    unit: 'kg',
    emissionFactorSlug: 'papier_recycling',
    category: 'waste',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 500',
    helpText: 'Papier de bureau, cartons, emballages papier'
  },
  {
    id: 'plastic_waste',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.plastic_waste"),
    unit: 'kg',
    emissionFactorSlug: 'plastique_emballage',
    category: 'waste',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 200',
    helpText: 'Emballages plastique, bouteilles, contenants'
  },
  {
    id: 'general_waste',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.general_waste"),
    unit: 'kg',
    emissionFactorSlug: 'dechet_general_kg',
    category: 'waste',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 1000',
    helpText: 'Déchets ménagers et assimilés non triés'
  },

  // SCOPE 3 - EMPLOYEE COMMUTING
  {
    id: 'employee_commuting_car',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.employee_commuting_car"),
    unit: 'km/jour',
    emissionFactorSlug: 'voiture',
    category: 'transport',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 30',
    helpText: 'Distance aller-retour moyenne des employés en voiture'
  },
  {
    id: 'employee_commuting_public',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.employee_commuting_public"),
    unit: 'km/jour',
    emissionFactorSlug: 'transport_public_km',
    category: 'transport',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 25',
    helpText: 'Distance aller-retour moyenne en bus, métro, tramway'
  },

  // SCOPE 3 - PURCHASES & SERVICES
  {
    id: 'office_supplies',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.office_supplies"),
    unit: 'euros',
    emissionFactorSlug: 'fournitures_bureau_euro',
    category: 'materials',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 5000',
    helpText: 'Stylos, classeurs, équipements de bureau, mobilier'
  },
  {
    id: 'catering_meals',
    questionText: t("questionnaire.dynamicQuestionnaire.questions.catering_meals"),
    unit: 'repas',
    emissionFactorSlug: 'repas_traiteur',
    category: 'other',
    required: false,
    inputType: 'number',
    placeholder: 'Ex: 1000',
    helpText: 'Repas d\'affaires, événements, restauration entreprise'
  }
];

// Sector-specific questions
export const SECTOR_QUESTIONS: { [sectorId: string]: DynamicQuestion[] } = {
  agriculture: [
    {
      id: 'rice_cultivation',
      questionText: 'Combien d\'hectares de riz cultivez-vous (culture irriguée) ?',
      unit: 'hectare',
      emissionFactorSlug: 'riz_culture',
      category: 'production',
      sector: 'agriculture',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 50',
      helpText: 'Culture du riz en zone irriguée (émissions de méthane)'
    },
    {
      id: 'fertilizer_nitrogen',
      questionText: 'Quelle quantité d\'engrais azotés utilisez-vous annuellement ?',
      unit: 'kg',
      emissionFactorSlug: 'engrais_n',
      category: 'materials',
      sector: 'agriculture',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 2000',
      helpText: 'Engrais chimiques à base d\'azote'
    },
    {
      id: 'sugar_cane',
      questionText: 'Production annuelle de canne à sucre ?',
      unit: 'kg',
      emissionFactorSlug: 'canne_sucre',
      category: 'production',
      sector: 'agriculture',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 100000'
    },
    {
      id: 'irrigation_water',
      questionText: 'Volume d\'eau utilisé pour l\'irrigation mécanisée ?',
      unit: 'm³',
      emissionFactorSlug: 'irrigation',
      category: 'energy',
      sector: 'agriculture',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 50000'
    },
    {
      id: 'livestock_cattle',
      questionText: 'Nombre de têtes de bétail (bovins) ?',
      unit: 'têtes',
      emissionFactorSlug: 'bovin_tete',
      category: 'production',
      sector: 'agriculture',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 100',
      helpText: 'Vaches, taureaux, veaux (émissions de méthane)'
    },
    {
      id: 'agricultural_machinery',
      questionText: 'Consommation de carburant des machines agricoles ?',
      unit: 'litre',
      emissionFactorSlug: 'tracteur_diesel_litre',
      category: 'energy',
      sector: 'agriculture',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 3000',
      helpText: 'Tracteurs, moissonneuses, autres engins agricoles'
    }
  ],

  btp: [
    {
      id: 'concrete_volume',
      questionText: 'Combien de mètres cubes de béton utilisez-vous annuellement ?',
      unit: 'm³',
      emissionFactorSlug: 'beton_m3',
      category: 'materials',
      sector: 'btp',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 500',
      helpText: 'Béton coulé sur chantier et béton préfabriqué'
    },
    {
      id: 'steel_consumption',
      questionText: 'Quelle quantité d\'acier consommez-vous par an ?',
      unit: 'kg',
      emissionFactorSlug: 'acier_kg',
      category: 'materials',
      sector: 'btp',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 10000',
      helpText: 'Acier de construction, armatures, structures'
    },
    {
      id: 'cement_consumption',
      questionText: 'Consommation annuelle de ciment ?',
      unit: 'kg',
      emissionFactorSlug: 'ciment_kg',
      category: 'materials',
      sector: 'btp',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 50000'
    },
    {
      id: 'construction_transport',
      questionText: 'Distance moyenne de transport des matériaux de construction ?',
      unit: 'km',
      emissionFactorSlug: 'transport_materiau_km',
      category: 'transport',
      sector: 'btp',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 100'
    }
  ],

  textile: [
    {
      id: 'cotton_fabric',
      questionText: 'Quelle quantité de tissu en coton achetez-vous annuellement ?',
      unit: 'kg',
      emissionFactorSlug: 'coton_brut',
      category: 'materials',
      sector: 'textile',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 5000',
      helpText: 'Coton brut et tissus en coton'
    },
    {
      id: 'polyester_fiber',
      questionText: 'Quantité de polyester utilisée ?',
      unit: 'kg',
      emissionFactorSlug: 'polyester_fibre',
      category: 'materials',
      sector: 'textile',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 3000',
      helpText: 'Fibres et tissus en polyester'
    },
    {
      id: 'leather_tanning',
      questionText: 'Quantité de cuir tanné utilisée ?',
      unit: 'kg',
      emissionFactorSlug: 'cuir_tannage',
      category: 'materials',
      sector: 'textile',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 1000'
    }
  ],

  tourism: [
    {
      id: 'hotel_nights',
      questionText: 'Combien de nuitées d\'hôtel proposez-vous annuellement ?',
      unit: 'nuit',
      emissionFactorSlug: 'nuit_hotel3',
      category: 'other',
      sector: 'tourism',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 10000',
      helpText: 'Total des nuitées dans vos établissements'
    },
    {
      id: 'laundry_kg',
      questionText: 'Quelle quantité de linge traitez-vous annuellement ?',
      unit: 'kg',
      emissionFactorSlug: 'linge_kg',
      category: 'other',
      sector: 'tourism',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 50000',
      helpText: 'Linge des chambres, restaurants, spa'
    },
    {
      id: 'restaurant_meals',
      questionText: 'Nombre de repas servis annuellement ?',
      unit: 'repas',
      emissionFactorSlug: 'repas_restaurant',
      category: 'other',
      sector: 'tourism',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 100000'
    }
  ],

  chemicals: [
    {
      id: 'plastic_production',
      questionText: 'Production annuelle de plastique ?',
      unit: 'kg',
      emissionFactorSlug: 'plastique_pe',
      category: 'production',
      sector: 'chemicals',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 100000'
    },
    {
      id: 'chemical_solvents',
      questionText: 'Consommation de solvants organiques ?',
      unit: 'litre',
      emissionFactorSlug: 'solvant_laboratoire',
      category: 'materials',
      sector: 'chemicals',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 5000'
    },
    {
      id: 'nitric_acid',
      questionText: 'Utilisation d\'acide nitrique ?',
      unit: 'kg',
      emissionFactorSlug: 'acide_nitrique',
      category: 'materials',
      sector: 'chemicals',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 1000'
    }
  ],

  gaming: [
    {
      id: 'gaming_servers',
      questionText: 'Consommation électrique de vos serveurs de jeu ?',
      unit: 'kWh',
      emissionFactorSlug: 'serveur_jeu',
      category: 'energy',
      sector: 'gaming',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 50000'
    },
    {
      id: 'console_manufacturing',
      questionText: 'Nombre de consoles fabriquées/distribuées ?',
      unit: 'unité',
      emissionFactorSlug: 'console_fabrication',
      category: 'production',
      sector: 'gaming',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 1000'
    }
  ],

  education: [
    {
      id: 'school_meals',
      questionText: 'Nombre de repas servis en cantine (en plus des repas traiteur) ?',
      unit: 'repas',
      emissionFactorSlug: 'cantine_repas',
      category: 'other',
      sector: 'education',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 100000',
      helpText: 'Repas spécifiques à la cantine scolaire, en complément du catering général'
    }
  ],

  finance: [
    {
      id: 'it_equipment_employees',
      questionText: 'Nombre d\'employés avec équipements IT ?',
      unit: 'salarié.an',
      emissionFactorSlug: 'it_financier',
      category: 'other',
      sector: 'finance',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 100'
    }
  ],

  retail: [
    {
      id: 'refrigeration_linear',
      questionText: 'Mètres linéaires de réfrigération ?',
      unit: 'm.linéaire.an',
      emissionFactorSlug: 'rayon_froid',
      category: 'energy',
      sector: 'retail',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 100'
    },
    {
      id: 'store_lighting',
      questionText: 'Surface d\'éclairage des magasins ?',
      unit: 'm².an',
      emissionFactorSlug: 'eclairage_gms',
      category: 'energy',
      sector: 'retail',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 2000'
    },
    {
      id: 'packaging_materials',
      questionText: 'Quantité d\'emballages clients utilisés annuellement ?',
      unit: 'kg',
      emissionFactorSlug: 'emballage_commerce_kg',
      category: 'materials',
      sector: 'retail',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 5000',
      helpText: 'Sacs, boîtes, emballages cadeau, étiquettes'
    },
    {
      id: 'customer_parking',
      questionText: 'Estimation des kilomètres parcourus par les clients pour venir en magasin ?',
      unit: 'km',
      emissionFactorSlug: 'trajet_client_km',
      category: 'transport',
      sector: 'retail',
      required: false,
      inputType: 'number',
      placeholder: 'Ex: 200000',
      helpText: 'Scope 3 aval - déplacements clients'
    }
  ]
};

// Sector mappings - Each sector gets 15-20 core questions + sector-specific questions
export const SECTOR_MAPPINGS: SectorMapping[] = [
  {
    sectorId: 'agriculture',
    sectorName: 'Agriculture & Agroalimentaire',
    questions: ['rice_cultivation', 'fertilizer_nitrogen', 'sugar_cane', 'irrigation_water', 'livestock_cattle', 'agricultural_machinery'],
    defaultQuestions: [
      'electricity_consumption', 'natural_gas_consumption', 'fleet_diesel_consumption', 'heating_oil_consumption',
      'fleet_trucks', 'business_flights_domestic', 'train_travel',
      'paper_consumption', 'paper_waste', 'general_waste', 'employee_commuting_car',
      'office_supplies', 'catering_meals', 'emails_sent', 'cloud_data_usage'
    ]
  },
  {
    sectorId: 'btp',
    sectorName: 'BTP & Construction',
    questions: ['concrete_volume', 'steel_consumption', 'cement_consumption', 'construction_transport'],
    defaultQuestions: [
      'electricity_consumption', 'natural_gas_consumption', 'fleet_diesel_consumption', 'heating_oil_consumption',
      'fleet_trucks', 'business_flights_domestic', 'train_travel',
      'paper_consumption', 'paper_waste', 'general_waste', 'plastic_waste',
      'employee_commuting_car', 'office_supplies', 'emails_sent', 'cloud_data_usage'
    ]
  },
  {
    sectorId: 'textile',
    sectorName: 'Textile & Mode',
    questions: ['cotton_fabric', 'polyester_fiber', 'leather_tanning'],
    defaultQuestions: [
      'electricity_consumption', 'natural_gas_consumption', 'fleet_gasoline_consumption', 'business_flights_international',
      'train_travel', 'hotel_nights', 'cloud_data_usage', 'emails_sent', 'video_conferences',
      'paper_consumption', 'plastic_waste', 'general_waste', 'employee_commuting_public',
      'office_supplies', 'catering_meals'
    ]
  },
  {
    sectorId: 'tourism',
    sectorName: 'Tourisme & Hôtellerie',
    questions: ['hotel_nights', 'laundry_kg', 'restaurant_meals'],
    defaultQuestions: [
      'electricity_consumption', 'natural_gas_consumption', 'heating_oil_consumption', 'fleet_gasoline_consumption',
      'business_flights_international', 'train_travel', 'paper_consumption', 'paper_waste',
      'general_waste', 'plastic_waste', 'employee_commuting_car', 'employee_commuting_public',
      'office_supplies', 'emails_sent', 'website_visits'
    ]
  },
  {
    sectorId: 'chemicals',
    sectorName: 'Chimie & Plastique',
    questions: ['plastic_production', 'chemical_solvents', 'nitric_acid'],
    defaultQuestions: [
      'electricity_consumption', 'natural_gas_consumption', 'fleet_diesel_consumption', 'steam_purchased',
      'fleet_trucks', 'business_flights_domestic', 'train_travel',
      'paper_consumption', 'plastic_waste', 'general_waste', 'employee_commuting_car',
      'office_supplies', 'emails_sent', 'cloud_data_usage', 'video_conferences'
    ]
  },
  {
    sectorId: 'gaming',
    sectorName: 'Jeux Vidéo & Gaming',
    questions: ['gaming_servers', 'console_manufacturing'],
    defaultQuestions: [
      'electricity_consumption', 'cooling_purchased', 'fleet_gasoline_consumption', 'business_flights_international',
      'train_travel', 'hotel_nights', 'cloud_data_usage', 'emails_sent', 'video_conferences',
      'website_visits', 'paper_consumption', 'plastic_waste', 'employee_commuting_public',
      'office_supplies', 'catering_meals'
    ]
  },
  {
    sectorId: 'education',
    sectorName: 'Éducation & Formation',
    questions: ['school_meals'],  
    defaultQuestions: [
      'electricity_consumption', 'natural_gas_consumption', 'heating_oil_consumption', 'fleet_gasoline_consumption',
      'business_flights_domestic', 'train_travel', 'paper_consumption', 'paper_waste',
      'general_waste', 'employee_commuting_public', 'employee_commuting_car', 'office_supplies',
      'catering_meals', 'emails_sent', 'video_conferences', 'website_visits'
    ]
  },
  {
    sectorId: 'finance',
    sectorName: 'Finance & Banques',
    questions: ['it_equipment_employees'],
    defaultQuestions: [
      'electricity_consumption', 'cooling_purchased', 'fleet_gasoline_consumption', 'business_flights_international',
      'business_flights_domestic', 'train_travel', 'hotel_nights', 'cloud_data_usage',
      'emails_sent', 'video_conferences', 'website_visits', 'paper_consumption',
      'employee_commuting_public', 'office_supplies', 'catering_meals'
    ]
  },
  {
    sectorId: 'retail',
    sectorName: 'Commerce & Distribution',
    questions: ['refrigeration_linear', 'store_lighting', 'packaging_materials', 'customer_parking'],
    defaultQuestions: [
      'electricity_consumption', 'natural_gas_consumption', 'fleet_diesel_consumption', 'fleet_trucks',
      'business_flights_domestic', 'train_travel', 'paper_consumption', 'paper_waste',
      'plastic_waste', 'general_waste', 'employee_commuting_car', 'employee_commuting_public',
      'office_supplies', 'emails_sent', 'cloud_data_usage', 'website_visits'
    ]
  }
];