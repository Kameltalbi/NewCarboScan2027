// Service pour gérer les données d'activité centrales

import { supabase } from "@/integrations/api/client";
import { ActivityData, ActivityDataInput, ActivityDataFilters, DataQualityStats } from './types';

export class ActivityDataService {
  /**
   * Créer une nouvelle donnée d'activité
   */
  static async create(data: ActivityDataInput): Promise<ActivityData> {
    const { data: activity, error } = await supabase
      .from('activity_data')
      .insert({
        ...data,
        data_quality: data.data_quality || 'estimated',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la création: ${error.message}`);
    }

    return activity;
  }

  /**
   * Récupérer une donnée d'activité par ID
   */
  static async getById(id: string): Promise<ActivityData | null> {
    const { data, error } = await supabase
      .from('activity_data')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return data;
  }

  /**
   * Lister les données d'activité avec filtres
   */
  static async list(filters: ActivityDataFilters): Promise<ActivityData[]> {
    let query = supabase
      .from('activity_data')
      .select('*')
      .eq('organization_id', filters.organization_id)
      .order('period_start', { ascending: false });

    // Filtre site strict: uniquement les données du site sélectionné
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }

    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters.activity_type) {
      query = query.eq('activity_type', filters.activity_type);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.period_start) {
      query = query.gte('period_start', filters.period_start);
    }

    if (filters.period_end) {
      query = query.lte('period_end', filters.period_end);
    }

    if (filters.data_quality) {
      query = query.eq('data_quality', filters.data_quality);
    }

    if (filters.scope_hint) {
      query = query.eq('scope_hint', filters.scope_hint);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mettre à jour une donnée d'activité
   */
  static async update(id: string, updates: Partial<ActivityDataInput>): Promise<ActivityData> {
    const { data, error } = await supabase
      .from('activity_data')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }

    return data;
  }

  /**
   * Supprimer une donnée d'activité
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('activity_data')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  /**
   * Calculer les émissions d'une activité
   */
  static async calculateEmissions(activityId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_activity_emissions', { p_activity_id: activityId });

    if (error) {
      throw new Error(`Erreur lors du calcul: ${error.message}`);
    }

    return data || 0;
  }

  /**
   * Obtenir les statistiques de qualité des données
   */
  static async getDataQualityStats(
    organizationId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<DataQualityStats> {
    const { data, error } = await supabase
      .rpc('get_data_quality_stats', {
        p_organization_id: organizationId,
        p_period_start: periodStart || null,
        p_period_end: periodEnd || null,
      })
      .single();

    if (error) {
      throw new Error(`Erreur lors de la récupération des stats: ${error.message}`);
    }

    return data as DataQualityStats;
  }

  /**
   * Importer des données depuis CSV/Excel
   */
  static async bulkCreate(activities: ActivityDataInput[]): Promise<ActivityData[]> {
    const { data, error } = await supabase
      .from('activity_data')
      .insert(activities.map(a => ({
        ...a,
        data_quality: a.data_quality || 'estimated',
      })))
      .select();

    if (error) {
      throw new Error(`Erreur lors de l'import: ${error.message}`);
    }

    return data || [];
  }
}

