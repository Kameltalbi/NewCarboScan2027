// Service d'agrégation hiérarchique selon GHG Protocol
// Agrège les émissions par Scope > Poste > Catégorie

import { supabase } from "@/integrations/api/client";
import { logger } from '@/utils/logger';
import {
  ScopeNumber,
  GHGPoste,
  GHGCategory,
  getAllPostes,
  getPostesByScope,
  getCategoriesByPoste,
  mapActivityCategoryToGHGPoste,
  getPosteById,
  getCategoryById,
} from './ghg-hierarchy';

export interface EmissionDataPoint {
  activity_id: string;
  activity_type: string;
  activity_category: string;
  activity_subcategory?: string;
  quantity: number;
  unit: string;
  emissions: number; // tCO₂e
  period_start: string;
  period_end: string;
  data_quality: string;
  confidence_score?: number;
  source_document?: string;
  notes?: string;
}

export interface GHGCategoryEmissions {
  category: GHGCategory;
  emissions: number; // tCO₂e
  percentage: number; // % du total
  data_points: EmissionDataPoint[];
  data_quality_avg: number; // Score moyen de qualité
}

export interface GHGPosteEmissions {
  poste: GHGPoste;
  emissions: number; // tCO₂e
  percentage: number; // % du scope
  categories: GHGCategoryEmissions[];
  data_points_count: number;
}

export interface GHGScopeEmissions {
  scope: ScopeNumber;
  emissions: number; // tCO₂e
  percentage: number; // % du total
  postes: GHGPosteEmissions[];
  mandatory_postes_covered: number; // Nombre de postes obligatoires couverts
  mandatory_postes_total: number; // Nombre total de postes obligatoires
}

export interface GHGHierarchicalResult {
  organization_id: string;
  period_start: string;
  period_end: string;
  total_emissions: number; // tCO₂e
  scopes: GHGScopeEmissions[];
  coverage: {
    scope1_covered: boolean;
    scope2_covered: boolean;
    scope3_covered: boolean;
    mandatory_postes_missing: string[]; // Codes des postes obligatoires manquants
  };
  data_quality: {
    real_percentage: number;
    estimated_percentage: number;
    default_percentage: number;
    avg_confidence_score: number | null;
  };
  calculated_at: string;
}

export class GHGAggregationService {
  /**
   * Agréger les émissions selon la hiérarchie GHG Protocol
   */
  static async aggregateByGHGHierarchy(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<GHGHierarchicalResult> {
    // 1. Récupérer toutes les activity_data avec leurs émissions
    const { data: activities, error } = await supabase
      .from('activity_data')
      .select(
        `
        id,
        activity_type,
        category,
        subcategory,
        quantity,
        unit,
        period_start,
        period_end,
        data_quality,
        confidence_score,
        source_document,
        notes,
        scope_hint,
        emission_factor_id
      `
      )
      .eq('organization_id', organizationId)
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd);

    if (error) {
      throw new Error(`Erreur récupération activities: ${error.message}`);
    }

    if (!activities || activities.length === 0) {
      return this.emptyResult(organizationId, periodStart, periodEnd);
    }

    // 2. Calculer les émissions pour chaque activity
    const dataPoints: EmissionDataPoint[] = await Promise.all(
      activities.map(async (activity) => {
        let emissions = 0;

        if (activity.emission_factor_id) {
          // Récupérer le facteur d'émission
          const { data: ef } = await supabase
            .from('emission_factors')
            .select('emission_factor')
            .eq('id', activity.emission_factor_id)
            .single();

          if (ef) {
            emissions = activity.quantity * ef.emission_factor;
          }
        }

        return {
          activity_id: activity.id,
          activity_type: activity.activity_type,
          activity_category: activity.category,
          activity_subcategory: activity.subcategory,
          quantity: activity.quantity,
          unit: activity.unit,
          emissions: emissions / 1000, // Convertir en tonnes
          period_start: activity.period_start,
          period_end: activity.period_end,
          data_quality: activity.data_quality,
          confidence_score: activity.confidence_score,
          source_document: activity.source_document,
          notes: activity.notes,
        };
      })
    );

    // 3. Agréger par Scope > Poste > Catégorie
    const scopes = await this.aggregateByScopes(dataPoints);

    // 4. Calculer les totaux et pourcentages
    const totalEmissions = scopes.reduce((sum, s) => sum + s.emissions, 0);

    scopes.forEach((scope) => {
      scope.percentage = totalEmissions > 0 ? (scope.emissions / totalEmissions) * 100 : 0;

      scope.postes.forEach((poste) => {
        poste.percentage = scope.emissions > 0 ? (poste.emissions / scope.emissions) * 100 : 0;

        poste.categories.forEach((category) => {
          category.percentage =
            poste.emissions > 0 ? (category.emissions / poste.emissions) * 100 : 0;
        });
      });
    });

    // 5. Calculer la couverture
    const coverage = this.calculateCoverage(scopes);

    // 6. Calculer la qualité des données
    const dataQuality = this.calculateDataQuality(dataPoints);

    return {
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
      total_emissions: totalEmissions,
      scopes,
      coverage,
      data_quality: dataQuality,
      calculated_at: new Date().toISOString(),
    };
  }

  /**
   * Agréger par scopes
   */
  private static async aggregateByScopes(
    dataPoints: EmissionDataPoint[]
  ): Promise<GHGScopeEmissions[]> {
    const scopes: GHGScopeEmissions[] = [];

    for (const scopeNumber of [1, 2, 3] as ScopeNumber[]) {
      const postes = await this.aggregateByPostes(dataPoints, scopeNumber);
      const emissions = postes.reduce((sum, p) => sum + p.emissions, 0);

      const mandatoryPostes = getPostesByScope(scopeNumber).filter((p) => p.mandatory);

      scopes.push({
        scope: scopeNumber,
        emissions,
        percentage: 0, // Sera calculé plus tard
        postes,
        mandatory_postes_covered: postes.filter((p) => p.poste.mandatory).length,
        mandatory_postes_total: mandatoryPostes.length,
      });
    }

    return scopes;
  }

  /**
   * Agréger par postes
   */
  private static async aggregateByPostes(
    dataPoints: EmissionDataPoint[],
    scope: ScopeNumber
  ): Promise<GHGPosteEmissions[]> {
    const postesMap = new Map<string, GHGPosteEmissions>();

    for (const dataPoint of dataPoints) {
      // Mapper l'activity_category vers un poste GHG
      const posteId = mapActivityCategoryToGHGPoste(dataPoint.activity_category);

      if (!posteId) {
        logger.warn(`Pas de mapping pour category: ${dataPoint.activity_category}`);
        continue;
      }

      const poste = getPosteById(posteId);
      if (!poste || poste.scope !== scope) {
        continue;
      }

      if (!postesMap.has(posteId)) {
        postesMap.set(posteId, {
          poste,
          emissions: 0,
          percentage: 0,
          categories: [],
          data_points_count: 0,
        });
      }

      const posteEmissions = postesMap.get(posteId)!;
      posteEmissions.emissions += dataPoint.emissions;
      posteEmissions.data_points_count++;
    }

    return Array.from(postesMap.values());
  }

  /**
   * Calculer la couverture des postes obligatoires
   */
  private static calculateCoverage(scopes: GHGScopeEmissions[]): {
    scope1_covered: boolean;
    scope2_covered: boolean;
    scope3_covered: boolean;
    mandatory_postes_missing: string[];
  } {
    const scope1 = scopes.find((s) => s.scope === 1);
    const scope2 = scopes.find((s) => s.scope === 2);
    const scope3 = scopes.find((s) => s.scope === 3);

    const missingPostes: string[] = [];

    // Scope 1 & 2 : Obligatoires
    const scope1Postes = getPostesByScope(1).filter((p) => p.mandatory);
    const scope2Postes = getPostesByScope(2).filter((p) => p.mandatory);

    scope1Postes.forEach((poste) => {
      const covered = scope1?.postes.some((p) => p.poste.id === poste.id);
      if (!covered) {
        missingPostes.push(poste.code);
      }
    });

    scope2Postes.forEach((poste) => {
      const covered = scope2?.postes.some((p) => p.poste.id === poste.id);
      if (!covered) {
        missingPostes.push(poste.code);
      }
    });

    return {
      scope1_covered: scope1 ? scope1.mandatory_postes_covered === scope1.mandatory_postes_total : false,
      scope2_covered: scope2 ? scope2.mandatory_postes_covered === scope2.mandatory_postes_total : false,
      scope3_covered: (scope3?.emissions || 0) > 0,
      mandatory_postes_missing: missingPostes,
    };
  }

  /**
   * Calculer la qualité des données
   */
  private static calculateDataQuality(dataPoints: EmissionDataPoint[]): {
    real_percentage: number;
    estimated_percentage: number;
    default_percentage: number;
    avg_confidence_score: number | null;
  } {
    if (dataPoints.length === 0) {
      return {
        real_percentage: 0,
        estimated_percentage: 0,
        default_percentage: 100,
        avg_confidence_score: null,
      };
    }

    const realCount = dataPoints.filter((d) => d.data_quality === 'real').length;
    const estimatedCount = dataPoints.filter((d) => d.data_quality === 'estimated').length;
    const defaultCount = dataPoints.filter((d) => d.data_quality === 'default').length;

    const confidenceScores = dataPoints
      .map((d) => d.confidence_score)
      .filter((s): s is number => s !== null && s !== undefined);

    const avgConfidence =
      confidenceScores.length > 0
        ? confidenceScores.reduce((sum, s) => sum + s, 0) / confidenceScores.length
        : null;

    return {
      real_percentage: (realCount / dataPoints.length) * 100,
      estimated_percentage: (estimatedCount / dataPoints.length) * 100,
      default_percentage: (defaultCount / dataPoints.length) * 100,
      avg_confidence_score: avgConfidence,
    };
  }

  /**
   * Résultat vide
   */
  private static emptyResult(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): GHGHierarchicalResult {
    return {
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
      total_emissions: 0,
      scopes: [],
      coverage: {
        scope1_covered: false,
        scope2_covered: false,
        scope3_covered: false,
        mandatory_postes_missing: [],
      },
      data_quality: {
        real_percentage: 0,
        estimated_percentage: 0,
        default_percentage: 100,
        avg_confidence_score: null,
      },
      calculated_at: new Date().toISOString(),
    };
  }

  /**
   * Obtenir les émissions d'un poste spécifique
   */
  static async getPosteEmissions(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    posteId: string
  ): Promise<GHGPosteEmissions | null> {
    const result = await this.aggregateByGHGHierarchy(organizationId, periodStart, periodEnd);

    for (const scope of result.scopes) {
      const poste = scope.postes.find((p) => p.poste.id === posteId);
      if (poste) {
        return poste;
      }
    }

    return null;
  }

  /**
   * Obtenir les émissions d'un scope spécifique
   */
  static async getScopeEmissions(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    scope: ScopeNumber
  ): Promise<GHGScopeEmissions | null> {
    const result = await this.aggregateByGHGHierarchy(organizationId, periodStart, periodEnd);
    return result.scopes.find((s) => s.scope === scope) || null;
  }
}
