// Service pour gérer le DataRoom CSRD (justificatifs)
// Stockage objet non porté : méthodes listent vide / throw un message clair.

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

const unavailable = () => {
  throw new Error('DataRoom non disponible : pas de stockage objet sur l’API Newcarboscan.');
};

export class CollectDataRoomService {
  static async create(_input: CreateDocumentInput): Promise<CollectDocument> {
    return unavailable();
  }

  static async uploadFile(
    _file: File,
    _organizationId: string,
    _folder?: string,
  ): Promise<{ path: string; url: string }> {
    return unavailable();
  }

  static async list(
    _organizationId: string,
    _filters?: {
      activity_data_id?: string;
      document_type?: DocumentType;
      category?: string;
    },
  ): Promise<CollectDocument[]> {
    return [];
  }

  static async get(_id: string): Promise<CollectDocument> {
    return unavailable();
  }

  static async update(
    _id: string,
    _updates: Partial<CreateDocumentInput>,
  ): Promise<CollectDocument> {
    return unavailable();
  }

  static async delete(_id: string): Promise<void> {
    return unavailable();
  }

  static async linkToActivity(_documentId: string, _activityDataId: string): Promise<void> {
    return unavailable();
  }

  static async getDocumentsForActivity(_activityDataId: string): Promise<CollectDocument[]> {
    return [];
  }

  static getPublicUrl(_document: CollectDocument): string {
    return '';
  }
}
