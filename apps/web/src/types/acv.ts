export interface ACVProject {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  functional_unit: string;
  scope_definition: string;
  goal_definition: string;
  system_boundaries?: string;
  status: string; // 'draft' | 'completed' | 'archived' but stored as string in DB
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  project_id: string;
  category: string; // 'Energie' | 'Transport' | 'Matériaux' | 'Déchets' but stored as string in DB
  item: string;
  quantity: number;
  unit: string;
}

export interface ImpactFactor {
  id: string;
  category: string;
  item: string;
  unit: string;
  climate_co2e?: number;
  acidification_so2e?: number;
  water_m3?: number;
}

export interface ACVResult {
  id: string;
  project_id: string;
  impact_category: 'climate' | 'acidification' | 'water';
  value: number;
  unit: string;
  created_at: string;
}

export interface ACVCalculationResult {
  climate: { value: number; unit: string; breakdown: { [key: string]: number } };
  acidification: { value: number; unit: string; breakdown: { [key: string]: number } };
  water: { value: number; unit: string; breakdown: { [key: string]: number } };
}

export interface ACVProjectWithData extends ACVProject {
  inventory?: InventoryItem[];
  results?: ACVResult[];
  calculation?: ACVCalculationResult;
}