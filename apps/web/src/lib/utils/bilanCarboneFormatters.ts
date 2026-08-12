/**
 * Utilitaires de formatage pour les Bilans Carbone®
 * Conformes aux règles méthodologiques du Bilan Carbone® ADEME
 */

/**
 * Formate une valeur d'émissions en tCO₂e selon les règles du Bilan Carbone®
 * Règle : Arrondir à l'entier le plus proche, pas de décimales
 * 
 * @param kgCO2e - Émissions en kilogrammes CO₂e
 * @returns Émissions en tonnes CO₂e, arrondies à l'entier
 * 
 * @example
 * formatEmissions(1694733) // "1695"
 * formatEmissions(518392.4) // "518"
 */
export function formatEmissions(kgCO2e: number): string {
  const tonnes = kgCO2e / 1000;
  return Math.round(tonnes).toLocaleString('fr-FR');
}

/**
 * Formate une valeur d'émissions en tCO₂e (nombre)
 * 
 * @param kgCO2e - Émissions en kilogrammes CO₂e
 * @returns Émissions en tonnes CO₂e, arrondies à l'entier
 */
export function convertToTonnes(kgCO2e: number): number {
  return Math.round(kgCO2e / 1000);
}

/**
 * Formate un pourcentage selon les règles du Bilan Carbone®
 * Règle : Arrondir à l'entier le plus proche
 * 
 * @param percent - Pourcentage (0-100)
 * @returns Pourcentage arrondi avec le symbole %
 * 
 * @example
 * formatPercent(45.7) // "46%"
 * formatPercent(12.3) // "12%"
 */
export function formatPercent(percent: number): string {
  return `${Math.round(percent)}%`;
}

/**
 * Formate une intensité carbone
 * Règle : Arrondir à l'entier le plus proche
 * 
 * @param intensity - Intensité carbone
 * @param unit - Unité (par défaut: "tCO₂e")
 * @returns Intensité formatée avec unité
 * 
 * @example
 * formatIntensity(3.456, "tCO₂e/collaborateur") // "3 tCO₂e/collaborateur"
 * formatIntensity(125.8, "kgCO₂e/m²") // "126 kgCO₂e/m²"
 */
export function formatIntensity(intensity: number, unit: string = "tCO₂e"): string {
  return `${Math.round(intensity).toLocaleString('fr-FR')} ${unit}`;
}

/**
 * Formate un nombre avec séparateurs de milliers (format français)
 * 
 * @param value - Nombre à formater
 * @returns Nombre formaté avec espaces comme séparateurs de milliers
 * 
 * @example
 * formatNumber(1694733) // "1 694 733"
 * formatNumber(518) // "518"
 */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('fr-FR');
}

/**
 * Calcule et formate le pourcentage d'une partie par rapport au total
 * 
 * @param part - Valeur partielle
 * @param total - Valeur totale
 * @returns Pourcentage arrondi
 * 
 * @example
 * calculatePercent(518, 1695) // 31
 */
export function calculatePercent(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Formate une valeur monétaire avec la devise spécifiée
 * 
 * @param amount - Montant
 * @param currency - Code devise (défaut: 'TND')
 * @returns Montant formaté avec symbole de devise
 * 
 * @example
 * formatCurrency(1500000, 'EUR') // "1 500 000 €"
 * formatCurrency(1500000, 'TND') // "1 500 000 TND"
 */
export function formatCurrency(amount: number, currency: string = 'TND'): string {
  const currencySymbols: Record<string, string> = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'TND': 'TND',
    'MAD': 'MAD',
    'DZD': 'DZD',
    'CHF': 'CHF',
    'CAD': 'CAD',
  };
  const symbol = currencySymbols[currency] || currency;
  return `${Math.round(amount).toLocaleString('fr-FR')} ${symbol}`;
}

/**
 * Formate une surface en m²
 * 
 * @param surface - Surface en m²
 * @returns Surface formatée avec unité
 * 
 * @example
 * formatSurface(1250) // "1 250 m²"
 */
export function formatSurface(surface: number): string {
  return `${Math.round(surface).toLocaleString('fr-FR')} m²`;
}

/**
 * Formate un effectif (nombre de collaborateurs)
 * 
 * @param employees - Nombre de collaborateurs
 * @returns Effectif formaté
 * 
 * @example
 * formatEmployees(150) // "150 collaborateurs"
 * formatEmployees(1) // "1 collaborateur"
 */
export function formatEmployees(employees: number): string {
  const rounded = Math.round(employees);
  return `${rounded.toLocaleString('fr-FR')} ${rounded > 1 ? 'collaborateurs' : 'collaborateur'}`;
}

/**
 * Règles de formatage pour les rapports Bilan Carbone®
 */
export const BILAN_CARBONE_RULES = {
  /**
   * Règle 1 : Arrondir toutes les valeurs d'émissions à l'entier le plus proche
   * Justification : Éviter une fausse précision, les facteurs d'émission ont une incertitude
   */
  ROUND_EMISSIONS: true,
  
  /**
   * Règle 2 : Arrondir les pourcentages à l'entier le plus proche
   * Justification : Cohérence avec les valeurs d'émissions arrondies
   */
  ROUND_PERCENTAGES: true,
  
  /**
   * Règle 3 : Arrondir les intensités carbone à l'entier le plus proche
   * Justification : Même logique que pour les émissions
   */
  ROUND_INTENSITIES: true,
  
  /**
   * Règle 4 : Utiliser le séparateur de milliers français (espace)
   * Justification : Norme française, améliore la lisibilité
   */
  USE_FRENCH_SEPARATORS: true,
  
  /**
   * Règle 5 : Unité standard = tCO₂e (tonnes équivalent CO₂)
   * Justification : Unité de référence du Bilan Carbone®
   */
  STANDARD_UNIT: 'tCO₂e',
} as const;

/**
 * Exemples d'utilisation
 */
export const FORMATTING_EXAMPLES = {
  emissions: {
    input: 1694733, // kg CO₂e
    output: formatEmissions(1694733), // "1 695 tCO₂e"
  },
  percent: {
    input: 45.7,
    output: formatPercent(45.7), // "46%"
  },
  intensity: {
    input: 3.456,
    output: formatIntensity(3.456, 'tCO₂e/collaborateur'), // "3 tCO₂e/collaborateur"
  },
} as const;
