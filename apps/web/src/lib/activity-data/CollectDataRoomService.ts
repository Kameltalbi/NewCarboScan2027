// Service pour gérer le DataRoom CSRD (justificatifs)

import { supabase } from "@/integrations/api/client";
import { logger } from '@/utils/logger';

export type DocumentType = 'invoice' | 'receipt' | 'certificate' | 'report' | 'contract' | 'measurement' | 'other';

export interface CollectDocument {
  id: string;
  organization_id: string;
  activity_data_id: string | null;
  name: string;
  description: string | null;
  document_type: DocumentType;
  category: string | null;
  storage_path: string;
  storage_bucket: string;
  file_name: string;
  file_type: string;
  file_size: number;
  tags: string[];
  period_start: string | null;
  period_end: string | null;
  metadata: Record<string, any>;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentInput {
  organization_id: string;
  activity_data_id?: string | null;
  name: string;
  description?: string;
  document_type: DocumentType;
  category?: string;
  storage_path: string;
  storage_bucket?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  tags?: string[];
  period_start?: string;
  period_end?: string;
  metadata?: Record<string, any>;
}

/**
 * Service pour gérer le DataRoom CSRD
 */
export class CollectDataRoomService {
  /**
   * Créer un document
   */
  static async create(input: CreateDocumentInput): Promise<CollectDocument> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('collect_documents')
      .insert({
        ...input,
        storage_bucket: input.storage_bucket || 'collect-documents',
        uploaded_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la création du document: ${error.message}`);
    }

    return data as CollectDocument;
  }

  /**
   * Upload un fichier vers Storage
   */
  static async uploadFile(
    file: File,
    organizationId: string,
    folder?: string
  ): Promise<{ path: string; url: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}/${folder || 'documents'}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('collect-documents')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('collect-documents')
      .getPublicUrl(fileName);

    return {
      path: fileName,
      url: urlData.publicUrl,
    };
  }

  /**
   * Récupérer les documents d'une organisation
   */
  static async list(organizationId: string, filters?: {
    activity_data_id?: string;
    document_type?: DocumentType;
    category?: string;
    tags?: string[];
    period_start?: string;
    period_end?: string;
  }): Promise<CollectDocument[]> {
    let query = supabase
      .from('collect_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (filters?.activity_data_id) {
      query = query.eq('activity_data_id', filters.activity_data_id);
    }

    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters?.period_start) {
      query = query.gte('period_start', filters.period_start);
    }

    if (filters?.period_end) {
      query = query.lte('period_end', filters.period_end);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération des documents: ${error.message}`);
    }

    return (data || []) as CollectDocument[];
  }

  /**
   * Récupérer un document
   */
  static async get(id: string): Promise<CollectDocument> {
    const { data, error } = await supabase
      .from('collect_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Erreur lors de la récupération du document: ${error.message}`);
    }

    return data as CollectDocument;
  }

  /**
   * Mettre à jour un document
   */
  static async update(
    id: string,
    updates: Partial<CreateDocumentInput>
  ): Promise<CollectDocument> {
    const { data, error } = await supabase
      .from('collect_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }

    return data as CollectDocument;
  }

  /**
   * Supprimer un document
   */
  static async delete(id: string): Promise<void> {
    // Récupérer le document pour supprimer le fichier
    const document = await this.get(id);

    // Supprimer le fichier du storage
    const { error: storageError } = await supabase.storage
      .from(document.storage_bucket)
      .remove([document.storage_path]);

    if (storageError) {
      logger.warn('Erreur suppression fichier storage:', storageError);
    }

    // Supprimer l'enregistrement
    const { error } = await supabase
      .from('collect_documents')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  /**
   * Lier un document à une donnée d'activité
   */
  static async linkToActivity(documentId: string, activityDataId: string): Promise<void> {
    await this.update(documentId, { activity_data_id: activityDataId });
  }

  /**
   * Obtenir les documents liés à une donnée d'activité
   */
  static async getDocumentsForActivity(activityDataId: string): Promise<CollectDocument[]> {
    const { data, error } = await supabase
      .from('collect_documents')
      .select('*')
      .eq('activity_data_id', activityDataId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return (data || []) as CollectDocument[];
  }

  /**
   * Obtenir l'URL publique d'un document
   */
  static getPublicUrl(document: CollectDocument): string {
    const { data } = supabase.storage
      .from(document.storage_bucket)
      .getPublicUrl(document.storage_path);

    return data.publicUrl;
  }
}
