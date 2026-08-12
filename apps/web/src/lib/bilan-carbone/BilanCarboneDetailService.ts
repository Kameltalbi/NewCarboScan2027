// Service pour gérer le détail structuré du Bilan Carbone
// Utilise la hiérarchie GHG Protocol (Scope > Poste > Catégorie)

import { supabase } from "@/integrations/api/client";
import { logger } from '@/utils/logger';
import { ActivityDataService } from '../activity-data/ActivityDataService';
import {
  mapActivityCategoryToGHGPoste,
  GHGPoste,
  GHGCategory,
  ScopeNumber,
  getAllPostes,
  getPosteById,
  getCategoriesByPoste,
} from './ghg-hierarchy';

export interface BilanCarboneDetailEntry {
  id: string;
  bilan_id: string;
  organization_id: string;
  scope: ScopeNumber;
  poste_code: string;
  poste_name: string;
  category_code?: string;
  category_name?: string;
  subcategory?: string;
  emissions_kg_co2e: number;
  co2_kg?: number;
  ch4_kg_co2e?: number;
  n2o_kg_co2e?: number;
  other_gases_kg_co2e?: number;
  activity_data_count: number;
  data_quality_score?: number;
  is_mandatory: boolean;
  notes?: string;
}

export interface BilanCarboneByScope {
  scope: ScopeNumber;
  total_emissions_kg_co2e: number;
  total_emissions_t_co2e: number;
  poste_count: number;
  total_activity_data_count: number;
  avg_data_quality?: number;
}

export interface BilanCarboneByPoste {
  scope: ScopeNumber;
  poste_code: string;
  poste_name: string;
  total_emissions_kg_co2e: number;
  total_emissions_t_co2e: number;
  category_count: number;
  total_activity_data_count: number;
  avg_data_quality?: number;
  percentage: number; // % du scope
}

export interface BilanCarboneDetailResult {
  byScope: BilanCarboneByScope[];
  byPoste: BilanCarboneByPoste[];
  details: BilanCarboneDetailEntry[];
  totalEmissions: number; // kg CO2e
  dataQuality: {
    real: number;
    estimated: number;
    default: number;
  };
}

export class BilanCarboneDetailService {
  /**
   * Calculer le bilan carbone détaillé avec hiérarchie complète
   */
  static async calculateDetail(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<BilanCarboneDetailResult> {
    // Récupérer toutes les activity_data de la période
    const activities = await ActivityDataService.list({
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
    });

    if (activities.length === 0) {
      return {
        byScope: [],
        byPoste: [],
        details: [],
        totalEmissions: 0,
        dataQuality: { real: 0, estimated: 0, default: 100 },
      };
    }

    // Calculer les émissions par activity_data et les mapper à la hiérarchie
    const detailsMap = new Map<string, BilanCarboneDetailEntry>();

    for (const activity of activities) {
      // Calculer les émissions
      const emissions = await ActivityDataService.calculateEmissions(activity.id);

      // Inférer le poste ID depuis la catégorie d'activité
      const posteId = mapActivityCategoryToGHGPoste(activity.category);

      if (!posteId) {
        logger.warn(`Impossible de mapper activity_data ${activity.id} à un poste GHG`);
        continue;
      }

      const poste = getPosteById(posteId);
      if (!poste) {
        logger.warn(`Poste ${posteId} non trouvé`);
        continue;
      }

      // Récupérer les catégories du poste
      const categories = getCategoriesByPoste(posteId);
      const category = categories[0] || { code: poste.code + '.0', name: poste.name };

      // Clé unique pour agréger
      const key = `${poste.code}-${category.code}`;

      if (detailsMap.has(key)) {
        // Agréger
        const existing = detailsMap.get(key)!;
        existing.emissions_kg_co2e += emissions;
        existing.activity_data_count += 1;
      } else {
        // Créer nouvelle entrée
        detailsMap.set(key, {
          id: crypto.randomUUID(),
          bilan_id: '', // Sera défini lors de la sauvegarde
          organization_id: organizationId,
          scope: poste.scope,
          poste_code: poste.code,
          poste_name: poste.name,
          category_code: category.code,
          category_name: category.name,
          subcategory: activity.subcategory || undefined,
          emissions_kg_co2e: emissions,
          activity_data_count: 1,
          data_quality_score: activity.confidence_score || undefined,
          is_mandatory: poste.mandatory || false,
        });
      }
    }

    const details = Array.from(detailsMap.values());

    // Calculer les agrégations par scope
    const byScopeMap = new Map<ScopeNumber, BilanCarboneByScope>();

    details.forEach((detail) => {
      if (!byScopeMap.has(detail.scope)) {
        byScopeMap.set(detail.scope, {
          scope: detail.scope,
          total_emissions_kg_co2e: 0,
          total_emissions_t_co2e: 0,
          poste_count: 0,
          total_activity_data_count: 0,
        });
      }

      const scopeData = byScopeMap.get(detail.scope)!;
      scopeData.total_emissions_kg_co2e += detail.emissions_kg_co2e;
      scopeData.total_emissions_t_co2e = scopeData.total_emissions_kg_co2e / 1000;
      scopeData.total_activity_data_count += detail.activity_data_count;
      
      // Compter les postes uniques
      const uniquePostes = new Set(
        details.filter((d) => d.scope === detail.scope).map((d) => d.poste_code)
      );
      scopeData.poste_count = uniquePostes.size;
    });

    // Calculer les agrégations par poste
    const byPosteMap = new Map<string, BilanCarboneByPoste>();

    details.forEach((detail) => {
      const key = `${detail.scope}-${detail.poste_code}`;
      
      if (!byPosteMap.has(key)) {
        byPosteMap.set(key, {
          scope: detail.scope,
          poste_code: detail.poste_code,
          poste_name: detail.poste_name,
          total_emissions_kg_co2e: 0,
          total_emissions_t_co2e: 0,
          category_count: 0,
          total_activity_data_count: 0,
          percentage: 0,
        });
      }

      const posteData = byPosteMap.get(key)!;
      posteData.total_emissions_kg_co2e += detail.emissions_kg_co2e;
      posteData.total_emissions_t_co2e = posteData.total_emissions_kg_co2e / 1000;
      posteData.total_activity_data_count += detail.activity_data_count;

      // Compter les catégories uniques
      const uniqueCategories = new Set(
        details
          .filter((d) => d.scope === detail.scope && d.poste_code === detail.poste_code)
          .map((d) => d.category_code)
      );
      posteData.category_count = uniqueCategories.size;
    });

    // Calculer les pourcentages par poste (% du scope)
    const byPoste = Array.from(byPosteMap.values()).map((poste) => {
      const scopeData = byScopeMap.get(poste.scope);
      if (scopeData && scopeData.total_emissions_kg_co2e > 0) {
        poste.percentage = (poste.total_emissions_kg_co2e / scopeData.total_emissions_kg_co2e) * 100;
      }
      return poste;
    });

    // Total des émissions
    const totalEmissions = details.reduce((sum, d) => sum + d.emissions_kg_co2e, 0);

    // Qualité des données
    const qualityStats = await ActivityDataService.getDataQualityStats(
      organizationId,
      periodStart,
      periodEnd
    );

    return {
      byScope: Array.from(byScopeMap.values()).sort((a, b) => a.scope - b.scope),
      byPoste: byPoste.sort((a, b) => {
        if (a.scope !== b.scope) return a.scope - b.scope;
        return b.total_emissions_kg_co2e - a.total_emissions_kg_co2e; // Tri décroissant
      }),
      details: details.sort((a, b) => {
        if (a.scope !== b.scope) return a.scope - b.scope;
        if (a.poste_code !== b.poste_code) return a.poste_code.localeCompare(b.poste_code);
        return b.emissions_kg_co2e - a.emissions_kg_co2e;
      }),
      totalEmissions,
      dataQuality: {
        real: qualityStats.real_percentage,
        estimated: qualityStats.estimated_percentage,
        default: qualityStats.default_percentage,
      },
    };
  }

  /**
   * Sauvegarder le bilan détaillé en base
   */
  static async saveDetail(
    bilanId: string,
    organizationId: string,
    details: BilanCarboneDetailEntry[]
  ): Promise<void> {
    // Supprimer les anciens détails
    await supabase
      .from('bilans_carbone_detail')
      .delete()
      .eq('bilan_id', bilanId);

    // Insérer les nouveaux
    const { error } = await supabase.from('bilans_carbone_detail').insert(
      details.map((d) => ({
        ...d,
        bilan_id: bilanId,
        organization_id: organizationId,
      }))
    );

    if (error) {
      throw new Error(`Erreur sauvegarde détail: ${error.message}`);
    }
  }

  /**
   * Récupérer le bilan détaillé depuis la base
   */
  static async getDetail(bilanId: string): Promise<BilanCarboneDetailResult | null> {
    const { data: details, error } = await supabase
      .from('bilans_carbone_detail')
      .select('*')
      .eq('bilan_id', bilanId);

    if (error || !details || details.length === 0) {
      return null;
    }

    // Recalculer les agrégations
    const byScopeMap = new Map<ScopeNumber, BilanCarboneByScope>();
    const byPosteMap = new Map<string, BilanCarboneByPoste>();

    details.forEach((detail: any) => {
      // Par scope
      if (!byScopeMap.has(detail.scope)) {
        byScopeMap.set(detail.scope, {
          scope: detail.scope,
          total_emissions_kg_co2e: 0,
          total_emissions_t_co2e: 0,
          poste_count: 0,
          total_activity_data_count: 0,
        });
      }
      const scopeData = byScopeMap.get(detail.scope)!;
      scopeData.total_emissions_kg_co2e += detail.emissions_kg_co2e;
      scopeData.total_emissions_t_co2e = scopeData.total_emissions_kg_co2e / 1000;
      scopeData.total_activity_data_count += detail.activity_data_count;

      // Par poste
      const key = `${detail.scope}-${detail.poste_code}`;
      if (!byPosteMap.has(key)) {
        byPosteMap.set(key, {
          scope: detail.scope,
          poste_code: detail.poste_code,
          poste_name: detail.poste_name,
          total_emissions_kg_co2e: 0,
          total_emissions_t_co2e: 0,
          category_count: 0,
          total_activity_data_count: 0,
          percentage: 0,
        });
      }
      const posteData = byPosteMap.get(key)!;
      posteData.total_emissions_kg_co2e += detail.emissions_kg_co2e;
      posteData.total_emissions_t_co2e = posteData.total_emissions_kg_co2e / 1000;
      posteData.total_activity_data_count += detail.activity_data_count;
    });

    const totalEmissions = details.reduce((sum: number, d: any) => sum + d.emissions_kg_co2e, 0);

    return {
      byScope: Array.from(byScopeMap.values()),
      byPoste: Array.from(byPosteMap.values()),
      details: details as BilanCarboneDetailEntry[],
      totalEmissions,
      dataQuality: { real: 0, estimated: 0, default: 100 }, // TODO: récupérer depuis bilan
    };
  }

  /**
   * Obtenir les postes manquants obligatoires
   */
  static getMandatoryPostes(): GHGPoste[] {
    const allPostes = getAllPostes();
    return allPostes.filter((poste) => poste.mandatory);
  }

  /**
   * Vérifier la complétude du bilan (postes obligatoires)
   */
  static checkCompleteness(details: BilanCarboneDetailEntry[]): {
    isComplete: boolean;
    missingPostes: GHGPoste[];
  } {
    const mandatoryPostes = this.getMandatoryPostes();
    const presentPosteCodes = new Set(details.map((d) => d.poste_code));

    const missingPostes = mandatoryPostes.filter(
      (poste) => !presentPosteCodes.has(poste.code)
    );

    return {
      isComplete: missingPostes.length === 0,
      missingPostes,
    };
  }
}
