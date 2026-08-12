/**
 * Normalisation & Pondération PEF (Product Environmental Footprint)
 * 
 * Référentiel : EU PEF 3.0 / ILCD midpoint
 * Les facteurs de normalisation convertissent les résultats bruts en "person-equivalents" (PE)
 * Les facteurs de pondération reflètent l'importance relative de chaque catégorie
 * 
 * Source : JRC Technical Report — PEF method 3.0 (2021)
 */

import type { ACVImpactResult } from '../types';

// ── FACTEURS DE NORMALISATION PEF 3.0 ──
// Valeur = impact annuel moyen par habitant EU (person-equivalent)
export const PEF_NORMALIZATION_FACTORS: Record<keyof ACVImpactResult, { value: number; unit: string; label: string }> = {
  carbon: {
    value: 8100,       // kgCO2e / personne / an (EU27)
    unit: 'kgCO₂e/cap/an',
    label: 'Changement climatique',
  },
  energy: {
    value: 65000,      // MJ / personne / an
    unit: 'MJ/cap/an',
    label: 'Énergie primaire',
  },
  water: {
    value: 11500,      // m³ / personne / an (AWARE)
    unit: 'm³eq/cap/an',
    label: 'Utilisation d\'eau',
  },
  acidification: {
    value: 55.6,       // kgSO2e / personne / an
    unit: 'kgSO₂e/cap/an',
    label: 'Acidification',
  },
};

// ── FACTEURS DE PONDÉRATION PEF 3.0 ──
// Importance relative (somme = 100%)
export const PEF_WEIGHTING_FACTORS: Record<keyof ACVImpactResult, number> = {
  carbon: 0.2106,       // 21.06% — Changement climatique
  energy: 0.0842,       // 8.42%  — Ressources énergétiques
  water: 0.0851,        // 8.51%  — Utilisation d'eau
  acidification: 0.0620, // 6.20% — Acidification
};

// ── RÉSULTATS NORMALISÉS ──

export interface NormalizedImpact {
  category: keyof ACVImpactResult;
  label: string;
  raw_value: number;
  raw_unit: string;
  normalized_value: number;  // person-equivalents (PE)
  weighted_value: number;    // PE × weight (µPt)
  percentage_of_total: number;
}

export interface PEFNormalizationResult {
  impacts: NormalizedImpact[];
  total_weighted_score: number;   // Single score (µPt)
  dominant_category: string;
  benchmark_comparison?: BenchmarkComparison;
}

export interface BenchmarkComparison {
  sector: string;
  sector_average: number;    // µPt
  performance_ratio: number; // < 1 = meilleur que la moyenne
  rating: 'excellent' | 'good' | 'average' | 'poor';
}

// ── BENCHMARKS SECTORIELS (µPt par kg de produit) ──
// Source : PEF pilot studies, valeurs indicatives
export const SECTOR_BENCHMARKS: Record<string, { average: number; label: string }> = {
  metals: { average: 0.85, label: 'Métaux & métallurgie' },
  plastics: { average: 0.42, label: 'Plastiques & polymères' },
  construction: { average: 1.20, label: 'Construction' },
  textiles: { average: 0.95, label: 'Textiles' },
  electronics: { average: 1.50, label: 'Électronique' },
  food: { average: 0.65, label: 'Agroalimentaire' },
  chemicals: { average: 0.78, label: 'Chimie' },
  general: { average: 0.80, label: 'Général' },
};

// ── FONCTIONS DE CALCUL ──

/**
 * Normalise un résultat d'impact brut en person-equivalents
 */
export function normalizeImpact(rawValue: number, category: keyof ACVImpactResult): number {
  const factor = PEF_NORMALIZATION_FACTORS[category];
  if (!factor || factor.value === 0) return 0;
  return rawValue / factor.value;
}

/**
 * Applique la pondération PEF à une valeur normalisée
 */
export function weightImpact(normalizedValue: number, category: keyof ACVImpactResult): number {
  const weight = PEF_WEIGHTING_FACTORS[category];
  return normalizedValue * weight * 1e6; // Résultat en µPt (micro-points)
}

/**
 * Calcule la normalisation et pondération complète PEF
 */
export function calculatePEFNormalization(
  totals: ACVImpactResult,
  sector?: string
): PEFNormalizationResult {
  const categories: Array<keyof ACVImpactResult> = ['carbon', 'energy', 'water', 'acidification'];
  
  const impacts: NormalizedImpact[] = categories.map(cat => {
    const normalized = normalizeImpact(totals[cat], cat);
    const weighted = weightImpact(normalized, cat);
    return {
      category: cat,
      label: PEF_NORMALIZATION_FACTORS[cat].label,
      raw_value: totals[cat],
      raw_unit: getUnit(cat),
      normalized_value: normalized,
      weighted_value: weighted,
      percentage_of_total: 0, // filled below
    };
  });

  const total_weighted_score = impacts.reduce((sum, i) => sum + i.weighted_value, 0);

  // Calculate percentages
  impacts.forEach(i => {
    i.percentage_of_total = total_weighted_score > 0
      ? (i.weighted_value / total_weighted_score) * 100
      : 0;
  });

  // Find dominant category
  const dominant = impacts.reduce((max, i) => i.weighted_value > max.weighted_value ? i : max, impacts[0]);

  // Benchmark comparison
  let benchmark_comparison: BenchmarkComparison | undefined;
  if (sector && SECTOR_BENCHMARKS[sector]) {
    const bench = SECTOR_BENCHMARKS[sector];
    const ratio = bench.average > 0 ? total_weighted_score / bench.average : 1;
    benchmark_comparison = {
      sector: bench.label,
      sector_average: bench.average,
      performance_ratio: ratio,
      rating: ratio < 0.7 ? 'excellent' : ratio < 1.0 ? 'good' : ratio < 1.3 ? 'average' : 'poor',
    };
  }

  return {
    impacts,
    total_weighted_score,
    dominant_category: dominant.label,
    benchmark_comparison,
  };
}

function getUnit(category: keyof ACVImpactResult): string {
  const units: Record<keyof ACVImpactResult, string> = {
    carbon: 'kgCO₂e',
    energy: 'MJ',
    water: 'm³',
    acidification: 'kgSO₂e',
  };
  return units[category];
}

/**
 * Formate un score PEF pour affichage
 */
export function formatPEFScore(microPoints: number): string {
  if (microPoints >= 1000) {
    return `${(microPoints / 1000).toFixed(2)} mPt`;
  }
  return `${microPoints.toFixed(2)} µPt`;
}

/**
 * Retourne la couleur sémantique pour un rating
 */
export function getRatingColor(rating: BenchmarkComparison['rating']): string {
  switch (rating) {
    case 'excellent': return 'text-emerald-600';
    case 'good': return 'text-blue-600';
    case 'average': return 'text-amber-600';
    case 'poor': return 'text-red-600';
  }
}

export function getRatingLabel(rating: BenchmarkComparison['rating']): string {
  switch (rating) {
    case 'excellent': return 'Excellent';
    case 'good': return 'Bon';
    case 'average': return 'Moyen';
    case 'poor': return 'À améliorer';
  }
}
