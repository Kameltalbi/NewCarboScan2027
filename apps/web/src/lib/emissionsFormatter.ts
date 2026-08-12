/**
 * Utilitaires de formatage des émissions - VERROUILLÉ EN TONNES
 * 
 * IMPORTANT: Ce fichier assure que TOUTES les émissions sont TOUJOURS affichées en tonnes (tCO₂e)
 * conformément aux règles méthodologiques du Bilan Carbone® ADEME.
 * 
 * Ne jamais afficher en kg pour éviter toute confusion.
 */

/**
 * Formate une valeur d'émissions TOUJOURS en tonnes tCO₂e
 * @param value - Émissions en kilogrammes CO₂e
 * @returns Chaîne formatée en tonnes tCO₂e
 */
export function formatEmissions(value: number): string {
  // Assurer que la valeur est un nombre valide
  if (typeof value !== 'number' || isNaN(value)) {
    return '0 tCO₂e';
  }
  
  // TOUJOURS convertir en tonnes
  const tonnes = value / 1000;
  
  // Formatage intelligent : 2 décimales si < 1 tonne, sinon entier arrondi
  if (tonnes > 0 && tonnes < 1) {
    return `${tonnes.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tCO₂e`;
  }
  return `${Math.round(tonnes).toLocaleString('fr-FR')} tCO₂e`;
}

/**
 * Formate une valeur d'émissions pour l'affichage séparé valeur/unité
 * TOUJOURS en tonnes (tCO₂e) - jamais en kg
 */
export function formatEmissionsForDisplay(value: number): {
  value: string;
  unit: string;
  numericValue: number;
} {
  if (typeof value !== 'number' || isNaN(value)) {
    return { value: '0', unit: 'tCO₂e', numericValue: 0 };
  }
  
  // TOUJOURS convertir en tonnes
  const tonnes = value / 1000;
  
  // Formatage intelligent : 2 décimales si < 1 tonne, sinon entier arrondi
  if (tonnes > 0 && tonnes < 1) {
    return {
      value: tonnes.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      unit: 'tCO₂e',
      numericValue: tonnes
    };
  }
  
  return {
    value: Math.round(tonnes).toLocaleString('fr-FR'),
    unit: 'tCO₂e',
    numericValue: Math.round(tonnes)
  };
}

/**
 * Convertit des kg en tonnes (arrondi à l'entier)
 * @param kgValue - Valeur en kilogrammes
 * @returns Valeur en tonnes (arrondie)
 */
export function convertToTonnesIfNeeded(kgValue: number): number {
  return Math.round(kgValue / 1000);
}

/**
 * @deprecated - Ne pas utiliser, toujours travailler en tonnes
 * Conservé pour compatibilité mais retourne la valeur inchangée
 */
export function ensureKilograms(value: number): number {
  // deprecated - no-op
  return value;
}
