// Service pour gérer les collectes périodiques

import { supabase } from "@/integrations/api/client";
import { CollectNotificationService } from './CollectNotificationService';

export type CollectionFrequency = 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type CollectionStatus = 'active' | 'paused' | 'completed';
export type ExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export interface PeriodicCollection {
  id: string;
  organization_id: string;
  site_id: string | null;
  name: string;
  description: string | null;
  frequency: CollectionFrequency;
  custom_schedule: Record<string, any> | null;
  target_period_start: string;
  target_period_end: string;
  next_collection_date: string;
  last_collection_date: string | null;
  status: CollectionStatus;
  metadata: Record<string, any> | null;
  notify_before_days: number;
  notify_on_due: boolean;
  created_at: string;
  updated_at: string;
}

export interface PeriodicCollectionExecution {
  id: string;
  periodic_collection_id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  status: ExecutionStatus;
  data_count: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreatePeriodicCollectionInput {
  organization_id: string;
  site_id?: string | null;
  name: string;
  description?: string;
  frequency: CollectionFrequency;
  custom_schedule?: Record<string, any>;
  target_period_start: string;
  target_period_end: string;
  notify_before_days?: number;
  notify_on_due?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdatePeriodicCollectionInput {
  site_id?: string | null;
  name?: string;
  description?: string | null;
  frequency?: CollectionFrequency;
  custom_schedule?: Record<string, any> | null;
  target_period_start?: string;
  target_period_end?: string;
  next_collection_date?: string;
  status?: CollectionStatus;
  notify_before_days?: number;
  notify_on_due?: boolean;
  metadata?: Record<string, any> | null;
}

/**
 * Service pour gérer les collectes périodiques
 */
export class PeriodicCollectionService {
  /**
   * Créer une collecte périodique
   */
  static async create(input: CreatePeriodicCollectionInput): Promise<PeriodicCollection> {
    // Calculer la prochaine date de collecte
    const nextDate = this.calculateNextDate(input.frequency, input.target_period_start);

    const { data, error } = await supabase
      .from('periodic_collections')
      .insert({
        ...input,
        next_collection_date: nextDate,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la création de la collecte périodique: ${error.message}`);
    }

    return data as PeriodicCollection;
  }

  /**
   * Récupérer les collectes périodiques d'une organisation
   */
  static async list(organizationId: string): Promise<PeriodicCollection[]> {
    const { data, error } = await supabase
      .from('periodic_collections')
      .select('*')
      .eq('organization_id', organizationId)
      .order('next_collection_date', { ascending: true });

    if (error) {
      throw new Error(`Erreur lors de la récupération des collectes: ${error.message}`);
    }

    return (data || []) as PeriodicCollection[];
  }

  /**
   * Récupérer une collecte périodique
   */
  static async get(id: string): Promise<PeriodicCollection> {
    const { data, error } = await supabase
      .from('periodic_collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Erreur lors de la récupération de la collecte: ${error.message}`);
    }

    return data as PeriodicCollection;
  }

  /**
   * Mettre à jour une collecte périodique
   */
  static async update(
    id: string,
    updates: UpdatePeriodicCollectionInput
  ): Promise<PeriodicCollection> {
    const { data, error } = await supabase
      .from('periodic_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }

    return data as PeriodicCollection;
  }

  /**
   * Supprimer une collecte périodique
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('periodic_collections')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  /**
   * Calculer la prochaine date de collecte
   */
  static calculateNextDate(frequency: CollectionFrequency, startDate: string): string {
    const start = new Date(startDate);
    let next = new Date(start);

    switch (frequency) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }

    return next.toISOString().split('T')[0];
  }

  /**
   * Marquer une collecte comme effectuée
   */
  static async markAsCompleted(
    collectionId: string,
    periodStart: string,
    periodEnd: string,
    dataCount: number
  ): Promise<PeriodicCollectionExecution> {
    const collection = await this.get(collectionId);

    // Créer l'exécution
    const { data: execution, error: execError } = await supabase
      .from('periodic_collection_executions')
      .insert({
        periodic_collection_id: collectionId,
        organization_id: collection.organization_id,
        period_start: periodStart,
        period_end: periodEnd,
        status: 'completed',
        data_count: dataCount,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (execError) {
      throw new Error(`Erreur lors de la création de l'exécution: ${execError.message}`);
    }

    // Mettre à jour la collecte
    const nextDate = this.calculateNextDate(collection.frequency, periodEnd);
    await this.update(collectionId, {
      next_collection_date: nextDate,
    });

    return execution as PeriodicCollectionExecution;
  }

  /**
   * Récupérer les collectes dues (à effectuer)
   */
  static async getDueCollections(organizationId: string): Promise<PeriodicCollection[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('periodic_collections')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .lte('next_collection_date', today)
      .order('next_collection_date', { ascending: true });

    if (error) {
      throw new Error(`Erreur lors de la récupération des collectes dues: ${error.message}`);
    }

    return (data || []) as PeriodicCollection[];
  }

  /**
   * Récupérer les collectes à venir (avec rappel)
   */
  static async getUpcomingCollections(
    organizationId: string,
    daysAhead: number = 7
  ): Promise<PeriodicCollection[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('periodic_collections')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .gte('next_collection_date', today.toISOString().split('T')[0])
      .lte('next_collection_date', futureDate.toISOString().split('T')[0])
      .order('next_collection_date', { ascending: true });

    if (error) {
      throw new Error(`Erreur lors de la récupération des collectes à venir: ${error.message}`);
    }

    return (data || []) as PeriodicCollection[];
  }

  /**
   * Envoyer les notifications de rappel
   */
  static async sendReminderNotifications(organizationId: string): Promise<void> {
    const collections = await this.getUpcomingCollections(organizationId, 7);

    for (const collection of collections) {
      const daysUntil = Math.ceil(
        (new Date(collection.next_collection_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysUntil <= collection.notify_before_days) {
        await CollectNotificationService.notifyCollectionReminder(
          organizationId,
          `${collection.target_period_start} - ${collection.target_period_end}`
        );
      }
    }
  }

  /**
   * Récupérer l'historique des exécutions
   */
  static async getExecutions(
    collectionId: string
  ): Promise<PeriodicCollectionExecution[]> {
    const { data, error } = await supabase
      .from('periodic_collection_executions')
      .select('*')
      .eq('periodic_collection_id', collectionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération des exécutions: ${error.message}`);
    }

    return (data || []) as PeriodicCollectionExecution[];
  }
}
