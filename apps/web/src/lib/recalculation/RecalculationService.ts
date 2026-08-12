// Service de recalcul automatique
// Gère la communication avec le système de recalcul automatique

import { supabase } from "@/integrations/api/client";
import { logger } from '@/utils/logger';

export interface RecalculationTask {
  id: string;
  organization_id: string;
  product_id?: string;
  trigger_type: 'activity_data_change' | 'manual' | 'scheduled';
  trigger_details?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  retry_count: number;
}

export interface RecalculationResult {
  bilan_carbone?: any;
  product_footprint?: any;
  dashboard_metrics?: any;
}

export class RecalculationService {
  /**
   * Déclencher un recalcul manuel
   */
  static async triggerManualRecalculation(
    organizationId: string,
    options?: {
      productId?: string;
      periodStart?: string;
      periodEnd?: string;
    }
  ): Promise<RecalculationResult> {
    try {
      // Appeler la Edge Function directement
      const { data, error } = await supabase.functions.invoke(
        'recalculate-on-activity-change',
        {
          body: {
            type: 'MANUAL',
            table: 'activity_data',
            record: {
              organization_id: organizationId,
              product_id: options?.productId,
              period_start: options?.periodStart,
              period_end: options?.periodEnd,
            },
          },
        }
      );

      if (error) {
        throw new Error(`Erreur lors du recalcul: ${error.message}`);
      }

      return data.recalculations || {};
    } catch (error: any) {
      logger.error('Error triggering manual recalculation:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des recalculs
   */
  static async getRecalculationHistory(
    organizationId: string,
    limit: number = 20
  ): Promise<RecalculationTask[]> {
    const { data, error } = await supabase
      .from('recalculation_queue')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupérer le statut du dernier recalcul
   */
  static async getLatestRecalculationStatus(
    organizationId: string
  ): Promise<RecalculationTask | null> {
    const { data, error } = await supabase
      .from('recalculation_queue')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return data;
  }

  /**
   * Vérifier si un recalcul est en cours
   */
  static async isRecalculationInProgress(
    organizationId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('recalculation_queue')
      .select('id')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'processing'])
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Error checking recalculation status:', error);
      return false;
    }

    return data !== null;
  }

  /**
   * S'abonner aux changements de statut des recalculs
   */
  static subscribeToRecalculations(
    organizationId: string,
    callback: (task: RecalculationTask) => void
  ) {
    const subscription = supabase
      .channel(`recalculation_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recalculation_queue',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          logger.debug('Recalculation update:', payload);
          if (payload.new) {
            callback(payload.new as RecalculationTask);
          }
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Calculer le Bilan Carbone depuis activity_data
   */
  static async calculateBilanCarbone(
    organizationId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<any> {
    const { data, error } = await supabase.rpc(
      'calculate_bilan_carbone_from_activity_data',
      {
        p_organization_id: organizationId,
        p_period_start: periodStart || null,
        p_period_end: periodEnd || null,
      }
    );

    if (error) {
      throw new Error(`Erreur lors du calcul: ${error.message}`);
    }

    return data;
  }

  /**
   * Calculer l'empreinte produit depuis activity_data
   */
  static async calculateProductFootprint(
    organizationId: string,
    productId: string
  ): Promise<any> {
    const { data, error } = await supabase.rpc(
      'calculate_product_footprint_from_activity_data',
      {
        p_organization_id: organizationId,
        p_product_id: productId,
      }
    );

    if (error) {
      throw new Error(`Erreur lors du calcul: ${error.message}`);
    }

    return data;
  }

  /**
   * Calculer les métriques du dashboard depuis activity_data
   */
  static async calculateDashboardMetrics(
    organizationId: string
  ): Promise<any> {
    const { data, error } = await supabase.rpc(
      'calculate_dashboard_metrics_from_activity_data',
      {
        p_organization_id: organizationId,
      }
    );

    if (error) {
      throw new Error(`Erreur lors du calcul: ${error.message}`);
    }

    return data;
  }

  /**
   * Vérifier si le cache est valide
   */
  static async isCacheValid(
    organizationId: string,
    cacheType: 'bilan_carbone' | 'product_footprint'
  ): Promise<boolean> {
    if (cacheType === 'bilan_carbone') {
      const { data, error } = await supabase
        .from('bilans_carbone')
        .select('is_cache_valid')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      return data.is_cache_valid === true;
    }

    // TODO: Implémenter pour product_footprint si nécessaire
    return false;
  }

  /**
   * Invalider le cache manuellement
   */
  static async invalidateCache(
    organizationId: string,
    cacheType: 'bilan_carbone' | 'product_footprint'
  ): Promise<void> {
    if (cacheType === 'bilan_carbone') {
      const { error } = await supabase
        .from('bilans_carbone')
        .update({
          is_cache_valid: false,
          cache_invalidated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(`Erreur lors de l'invalidation: ${error.message}`);
      }
    }

    // TODO: Implémenter pour product_footprint si nécessaire
  }
}
