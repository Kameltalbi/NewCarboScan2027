/**
 * Moteur d'analyse de sensibilité ACV
 * ISO 14044 § 4.5 — Évaluation de la robustesse des résultats
 * 
 * Teste l'influence de variations paramétriques sur les résultats :
 * - Variation des facteurs d'émission
 * - Variation des distances de transport
 * - Variation du taux de recyclage
 * - Variation des quantités
 */

import type { ACVImpactResult } from '../types';
import type { ACVProductResult } from './acvCalculationEngine';

// ============================================
// TYPES
// ============================================

export type SensitivityParameterType =
  | 'carbon_factor'
  | 'energy_factor'
  | 'water_factor'
  | 'transport_distance'
  | 'recycled_percentage'
  | 'quantity'
  | 'electricity_factor'
  | 'custom';

export interface SensitivityParameter {
  id: string;
  label: string;
  type: SensitivityParameterType;
  component_id?: string;          // Composant ciblé (si spécifique)
  base_value: number;             // Valeur de référence
  variation_min: number;          // Variation min en %
  variation_max: number;          // Variation max en %
  steps: number;                  // Nombre de pas de calcul
  unit?: string;
}

export interface SensitivityDataPoint {
  variation_pct: number;          // % de variation par rapport à base
  absolute_value: number;         // Valeur absolue du paramètre
  impact: ACVImpactResult;        // Impact calculé à ce point
  delta_pct: ACVImpactResult;     // % de variation de l'impact vs baseline
}

export interface SensitivityResult {
  parameter: SensitivityParameter;
  baseline_impact: ACVImpactResult;
  data_points: SensitivityDataPoint[];
  elasticity: ACVImpactResult;    // Élasticité : %Δimpact / %Δparamètre
  is_sensitive: boolean;          // Le paramètre a-t-il une influence significative (>5%)?
  max_impact_variation: ACVImpactResult; // Variation max observée
}

export interface SensitivityAnalysisResult {
  parameters: SensitivityResult[];
  most_sensitive: SensitivityResult[];  // Triés par influence décroissante
  robustness_score: number;             // 0–100 (100 = très robuste)
  summary: string;
}

// ============================================
// ANALYSE DE SENSIBILITÉ
// ============================================

/**
 * Exécute une analyse de sensibilité mono-paramétrique
 */
export function runSensitivityAnalysis(
  baselineResult: ACVProductResult,
  parameters: SensitivityParameter[],
  recalculateFn: (paramId: string, newValue: number) => ACVImpactResult
): SensitivityAnalysisResult {
  const results: SensitivityResult[] = [];

  for (const param of parameters) {
    const dataPoints: SensitivityDataPoint[] = [];
    const stepSize = (param.variation_max - param.variation_min) / Math.max(param.steps - 1, 1);

    for (let i = 0; i < param.steps; i++) {
      const variationPct = param.variation_min + stepSize * i;
      const absoluteValue = param.base_value * (1 + variationPct / 100);

      const impact = recalculateFn(param.id, absoluteValue);

      const deltaPct: ACVImpactResult = {
        carbon: baselineResult.totals.carbon > 0
          ? ((impact.carbon - baselineResult.totals.carbon) / baselineResult.totals.carbon) * 100 : 0,
        energy: baselineResult.totals.energy > 0
          ? ((impact.energy - baselineResult.totals.energy) / baselineResult.totals.energy) * 100 : 0,
        water: baselineResult.totals.water > 0
          ? ((impact.water - baselineResult.totals.water) / baselineResult.totals.water) * 100 : 0,
        acidification: baselineResult.totals.acidification > 0
          ? ((impact.acidification - baselineResult.totals.acidification) / baselineResult.totals.acidification) * 100 : 0,
      };

      dataPoints.push({
        variation_pct: variationPct,
        absolute_value: absoluteValue,
        impact,
        delta_pct: deltaPct,
      });
    }

    // Calculer l'élasticité (pente au centre)
    const centerIdx = Math.floor(param.steps / 2);
    const elasticity = calculateElasticity(dataPoints, centerIdx);

    // Variation max observée
    const maxVariation = calculateMaxVariation(dataPoints);

    const isSensitive = Math.abs(maxVariation.carbon) > 5 ||
      Math.abs(maxVariation.energy) > 5 ||
      Math.abs(maxVariation.water) > 5;

    results.push({
      parameter: param,
      baseline_impact: baselineResult.totals,
      data_points: dataPoints,
      elasticity,
      is_sensitive: isSensitive,
      max_impact_variation: maxVariation,
    });
  }

  // Trier par sensibilité carbone
  const sorted = [...results].sort(
    (a, b) => Math.abs(b.max_impact_variation.carbon) - Math.abs(a.max_impact_variation.carbon)
  );

  const mostSensitive = sorted.filter(r => r.is_sensitive);

  // Score de robustesse : inversement proportionnel à la variation max
  const maxCarbonVariation = Math.max(...results.map(r => Math.abs(r.max_impact_variation.carbon)), 0);
  const robustnessScore = Math.max(0, Math.min(100, 100 - maxCarbonVariation));

  const summary = generateSummary(mostSensitive, robustnessScore);

  return {
    parameters: results,
    most_sensitive: mostSensitive,
    robustness_score: robustnessScore,
    summary,
  };
}

/**
 * Génère des paramètres de sensibilité par défaut basés sur les composants
 */
export function generateDefaultParameters(
  components: Array<{ id: string; component_name: string; quantity: number; recycled_percentage: number; transport_distance_km: number }>
): SensitivityParameter[] {
  const params: SensitivityParameter[] = [];

  // Paramètres globaux
  params.push({
    id: 'global_electricity_factor',
    label: 'Facteur carbone électricité',
    type: 'electricity_factor',
    base_value: 1,
    variation_min: -30,
    variation_max: 30,
    steps: 7,
    unit: 'ratio',
  });

  // Par composant : quantité, transport, recyclage
  for (const comp of components) {
    if (comp.quantity > 0) {
      params.push({
        id: `quantity_${comp.id}`,
        label: `Quantité — ${comp.component_name}`,
        type: 'quantity',
        component_id: comp.id,
        base_value: comp.quantity,
        variation_min: -20,
        variation_max: 20,
        steps: 5,
        unit: 'kg',
      });
    }

    if (comp.transport_distance_km > 0) {
      params.push({
        id: `transport_${comp.id}`,
        label: `Distance transport — ${comp.component_name}`,
        type: 'transport_distance',
        component_id: comp.id,
        base_value: comp.transport_distance_km,
        variation_min: -50,
        variation_max: 50,
        steps: 5,
        unit: 'km',
      });
    }

    if (comp.recycled_percentage > 0) {
      params.push({
        id: `recycled_${comp.id}`,
        label: `Taux recyclage — ${comp.component_name}`,
        type: 'recycled_percentage',
        component_id: comp.id,
        base_value: comp.recycled_percentage,
        variation_min: -50,
        variation_max: 50,
        steps: 5,
        unit: '%',
      });
    }
  }

  return params;
}

// ============================================
// TORNADO CHART DATA
// ============================================

export interface TornadoBar {
  parameter_label: string;
  low_impact: number;      // Impact quand paramètre bas
  high_impact: number;     // Impact quand paramètre haut
  baseline_impact: number;
  range: number;           // high - low
}

/**
 * Génère les données pour un diagramme tornado
 */
export function generateTornadoData(
  analysisResult: SensitivityAnalysisResult,
  impactCategory: keyof ACVImpactResult = 'carbon'
): TornadoBar[] {
  return analysisResult.parameters
    .map(r => {
      const impacts = r.data_points.map(dp => dp.impact[impactCategory]);
      const low = Math.min(...impacts);
      const high = Math.max(...impacts);

      return {
        parameter_label: r.parameter.label,
        low_impact: low,
        high_impact: high,
        baseline_impact: r.baseline_impact[impactCategory],
        range: high - low,
      };
    })
    .sort((a, b) => b.range - a.range);
}

// ============================================
// UTILITAIRES INTERNES
// ============================================

function calculateElasticity(dataPoints: SensitivityDataPoint[], centerIdx: number): ACVImpactResult {
  if (dataPoints.length < 2) {
    return { carbon: 0, energy: 0, water: 0, acidification: 0 };
  }

  const lo = dataPoints[Math.max(0, centerIdx - 1)];
  const hi = dataPoints[Math.min(dataPoints.length - 1, centerIdx + 1)];
  const dParam = hi.variation_pct - lo.variation_pct;

  if (Math.abs(dParam) < 0.001) {
    return { carbon: 0, energy: 0, water: 0, acidification: 0 };
  }

  return {
    carbon: (hi.delta_pct.carbon - lo.delta_pct.carbon) / dParam,
    energy: (hi.delta_pct.energy - lo.delta_pct.energy) / dParam,
    water: (hi.delta_pct.water - lo.delta_pct.water) / dParam,
    acidification: (hi.delta_pct.acidification - lo.delta_pct.acidification) / dParam,
  };
}

function calculateMaxVariation(dataPoints: SensitivityDataPoint[]): ACVImpactResult {
  if (dataPoints.length === 0) {
    return { carbon: 0, energy: 0, water: 0, acidification: 0 };
  }

  return {
    carbon: Math.max(...dataPoints.map(dp => Math.abs(dp.delta_pct.carbon))),
    energy: Math.max(...dataPoints.map(dp => Math.abs(dp.delta_pct.energy))),
    water: Math.max(...dataPoints.map(dp => Math.abs(dp.delta_pct.water))),
    acidification: Math.max(...dataPoints.map(dp => Math.abs(dp.delta_pct.acidification))),
  };
}

function generateSummary(mostSensitive: SensitivityResult[], robustnessScore: number): string {
  if (mostSensitive.length === 0) {
    return 'Les résultats sont robustes — aucun paramètre n\'a d\'influence significative (>5%).';
  }

  const topParams = mostSensitive.slice(0, 3).map(r => r.parameter.label).join(', ');
  const level = robustnessScore >= 80 ? 'bonne' : robustnessScore >= 50 ? 'moyenne' : 'faible';

  return `Robustesse ${level} (${robustnessScore.toFixed(0)}/100). Paramètres sensibles : ${topParams}.`;
}
