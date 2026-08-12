// Service de calcul pour l'Empreinte Produit
// Consomme uniquement activity_data filtré par product_id

import { ActivityDataService } from '../activity-data/ActivityDataService';
import { supabase } from "@/integrations/api/client";
import { logger } from '@/utils/logger';

export interface ProductFootprintResult {
  productId: string;
  totalEmissions: number; // kg CO2e par unité fonctionnelle
  functionalUnit: string;
  breakdown: {
    phase: string;
    emissions: number;
    percentage: number;
  }[];
  dataQuality: {
    real: number;
    estimated: number;
    default: number;
  };
}

export class ProductFootprintCalculator {
  /**
   * Calculer l'empreinte carbone d'un produit
   * Priorité: RPC function, fallback sur frontend calculation
   */
  static async calculate(
    organizationId: string,
    productId: string,
    functionalUnit: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<ProductFootprintResult> {
    try {
      // PRIORITÉ 1: Utiliser la fonction RPC PostgreSQL
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'calculate_product_footprint_from_activity_data',
        {
          p_organization_id: organizationId,
          p_product_id: productId,
        }
      );

      if (!rpcError && rpcResult) {
        logger.debug('Product Footprint calculé via RPC:', rpcResult);
        
        // Formater le résultat
        const breakdown = Object.entries(rpcResult.breakdown_by_phase || {}).map(
          ([phase, emissions]) => ({
            phase,
            emissions: emissions as number,
            percentage: ((emissions as number) / rpcResult.total_emissions) * 100,
          })
        );

        return {
          productId,
          totalEmissions: rpcResult.total_emissions || 0,
          functionalUnit,
          breakdown,
          dataQuality: {
            real: 0, // TODO: Ajouter dans RPC
            estimated: 0,
            default: 0,
          },
        };
      }

      logger.warn('RPC failed, fallback to frontend calculation:', rpcError);
    } catch (error) {
      console.error('❌ Error calling RPC function:', error);
    }

    // FALLBACK: Calculer côté frontend si RPC échoue
    // Récupérer toutes les données d'activité pour ce produit
    const activities = await ActivityDataService.list({
      organization_id: organizationId,
      product_id: productId,
      period_start: periodStart || null,
      period_end: periodEnd || null,
    });

    // Calculer les émissions par activité
    const emissionsByActivity = await Promise.all(
      activities.map(async (activity) => {
        const emissions = await ActivityDataService.calculateEmissions(activity.id);
        return {
          activity,
          emissions,
        };
      })
    );

    // Agrégation par phase du cycle de vie
    const phases: Record<string, number> = {
      materials: 0,
      manufacturing: 0,
      transport: 0,
      usage: 0,
      endOfLife: 0,
    };

    emissionsByActivity.forEach(({ activity, emissions }) => {
      const phase = this.mapCategoryToLifecyclePhase(activity.category);
      phases[phase] = (phases[phase] || 0) + emissions;
    });

    const totalEmissions = Object.values(phases).reduce((sum, val) => sum + val, 0);

    // Calculer la qualité des données
    const orgId = activities[0]?.organization_id;
    const qualityStats = orgId ? await ActivityDataService.getDataQualityStats(
      orgId,
      periodStart || undefined,
      periodEnd || undefined
    ) : {
      real_percentage: 0,
      estimated_percentage: 0,
      default_percentage: 0,
    };

    // Formater le breakdown
    const breakdown = Object.entries(phases)
      .filter(([_, emissions]) => emissions > 0)
      .map(([phase, emissions]) => ({
        phase,
        emissions,
        percentage: totalEmissions > 0 ? (emissions / totalEmissions) * 100 : 0,
      }))
      .sort((a, b) => b.emissions - a.emissions);

    return {
      productId,
      totalEmissions,
      functionalUnit,
      breakdown,
      dataQuality: {
        real: qualityStats.real_percentage,
        estimated: qualityStats.estimated_percentage,
        default: qualityStats.default_percentage,
      },
    };
  }

  /**
   * Mapper la catégorie vers une phase du cycle de vie
   */
  private static mapCategoryToLifecyclePhase(category: string): string {
    if (category.includes('material')) return 'materials';
    if (category.includes('manufacturing')) return 'manufacturing';
    if (category.includes('transport')) return 'transport';
    if (category.includes('usage')) return 'usage';
    if (category.includes('eol')) return 'endOfLife';
    return 'materials'; // Par défaut
  }
}

