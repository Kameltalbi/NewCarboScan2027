// Service pour la consolidation multi-sites des données d'activité

import { ActivityDataService } from './ActivityDataService';
import { ActivityData, ActivityDataFilters, ActivityType, ActivityCategory } from './types';

export interface ConsolidatedActivityData {
  activity_type: string;
  category: string;
  subcategory: string | null;
  unit: string;
  total_quantity: number;
  site_count: number;
  sites: Array<{
    site_id: string;
    site_name: string;
    quantity: number;
    percentage: number;
  }>;
  period_start: string | null;
  period_end: string | null;
  data_quality: string;
  scope_hint: number | null;
}

export interface ConsolidationOptions {
  organization_id: string;
  site_ids?: string[]; // Si vide, tous les sites
  period_start?: string;
  period_end?: string;
  activity_type?: string;
  category?: string;
  group_by?: ('activity_type' | 'category' | 'subcategory' | 'period')[];
}

/**
 * Service pour consolider les données de plusieurs sites
 */
export class SiteConsolidationService {
  /**
   * Consolider les données de plusieurs sites
   */
  static async consolidate(options: ConsolidationOptions): Promise<ConsolidatedActivityData[]> {
    // Récupérer toutes les données selon les filtres
    const filters: ActivityDataFilters = {
      organization_id: options.organization_id,
      period_start: options.period_start || null,
      period_end: options.period_end || null,
      activity_type: (options.activity_type as ActivityType) || null,
      category: (options.category as ActivityCategory) || null,
    };

    // Si des sites spécifiques sont demandés, on filtrera après
    const allData = await ActivityDataService.list(filters);

    // Filtrer par sites si spécifié
    let filteredData = allData;
    if (options.site_ids && options.site_ids.length > 0) {
      filteredData = allData.filter(d => d.site_id && options.site_ids!.includes(d.site_id));
    } else {
      // Sinon, prendre toutes les données avec un site_id
      filteredData = allData.filter(d => d.site_id !== null);
    }

    // Grouper et consolider
    const grouped = this.groupAndConsolidate(filteredData, options.group_by || ['activity_type', 'category']);

    return grouped;
  }

  /**
   * Grouper et consolider les données
   */
  private static groupAndConsolidate(
    data: ActivityData[],
    groupBy: string[]
  ): ConsolidatedActivityData[] {
    const groups = new Map<string, ActivityData[]>();

    // Grouper les données
    for (const item of data) {
      const key = this.getGroupKey(item, groupBy);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    // Consolider chaque groupe
    const consolidated: ConsolidatedActivityData[] = [];

    for (const [key, items] of groups.entries()) {
      const first = items[0];
      
      // Calculer le total
      let totalQuantity = 0;
      const siteMap = new Map<string, { site_id: string; site_name: string; quantity: number }>();

      for (const item of items) {
        // Normaliser les unités si nécessaire (simplifié)
        const quantity = this.normalizeQuantity(item.quantity, item.unit, first.unit);
        totalQuantity += quantity;

        if (item.site_id) {
          const existing = siteMap.get(item.site_id);
          if (existing) {
            existing.quantity += quantity;
          } else {
            siteMap.set(item.site_id, {
              site_id: item.site_id,
              site_name: item.site_id, // On récupérera le nom depuis le hook
              quantity: quantity,
            });
          }
        }
      }

      // Calculer les pourcentages
      const sites = Array.from(siteMap.values()).map(site => ({
        ...site,
        percentage: totalQuantity > 0 ? (site.quantity / totalQuantity) * 100 : 0,
      }));

      // Trier par quantité décroissante
      sites.sort((a, b) => b.quantity - a.quantity);

      consolidated.push({
        activity_type: first.activity_type,
        category: first.category,
        subcategory: first.subcategory,
        unit: first.unit,
        total_quantity: totalQuantity,
        site_count: sites.length,
        sites,
        period_start: first.period_start,
        period_end: first.period_end,
        data_quality: first.data_quality,
        scope_hint: first.scope_hint,
      });
    }

    return consolidated;
  }

  /**
   * Générer une clé de groupe
   */
  private static getGroupKey(item: ActivityData, groupBy: string[]): string {
    const parts: string[] = [];

    for (const field of groupBy) {
      switch (field) {
        case 'activity_type':
          parts.push(item.activity_type);
          break;
        case 'category':
          parts.push(item.category);
          break;
        case 'subcategory':
          parts.push(item.subcategory || 'null');
          break;
        case 'period':
          parts.push(`${item.period_start || 'null'}_${item.period_end || 'null'}`);
          break;
      }
    }

    return parts.join('|');
  }

  /**
   * Normaliser une quantité vers une unité cible
   * (Simplifié - à améliorer avec un vrai service de conversion)
   */
  private static normalizeQuantity(
    quantity: number,
    fromUnit: string,
    toUnit: string
  ): number {
    // Si les unités sont identiques, pas de conversion
    if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
      return quantity;
    }

    // Conversions basiques (à améliorer)
    const conversions: Record<string, Record<string, number>> = {
      'kwh': {
        'mwh': 0.001,
        'gwh': 0.000001,
      },
      'mwh': {
        'kwh': 1000,
        'gwh': 0.001,
      },
      'gwh': {
        'kwh': 1000000,
        'mwh': 1000,
      },
      'l': {
        'm3': 0.001,
        'litres': 1,
      },
      'm3': {
        'l': 1000,
        'litres': 1000,
      },
    };

    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();

    if (conversions[from] && conversions[from][to]) {
      return quantity * conversions[from][to];
    }

    // Si pas de conversion trouvée, retourner tel quel (risque d'erreur)
    return quantity;
  }

  /**
   * Obtenir les statistiques de consolidation
   */
  static async getConsolidationStats(
    organizationId: string,
    siteIds?: string[]
  ): Promise<{
    total_sites: number;
    total_activities: number;
    total_quantity: number;
    by_activity_type: Record<string, number>;
    by_category: Record<string, number>;
  }> {
    const filters: ActivityDataFilters = {
      organization_id: organizationId,
    };

    const allData = await ActivityDataService.list(filters);
    
    let filteredData = allData;
    if (siteIds && siteIds.length > 0) {
      filteredData = allData.filter(d => d.site_id && siteIds.includes(d.site_id));
    } else {
      filteredData = allData.filter(d => d.site_id !== null);
    }

    const uniqueSites = new Set(filteredData.map(d => d.site_id).filter(Boolean));
    
    const byActivityType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalQuantity = 0;

    for (const item of filteredData) {
      byActivityType[item.activity_type] = (byActivityType[item.activity_type] || 0) + item.quantity;
      byCategory[item.category] = (byCategory[item.category] || 0) + item.quantity;
      totalQuantity += item.quantity;
    }

    return {
      total_sites: uniqueSites.size,
      total_activities: filteredData.length,
      total_quantity: totalQuantity,
      by_activity_type: byActivityType,
      by_category: byCategory,
    };
  }
}
