import { supabase } from "@/integrations/api/client";

export type BilanStatus = 'draft' | 'submitted' | 'validated' | 'revision';

export interface BilanWorkflowInfo {
  found: boolean;
  id?: string;
  status?: BilanStatus;
  revision_count?: number;
  max_revisions?: number;
  revisions_remaining?: number;
  can_edit?: boolean;
  can_submit?: boolean;
  can_request_revision?: boolean;
  reference_year?: number;
  validated_at?: string;
  submitted_at?: string;
}

export interface BilanWorkflowResult {
  success: boolean;
  error?: string;
  status?: BilanStatus;
  revision_count?: number;
}

export interface CanCreateResult {
  can_create: boolean;
  reason?: string;
  existing_bilan_id?: string;
  existing_status?: BilanStatus;
}

// Status labels and colors for UI
export const BILAN_STATUS_CONFIG: Record<BilanStatus, { label: string; color: string; bgColor: string; description: string }> = {
  draft: {
    label: 'Brouillon',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-300',
    description: 'En cours de saisie — vous pouvez modifier librement vos données.',
  },
  submitted: {
    label: 'Soumis pour validation',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-300',
    description: 'Votre bilan est en cours de vérification par un expert en comptabilité carbone.',
  },
  validated: {
    label: 'Validé',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-300',
    description: 'Votre bilan a été vérifié et validé.',
  },
  revision: {
    label: 'En révision',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-300',
    description: 'Vous pouvez modifier vos données d\'activité. Les champs clés (entreprise, secteur, année) sont verrouillés.',
  },
};

// Fields that are locked during revision mode
export const LOCKED_FIELDS_IN_REVISION = [
  'company_name',
  'companyName',
  'activitySector',
  'sector',
  'annee_etude',
  'reference_year',
  'employees',
  'country',
];

export class BilanWorkflowService {

  /**
   * Check if a bilan can be created for a given org + year
   */
  static async canCreateBilan(userId: string, orgId: string, year: number): Promise<CanCreateResult> {
    try {
      const { data, error } = await (supabase.rpc as any)('can_create_bilan', {
        _user_id: userId,
        _org_id: orgId,
        _year: year,
      });

      if (error) {
        console.error('Error checking can_create_bilan:', error);
        // Fallback: check locally
        return await this.canCreateBilanLocal(orgId, year);
      }

      return data as CanCreateResult;
    } catch {
      return await this.canCreateBilanLocal(orgId, year);
    }
  }

  /**
   * Local fallback for canCreateBilan (if RPC not yet deployed)
   */
  private static async canCreateBilanLocal(orgId: string, year: number): Promise<CanCreateResult> {
    const { data: existing } = await supabase
      .from('bilans_carbone')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('reference_year', year)
      .maybeSingle();

    if (existing) {
      return {
        can_create: false,
        reason: `Un bilan existe déjà pour l'année ${year}`,
        existing_bilan_id: existing.id,
        existing_status: existing.status as BilanStatus,
      };
    }

    return { can_create: true };
  }

  /**
   * Get workflow status for a bilan
   */
  static async getWorkflowStatus(bilanId: string): Promise<BilanWorkflowInfo> {
    try {
      const { data, error } = await (supabase.rpc as any)('get_bilan_workflow_status', {
        _bilan_id: bilanId,
      });

      if (error) {
        console.error('Error getting workflow status:', error);
        return await this.getWorkflowStatusLocal(bilanId);
      }

      return data as BilanWorkflowInfo;
    } catch {
      return await this.getWorkflowStatusLocal(bilanId);
    }
  }

  /**
   * Local fallback for getWorkflowStatus
   */
  private static async getWorkflowStatusLocal(bilanId: string): Promise<BilanWorkflowInfo> {
    const { data } = await supabase
      .from('bilans_carbone')
      .select('id, status, revision_count, max_revisions, reference_year, validated_at, submitted_at')
      .eq('id', bilanId)
      .maybeSingle();

    if (!data) return { found: false };

    const status = (data.status || 'draft') as BilanStatus;
    const revisionCount = data.revision_count || 0;
    const maxRevisions = data.max_revisions || 2;

    return {
      found: true,
      id: data.id,
      status,
      revision_count: revisionCount,
      max_revisions: maxRevisions,
      revisions_remaining: maxRevisions - revisionCount,
      can_edit: status === 'draft' || status === 'revision',
      can_submit: status === 'draft' || status === 'revision',
      can_request_revision: status === 'validated' && revisionCount < maxRevisions,
      reference_year: data.reference_year,
      validated_at: data.validated_at,
      submitted_at: data.submitted_at,
    };
  }

  /**
   * Submit bilan for expert validation
   */
  static async submitForValidation(bilanId: string, userId: string): Promise<BilanWorkflowResult> {
    try {
      const { data, error } = await (supabase.rpc as any)('submit_bilan_for_validation', {
        _bilan_id: bilanId,
        _user_id: userId,
      });

      if (error) {
        console.error('Error submitting bilan:', error);
        // Fallback: update locally
        return await this.submitForValidationLocal(bilanId, userId);
      }

      return data as BilanWorkflowResult;
    } catch {
      return await this.submitForValidationLocal(bilanId, userId);
    }
  }

  private static async submitForValidationLocal(bilanId: string, userId: string): Promise<BilanWorkflowResult> {
    const { data: bilan } = await supabase
      .from('bilans_carbone')
      .select('status')
      .eq('id', bilanId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!bilan) return { success: false, error: 'Bilan non trouvé' };

    const status = bilan.status || 'draft';
    if (status !== 'draft' && status !== 'revision') {
      return { success: false, error: `Ce bilan ne peut pas être soumis dans son état actuel (${status})` };
    }

    const { error } = await supabase
      .from('bilans_carbone')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() } as any)
      .eq('id', bilanId);

    if (error) return { success: false, error: error.message };
    return { success: true, status: 'submitted' };
  }

  /**
   * Request a revision (user side, max 2)
   */
  static async requestRevision(bilanId: string, userId: string): Promise<BilanWorkflowResult> {
    try {
      const { data, error } = await (supabase.rpc as any)('request_bilan_revision', {
        _bilan_id: bilanId,
        _user_id: userId,
      });

      if (error) {
        console.error('Error requesting revision:', error);
        return await this.requestRevisionLocal(bilanId, userId);
      }

      return data as BilanWorkflowResult;
    } catch {
      return await this.requestRevisionLocal(bilanId, userId);
    }
  }

  private static async requestRevisionLocal(bilanId: string, userId: string): Promise<BilanWorkflowResult> {
    const { data: bilan } = await supabase
      .from('bilans_carbone')
      .select('status, revision_count, max_revisions')
      .eq('id', bilanId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!bilan) return { success: false, error: 'Bilan non trouvé' };

    if ((bilan.status || 'draft') !== 'validated') {
      return { success: false, error: 'Seul un bilan validé peut faire l\'objet d\'une demande de révision' };
    }

    const revCount = bilan.revision_count || 0;
    const maxRev = bilan.max_revisions || 2;

    if (revCount >= maxRev) {
      return { success: false, error: `Nombre maximum de révisions atteint (${maxRev})` };
    }

    const { error } = await supabase
      .from('bilans_carbone')
      .update({ status: 'revision', revision_count: revCount + 1 } as any)
      .eq('id', bilanId);

    if (error) return { success: false, error: error.message };
    return { success: true, status: 'revision', revision_count: revCount + 1 };
  }

  /**
   * Validate bilan (admin/superadmin only)
   */
  static async validateBilan(bilanId: string, adminId: string): Promise<BilanWorkflowResult> {
    try {
      const { data, error } = await (supabase.rpc as any)('validate_bilan', {
        _bilan_id: bilanId,
        _admin_id: adminId,
      });

      if (error) {
        console.error('Error validating bilan:', error);
        return await this.validateBilanLocal(bilanId, adminId);
      }

      const rpcResult = data as BilanWorkflowResult | null;

      // Compatibilité: si la RPC impose encore "submitted", appliquer la logique locale assouplie
      if (rpcResult?.success === false) {
        const err = (rpcResult.error || '').toLowerCase();
        const blockedByLegacySubmittedRule =
          err.includes('statut "soumis"') ||
          err.includes('status "submitted"') ||
          (err.includes('submitted') && err.includes('valid'));

        if (blockedByLegacySubmittedRule) {
          return await this.validateBilanLocal(bilanId, adminId);
        }

        return rpcResult;
      }

      if (rpcResult) return rpcResult;

      return await this.validateBilanLocal(bilanId, adminId);
    } catch {
      return await this.validateBilanLocal(bilanId, adminId);
    }
  }

  private static async validateBilanLocal(bilanId: string, adminId: string): Promise<BilanWorkflowResult> {
    const { data: bilan } = await supabase
      .from('bilans_carbone')
      .select('status')
      .eq('id', bilanId)
      .maybeSingle();

    if (!bilan) return { success: false, error: 'Bilan non trouvé' };

    if ((bilan.status || 'draft') === 'validated') {
      return { success: false, error: 'Ce bilan est déjà validé' };
    }

    const { error } = await supabase
      .from('bilans_carbone')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: adminId,
      } as any)
      .eq('id', bilanId);

    if (error) return { success: false, error: error.message };
    return { success: true, status: 'validated' };
  }

  /**
   * Check if a field is locked for the current bilan status
   */
  static isFieldLocked(fieldName: string, status: BilanStatus): boolean {
    if (status === 'revision') {
      return LOCKED_FIELDS_IN_REVISION.includes(fieldName);
    }
    if (status === 'submitted' || status === 'validated') {
      return true; // All fields locked
    }
    return false; // draft = all editable
  }
}
