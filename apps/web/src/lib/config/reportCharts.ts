/**
 * Configuration des graphiques du rapport Bilan Carbone
 *
 * Mapping type / section (voir docs/STRUCTURE_GRAPHIQUES_RAPPORT.md) :
 * - Répartition → Doughnut Chart → Synthèse Globale
 * - Hiérarchie → TreeMap → Focus Scope 3
 * - Évolution → Waterfall Chart → Analyse de Performance
 * - Flux → Sankey Diagram → Énergie & Process
 * - Prospective → Line Chart avec Area → Stratégie 2030
 *
 * Règles : max 2 graphiques par page, couleurs sobres, axes et légendes visibles.
 */

// Palette CarboScan (src/brand/colors.ts)
import { BRAND, SCOPE_COLORS } from "@/brand/colors";

export const CHART_COLORS = {
  scope1: SCOPE_COLORS[1],
  scope2: SCOPE_COLORS[2],
  scope3: SCOPE_COLORS[3],

  primary: BRAND.primary,
  secondary: SCOPE_COLORS[2],

  accentSuccess: SCOPE_COLORS[1],
  alertHotspot: "#EF4444",

  gradient: [
    SCOPE_COLORS[1],
    "#33CC8E",
    SCOPE_COLORS[2],
    "#33CAD8",
    SCOPE_COLORS[3],
    "#FFA04D",
    "#FFB87A",
  ],

  background: BRAND.white,
  backgroundLight: BRAND.surface,
  grid: BRAND.separator,
  axis: BRAND.textSecondary,
  textPrimary: BRAND.primary,
};

// Types de graphiques (alignés avec STRUCTURE_GRAPHIQUES_RAPPORT.md)
export enum ChartType {
  PIE = 'pie',
  DOUGHNUT = 'doughnut',       // Répartition → Synthèse Globale
  BAR = 'bar',
  HORIZONTAL_BAR = 'horizontal_bar',
  PARETO = 'pareto',
  GROUPED_BAR = 'grouped_bar',
  TREEMAP = 'treemap',         // Hiérarchie → Focus Scope 3
  WATERFALL = 'waterfall',      // Évolution → Analyse de Performance
  SANKEY = 'sankey',            // Flux → Énergie & Process
  LINE_AREA = 'line_area',      // Prospective → Stratégie 2030
}

/** Section du rapport (pour documentation et mapping) */
export type ReportSection =
  | 'Synthèse Globale'
  | 'Focus Scope 3'
  | 'Analyse de Performance'
  | 'Énergie & Process'
  | 'Stratégie 2030';

/** Mapping Graphique → Type technique → Section (référence) */
export const CHART_SECTION_MAPPING: Array<{
  graphique: string;
  typeTechnique: string;
  section: ReportSection;
}> = [
  { graphique: 'Répartition', typeTechnique: 'Doughnut Chart', section: 'Synthèse Globale' },
  { graphique: 'Hiérarchie', typeTechnique: 'TreeMap', section: 'Focus Scope 3' },
  { graphique: 'Évolution', typeTechnique: 'Waterfall Chart', section: 'Analyse de Performance' },
  { graphique: 'Flux', typeTechnique: 'Sankey Diagram', section: 'Énergie & Process' },
  { graphique: 'Prospective', typeTechnique: 'Line Chart avec Area', section: 'Stratégie 2030' },
];

// Configuration des graphiques par page
export interface ChartConfig {
  pageNumber: number;
  pageTitle: string;
  /** Section du rapport (Synthèse Globale, Focus Scope 3, etc.) */
  reportSection?: ReportSection;
  charts: {
    type: ChartType;
    title: string;
    dataKey: string;
    description: string;
    width: number;
    height: number;
    colors?: string[];
    reportSection?: ReportSection;
  }[];
}

// Tous les graphiques sont désormais des SVG inline intégrés directement dans les templates HTML.
// Le tableau REPORT_CHARTS est vidé pour éviter les doublons React par-dessus le contenu.
export const REPORT_CHARTS: ChartConfig[] = [];

// Toutes les pages sont text-only côté viewer (les graphiques sont des SVG inline dans les templates)
export const TEXT_ONLY_PAGES = Array.from({ length: 30 }, (_, i) => i + 1);

// Dimensions standard des graphiques
export const CHART_DIMENSIONS = {
  small: { width: 350, height: 350 },
  medium: { width: 500, height: 400 },
  large: { width: 650, height: 450 },
  xlarge: { width: 700, height: 500 },
};

// Configuration Recharts commune
export const COMMON_CHART_CONFIG = {
  margin: { top: 20, right: 30, left: 20, bottom: 20 },
  cartesianGrid: {
    strokeDasharray: '3 3',
    stroke: CHART_COLORS.grid,
  },
  axis: {
    stroke: CHART_COLORS.axis,
    style: { fontSize: '12px', fontFamily: 'Inter, sans-serif' },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: `1px solid ${CHART_COLORS.grid}`,
      borderRadius: '4px',
      fontSize: '13px',
    },
  },
  legend: {
    iconType: 'circle' as const,
    wrapperStyle: { fontSize: '13px', fontFamily: 'Inter, sans-serif' },
  },
};

// Helper pour obtenir la configuration d'une page
export function getChartConfigForPage(pageNumber: number): ChartConfig | null {
  return REPORT_CHARTS.find(config => config.pageNumber === pageNumber) || null;
}

// Helper pour vérifier si une page a des graphiques
export function hasCharts(pageNumber: number): boolean {
  return !TEXT_ONLY_PAGES.includes(pageNumber);
}

// Helper pour obtenir le nombre total de graphiques
export function getTotalChartsCount(): number {
  return REPORT_CHARTS.reduce((total, config) => total + config.charts.length, 0);
}

// Validation : Maximum 2 graphiques par page
export function validateChartConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  REPORT_CHARTS.forEach(config => {
    if (config.charts.length > 2) {
      errors.push(
        `Page ${config.pageNumber} (${config.pageTitle}) has ${config.charts.length} charts. Maximum is 2.`
      );
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export de la validation au démarrage
const validation = validateChartConfig();
if (!validation.valid) {
  console.error('❌ Chart configuration validation failed:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
}

export default {
  CHART_COLORS,
  REPORT_CHARTS,
  TEXT_ONLY_PAGES,
  CHART_DIMENSIONS,
  COMMON_CHART_CONFIG,
  getChartConfigForPage,
  hasCharts,
  getTotalChartsCount,
  validateChartConfig,
};
