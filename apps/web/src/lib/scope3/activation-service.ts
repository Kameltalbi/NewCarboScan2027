/**
 * LOGIQUE D'ACTIVATION DES CATÉGORIES SCOPE 3
 * 
 * Gère l'activation/désactivation des 15 catégories GHG Protocol
 * basée sur des questions métier simples
 */

import { supabase } from "@/integrations/api/client";
import type { Scope3CategoryId } from './ghg-protocol-categories';
import type { DataQualityStatus } from './ghg-protocol-categories';

/**
 * Configuration d'activation d'une catégorie Scope 3 pour une organisation
 */
export interface Scope3CategoryActivation {
  id?: string;
  organization_id: string;
  category_id: Scope3CategoryId;
  is_active: boolean;
  activation_reason?: string;
  deactivation_reason?: string;
  data_quality?: DataQualityStatus;
  updated_at?: string;
}

/**
 * Service de gestion de l'activation des catégories Scope 3
 */
export class Scope3ActivationService {
  
  /**
   * Récupérer l'état d'activation de toutes les catégories pour une organisation
   */
  static async getActivationStatus(organizationId: string): Promise<Map<Scope3CategoryId, Scope3CategoryActivation>> {
    const { data, error } = await supabase
      .from('scope3_category_activations')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('Error fetching Scope 3 activations:', error);
      return new Map();
    }
    
    const activationMap = new Map<Scope3CategoryId, Scope3CategoryActivation>();
    data?.forEach(activation => {
      activationMap.set(activation.category_id as Scope3CategoryId, activation);
    });
    
    return activationMap;
  }
  
  /**
   * Vérifier si une catégorie est active
   */
  static async isActive(organizationId: string, categoryId: Scope3CategoryId): Promise<boolean> {
    const { data, error } = await supabase
      .from('scope3_category_activations')
      .select('is_active')
      .eq('organization_id', organizationId)
      .eq('category_id', categoryId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking category activation:', error);
      return false;
    }
    
    return data?.is_active ?? false;
  }
  
  /**
   * Activer une catégorie
   */
  static async activate(
    organizationId: string,
    categoryId: Scope3CategoryId,
    reason?: string,
    dataQuality: DataQualityStatus = 'estimated'
  ): Promise<void> {
    const { error } = await supabase
      .from('scope3_category_activations')
      .upsert({
        organization_id: organizationId,
        category_id: categoryId,
        is_active: true,
        activation_reason: reason,
        data_quality: dataQuality,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,category_id'
      });
    
    if (error) {
      console.error('Error activating category:', error);
      throw error;
    }
  }
  
  /**
   * Désactiver une catégorie
   */
  static async deactivate(
    organizationId: string,
    categoryId: Scope3CategoryId,
    reason?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('scope3_category_activations')
      .upsert({
        organization_id: organizationId,
        category_id: categoryId,
        is_active: false,
        deactivation_reason: reason,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,category_id'
      });
    
    if (error) {
      console.error('Error deactivating category:', error);
      throw error;
    }
  }
  
  /**
   * Activer/désactiver plusieurs catégories en lot
   */
  static async batchUpdate(
    organizationId: string,
    updates: Array<{ categoryId: Scope3CategoryId; isActive: boolean; reason?: string }>
  ): Promise<void> {
    const records = updates.map(update => ({
      organization_id: organizationId,
      category_id: update.categoryId,
      is_active: update.isActive,
      activation_reason: update.isActive ? update.reason : undefined,
      deactivation_reason: !update.isActive ? update.reason : undefined,
      updated_at: new Date().toISOString(),
    }));
    
    const { error } = await supabase
      .from('scope3_category_activations')
      .upsert(records, {
        onConflict: 'organization_id,category_id'
      });
    
    if (error) {
      console.error('Error batch updating categories:', error);
      throw error;
    }
  }
  
  /**
   * Initialiser les activations par défaut pour une nouvelle organisation
   */
  static async initializeDefaults(organizationId: string): Promise<void> {
    // Catégories actives par défaut (les plus communes)
    const defaultActivations: Scope3CategoryId[] = [
      'cat1_purchased_goods',
      'cat2_capital_goods',
      'cat3_fuel_energy', // Auto-calculée
      'cat4_upstream_transport',
      'cat5_waste',
      'cat6_business_travel',
      'cat7_commuting',
    ];
    
    const records = defaultActivations.map(categoryId => ({
      organization_id: organizationId,
      category_id: categoryId,
      is_active: true,
      activation_reason: 'Activation par défaut (catégories communes)',
      data_quality: 'estimated' as DataQualityStatus,
    }));
    
    const { error } = await supabase
      .from('scope3_category_activations')
      .upsert(records, {
        onConflict: 'organization_id,category_id',
        ignoreDuplicates: true,
      });
    
    if (error) {
      console.error('Error initializing default activations:', error);
      throw error;
    }
  }
  
  /**
   * Mettre à jour la qualité des données d'une catégorie
   */
  static async updateDataQuality(
    organizationId: string,
    categoryId: Scope3CategoryId,
    dataQuality: DataQualityStatus
  ): Promise<void> {
    const { error } = await supabase
      .from('scope3_category_activations')
      .update({ 
        data_quality: dataQuality,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('category_id', categoryId);
    
    if (error) {
      console.error('Error updating data quality:', error);
      throw error;
    }
  }
  
  /**
   * Récupérer les catégories avec données manquantes
   */
  static async getMissingDataCategories(organizationId: string): Promise<Scope3CategoryId[]> {
    const { data, error } = await supabase
      .from('scope3_category_activations')
      .select('category_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('data_quality', 'not_available');
    
    if (error) {
      console.error('Error fetching missing data categories:', error);
      return [];
    }
    
    return data?.map(d => d.category_id as Scope3CategoryId) || [];
  }
  
  /**
   * Récupérer les statistiques d'activation pour une organisation
   */
  static async getActivationStats(organizationId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    upstream: number;
    downstream: number;
    measuredData: number;
    estimatedData: number;
    missingData: number;
  }> {
    const { data, error } = await supabase
      .from('scope3_category_activations')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('Error fetching activation stats:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        upstream: 0,
        downstream: 0,
        measuredData: 0,
        estimatedData: 0,
        missingData: 0,
      };
    }
    
    const active = data?.filter(d => d.is_active) || [];
    const inactive = data?.filter(d => !d.is_active) || [];
    
    return {
      total: data?.length || 0,
      active: active.length,
      inactive: inactive.length,
      upstream: active.filter(d => d.category_id.startsWith('cat') && parseInt(d.category_id.match(/\d+/)?.[0] || '0') <= 8).length,
      downstream: active.filter(d => d.category_id.startsWith('cat') && parseInt(d.category_id.match(/\d+/)?.[0] || '0') > 8).length,
      measuredData: active.filter(d => d.data_quality === 'measured').length,
      estimatedData: active.filter(d => d.data_quality === 'estimated').length,
      missingData: active.filter(d => d.data_quality === 'not_available').length,
    };
  }
}

/**
 * Helper: Déterminer automatiquement si une catégorie devrait être active
 * basé sur des heuristiques métier
 */
export async function suggestCategoryActivation(
  organizationId: string,
  categoryId: Scope3CategoryId
): Promise<{ shouldActivate: boolean; reason: string }> {
  
  // TODO: Implémenter des heuristiques intelligentes basées sur :
  // - Type d'entreprise (si disponible dans le profil)
  // - Secteur d'activité
  // - Taille (nombre d'employés)
  // - Données déjà saisies dans d'autres catégories
  
  // Pour l'instant, retourne une suggestion par défaut
  const commonCategories: Scope3CategoryId[] = [
    'cat1_purchased_goods',
    'cat2_capital_goods',
    'cat3_fuel_energy',
    'cat5_waste',
    'cat6_business_travel',
    'cat7_commuting',
  ];
  
  return {
    shouldActivate: commonCategories.includes(categoryId),
    reason: commonCategories.includes(categoryId) 
      ? 'Catégorie commune à la plupart des entreprises'
      : 'Catégorie spécifique, à activer selon votre activité',
  };
}
