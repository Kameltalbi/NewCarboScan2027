// Types ACV conformes ISO 14040/14044 & EN 15804

export interface ACVMaterial {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  unit: string;
  carbon_factor: number;
  energy_factor: number;
  water_factor: number;
  acidification_factor: number;
  source: string;
  source_year?: number;
  is_default: boolean;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ACVProcess {
  id: string;
  name: string;
  sector: string;
  subsector?: string;
  energy_consumption: number;
  emission_factor: number;
  water_consumption: number;
  unit: string;
  source: string;
  source_year?: number;
  is_default: boolean;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ACVTransportMode {
  id: string;
  name: string;
  mode_type: 'road' | 'rail' | 'sea' | 'air' | 'inland_waterway';
  emission_factor_tkm: number;
  energy_factor_tkm: number;
  description?: string;
  source: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ACVProductComponent {
  id: string;
  project_id: string;
  parent_component_id?: string;
  component_name: string;
  material_id?: string;
  process_id?: string;
  quantity: number;
  unit: string;
  recycled_percentage: number;
  transport_mode_id?: string;
  transport_distance_km: number;
  supplier_country?: string;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined data
  material?: ACVMaterial;
  process?: ACVProcess;
  transport_mode?: ACVTransportMode;
  children?: ACVProductComponent[];
}

// EN 15804 Lifecycle module codes
export type LifecycleModuleCode =
  | 'A1' | 'A2' | 'A3' | 'A4' | 'A5'
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' | 'B7'
  | 'C1' | 'C2' | 'C3' | 'C4'
  | 'D';

export type LifecycleModuleGroup = 'production' | 'construction' | 'use' | 'end_of_life' | 'beyond';

export interface ACVLifecycleModule {
  id: string;
  project_id: string;
  module_code: LifecycleModuleCode;
  module_name: string;
  module_group: LifecycleModuleGroup;
  is_included: boolean;
  carbon_impact: number;
  energy_impact: number;
  water_impact: number;
  acidification_impact: number;
  data_quality_score: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ACVScenario {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  is_baseline: boolean;
  parameters: Record<string, any>;
  total_carbon: number;
  total_energy: number;
  total_water: number;
  created_at: string;
  updated_at: string;
}

// Résultats de calcul
export interface ACVImpactResult {
  carbon: number;    // kgCO2e
  energy: number;    // MJ
  water: number;     // m³
  acidification: number; // kgSO2e
}

export interface ACVComponentImpact {
  component_id: string;
  component_name: string;
  material_impact: ACVImpactResult;
  process_impact: ACVImpactResult;
  transport_impact: ACVImpactResult;
  total: ACVImpactResult;
  percentage: number; // % du total produit
}

export interface ACVLifecycleImpact {
  module_code: LifecycleModuleCode;
  module_name: string;
  module_group: LifecycleModuleGroup;
  impact: ACVImpactResult;
  percentage: number;
}

export interface ACVHotspot {
  source: string;
  type: 'material' | 'process' | 'transport';
  impact_category: 'carbon' | 'energy' | 'water' | 'acidification';
  value: number;
  percentage: number;
}

// Modules EN 15804 avec métadonnées
export const LIFECYCLE_MODULES: { code: LifecycleModuleCode; name: string; group: LifecycleModuleGroup; priority: boolean }[] = [
  { code: 'A1', name: 'Matières premières', group: 'production', priority: true },
  { code: 'A2', name: 'Transport matières', group: 'production', priority: true },
  { code: 'A3', name: 'Fabrication', group: 'production', priority: true },
  { code: 'A4', name: 'Transport distribution', group: 'construction', priority: false },
  { code: 'A5', name: 'Installation', group: 'construction', priority: false },
  { code: 'B1', name: 'Utilisation', group: 'use', priority: false },
  { code: 'B2', name: 'Maintenance', group: 'use', priority: false },
  { code: 'B3', name: 'Réparation', group: 'use', priority: false },
  { code: 'B4', name: 'Remplacement', group: 'use', priority: false },
  { code: 'B5', name: 'Réhabilitation', group: 'use', priority: false },
  { code: 'B6', name: 'Énergie opérationnelle', group: 'use', priority: false },
  { code: 'B7', name: 'Eau opérationnelle', group: 'use', priority: false },
  { code: 'C1', name: 'Déconstruction', group: 'end_of_life', priority: false },
  { code: 'C2', name: 'Transport fin de vie', group: 'end_of_life', priority: false },
  { code: 'C3', name: 'Traitement déchets', group: 'end_of_life', priority: false },
  { code: 'C4', name: 'Élimination', group: 'end_of_life', priority: false },
  { code: 'D', name: 'Recyclage & réutilisation', group: 'beyond', priority: false },
];

export const MATERIAL_CATEGORIES = [
  { value: 'metals', label: 'Métaux' },
  { value: 'plastics', label: 'Plastiques' },
  { value: 'minerals', label: 'Minéraux & Construction' },
  { value: 'wood', label: 'Bois & Papier' },
  { value: 'chemicals', label: 'Chimie' },
  { value: 'textiles', label: 'Textiles' },
] as const;

export const PROCESS_SECTORS = [
  { value: 'steel', label: 'Acier' },
  { value: 'aluminum', label: 'Aluminium' },
  { value: 'plastics', label: 'Plastiques' },
  { value: 'cement', label: 'Ciment' },
  { value: 'textiles', label: 'Textiles' },
  { value: 'general', label: 'Général' },
] as const;

// ============================================
// TYPES AVANCÉS — Fonctions ACV professionnelles
// ============================================

// Qualité des données (ISO 14044 § 4.2.3.6)
export type DataType = 'primary' | 'secondary';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very_low';

export interface DataSourceInfo {
  data_type: DataType;
  source_name?: string;
  source_database?: string;   // 'ecoinvent', 'base_carbone', 'gabi', 'custom'
  source_version?: string;
  source_year?: number;
  confidence_level: ConfidenceLevel;
}

// Flux intermédiaires (Process Flows)
export type FlowType = 'intermediate' | 'elementary_input' | 'elementary_output' | 'waste' | 'co_product';

export interface ACVProcessFlow {
  id: string;
  project_id: string;
  source_component_id?: string;
  target_component_id?: string;
  flow_name: string;
  flow_type: FlowType;
  quantity: number;
  unit: string;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Co-produits (Multi-product systems)
export type AllocationMethod = 'none' | 'mass' | 'energy' | 'economic' | 'system_expansion';

export interface ACVCoProduct {
  id: string;
  project_id: string;
  product_name: string;
  mass_kg: number;
  economic_value: number;
  energy_content_mj: number;
  is_main_product: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const DATA_SOURCES = [
  { value: 'ecoinvent', label: 'Ecoinvent' },
  { value: 'base_carbone', label: 'Base Carbone® (ADEME)' },
  { value: 'gabi', label: 'GaBi' },
  { value: 'inies', label: 'INIES' },
  { value: 'custom', label: 'Données entreprise' },
] as const;

export const DATA_QUALITY_LABELS: Record<ConfidenceLevel, { label: string; color: string }> = {
  high: { label: 'Élevée', color: 'text-green-600' },
  medium: { label: 'Moyenne', color: 'text-yellow-600' },
  low: { label: 'Faible', color: 'text-orange-600' },
  very_low: { label: 'Très faible', color: 'text-red-600' },
};
