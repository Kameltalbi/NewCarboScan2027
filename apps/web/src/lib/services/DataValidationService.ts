/**
 * SERVICE DE VALIDATION DES DONNÉES
 * 
 * Gestion de la validation par Admin et Auditeur
 * - Validation de périodes complètes
 * - Verrouillage des données
 * - Contrôle des rôles
 */

import { supabase, sessionAuth} from "@/integrations/api/client";

export type ValidationStatus = 'draft' | 'pending_review' | 'validated' | 'rejected';
export type ValidationRole = 'collector' | 'admin' | 'auditor';

export interface ValidationStats {
  total_data: number;
  draft_data: number;
  pending_data: number;
  validated_data: number;
  rejected_data: number;
  locked_data: number;
  can_validate: boolean;
}

export interface ValidationPeriod {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  period_label?: string;
  status: ValidationStatus;
  validated_by?: string;
  validated_at?: string;
  validation_notes?: string;
}

/**
 * Service de validation des données collectées
 */
export class DataValidationService {
  
  /**
   * Récupérer le rôle de validation de l'utilisateur connecté
   */
  static async getCurrentUserRole(): Promise<ValidationRole | null> {
    const { data: { user } } = await sessionAuth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('validation_role')
      .eq('id', user.id)
      .single();
    
    if (error || !data) return 'collector'; // Par défaut
    return data.validation_role as ValidationRole;
  }
  
  /**
   * Vérifier si l'utilisateur peut valider (Admin ou Auditeur)
   */
  static async canValidate(): Promise<boolean> {
    const role = await this.getCurrentUserRole();
    return role === 'admin' || role === 'auditor';
  }
  
  /**
   * Vérifier si l'utilisateur peut déverrouiller (Admin uniquement)
   */
  static async canUnlock(): Promise<boolean> {
    const role = await this.getCurrentUserRole();
    return role === 'admin';
  }
  
  /**
   * Récupérer les statistiques de validation pour une période
   */
  static async getValidationStats(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<ValidationStats | null> {
    const { data, error } = await supabase.rpc('get_validation_stats', {
      org_id: organizationId,
      p_start: periodStart,
      p_end: periodEnd,
    });
    
    if (error) {
      console.error('Error fetching validation stats:', error);
      return null;
    }
    
    return data?.[0] || null;
  }
  
  /**
   * Valider une période complète (Admin/Auditeur uniquement)
   */
  static async validatePeriod(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    validationNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await sessionAuth.getUser();
    if (!user) {
      return { success: false, error: 'Utilisateur non connecté' };
    }
    
    // Vérifier le rôle
    const canValidate = await this.canValidate();
    if (!canValidate) {
      return { 
        success: false, 
        error: 'Seuls les Admin et Auditeurs peuvent valider les données' 
      };
    }
    
    const { error } = await supabase.rpc('validate_collection_period', {
      p_organization_id: organizationId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_validated_by: user.id,
      p_validation_notes: validationNotes || null,
    });
    
    if (error) {
      console.error('Error validating period:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  }
  
  /**
   * Déverrouiller une période (Admin uniquement)
   */
  static async unlockPeriod(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await sessionAuth.getUser();
    if (!user) {
      return { success: false, error: 'Utilisateur non connecté' };
    }
    
    // Vérifier le rôle
    const canUnlock = await this.canUnlock();
    if (!canUnlock) {
      return { 
        success: false, 
        error: 'Seuls les Admins peuvent déverrouiller les données' 
      };
    }
    
    const { error } = await supabase.rpc('unlock_collection_period', {
      p_organization_id: organizationId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_unlocked_by: user.id,
    });
    
    if (error) {
      console.error('Error unlocking period:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  }
  
  /**
   * Récupérer les périodes de validation d'une organisation
   */
  static async getValidationPeriods(organizationId: string): Promise<ValidationPeriod[]> {
    const { data, error } = await supabase
      .from('data_validation_periods')
      .select('*')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false });
    
    if (error) {
      console.error('Error fetching validation periods:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Marquer des données comme "prêtes à valider"
   */
  static async markAsReady(activityDataIds: string[]): Promise<boolean> {
    const { error } = await supabase
      .from('activity_data')
      .update({ validation_status: 'pending_review', updated_at: new Date().toISOString() })
      .in('id', activityDataIds)
      .eq('is_locked', false); // Ne pas modifier les données verrouillées
    
    if (error) {
      console.error('Error marking data as ready:', error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Rejeter des données avec commentaire
   */
  static async rejectData(
    activityDataIds: string[],
    rejectionReason: string
  ): Promise<boolean> {
    const canValidate = await this.canValidate();
    if (!canValidate) return false;
    
    const { error } = await supabase
      .from('activity_data')
      .update({ 
        validation_status: 'rejected',
        validation_notes: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .in('id', activityDataIds);
    
    if (error) {
      console.error('Error rejecting data:', error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Récupérer les données en attente de validation
   */
  static async getPendingData(organizationId: string) {
    const { data, error } = await supabase
      .from('activity_data')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('validation_status', 'pending_review')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching pending data:', error);
      return [];
    }
    
    return data || [];
  }
}
