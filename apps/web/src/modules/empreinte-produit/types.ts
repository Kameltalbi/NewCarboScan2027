// Types pour le module PCF (Product Carbon Footprint)

// ─── Enums / Literals ───────────────────────────────────────────────
export type ProductCategory =
  | 'produit' | 'service' | 'industriel' | 'alimentaire'
  | 'textile' | 'electronique' | 'construction' | 'chimique'
  | 'ciment' | 'acier-fer' | 'aluminium' | 'engrais' | 'hydrogene' | 'electricite'
  | 'autre';

export type PerimeterType = 'cradle-to-gate' | 'cradle-to-customer' | 'cradle-to-grave' | 'gate-to-gate';

export type StudyMode = 'pcf' | 'acv';

export type StudyStatus = 'draft' | 'in_progress' | 'calculated' | 'locked';

export type TransportMode = 'road' | 'sea' | 'air' | 'rail' | 'mixed';
export type TransportType = 'inbound' | 'distribution';

export type EndOfLifeScenario = 'recycling' | 'incineration' | 'landfill' | 'reuse';
export type WasteTreatment = 'recycling' | 'incineration' | 'landfill';

export type LifeCyclePhase =
  | 'materials' | 'manufacturing' | 'transport'
  | 'wastes' | 'packaging' | 'distribution'
  | 'usage' | 'endOfLife' | 'subcontracting';

export type AllocationMethod = 'mass' | 'economic';

// ─── Database Row Types ─────────────────────────────────────────────
export interface PCFStudy {
  id: string;
  organization_id: string;
  name: string;
  product_category: string;
  description: string | null;
  sector: string | null;
  production_site: string | null;
  country: string | null;
  electricity_mix: string | null;
  functional_unit: string;
  perimeter_type: PerimeterType;
  hs_code: string | null;
  status: StudyStatus;
  study_mode: StudyMode;
  total_emissions: number | null;
  total_energy_mj: number | null;
  total_water_m3: number | null;
  total_acidification_kgso2e: number | null;
  version: number;
  cbam_mode: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PCFSubcontracting {
  id: string;
  study_id: string;
  process_name: string;
  supplier_name: string | null;
  country: string | null;
  quantity: number;
  unit: string;
  emission_factor_value: number | null;
  is_estimated: boolean;
  emissions_kg: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PCFCoProductAllocation {
  id: string;
  study_id: string;
  product_name: string;
  allocation_method: AllocationMethod;
  allocation_value: number;
  allocation_percentage: number;
  is_main_product: boolean;
  created_at: string;
  updated_at: string;
}

export interface PCFMaterial {
  id: string;
  study_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  supplier: string | null;
  country_origin: string | null;
  emission_factor_id: string | null;
  emission_factor_value: number | null;
  is_estimated: boolean;
  emissions_kg: number | null;
  scrap_rate: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PCFTransport {
  id: string;
  study_id: string;
  transport_type: TransportType;
  material_ref: string | null;
  mode: TransportMode;
  distance_km: number;
  weight_kg: number;
  emission_factor_value: number | null;
  is_estimated: boolean;
  emissions_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface PCFManufacturing {
  id: string;
  study_id: string;
  energy_type: string;
  quantity: number;
  unit: string;
  process_type: string | null;
  emission_factor_value: number | null;
  is_estimated: boolean;
  emissions_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface PCFWaste {
  id: string;
  study_id: string;
  waste_type: string;
  quantity_kg: number;
  treatment: WasteTreatment;
  emission_factor_value: number | null;
  is_estimated: boolean;
  emissions_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface PCFPackaging {
  id: string;
  study_id: string;
  material: string;
  weight_kg: number;
  emission_factor_value: number | null;
  is_estimated: boolean;
  emissions_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface PCFUsage {
  id: string;
  study_id: string;
  lifetime_years: number | null;
  uses_per_year: number | null;
  consumption_per_use: number | null;
  consumption_unit: string | null;
  emission_factor_value: number | null;
  is_estimated: boolean;
  emissions_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface PCFEndOfLife {
  id: string;
  study_id: string;
  scenario: EndOfLifeScenario;
  percentage: number;
  emission_factor_value: number | null;
  is_estimated: boolean;
  emissions_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface PCFResult {
  id: string;
  study_id: string;
  version: number;
  total_emissions: number;
  breakdown: PhaseBreakdown[];
  dominant_phase: string | null;
  data_quality: { realData: number; estimatedData: number };
  calculated_at: string;
  calculated_by: string | null;
}

export interface PCFScenario {
  id: string;
  study_id: string;
  name: string;
  description: string | null;
  changes: Record<string, unknown>;
  result_emissions: number | null;
  reduction_pct: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PCFVersion {
  id: string;
  study_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  comment: string | null;
  created_by: string | null;
  created_at: string;
}

// ─── Computed Types ─────────────────────────────────────────────────
export interface PhaseBreakdown {
  phase: LifeCyclePhase;
  emissions: number;
  percentage: number;
  isEstimated: boolean;
}

export interface StudyWithStats extends PCFStudy {
  materialsCount?: number;
  completionPct?: number;
}

// ─── Form Types ─────────────────────────────────────────────────────
export interface CreateStudyForm {
  name: string;
  product_category: string;
  description?: string;
  sector?: string;
  production_site?: string;
  country?: string;
  electricity_mix?: string;
  functional_unit: string;
  perimeter_type: PerimeterType;
  study_mode?: StudyMode;
  hs_code?: string;
}

// ─── Study navigation sections ──────────────────────────────────────
export type StudySection =
  | 'parametrage' | 'bom' | 'transport' | 'fabrication'
  | 'sous-traitance' | 'coproduits' | 'donnees-collect'
  | 'dechets' | 'emballage' | 'distribution'
  | 'utilisation' | 'fin-de-vie' | 'resultats' | 'rapport';

export const STUDY_SECTIONS: { id: StudySection; label: string; optional?: boolean }[] = [
  { id: 'parametrage', label: 'Paramétrage' },
  { id: 'bom', label: 'Composition (BOM)' },
  { id: 'transport', label: 'Transport matières' },
  { id: 'fabrication', label: 'Fabrication' },
  { id: 'sous-traitance', label: 'Sous-traitance', optional: true },
  { id: 'coproduits', label: 'Coproduits / Allocation', optional: true },
  { id: 'donnees-collect', label: 'Données Collect', optional: true },
  { id: 'dechets', label: 'Déchets' },
  { id: 'emballage', label: 'Emballage' },
  { id: 'distribution', label: 'Distribution', optional: true },
  { id: 'utilisation', label: 'Utilisation', optional: true },
  { id: 'fin-de-vie', label: 'Fin de vie', optional: true },
  { id: 'resultats', label: 'Résultats' },
  { id: 'rapport', label: 'Rapport' },
];

// ─── Legacy types (backward compat for old wizard) ──────────────────
/** @deprecated Use PCFStudy instead */
export interface ProductData {
  id?: string;
  name: string;
  category: ProductCategory;
  functionalUnit: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** @deprecated Use PCFMaterial instead */
export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  origin?: string;
  emissionFactor: number;
  isEstimated: boolean;
}

/** @deprecated Use PCFManufacturing instead */
export interface ManufacturingData {
  electricity: number;
  otherEnergy?: { type: string; quantity: number; unit: string };
  isEstimated: boolean;
}

/** @deprecated Use PCFTransport instead */
export interface TransportData {
  distance: number;
  mode: TransportMode;
  weight: number;
  isEstimated: boolean;
}

/** @deprecated Use PCFUsage instead */
export interface UsageData {
  lifetime?: number;
  consumptionPerUse?: number;
  numberOfUses?: number;
  isEstimated: boolean;
}

/** @deprecated Use PCFEndOfLife instead */
export interface EndOfLifeData {
  scenario: EndOfLifeScenario;
  percentage: number;
  isEstimated: boolean;
}

/** @deprecated Use PCFStudy + sub-tables instead */
export interface ProductCalculation {
  product: ProductData;
  materials: Material[];
  manufacturing: ManufacturingData;
  transport: TransportData;
  usage?: UsageData;
  endOfLife?: EndOfLifeData;
}

/** @deprecated Use PCFResult instead */
export interface CalculationResult {
  totalEmissions: number;
  breakdown: {
    phase: LifeCyclePhase;
    emissions: number;
    percentage: number;
    isEstimated: boolean;
  }[];
  dominantPhase: LifeCyclePhase;
  dataQuality: { realData: number; estimatedData: number };
  methodology: string;
}

/** @deprecated */
export interface ProductComparison {
  productId: string;
  version: string;
  totalEmissions: number;
  date: string;
}
