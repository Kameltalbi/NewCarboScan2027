/**
 * CALCUL AUTOMATIQUE CATÉGORIE 3 - GHG PROTOCOL
 * 
 * Catégorie 3: Fuel- and energy-related activities (not included in Scope 1 or Scope 2)
 * 
 * Cette catégorie se calcule AUTOMATIQUEMENT à partir des données Scope 1 et 2.
 * Elle inclut:
 * - Extraction, raffinage et transport des combustibles (Scope 1)
 * - Production et transport d'électricité (Scope 2)
 * - Pertes réseau de distribution
 * 
 * IMPORTANT: AUCUNE SAISIE MANUELLE n'est requise.
 */

import { supabase } from "@/integrations/api/client";
import { logger } from '@/utils/logger';

/**
 * Facteurs d'émission upstream pour Scope 1 & 2
 * (Exprimés en kgCO2e par unité d'énergie finale)
 * 
 * Ces facteurs représentent les émissions liées à la production/extraction/transport
 * des énergies AVANT leur consommation (qui est déjà comptée en Scope 1 & 2)
 */
const UPSTREAM_EMISSION_FACTORS = {
  // Scope 1 - Combustibles fossiles (facteurs upstream)
  electricity_grid: 0.08,        // kgCO2e/kWh (production, transport, pertes)
  fossil_gas: 0.23,              // kgCO2e/m³ (extraction, transport)
  fossil_diesel: 0.52,           // kgCO2e/L (raffinage, transport)
  fossil_fuel_oil: 0.55,         // kgCO2e/L
  fuel_diesel: 0.52,             // kgCO2e/L
  fuel_gasoline: 0.47,           // kgCO2e/L
  fuel_lpg: 0.38,                // kgCO2e/kg
  
  // Scope 2 - Électricité (facteurs upstream)
  electricity_self: 0.05,        // kgCO2e/kWh (auto-production, facteur plus faible)
  
  // Chaleur/vapeur/froid
  district_heat: 0.12,           // kgCO2e/kWh
  district_steam: 0.15,          // kgCO2e/kWh
  district_cold: 0.10,           // kgCO2e/kWh
  
  // Défaut générique
  default: 0.15,                 // kgCO2e/kWh équivalent
};

/**
 * Résultat du calcul catégorie 3
 */
export interface Category3Result {
  totalEmissions: number;        // kgCO2e
  scope1Contribution: number;    // kgCO2e (part venant du Scope 1)
  scope2Contribution: number;    // kgCO2e (part venant du Scope 2)
  breakdown: Array<{
    source: string;
    subcategory: string;
    quantity: number;
    unit: string;
    upstreamFactor: number;
    emissions: number;           // kgCO2e
  }>;
  hasData: boolean;
}

/**
 * Service de calcul automatique de la catégorie 3
 */
export class Category3Calculator {
  
  /**
   * Calculer la catégorie 3 pour une organisation sur une période
   */
  static async calculate(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<Category3Result> {
    
    // Récupérer TOUTES les données Scope 1 et 2 de l'organisation sur la période
    const { data: activityData, error } = await supabase
      .from('activity_data')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd)
      .in('category', ['scope1', 'scope2']);
    
    if (error) {
      logger.error('Error fetching Scope 1 & 2 data for Cat3 calculation:', error);
      return {
        totalEmissions: 0,
        scope1Contribution: 0,
        scope2Contribution: 0,
        breakdown: [],
        hasData: false,
      };
    }
    
    if (!activityData || activityData.length === 0) {
      return {
        totalEmissions: 0,
        scope1Contribution: 0,
        scope2Contribution: 0,
        breakdown: [],
        hasData: false,
      };
    }
    
    const breakdown: Category3Result['breakdown'] = [];
    let scope1Total = 0;
    let scope2Total = 0;
    
    // Calculer les émissions upstream pour chaque ligne d'activité
    activityData.forEach(activity => {
      const subcategory = activity.subcategory || 'default';
      const upstreamFactor = UPSTREAM_EMISSION_FACTORS[subcategory] || UPSTREAM_EMISSION_FACTORS.default;
      
      // Convertir la quantité en unité équivalente si nécessaire
      let normalizedQuantity = activity.quantity;
      
      // Appliquer le facteur upstream
      const upstreamEmissions = normalizedQuantity * upstreamFactor;
      
      breakdown.push({
        source: activity.category === 'scope1' ? 'Scope 1' : 'Scope 2',
        subcategory: subcategory,
        quantity: activity.quantity,
        unit: activity.unit,
        upstreamFactor: upstreamFactor,
        emissions: upstreamEmissions,
      });
      
      if (activity.category === 'scope1') {
        scope1Total += upstreamEmissions;
      } else {
        scope2Total += upstreamEmissions;
      }
    });
    
    return {
      totalEmissions: scope1Total + scope2Total,
      scope1Contribution: scope1Total,
      scope2Contribution: scope2Total,
      breakdown,
      hasData: true,
    };
  }
  
  /**
   * Enregistrer le résultat du calcul de catégorie 3 dans activity_data
   * (pour traçabilité et inclusion dans le bilan final)
   */
  static async saveCalculation(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    result: Category3Result
  ): Promise<void> {
    
    if (!result.hasData || result.totalEmissions === 0) {
      logger.debug('No Scope 1 & 2 data, skipping Cat3 save');
      return;
    }
    
    // Supprimer l'ancien calcul de catégorie 3 pour cette période (si existe)
    await supabase
      .from('activity_data')
      .delete()
      .eq('organization_id', organizationId)
      .eq('scope3_category_id', 'cat3_fuel_energy')
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd);
    
    // Insérer le nouveau calcul
    const { error } = await supabase
      .from('activity_data')
      .insert({
        organization_id: organizationId,
        activity_type: 'energy',
        category: 'scope3_upstream',
        scope3_category_id: 'cat3_fuel_energy',
        subcategory: 'auto_calculated',
        quantity: result.totalEmissions / 1000, // Convertir en tonnes
        unit: 'tCO2e',
        period_start: periodStart,
        period_end: periodEnd,
        data_quality: 'estimated',
        notes: `Calcul automatique - Cat 3 GHG Protocol. Scope 1: ${(result.scope1Contribution / 1000).toFixed(2)} tCO2e, Scope 2: ${(result.scope2Contribution / 1000).toFixed(2)} tCO2e`,
        is_verified: false,
        metadata: {
          auto_calculated: true,
          calculation_method: 'upstream_factors',
          scope1_contribution: result.scope1Contribution,
          scope2_contribution: result.scope2Contribution,
          breakdown: result.breakdown,
        },
      });
    
    if (error) {
      logger.error('Error saving Cat3 calculation:', error);
      throw error;
    }
  }
  
  /**
   * Recalculer automatiquement la catégorie 3 lorsque Scope 1 ou 2 change
   */
  static async autoRecalculate(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<void> {
    const result = await this.calculate(organizationId, periodStart, periodEnd);
    await this.saveCalculation(organizationId, periodStart, periodEnd, result);
  }
  
  /**
   * Vérifier si la catégorie 3 doit être active pour une organisation
   */
  static async shouldBeActive(organizationId: string): Promise<boolean> {
    // Cat3 est active si Scope 1 OU Scope 2 contient des données
    const { data, error } = await supabase
      .from('activity_data')
      .select('id')
      .eq('organization_id', organizationId)
      .in('category', ['scope1', 'scope2'])
      .limit(1);
    
    if (error) {
      logger.error('Error checking Cat3 activation:', error);
      return false;
    }
    
    return (data?.length || 0) > 0;
  }
}

/**
 * Hook optionnel: Trigger automatique pour recalculer Cat3
 * à chaque insertion/modification dans Scope 1 ou 2
 * 
 * À implémenter côté Supabase (voir migration SQL)
 */
export const CATEGORY3_AUTO_TRIGGER_SQL = `
-- Trigger: Recalculer automatiquement Cat3 quand Scope 1 ou 2 change
CREATE OR REPLACE FUNCTION trigger_recalculate_cat3()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marquer l'organisation pour recalcul Cat3
  -- (Le recalcul sera fait par le backend via un job ou lors du prochain chargement)
  
  UPDATE scope3_category_activations
  SET updated_at = NOW()
  WHERE organization_id = NEW.organization_id
    AND category_id = 'cat3_fuel_energy';
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_scope1_scope2_change_recalc_cat3 ON activity_data;
CREATE TRIGGER on_scope1_scope2_change_recalc_cat3
  AFTER INSERT OR UPDATE ON activity_data
  FOR EACH ROW
  WHEN (NEW.category IN ('scope1', 'scope2'))
  EXECUTE FUNCTION trigger_recalculate_cat3();
`;
