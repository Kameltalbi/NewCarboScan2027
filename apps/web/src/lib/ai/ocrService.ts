// Service IA pour OCR et extraction de données depuis factures
import { supabase } from "@/integrations/api/client";

export interface OCRResult {
  success: boolean;
  data: Record<string, any>;
  confidence: number;
  extractedFields: {
    [key: string]: {
      value: any;
      confidence: number;
      source: string;
    };
  };
  rawText?: string;
  error?: string;
}

export interface InvoiceData {
  // Électricité
  electricite_quantite?: number; // kWh
  electricite_montant?: number; // TND
  
  // Gaz
  gaz_naturel_quantite?: number; // m³
  gaz_naturel_montant?: number; // TND
  
  // Fuel
  fuel_quantite?: number; // litres
  fuel_montant?: number; // TND
  
  // Carburant
  carburant_quantite?: number; // litres
  carburant_montant?: number; // TND
  
  // Métadonnées
  date_facture?: string;
  fournisseur?: string;
  numero_facture?: string;
  periode?: string;
}

/**
 * Service OCR utilisant l'IA pour extraire les données des factures
 */
export class OCRService {
  /**
   * Extraire les données directement depuis un fichier stocké dans Supabase Storage.
   * (Ne dépend pas de la table collect_files — utile si l'insertion échoue à cause de contraintes/RLS.)
   */
  static async extractFromStorage(
    params: {
      filePath: string;
      bucket: string;
      category: 'facture_electricite' | 'facture_gaz' | 'facture_fuel' | 'facture_carburant';
    }
  ): Promise<OCRResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('ocr-extract', {
        body: {
          file_id: 'storage-only',
          file_path: params.filePath,
          bucket: params.bucket,
          category: params.category,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (ocrError) throw ocrError;
      return ocrResult as OCRResult;
    } catch (error) {
      console.error('Erreur OCR (storage):', error);
      return {
        success: false,
        data: {},
        confidence: 0,
        extractedFields: {},
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Extraire les données d'une facture PDF/image
   */
  static async extractFromFile(
    fileId: string,
    category: 'facture_electricite' | 'facture_gaz' | 'facture_fuel' | 'facture_carburant'
  ): Promise<OCRResult> {
    try {
      // Récupérer le fichier depuis Supabase Storage
      const { data: fileData, error: fileError } = await (supabase
        .from('collect_files' as any)
        .select('storage_path, file_type')
        .eq('id', fileId)
        .single() as any);

      if (fileError || !fileData) {
        throw new Error('Fichier non trouvé');
      }

      // Appeler l'Edge Function pour l'OCR
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('ocr-extract', {
        body: {
          file_id: fileId,
          file_path: fileData.storage_path,
          // La table collect_files ne stocke pas le bucket dans ce projet
          bucket: 'collect-files',
          category: category,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (ocrError) {
        throw ocrError;
      }

      // Mettre à jour le statut d'extraction
      await (supabase
        .from('collect_files' as any)
        .update({
          extraction_status: ocrResult.success ? 'completed' : 'failed',
          extracted_data: ocrResult.data,
        })
        .eq('id', fileId) as any);

      return ocrResult;
    } catch (error) {
      console.error('Erreur OCR:', error);
      return {
        success: false,
        data: {},
        confidence: 0,
        extractedFields: {},
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Convertir les données OCR en réponses de collecte
   */
  static convertOCRToResponses(
    ocrResult: OCRResult,
    category: string
  ): Array<{ question_key: string; value: any; unit: string; confidence: number }> {
    const responses: Array<{ question_key: string; value: any; unit: string; confidence: number }> = [];
    const data = ocrResult.extractedFields;

    switch (category) {
      case 'facture_electricite':
        if (data.electricite_quantite) {
          responses.push({
            question_key: 'electricite_quantite',
            value: data.electricite_quantite.value,
            unit: 'kWh',
            confidence: data.electricite_quantite.confidence,
          });
        }
        break;

      case 'facture_gaz':
        if (data.gaz_naturel_quantite) {
          responses.push({
            question_key: 'gaz_naturel_quantite',
            value: data.gaz_naturel_quantite.value,
            unit: 'm³',
            confidence: data.gaz_naturel_quantite.confidence,
          });
        }
        break;

      case 'facture_fuel':
        if (data.fuel_quantite) {
          responses.push({
            question_key: 'fioul_quantite',
            value: data.fuel_quantite.value,
            unit: 'litres',
            confidence: data.fuel_quantite.confidence,
          });
        }
        break;

      case 'facture_carburant':
        if (data.carburant_quantite) {
          responses.push({
            question_key: 'carburant_consommation',
            value: data.carburant_quantite.value,
            unit: 'litres',
            confidence: data.carburant_quantite.confidence,
          });
        }
        break;
    }

    return responses;
  }

  /**
   * Extraire les données de plusieurs fichiers en batch
   */
  static async extractBatch(
    fileIds: string[],
    category: string
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    for (const fileId of fileIds) {
      const result = await this.extractFromFile(
        fileId,
        category as any
      );
      results.push(result);
    }

    return results;
  }
}
