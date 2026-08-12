// Service pour gérer l'historique des modifications de activity_data

import { supabase } from "@/integrations/api/client";

export interface ActivityDataHistory {
  id: string;
  activity_data_id: string;
  organization_id: string;
  action: 'created' | 'updated' | 'deleted';
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: string[] | null;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

export interface HistoryFilter {
  activity_data_id?: string;
  organization_id: string;
  action?: 'created' | 'updated' | 'deleted';
  changed_by?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Service pour récupérer l'historique des modifications
 */
export class ActivityDataHistoryService {
  /**
   * Récupérer l'historique d'une donnée spécifique
   */
  static async getHistoryForActivity(
    activityId: string,
    organizationId: string
  ): Promise<ActivityDataHistory[]> {
    const { data, error } = await supabase
      .from('activity_data_history')
      .select('*')
      .eq('activity_data_id', activityId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
    }

    return (data || []) as ActivityDataHistory[];
  }

  /**
   * Récupérer l'historique avec filtres
   */
  static async getHistory(filters: HistoryFilter): Promise<ActivityDataHistory[]> {
    let query = supabase
      .from('activity_data_history')
      .select('*')
      .eq('organization_id', filters.organization_id)
      .order('created_at', { ascending: false });

    if (filters.activity_data_id) {
      query = query.eq('activity_data_id', filters.activity_data_id);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.changed_by) {
      query = query.eq('changed_by', filters.changed_by);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
    }

    return (data || []) as ActivityDataHistory[];
  }

  /**
   * Obtenir les statistiques d'historique
   */
  static async getHistoryStats(
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    total_changes: number;
    created_count: number;
    updated_count: number;
    deleted_count: number;
    most_active_user: { user_id: string; count: number } | null;
  }> {
    let query = supabase
      .from('activity_data_history')
      .select('action, changed_by')
      .eq('organization_id', organizationId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération des stats: ${error.message}`);
    }

    const history = (data || []) as ActivityDataHistory[];

    const stats = {
      total_changes: history.length,
      created_count: history.filter(h => h.action === 'created').length,
      updated_count: history.filter(h => h.action === 'updated').length,
      deleted_count: history.filter(h => h.action === 'deleted').length,
      most_active_user: null as { user_id: string; count: number } | null,
    };

    // Trouver l'utilisateur le plus actif
    const userCounts = new Map<string, number>();
    history.forEach(h => {
      if (h.changed_by) {
        userCounts.set(h.changed_by, (userCounts.get(h.changed_by) || 0) + 1);
      }
    });

    if (userCounts.size > 0) {
      const maxEntry = Array.from(userCounts.entries()).reduce((max, [userId, count]) =>
        count > max.count ? { user_id: userId, count } : max,
        { user_id: '', count: 0 }
      );
      if (maxEntry.count > 0) {
        stats.most_active_user = maxEntry;
      }
    }

    return stats;
  }
}
