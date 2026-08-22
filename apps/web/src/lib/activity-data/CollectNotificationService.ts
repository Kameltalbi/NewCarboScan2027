// Service pour gérer les notifications du module Collect

import { supabase, sessionAuth} from "@/integrations/api/client";

export type NotificationType =
  | 'data_validation_required'
  | 'data_quality_warning'
  | 'collection_reminder'
  | 'collection_completed'
  | 'duplicate_detected'
  | 'import_completed'
  | 'export_ready'
  | 'team_member_added'
  | 'team_member_removed';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CollectNotification {
  id: string;
  organization_id: string;
  user_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  action_url: string | null;
  metadata: Record<string, any> | null;
  read: boolean;
  read_at: string | null;
  priority: NotificationPriority;
  created_at: string;
}

export interface CreateNotificationInput {
  organization_id: string;
  user_id?: string | null; // NULL = pour tous les membres
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  metadata?: Record<string, any>;
  priority?: NotificationPriority;
}

/**
 * Service pour gérer les notifications du module Collect
 */
export class CollectNotificationService {
  /**
   * Créer une notification
   */
  static async create(input: CreateNotificationInput): Promise<string> {
    const { data, error } = await supabase.rpc('create_collect_notification', {
      p_organization_id: input.organization_id,
      p_user_id: input.user_id || null,
      p_type: input.type,
      p_title: input.title,
      p_message: input.message,
      p_action_url: input.action_url || null,
      p_metadata: input.metadata || null,
      p_priority: input.priority || 'normal',
    });

    if (error) {
      throw new Error(`Erreur lors de la création de la notification: ${error.message}`);
    }

    return data as string;
  }

  /**
   * Récupérer les notifications d'un utilisateur
   */
  static async getUserNotifications(
    organizationId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<CollectNotification[]> {
    let query = supabase
      .from('collect_notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`user_id.is.null,user_id.eq.${(await sessionAuth.getUser()).data.user?.id}`)
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq('read', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération des notifications: ${error.message}`);
    }

    return (data || []) as CollectNotification[];
  }

  /**
   * Marquer une notification comme lue
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('collect_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour de la notification: ${error.message}`);
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  static async markAllAsRead(organizationId: string): Promise<void> {
    const { data: { user } } = await sessionAuth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('collect_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .eq('read', false);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour des notifications: ${error.message}`);
    }
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  static async getUnreadCount(organizationId: string): Promise<number> {
    const { data: { user } } = await sessionAuth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('collect_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .eq('read', false);

    if (error) {
      throw new Error(`Erreur lors du comptage des notifications: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Supprimer une notification
   */
  static async delete(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('collect_notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Erreur lors de la suppression de la notification: ${error.message}`);
    }
  }

  /**
   * Créer une notification de validation requise
   */
  static async notifyValidationRequired(
    organizationId: string,
    activityDataId: string,
    userId?: string
  ): Promise<string> {
    return this.create({
      organization_id: organizationId,
      user_id: userId || null,
      type: 'data_validation_required',
      title: 'Validation de données requise',
      message: 'Des données nécessitent votre validation avant d\'être utilisées dans les calculs.',
      action_url: `/app/collecte?validate=${activityDataId}`,
      metadata: { activity_data_id: activityDataId },
      priority: 'high',
    });
  }

  /**
   * Créer une notification de qualité de données
   */
  static async notifyDataQualityWarning(
    organizationId: string,
    activityDataId: string,
    warning: string,
    userId?: string
  ): Promise<string> {
    return this.create({
      organization_id: organizationId,
      user_id: userId || null,
      type: 'data_quality_warning',
      title: 'Avertissement qualité de données',
      message: warning,
      action_url: `/app/collecte?view=${activityDataId}`,
      metadata: { activity_data_id: activityDataId },
      priority: 'normal',
    });
  }

  /**
   * Créer une notification de rappel de collecte
   */
  static async notifyCollectionReminder(
    organizationId: string,
    period: string,
    userId?: string
  ): Promise<string> {
    return this.create({
      organization_id: organizationId,
      user_id: userId || null,
      type: 'collection_reminder',
      title: 'Rappel de collecte',
      message: `N'oubliez pas de compléter la collecte de données pour ${period}.`,
      action_url: '/app/collecte/nouvelle',
      metadata: { period },
      priority: 'normal',
    });
  }

  /**
   * Créer une notification de doublon détecté
   */
  static async notifyDuplicateDetected(
    organizationId: string,
    activityDataId: string,
    duplicateIds: string[],
    userId?: string
  ): Promise<string> {
    return this.create({
      organization_id: organizationId,
      user_id: userId || null,
      type: 'duplicate_detected',
      title: 'Doublon détecté',
      message: `Une donnée similaire existe déjà. Vérifiez qu'il ne s'agit pas d'un doublon.`,
      action_url: `/app/collecte?view=${activityDataId}`,
      metadata: { activity_data_id: activityDataId, duplicate_ids: duplicateIds },
      priority: 'low',
    });
  }
}
