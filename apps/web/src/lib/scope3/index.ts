/**
 * INDEX CENTRAL - MODULE SCOPE 3 GHG PROTOCOL
 * 
 * Export centralisé de tous les composants et services Scope 3
 */

// Types et définitions
export {
  GHG_SCOPE3_CATEGORIES,
  getScope3Category,
  getUpstreamCategories,
  getDownstreamCategories,
  getDefaultActiveCategories,
  type Scope3CategoryId,
  type Scope3Category,
  type DataQualityStatus,
} from './ghg-protocol-categories';

export {
  SCOPE3_SUBCATEGORIES_BY_CATEGORY,
  getAllSubcategories,
  getSubcategories,
  type Scope3Subcategory,
  // Exports individuels par catégorie
  CAT1_PURCHASED_GOODS,
  CAT2_CAPITAL_GOODS,
  CAT3_FUEL_ENERGY,
  CAT4_UPSTREAM_TRANSPORT,
  CAT5_WASTE,
  CAT6_BUSINESS_TRAVEL,
  CAT7_COMMUTING,
  CAT8_UPSTREAM_LEASED,
  CAT9_DOWNSTREAM_TRANSPORT,
  CAT10_PROCESSING,
  CAT11_USE_OF_PRODUCTS,
  CAT12_END_OF_LIFE,
  CAT13_DOWNSTREAM_LEASED,
  CAT14_FRANCHISES,
  CAT15_INVESTMENTS,
} from './subcategories';

// Services
export {
  Scope3ActivationService,
  suggestCategoryActivation,
  type Scope3CategoryActivation,
} from './activation-service';

export {
  Category3Calculator,
  type Category3Result,
  CATEGORY3_AUTO_TRIGGER_SQL,
} from './category3-calculator';

// Composants React
export { Scope3CategoryConfig } from '@/components/scope3/Scope3CategoryConfig';
export { Scope3DataEntry } from '@/components/scope3/Scope3DataEntry';

/**
 * GUIDE D'UTILISATION RAPIDE
 * 
 * 1. Configuration des catégories (dans Paramètres)
 * ```tsx
 * import { Scope3CategoryConfig } from '@/lib/scope3';
 * <Scope3CategoryConfig />
 * ```
 * 
 * 2. Saisie des données (dans Collecte)
 * ```tsx
 * import { Scope3DataEntry } from '@/lib/scope3';
 * <Scope3DataEntry onSuccess={() => console.log('Saved')} />
 * ```
 * 
 * 3. Récupération programmatique
 * ```tsx
 * import { Scope3ActivationService, Category3Calculator } from '@/lib/scope3';
 * 
 * // Récupérer les catégories actives
 * const activations = await Scope3ActivationService.getActivationStatus(orgId);
 * 
 * // Calculer Cat3 automatiquement
 * const cat3 = await Category3Calculator.calculate(orgId, '2025-01-01', '2025-12-31');
 * await Category3Calculator.saveCalculation(orgId, '2025-01-01', '2025-12-31', cat3);
 * ```
 * 
 * 4. Statistiques
 * ```tsx
 * const stats = await Scope3ActivationService.getActivationStats(orgId);
 * console.log(`${stats.active}/15 catégories actives`);
 * ```
 */
