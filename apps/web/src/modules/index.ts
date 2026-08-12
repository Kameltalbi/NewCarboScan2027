// CarboScan Suite - Module Registry
// Point d'entrée central pour tous les modules de la suite

export interface ModuleConfig {
  slug: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  category: 'core' | 'technical' | 'landing';
  component: React.LazyExoticComponent<React.ComponentType<any>> | null;
  isActive: boolean;
}

import { lazy } from 'react';

// Lazy loading des modules pour optimiser les performances
export const moduleRegistry: ModuleConfig[] = [
  // MODULES CORE - Applications fonctionnelles
  {
    slug: 'bilan-carbone',
    name: 'Bilan Carbone',
    description: 'Calculez l\'empreinte carbone complète de votre entreprise (Scopes 1, 2 et 3)',
    icon: 'BarChart3',
    route: '/app/bilan-carbone',
    category: 'core',
    component: lazy(() => import('./bilan-carbone/BilanCarboneApp')),
    isActive: true,
  },
  {
    slug: 'empreinte-produit',
    name: 'Empreinte Produit',
    description: 'Calculez l\'empreinte carbone de vos produits avec une ACV simplifiée',
    icon: 'Package',
    route: '/app/empreinte-produit',
    category: 'core',
    component: lazy(() => import('./empreinte-produit/EmpreinteProduitApp')),
    isActive: true,
  },
  {
    slug: 'acv',
    name: 'Analyse Cycle de Vie',
    description: 'ACV complète multi-indicateurs : GWP, ODP, AP, EP, POCP',
    icon: 'Leaf',
    route: '/app/acv',
    category: 'core',
    component: lazy(() => import('./acv/ACVApp')),
    isActive: true,
  },
  {
    slug: 'cbam',
    name: 'CBAM Calculator',
    description: 'Calculateur CBAM pour la conformité réglementaire UE',
    icon: 'Shield',
    route: '/app/cbam',
    category: 'core',
    component: lazy(() => import('./cbam/CBAMApp')),
    isActive: true,
  },
  {
    slug: 'collect',
    name: 'CarboScan Collect',
    description: 'Collecte intelligente de données : import Excel, OCR PDF, validation IA',
    icon: 'Database',
    route: '/app/collecte',
    category: 'core',
    component: lazy(() => import('./collect/CollectApp')),
    isActive: true,
  },
  {
    slug: 'decarbotech',
    name: 'Monitoring & Réduction',
    description: 'Plan de réduction Net-Zero, intégration IoT, tableaux de bord de décarbonation',
    icon: 'Target',
    route: '/app/decarbotech',
    category: 'core',
    component: lazy(() => import('./decarbotech/DecarbotechApp')),
    isActive: true,
  },
  {
    slug: 'fournisseurs',
    name: 'Gestion Fournisseurs',
    description: 'Référencez et pilotez vos fournisseurs : collecte carbone, questionnaires climat, conformité internationale',
    icon: 'Users',
    route: '/app/fournisseurs',
    category: 'core',
    component: lazy(() => import('./fournisseurs/FournisseursApp')),
    isActive: true,
  },
  {
    slug: 'academy',
    name: 'CarboScan Academy',
    description: 'Formations et modules d\'apprentissage sur le bilan carbone et la décarbonation',
    icon: 'GraduationCap',
    route: '/app/academy',
    category: 'core',
    component: lazy(() => import('./academy/AcademyApp')),
    isActive: true,
  },
];

// Helper pour récupérer un module par son slug
export const getModuleBySlug = (slug: string): ModuleConfig | undefined => {
  return moduleRegistry.find(m => m.slug === slug);
};

// Helper pour récupérer les modules core actifs
export const getCoreModules = (): ModuleConfig[] => {
  return moduleRegistry.filter(m => m.category === 'core' && m.isActive);
};
