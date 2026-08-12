// Service d'agrégation pour le Dashboard global
// Consomme tous les calculateurs et agrège les résultats

import { BilanCarboneCalculator, type MissingEmissionFactor, type EmissionLineDetail } from './BilanCarboneCalculator';
import { ProductFootprintCalculator } from './ProductFootprintCalculator';
import { ActivityDataService } from '../activity-data/ActivityDataService';
import { logger } from '@/utils/logger';

export interface DashboardAggregatedData {
  organizationId: string;
  period: {
    start: string;
    end: string;
  };
  bilanCarbone: {
    totalEmissions: number;
    scope1: number;
    scope2: number;
    scope3: number;
    breakdown: Array<{ category: string; emissions: number; percentage: number }>;
    /** Détails ligne par ligne pour la traçabilité (quantité × FE = émissions) */
    detailedBreakdown: EmissionLineDetail[];
    missingFactors: MissingEmissionFactor[];
  };
  products: Array<{
    productId: string;
    name: string;
    totalEmissions: number;
    functionalUnit: string;
    footprint: number; // Pour compatibilité avec UnifiedDashboard
  }>;
  dataQuality: {
    real: number;
    estimated: number;
    default: number;
    avgConfidence: number | null;
  };
  coverage: {
    modulesWithData: string[];
    modulesWithoutData: string[];
  };
}

export class DashboardAggregator {
  /**
   * Agréger toutes les données pour le dashboard global
   * Consomme uniquement activity_data, aucun stockage
   */
  static async aggregate(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    options?: {
      productIds?: string[];
      siteId?: string | null; // null = vue consolidée (tous les sites)
    }
  ): Promise<DashboardAggregatedData> {
    const siteId = options?.siteId;
    // NOTE: L'invalidation du cache FE est gérée par useDashboardCache via l'événement 'emissionFactorsUpdated'
    // Ne pas invalider ici car cela force des requêtes à chaque navigation vers le dashboard
    logger.debug(`🔄 DashboardAggregator: Calcul en cours${siteId ? ` pour site ${siteId}` : ' (consolidé)'}...`);
    
    // 1. Calculer le Bilan Carbone (avec filtre site optionnel)
    const bilanCarbone = await BilanCarboneCalculator.calculate(
      organizationId,
      periodStart,
      periodEnd,
      siteId ?? undefined
    );

    // 2. Récupérer les productIds depuis activity_data et calculer les empreintes produits
    const activityFilters: Parameters<typeof ActivityDataService.list>[0] = {
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
    };
    
    // Ajouter le filtre site si spécifié
    if (siteId) {
      activityFilters.site_id = siteId;
    }
    
    const activities = await ActivityDataService.list(activityFilters);

    // Extraire les productIds uniques depuis activity_data
    const uniqueProductIds = Array.from(
      new Set(
        activities
          .filter(a => a.product_id !== null)
          .map(a => a.product_id as string)
      )
    );

    // Calculer les empreintes produits
    const products = uniqueProductIds.length > 0
      ? await Promise.all(
          uniqueProductIds.map(async (productId) => {
            try {
              const footprint = await ProductFootprintCalculator.calculate(
                organizationId,
                productId,
                '1 produit', // TODO: Récupérer la vraie unité fonctionnelle depuis une table produits
                periodStart,
                periodEnd
              );
              return {
                productId,
                name: `Produit ${productId.substring(0, 8)}`, // TODO: Récupérer le vrai nom depuis une table produits
                totalEmissions: footprint.totalEmissions,
                functionalUnit: footprint.functionalUnit,
                footprint: footprint.totalEmissions, // Pour compatibilité avec UnifiedDashboard
              };
            } catch (error) {
              console.error(`Erreur calcul produit ${productId}:`, error);
              return null;
            }
          })
        ).then(results => results.filter((r): r is NonNullable<typeof r> => r !== null))
      : [];

    // 3. Obtenir les statistiques de qualité des données
    // Utiliser les stats du bilan carbone si disponibles, sinon depuis activity_data
    let qualityStats = {
      real_percentage: 0,
      estimated_percentage: 0,
      default_percentage: 100,
      avg_confidence_score: null as number | null,
    };

    if (activities.length > 0) {
      // Si on a des données dans activity_data, utiliser ActivityDataService
      qualityStats = await ActivityDataService.getDataQualityStats(
        organizationId,
        periodStart,
        periodEnd
      );
    } else if (bilanCarbone.totalEmissions > 0) {
      // Si les données viennent de bilans_carbone, utiliser les stats du bilan
      qualityStats = {
        real_percentage: bilanCarbone.dataQuality.real,
        estimated_percentage: bilanCarbone.dataQuality.estimated,
        default_percentage: bilanCarbone.dataQuality.default,
        avg_confidence_score: null,
      };
    }

    // 4. Déterminer la couverture des modules (activities déjà récupérées ci-dessus)

    const modulesWithData: string[] = [];
    const modulesWithoutData: string[] = [];

    // Vérifier quels modules ont des données
    const hasScope1 = activities.some(a => a.scope_hint === 1 || a.category.startsWith('scope1'));
    const hasScope2 = activities.some(a => a.scope_hint === 2 || a.category.startsWith('scope2'));
    const hasScope3 = activities.some(a => a.scope_hint === 3 || a.category.startsWith('scope3'));
    const hasProducts = activities.some(a => a.product_id !== null);
    const hasLifecycle = activities.some(a => a.category.startsWith('lifecycle'));

    // Vérifier si le bilan carbone a des données (depuis activity_data ou bilans_carbone)
    const hasBilanCarboneData = bilanCarbone.totalEmissions > 0 || hasScope1 || hasScope2 || hasScope3;
    
    if (hasBilanCarboneData) {
      modulesWithData.push('bilan-carbone');
    } else {
      modulesWithoutData.push('bilan-carbone');
    }

    if (hasProducts) {
      modulesWithData.push('empreinte-produit');
    } else {
      modulesWithoutData.push('empreinte-produit');
    }

    if (hasLifecycle) {
      modulesWithData.push('acv');
    } else {
      modulesWithoutData.push('acv');
    }

    return {
      organizationId,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      bilanCarbone: {
        missingFactors: bilanCarbone.missingFactors || [],
        totalEmissions: bilanCarbone.totalEmissions,
        scope1: bilanCarbone.scope1,
        scope2: bilanCarbone.scope2,
        scope3: bilanCarbone.scope3,
        breakdown: bilanCarbone.breakdown,
        detailedBreakdown: bilanCarbone.detailedBreakdown || [],
      },
      products,
      dataQuality: {
        real: qualityStats.real_percentage,
        estimated: qualityStats.estimated_percentage,
        default: qualityStats.default_percentage,
        avgConfidence: qualityStats.avg_confidence_score,
      },
      coverage: {
        modulesWithData,
        modulesWithoutData,
      },
    };
  }
}

