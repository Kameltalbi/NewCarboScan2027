/**
 * SOUS-CATÉGORIES DE SAISIE PAR CATÉGORIE GHG PROTOCOL SCOPE 3
 * 
 * Chaque catégorie GHG peut avoir plusieurs lignes de saisie
 * Structure générique applicable à tout type d'entreprise
 * Enrichi pour le secteur automobile/concession
 */

import type { Scope3CategoryId } from './ghg-protocol-categories';

export interface Scope3Subcategory {
  value: string;
  label: string;
  categoryId: Scope3CategoryId;
  defaultUnit: string;
  alternativeUnits?: string[];
  inputType: 'quantity' | 'mass' | 'distance' | 'monetary' | 'trips' | 'nights' | 'employees' | 'energy' | 'surface' | 'tonkm' | 'percentage' | 'years' | 'volume';
  description?: string;
}

/**
 * CATÉGORIE 1 : BIENS ET SERVICES ACHETÉS
 */
export const CAT1_PURCHASED_GOODS: Scope3Subcategory[] = [
  { value: 'cat1_office_supplies', label: 'Fournitures de bureau', categoryId: 'cat1_purchased_goods', defaultUnit: 'TND', alternativeUnits: ['€', 'USD'], inputType: 'monetary' },
  { value: 'cat1_raw_materials', label: 'Matières premières', categoryId: 'cat1_purchased_goods', defaultUnit: 'kg', alternativeUnits: ['t', 'TND'], inputType: 'mass' },
  { value: 'cat1_imported_spare_parts', label: 'Pièces détachées Importées', categoryId: 'cat1_purchased_goods', defaultUnit: 't', alternativeUnits: ['kg', 'TND'], inputType: 'mass', description: 'Pièces de rechange et composants importés' },
  { value: 'cat1_outsourced_services', label: 'Services sous-traités', categoryId: 'cat1_purchased_goods', defaultUnit: 'TND', alternativeUnits: ['€', 'USD'], inputType: 'monetary' },
  { value: 'cat1_moyens_generaux', label: 'Moyens généraux (OPEX)', categoryId: 'cat1_purchased_goods', defaultUnit: 'TND', alternativeUnits: ['€'], inputType: 'monetary', description: 'Charges d\'exploitation non immobilisées: fournitures, petit outillage, consommables divers' },
  { value: 'cat1_it_consumables', label: 'Consommables informatiques', categoryId: 'cat1_purchased_goods', defaultUnit: 'TND', alternativeUnits: ['€'], inputType: 'monetary', description: 'Cartouches, câbles, accessoires non immobilisés' },
  { value: 'cat1_maintenance_services', label: 'Services de maintenance', categoryId: 'cat1_purchased_goods', defaultUnit: 'TND', alternativeUnits: ['€'], inputType: 'monetary', description: 'Contrats de maintenance, réparations' },
  { value: 'cat1_consumables', label: 'Consommables (général)', categoryId: 'cat1_purchased_goods', defaultUnit: 'kg', alternativeUnits: ['TND'], inputType: 'mass' },
  { value: 'cat1_packaging', label: 'Emballages achetés', categoryId: 'cat1_purchased_goods', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat1_chemicals', label: 'Produits chimiques', categoryId: 'cat1_purchased_goods', defaultUnit: 'L', alternativeUnits: ['kg'], inputType: 'quantity' },
  { value: 'cat1_food_beverages', label: 'Alimentation et boissons', categoryId: 'cat1_purchased_goods', defaultUnit: 'TND', alternativeUnits: ['kg'], inputType: 'monetary' },
  { value: 'cat1_paper', label: 'Papier imprimé', categoryId: 'cat1_purchased_goods', defaultUnit: 'kg', alternativeUnits: ['rames'], inputType: 'mass', description: 'Rames papier, documents imprimés' },
  { value: 'cat1_other', label: 'Autres achats', categoryId: 'cat1_purchased_goods', defaultUnit: 'TND', inputType: 'monetary' },
];

/**
 * CATÉGORIE 2 : BIENS D'ÉQUIPEMENT (IMMOBILISATIONS)
 */
export const CAT2_CAPITAL_GOODS: Scope3Subcategory[] = [
  { value: 'cat2_it_equipment', label: 'Équipements informatiques', categoryId: 'cat2_capital_goods', defaultUnit: 'TND', alternativeUnits: ['unités'], inputType: 'monetary', description: 'Ordinateurs, serveurs, téléphones...' },
  { value: 'cat2_capex_general', label: 'CAPEX Équipements', categoryId: 'cat2_capital_goods', defaultUnit: 'TND', alternativeUnits: ['€'], inputType: 'monetary', description: 'Immobilisations générales: outillage durable, équipements de garage, aménagements' },
  { value: 'cat2_machinery', label: 'Machines et équipements industriels', categoryId: 'cat2_capital_goods', defaultUnit: 'TND', alternativeUnits: ['unités'], inputType: 'monetary' },
  { value: 'cat2_vehicles', label: 'Véhicules de société', categoryId: 'cat2_capital_goods', defaultUnit: 'unités', alternativeUnits: ['TND'], inputType: 'quantity', description: 'Véhicules achetés (pas en leasing)' },
  { value: 'cat2_furniture', label: 'Mobilier et aménagements', categoryId: 'cat2_capital_goods', defaultUnit: 'TND', inputType: 'monetary' },
  { value: 'cat2_buildings', label: 'Construction de bâtiments', categoryId: 'cat2_capital_goods', defaultUnit: 'm²', alternativeUnits: ['TND'], inputType: 'surface' },
  // Spécifique automobile - Pièces et consommables immobilisés
  { value: 'cat2_spare_parts_imported', label: 'Pièces détachées importées', categoryId: 'cat2_capital_goods', defaultUnit: 't', alternativeUnits: ['kg', 'TND'], inputType: 'mass', description: 'Masse totale des pièces importées (douane)' },
  { value: 'cat2_oils_lubricants', label: 'Huiles et lubrifiants achetés', categoryId: 'cat2_capital_goods', defaultUnit: 't', alternativeUnits: ['L', 'TND'], inputType: 'mass', description: 'Volume annuel d\'huiles/lubrifiants' },
  { value: 'cat2_batteries_new', label: 'Batteries achetées', categoryId: 'cat2_capital_goods', defaultUnit: 'unités', alternativeUnits: ['TND'], inputType: 'quantity', description: 'Batteries neuves pour stock/vente' },
  { value: 'cat2_tires_new', label: 'Pneus achetés', categoryId: 'cat2_capital_goods', defaultUnit: 'unités', alternativeUnits: ['TND'], inputType: 'quantity', description: 'Pneus neufs pour stock/vente' },
  { value: 'cat2_paints_solvents', label: 'Peintures et solvants achetés', categoryId: 'cat2_capital_goods', defaultUnit: 't', alternativeUnits: ['L', 'TND'], inputType: 'mass', description: 'Pour carrosserie et réparation' },
  { value: 'cat2_other', label: 'Autres immobilisations', categoryId: 'cat2_capital_goods', defaultUnit: 'TND', inputType: 'monetary' },
];

/**
 * CATÉGORIE 3 : ÉNERGIE (CALCULÉE AUTOMATIQUEMENT)
 */
export const CAT3_FUEL_ENERGY: Scope3Subcategory[] = [
  // 🔴 AUCUNE SAISIE MANUELLE - Calculé automatiquement depuis Scope 1 et 2
];

/**
 * CATÉGORIE 4 : TRANSPORT ET DISTRIBUTION AMONT
 */
export const CAT4_UPSTREAM_TRANSPORT: Scope3Subcategory[] = [
 { value: 'cat4_supplier_truck', label: 'Livraisons fournisseurs (camion)', categoryId: 'cat4_upstream_transport', defaultUnit: 'km', alternativeUnits: ['t.km'], inputType: 'distance' },
   { value: 'cat4_road_freight_local', label: 'Transport routier marchandises (local)', categoryId: 'cat4_upstream_transport', defaultUnit: 't.km', alternativeUnits: ['km', 'TND'], inputType: 'tonkm' },
   { value: 'cat4_supplier_ship', label: 'Transport maritime (fournisseurs)', categoryId: 'cat4_upstream_transport', defaultUnit: 't.km', alternativeUnits: ['TND'], inputType: 'tonkm' },
  { value: 'cat4_supplier_air', label: 'Fret aérien (fournisseurs)', categoryId: 'cat4_upstream_transport', defaultUnit: 't.km', alternativeUnits: ['TND'], inputType: 'tonkm' },
  { value: 'cat4_supplier_rail', label: 'Transport ferroviaire (fournisseurs)', categoryId: 'cat4_upstream_transport', defaultUnit: 't.km', inputType: 'tonkm' },
  { value: 'cat4_warehousing', label: 'Entreposage amont', categoryId: 'cat4_upstream_transport', defaultUnit: 'TND', inputType: 'monetary' },
  // Spécifique automobile - Import véhicules
  { value: 'cat4_vehicles_imported_roro', label: 'Véhicules importés (Ro-Ro maritime)', categoryId: 'cat4_upstream_transport', defaultUnit: 'unités', alternativeUnits: ['t.km'], inputType: 'quantity', description: 'Nombre de véhicules par mode de transport' },
  { value: 'cat4_vehicles_imported_rt', label: 'Véhicules importés (Route / RT)', categoryId: 'cat4_upstream_transport', defaultUnit: 'unités', alternativeUnits: ['km'], inputType: 'quantity', description: 'Nombre + distance moyenne' },
  { value: 'cat4_local_supplier_deliveries', label: 'Livraisons fournisseurs locaux', categoryId: 'cat4_upstream_transport', defaultUnit: 'livraisons', alternativeUnits: ['km'], inputType: 'quantity', description: 'Nombre de livraisons × distance moyenne' },
  { value: 'cat4_courier_deliveries', label: 'Livraisons par courrier/express', categoryId: 'cat4_upstream_transport', defaultUnit: 'envois', alternativeUnits: ['km'], inputType: 'quantity', description: 'Nombre de colis/envois' },
];

/**
 * CATÉGORIE 5 : DÉCHETS GÉNÉRÉS
 */
export const CAT5_WASTE: Scope3Subcategory[] = [
  { value: 'cat5_waste_recycling', label: 'Déchets recyclés (général)', categoryId: 'cat5_waste', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat5_waste_incineration', label: 'Déchets incinérés', categoryId: 'cat5_waste', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat5_waste_landfill', label: 'Déchets enfouis', categoryId: 'cat5_waste', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat5_waste_hazardous', label: 'Déchets dangereux (général)', categoryId: 'cat5_waste', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat5_wastewater', label: 'Eaux usées', categoryId: 'cat5_waste', defaultUnit: 'm³', inputType: 'quantity' },
  // Spécifique automobile - Déchets de garage
  { value: 'cat5_used_oils', label: 'Huiles usagées collectées', categoryId: 'cat5_waste', defaultUnit: 'L', alternativeUnits: ['kg'], inputType: 'volume', description: 'Huiles moteur, hydrauliques, etc.' },
  { value: 'cat5_used_batteries', label: 'Batteries usagées collectées', categoryId: 'cat5_waste', defaultUnit: 'unités', alternativeUnits: ['kg'], inputType: 'quantity', description: 'Batteries auto usagées' },
  { value: 'cat5_used_tires', label: 'Pneus usagés collectés', categoryId: 'cat5_waste', defaultUnit: 'unités', alternativeUnits: ['kg'], inputType: 'quantity', description: 'Pneus usés envoyés au recyclage' },
  { value: 'cat5_used_filters', label: 'Filtres usagés (huile, air, carburant)', categoryId: 'cat5_waste', defaultUnit: 'kg', alternativeUnits: ['unités'], inputType: 'mass', description: 'Tous types de filtres' },
  { value: 'cat5_cardboard_recycled', label: 'Cartons recyclés', categoryId: 'cat5_waste', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat5_plastic_recycled', label: 'Plastiques recyclés', categoryId: 'cat5_waste', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat5_metal_recycled', label: 'Métaux recyclés', categoryId: 'cat5_waste', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat5_unsorted_waste', label: 'Déchets non triés', categoryId: 'cat5_waste', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
];

/**
 * CATÉGORIE 6 : DÉPLACEMENTS PROFESSIONNELS
 */
export const CAT6_BUSINESS_TRAVEL: Scope3Subcategory[] = [
  { value: 'cat6_flight_domestic', label: 'Vol domestique', categoryId: 'cat6_business_travel', defaultUnit: 'trajets', alternativeUnits: ['km'], inputType: 'trips', description: 'Nombre de trajets aller-retour' },
  { value: 'cat6_flight_short', label: 'Vol international court-courrier', categoryId: 'cat6_business_travel', defaultUnit: 'trajets', alternativeUnits: ['km'], inputType: 'trips', description: '< 3000 km' },
  { value: 'cat6_flight_medium', label: 'Vol international moyen-courrier', categoryId: 'cat6_business_travel', defaultUnit: 'trajets', alternativeUnits: ['km'], inputType: 'trips', description: '3000-6000 km' },
  { value: 'cat6_flight_long', label: 'Vol international long-courrier', categoryId: 'cat6_business_travel', defaultUnit: 'trajets', alternativeUnits: ['km'], inputType: 'trips', description: '> 6000 km' },
  { value: 'cat6_flight_class', label: 'Classe de vol moyenne', categoryId: 'cat6_business_travel', defaultUnit: 'classe', inputType: 'quantity', description: 'Économique=1, Affaires=2, Première=3' },
  { value: 'cat6_train', label: 'Train', categoryId: 'cat6_business_travel', defaultUnit: 'km', inputType: 'distance' },
  { value: 'cat6_rental_car', label: 'Voiture de location', categoryId: 'cat6_business_travel', defaultUnit: 'jours', alternativeUnits: ['km', 'TND'], inputType: 'quantity', description: 'Jours de location hors Tunisie' },
  { value: 'cat6_taxi', label: 'Taxi / VTC', categoryId: 'cat6_business_travel', defaultUnit: 'TND', alternativeUnits: ['km'], inputType: 'monetary', description: 'Montant annuel en taxi' },
  { value: 'cat6_hotel', label: 'Nuitées d\'hôtel', categoryId: 'cat6_business_travel', defaultUnit: 'nuits', inputType: 'nights' },
];

/**
 * CATÉGORIE 7 : DÉPLACEMENTS DOMICILE-TRAVAIL
 */
export const CAT7_COMMUTING: Scope3Subcategory[] = [
  { value: 'cat7_company_cars', label: 'Voitures de location/société (trajets)', categoryId: 'cat7_commuting', defaultUnit: 'unités', alternativeUnits: ['km'], inputType: 'quantity', description: 'Nombre de véhicules utilisés' },
  { value: 'cat7_fuel_consumption', label: 'Consommation carburant (domicile-travail)', categoryId: 'cat7_commuting', defaultUnit: 'L', alternativeUnits: ['TND'], inputType: 'volume', description: 'Si connu directement' },
  { value: 'cat7_transport_mode', label: 'Mode de transport (enquête)', categoryId: 'cat7_commuting', defaultUnit: 'km/an', alternativeUnits: [], inputType: 'distance', description: 'Répartition par mode' },
  { value: 'cat7_avg_distance', label: 'Distance moyenne domicile-travail', categoryId: 'cat7_commuting', defaultUnit: 'km', inputType: 'distance', description: 'Par employé par jour' },
  { value: 'cat7_work_days', label: 'Jours de travail par employé/an', categoryId: 'cat7_commuting', defaultUnit: 'jours/semaine', inputType: 'quantity' },
  { value: 'cat7_carpooling_rate', label: 'Taux de covoiturage', categoryId: 'cat7_commuting', defaultUnit: '%', inputType: 'percentage', description: 'Pourcentage de covoiturage' },
  { value: 'cat7_car_gasoline', label: 'Voiture personnelle essence', categoryId: 'cat7_commuting', defaultUnit: 'km', inputType: 'distance', description: 'km/an ou km/semaine × employés' },
  { value: 'cat7_car_diesel', label: 'Voiture personnelle diesel', categoryId: 'cat7_commuting', defaultUnit: 'km', inputType: 'distance' },
  { value: 'cat7_car_electric', label: 'Voiture électrique', categoryId: 'cat7_commuting', defaultUnit: 'km', inputType: 'distance' },
  { value: 'cat7_public_transport', label: 'Transports en commun', categoryId: 'cat7_commuting', defaultUnit: 'km', inputType: 'distance' },
  { value: 'cat7_bike', label: 'Vélo / mobilité douce', categoryId: 'cat7_commuting', defaultUnit: 'km', inputType: 'distance', description: 'Émissions nulles, mais traçable' },
  { value: 'cat7_remote_work', label: 'Télétravail (jours/an)', categoryId: 'cat7_commuting', defaultUnit: 'jours', inputType: 'quantity', description: 'Réduction d\'émissions' },
];

/**
 * CATÉGORIE 8 : ACTIFS LOUÉS EN AMONT
 */
export const CAT8_UPSTREAM_LEASED: Scope3Subcategory[] = [
  { value: 'cat8_leased_buildings', label: 'Bâtiments loués', categoryId: 'cat8_upstream_leased', defaultUnit: 'm²', alternativeUnits: ['TND'], inputType: 'surface', description: 'Surface louée (non contrôlée)' },
  { value: 'cat8_leased_vehicles', label: 'Véhicules en leasing', categoryId: 'cat8_upstream_leased', defaultUnit: 'unités', alternativeUnits: ['TND'], inputType: 'quantity' },
  { value: 'cat8_leased_equipment', label: 'Équipements loués', categoryId: 'cat8_upstream_leased', defaultUnit: 'TND', inputType: 'monetary' },
];

/**
 * CATÉGORIE 9 : TRANSPORT ET DISTRIBUTION AVAL
 */
export const CAT9_DOWNSTREAM_TRANSPORT: Scope3Subcategory[] = [
  { value: 'cat9_delivery_truck', label: 'Livraisons clients (camion)', categoryId: 'cat9_downstream_transport', defaultUnit: 'km', alternativeUnits: ['t.km'], inputType: 'distance' },
  { value: 'cat9_delivery_ship', label: 'Transport maritime (clients)', categoryId: 'cat9_downstream_transport', defaultUnit: 't.km', inputType: 'tonkm' },
  { value: 'cat9_delivery_air', label: 'Fret aérien (clients)', categoryId: 'cat9_downstream_transport', defaultUnit: 't.km', inputType: 'tonkm' },
  { value: 'cat9_warehousing', label: 'Entreposage aval', categoryId: 'cat9_downstream_transport', defaultUnit: 'TND', inputType: 'monetary' },
  // Spécifique automobile - Livraisons véhicules
  { value: 'cat9_vehicles_delivered', label: 'Véhicules livrés aux clients', categoryId: 'cat9_downstream_transport', defaultUnit: 'unités', alternativeUnits: ['km'], inputType: 'quantity', description: 'Nombre de camions/livraisons' },
  { value: 'cat9_vehicles_transferred', label: 'Véhicules transférés (agents/franchisés)', categoryId: 'cat9_downstream_transport', defaultUnit: 'unités', alternativeUnits: ['km'], inputType: 'quantity', description: 'Transferts inter-sites' },
  { value: 'cat9_showroom_distance', label: 'Distance parcourue vers showrooms', categoryId: 'cat9_downstream_transport', defaultUnit: 'km', inputType: 'distance', description: 'Distance totale agents régionaux' },
];

/**
 * CATÉGORIE 10 : TRANSFORMATION DE PRODUITS VENDUS
 */
export const CAT10_PROCESSING: Scope3Subcategory[] = [
  { value: 'cat10_processing', label: 'Transformation par des tiers', categoryId: 'cat10_processing', defaultUnit: 'TND', alternativeUnits: ['kg'], inputType: 'monetary', description: 'Produits intermédiaires vendus' },
];

/**
 * CATÉGORIE 11 : UTILISATION DES PRODUITS VENDUS
 */
export const CAT11_USE_OF_PRODUCTS: Scope3Subcategory[] = [
  { value: 'cat11_energy_consumption', label: 'Consommation d\'énergie des produits', categoryId: 'cat11_use_of_products', defaultUnit: 'kWh', inputType: 'energy', description: 'Énergie consommée pendant la durée de vie' },
  { value: 'cat11_fuel_consumption', label: 'Consommation de carburant des produits', categoryId: 'cat11_use_of_products', defaultUnit: 'L', inputType: 'quantity', description: 'Ex: véhicules vendus' },
  { value: 'cat11_refrigerants', label: 'Fuites de fluides frigorigènes', categoryId: 'cat11_use_of_products', defaultUnit: 'kg', inputType: 'mass', description: 'Produits contenant des gaz réfrigérants' },
  // Spécifique automobile - Véhicules vendus
  { value: 'cat11_vehicles_sold_count', label: 'Nombre de véhicules vendus (par modèle)', categoryId: 'cat11_use_of_products', defaultUnit: 'unités', inputType: 'quantity', description: 'Voir tableau détaillé par modèle' },
  { value: 'cat11_vehicle_fuel_type', label: 'Type de motorisation', categoryId: 'cat11_use_of_products', defaultUnit: 'type', inputType: 'quantity', description: 'Essence, diesel, hybride, électrique' },
  { value: 'cat11_vehicle_consumption', label: 'Consommation moyenne par modèle', categoryId: 'cat11_use_of_products', defaultUnit: 'L/100km', alternativeUnits: ['kWh/100km'], inputType: 'quantity', description: 'Consommation constructeur' },
  { value: 'cat11_vehicle_annual_km', label: 'Kilométrage annuel moyen estimé', categoryId: 'cat11_use_of_products', defaultUnit: 'km/an', inputType: 'distance', description: 'Si données disponibles' },
  { value: 'cat11_vehicle_lifetime', label: 'Durée de vie moyenne véhicule', categoryId: 'cat11_use_of_products', defaultUnit: 'années', inputType: 'years', description: 'Durée d\'utilisation estimée' },
];

/**
 * CATÉGORIE 12 : FIN DE VIE DES PRODUITS VENDUS
 */
export const CAT12_END_OF_LIFE: Scope3Subcategory[] = [
  { value: 'cat12_recycling', label: 'Recyclage des produits vendus', categoryId: 'cat12_end_of_life', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat12_incineration', label: 'Incinération des produits vendus', categoryId: 'cat12_end_of_life', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  { value: 'cat12_landfill', label: 'Enfouissement des produits vendus', categoryId: 'cat12_end_of_life', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass' },
  // Spécifique automobile - Fin de vie véhicules
  { value: 'cat12_vehicle_recycling_rate', label: 'Taux moyen de recyclage véhicules', categoryId: 'cat12_end_of_life', defaultUnit: '%', inputType: 'percentage', description: 'Si données constructeur disponibles' },
  { value: 'cat12_vehicle_mass', label: 'Masse moyenne d\'un véhicule', categoryId: 'cat12_end_of_life', defaultUnit: 'kg', inputType: 'mass', description: 'Pour estimation fin de vie' },
  { value: 'cat12_parts_valorization', label: 'Part valorisée (acier, alu, plastique, verre)', categoryId: 'cat12_end_of_life', defaultUnit: '%', alternativeUnits: ['kg'], inputType: 'percentage', description: 'Pourcentage de matériaux récupérés' },
];

/**
 * CATÉGORIE 13 : ACTIFS LOUÉS EN AVAL
 */
export const CAT13_DOWNSTREAM_LEASED: Scope3Subcategory[] = [
  { value: 'cat13_leased_buildings', label: 'Bâtiments loués à des tiers', categoryId: 'cat13_downstream_leased', defaultUnit: 'm²', alternativeUnits: ['TND'], inputType: 'surface' },
  { value: 'cat13_leased_vehicles', label: 'Véhicules loués à des tiers (nombre)', categoryId: 'cat13_downstream_leased', defaultUnit: 'unités', alternativeUnits: ['TND'], inputType: 'quantity' },
  { value: 'cat13_leased_vehicles_km', label: 'Kilométrage véhicules loués à des tiers', categoryId: 'cat13_downstream_leased', defaultUnit: 'km', alternativeUnits: ['km/an'], inputType: 'distance', description: 'Total des km parcourus par la flotte louée' },
  { value: 'cat13_leased_equipment', label: 'Équipements loués à des tiers', categoryId: 'cat13_downstream_leased', defaultUnit: 'TND', inputType: 'monetary' },
];

/**
 * CATÉGORIE 14 : FRANCHISES
 */
export const CAT14_FRANCHISES: Scope3Subcategory[] = [
  { value: 'cat14_franchise_operations', label: 'Opérations des franchises (général)', categoryId: 'cat14_franchises', defaultUnit: 'TND', alternativeUnits: ['unités'], inputType: 'monetary', description: 'Chiffre d\'affaires ou nombre de franchises' },
  // Spécifique automobile - Réseau franchisés
  { value: 'cat14_spare_parts_sold', label: 'Pièces détachées vendues aux franchisés', categoryId: 'cat14_franchises', defaultUnit: 'TND', alternativeUnits: ['t'], inputType: 'monetary', description: 'Volume annuel' },
  { value: 'cat14_oils_products_sold', label: 'Huiles, pneus, batteries vendus aux franchisés', categoryId: 'cat14_franchises', defaultUnit: 'TND', alternativeUnits: ['L', 'unités'], inputType: 'monetary', description: 'Produits d\'entretien' },
  { value: 'cat14_franchise_waste', label: 'Déchets générés par sites franchisés', categoryId: 'cat14_franchises', defaultUnit: 'kg', alternativeUnits: ['t'], inputType: 'mass', description: 'Estimation volume déchets' },
];

/**
 * CATÉGORIE 15 : INVESTISSEMENTS
 */
export const CAT15_INVESTMENTS: Scope3Subcategory[] = [
  { value: 'cat15_equity', label: 'Investissements en actions', categoryId: 'cat15_investments', defaultUnit: 'TND', alternativeUnits: ['€', 'USD'], inputType: 'monetary' },
  { value: 'cat15_debt', label: 'Investissements obligataires', categoryId: 'cat15_investments', defaultUnit: 'TND', alternativeUnits: ['€', 'USD'], inputType: 'monetary' },
  { value: 'cat15_project_finance', label: 'Financement de projets', categoryId: 'cat15_investments', defaultUnit: 'TND', alternativeUnits: ['€', 'USD'], inputType: 'monetary' },
];

/**
 * MAPPING COMPLET : Toutes les sous-catégories par catégorie GHG
 */
export const SCOPE3_SUBCATEGORIES_BY_CATEGORY: Record<Scope3CategoryId, Scope3Subcategory[]> = {
  cat1_purchased_goods: CAT1_PURCHASED_GOODS,
  cat2_capital_goods: CAT2_CAPITAL_GOODS,
  cat3_fuel_energy: CAT3_FUEL_ENERGY,
  cat4_upstream_transport: CAT4_UPSTREAM_TRANSPORT,
  cat5_waste: CAT5_WASTE,
  cat6_business_travel: CAT6_BUSINESS_TRAVEL,
  cat7_commuting: CAT7_COMMUTING,
  cat8_upstream_leased: CAT8_UPSTREAM_LEASED,
  cat9_downstream_transport: CAT9_DOWNSTREAM_TRANSPORT,
  cat10_processing: CAT10_PROCESSING,
  cat11_use_of_products: CAT11_USE_OF_PRODUCTS,
  cat12_end_of_life: CAT12_END_OF_LIFE,
  cat13_downstream_leased: CAT13_DOWNSTREAM_LEASED,
  cat14_franchises: CAT14_FRANCHISES,
  cat15_investments: CAT15_INVESTMENTS,
};

/**
 * Récupérer toutes les sous-catégories d'une catégorie GHG
 */
export function getSubcategories(categoryId: Scope3CategoryId): Scope3Subcategory[] {
  return SCOPE3_SUBCATEGORIES_BY_CATEGORY[categoryId] || [];
}

/**
 * Récupérer toutes les sous-catégories (flat)
 */
export function getAllSubcategories(): Scope3Subcategory[] {
  return Object.values(SCOPE3_SUBCATEGORIES_BY_CATEGORY).flat();
}

/**
 * Récupérer le label d'une sous-catégorie par sa valeur (clé technique)
 * Retourne le label lisible ou la clé si non trouvée
 */
export function getSubcategoryLabel(value: string): string | null {
  const allSubcategories = getAllSubcategories();
  const found = allSubcategories.find(sub => sub.value === value);
  return found?.label || null;
}
