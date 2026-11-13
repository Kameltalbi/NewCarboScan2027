/**
 * LOGIQUE D'ACTIVATION DES CATÉGORIES SCOPE 3
 * 
 * Gère l'activation/désactivation des 15 catégories GHG Protocol
 * basée sur des questions métier simples
 */

import { api } from "@/integrations/api/client";
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
  static async getActivationStatus(_organizationId: string): Promise<Map<Scope3CategoryId, Scope3CategoryActivation>> {
    const { items } = await api.listScope3Activations();
    const activationMap = new Map<Scope3CategoryId, Scope3CategoryActivation>();
    for (const activation of items as Scope3CategoryActivation[]) {
      activationMap.set(activation.category_id, activation);
    }
    return activationMap;
  }
  
  /**
   * Vérifier si une catégorie est active
   */
  static async isActive(organizationId: string, categoryId: Scope3CategoryId): Promise<boolean> {
    const status = await this.getActivationStatus(organizationId);
    return status.get(categoryId)?.is_active ?? false;
  }
  
  /**
   * Activer une catégorie
   */
  static async activate(
    _organizationId: string,
    categoryId: Scope3CategoryId,
    reason?: string,
    dataQuality: DataQualityStatus = 'estimated'
  ): Promise<void> {
    await api.saveScope3Activations([{
      category_id: categoryId,
      is_active: true,
      activation_reason: reason ?? null,
      data_quality: dataQuality,
    }]);
  }
  
  /**
   * Désactiver une catégorie
   */
  static async deactivate(
    _organizationId: string,
    categoryId: Scope3CategoryId,
    reason?: string
  ): Promise<void> {
    await api.saveScope3Activations([{
      category_id: categoryId,
      is_active: false,
      deactivation_reason: reason ?? null,
    }]);
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
    
    await api.saveScope3Activations(records.map((record) => ({
      category_id: record.category_id,
      is_active: record.is_active,
      activation_reason: record.activation_reason,
      deactivation_reason: record.deactivation_reason,
    })));
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
    
    const existing = await this.getActivationStatus(organizationId);
    const missing = records.filter((record) => !existing.has(record.category_id));
    if (missing.length === 0) return;
    await api.saveScope3Activations(missing.map((record) => ({
      category_id: record.category_id,
      is_active: record.is_active,
      activation_reason: record.activation_reason,
      data_quality: record.data_quality,
    })));
  }
  
  /**
   * Mettre à jour la qualité des données d'une catégorie
   */
  static async updateDataQuality(
    organizationId: string,
    categoryId: Scope3CategoryId,
    dataQuality: DataQualityStatus
  ): Promise<void> {
    const current = await this.isActive(organizationId, categoryId);
    await api.saveScope3Activations([{
      category_id: categoryId,
      is_active: current,
      data_quality: dataQuality,
    }]);
  }
  
  /**
   * Récupérer les catégories avec données manquantes
   */
  static async getMissingDataCategories(organizationId: string): Promise<Scope3CategoryId[]> {
    const status = await this.getActivationStatus(organizationId);
    return [...status.values()]
      .filter((row) => row.is_active && row.data_quality === 'not_available')
      .map((row) => row.category_id);
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
    const rows = [...(await this.getActivationStatus(organizationId)).values()];
    const categoryNumber = (categoryId: string) => parseInt(categoryId.match(/\d+/)?.[0] || '0', 10);
    const active = rows.filter((row) => row.is_active);
    const inactive = rows.filter((row) => !row.is_active);

    return {
      total: rows.length,
      active: active.length,
      inactive: inactive.length,
      upstream: active.filter((row) => categoryNumber(row.category_id) <= 8).length,
      downstream: active.filter((row) => categoryNumber(row.category_id) > 8).length,
      measuredData: active.filter((row) => row.data_quality === 'measured').length,
      estimatedData: active.filter((row) => row.data_quality === 'estimated').length,
      missingData: active.filter((row) => row.data_quality === 'not_available').length,
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
