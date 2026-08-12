// Configuration pour les services OCR (frontend)
export type OCRProvider = 'google_vision' | 'aws_textract' | 'simulation';

export interface OCRConfig {
  provider: OCRProvider;
  googleVision?: {
    apiKey?: string;
    projectId?: string;
  };
  awsTextract?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  };
}

/**
 * Configuration OCR - Pour le frontend, toujours utiliser simulation
 * La vraie configuration est gérée côté edge function
 */
export const getOCRConfig = (): OCRConfig => {
  // En frontend, on utilise toujours la simulation
  // Le vrai OCR est géré par les edge functions Supabase
  return {
    provider: 'simulation',
    googleVision: undefined,
    awsTextract: undefined,
  };
};

/**
 * Vérifie si l'OCR réel est disponible (via edge function)
 */
export const isRealOCRAvailable = (): boolean => {
  // Le vrai OCR n'est disponible que via edge function
  return false;
};
