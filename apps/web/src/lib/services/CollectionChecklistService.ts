// Service pour gérer la checklist de collecte

import { supabase } from "@/integrations/api/client";
import type { ChecklistItem, CollectionProgress, ChecklistItemsByScope } from '../types/collection-checklist';

export class CollectionChecklistService {
  /**
   * Récupère la checklist complète pour une organisation
   */
  static async getChecklist(organizationId: string): Promise<ChecklistItem[]> {
    const { data, error } = await supabase
      .from('collection_checklist')
      .select('*')
      .eq('organization_id', organizationId)
      .order('scope', { ascending: true })
      .order('poste_code', { ascending: true });

    if (error) {
      console.error('Error fetching checklist:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Récupère la progression globale de collecte
   */
  static async getProgress(organizationId: string): Promise<CollectionProgress | null> {
    const { data, error } = await supabase
      .rpc('get_collection_progress', { org_id: organizationId })
      .single();

    if (error) {
      console.error('Error fetching collection progress:', error);
      throw error;
    }

    return data as CollectionProgress | null;
  }

  /**
   * Récupère les postes obligatoires manquants
   */
  static async getMissingMandatoryPostes(organizationId: string): Promise<ChecklistItem[]> {
    const { data, error } = await supabase
      .rpc('get_missing_mandatory_postes', { org_id: organizationId });

    if (error) {
      console.error('Error fetching missing mandatory postes:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Initialise la checklist pour une organisation
   */
  static async initializeChecklist(organizationId: string): Promise<void> {
    const { error } = await supabase
      .rpc('initialize_collection_checklist', { org_id: organizationId });

    if (error) {
      console.error('Error initializing checklist:', error);
      throw error;
    }
  }

  /**
   * Groupe les items de checklist par scope
   */
  static groupByScope(items: ChecklistItem[]): ChecklistItemsByScope[] {
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.scope]) {
        acc[item.scope] = [];
      }
      acc[item.scope].push(item);
      return acc;
    }, {} as Record<number, ChecklistItem[]>);

    return Object.entries(grouped).map(([scope, items]) => {
      const completed = items.filter(i => i.status === 'completed').length;
      return {
        scope: Number(scope),
        items,
        completed,
        total: items.length,
        percentage: Math.round((completed / items.length) * 100)
      };
    });
  }

  /**
   * Calcule les statistiques de la checklist
   */
  static calculateStats(items: ChecklistItem[]) {
    const mandatory = items.filter(i => i.is_mandatory);
    const completed = items.filter(i => i.status === 'completed');
    const completedMandatory = mandatory.filter(i => i.status === 'completed');

    return {
      total: items.length,
      mandatory: mandatory.length,
      completed: completed.length,
      completedMandatory: completedMandatory.length,
      percentage: mandatory.length > 0 
        ? Math.round((completedMandatory.length / mandatory.length) * 100)
        : 0,
      totalDataPoints: items.reduce((sum, item) => sum + item.data_count, 0)
    };
  }

  /**
   * Détermine le statut d'audit-readiness
   */
  static getAuditStatus(percentage: number): 'insufficient' | 'partial' | 'audit_ready' {
    if (percentage >= 100) return 'audit_ready';
    if (percentage >= 40) return 'partial';
    return 'insufficient';
  }
}
