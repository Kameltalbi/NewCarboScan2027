// Configuration des sections de collecte guidée
import { 
  Building2, 
  Flame, 
  Zap, 
  Car, 
  Trash2, 
  Droplets, 
  Truck, 
  Factory, 
  Hammer, 
  Users,
  Warehouse,
  LucideIcon
} from 'lucide-react';

export interface CollectSection {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind class
  categories: string[]; // Categories from COLLECT_QUESTIONS that belong to this section
  helpText?: string;
  examples?: string[];
}

export const COLLECT_SECTIONS: CollectSection[] = [
  {
    id: 'general',
    label: 'Informations Générales',
    description: 'Données de base sur votre entreprise',
    icon: Building2,
    color: 'bg-slate-500',
    categories: ['general'],
    helpText: 'Renseignez les informations de base de votre entreprise pour calibrer les estimations.',
    examples: ['Surface des locaux', 'Nombre de collaborateurs'],
  },
  {
    id: 'energie',
    label: 'Énergie & Combustibles',
    description: 'Gaz, fioul, électricité, vapeur',
    icon: Flame,
    color: 'bg-orange-500',
    categories: ['scope1', 'scope2', 'vapeur'],
    helpText: 'Vos consommations énergétiques directes (Scope 1) et indirectes (Scope 2).',
    examples: ['Factures de gaz', 'Consommation électrique annuelle', 'Fioul de chauffage'],
  },
  {
    id: 'transport',
    label: 'Flotte de Véhicules',
    description: 'Véhicules de fonction et flotte',
    icon: Car,
    color: 'bg-blue-500',
    categories: ['vehicules'],
    helpText: 'Émissions directes liées à vos véhicules d\'entreprise (Scope 1).',
    examples: ['Nombre de véhicules', 'Kilométrage annuel total', 'Type de carburant'],
  },
  {
    id: 'fret',
    label: 'Transport & Logistique',
    description: 'Fret amont, aval et logistique',
    icon: Truck,
    color: 'bg-indigo-500',
    categories: ['fret', 'logistique'],
    helpText: 'Transport de marchandises vers et depuis votre entreprise (Scope 3).',
    examples: ['Tonnes-km de fret', 'Mode de transport principal'],
  },
  {
    id: 'batiments',
    label: 'Bâtiments & Immobilier',
    description: 'Construction, rénovation, locaux',
    icon: Factory,
    color: 'bg-amber-600',
    categories: ['construction', 'immobilier'],
    helpText: 'Impact des bâtiments et travaux de construction/rénovation (Scope 3).',
    examples: ['Surface des locaux', 'Travaux réalisés dans l\'année'],
  },
  {
    id: 'eau',
    label: 'Eau & Assainissement',
    description: 'Consommation et traitement de l\'eau',
    icon: Droplets,
    color: 'bg-cyan-500',
    categories: ['eau'],
    helpText: 'Consommation d\'eau et traitement des eaux usées (Scope 3).',
    examples: ['Consommation annuelle en m³', 'Type de traitement'],
  },
  {
    id: 'dechets',
    label: 'Déchets',
    description: 'Production et traitement des déchets',
    icon: Trash2,
    color: 'bg-green-600',
    categories: ['scope3'],
    helpText: 'Gestion des déchets produits par votre activité (Scope 3).',
    examples: ['Tonnes de déchets/an', 'Type de déchets'],
  },
  {
    id: 'collaborateurs',
    label: 'Mobilité & RH',
    description: 'Déplacements des collaborateurs',
    icon: Users,
    color: 'bg-purple-500',
    categories: ['rh'],
    helpText: 'Déplacements domicile-travail et déplacements professionnels (Scope 3).',
    examples: ['Distance moyenne domicile-travail', 'Taux de télétravail'],
  },
];

// Fonction utilitaire pour obtenir la section d'une catégorie
export const getSectionForCategory = (category: string): CollectSection | undefined => {
  return COLLECT_SECTIONS.find(section => section.categories.includes(category));
};

// Fonction pour obtenir toutes les catégories d'une section
export const getCategoriesForSection = (sectionId: string): string[] => {
  const section = COLLECT_SECTIONS.find(s => s.id === sectionId);
  return section?.categories || [];
};
