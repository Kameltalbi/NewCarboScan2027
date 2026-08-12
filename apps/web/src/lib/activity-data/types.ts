// Types pour le socle central de collecte de données
// Ces types correspondent exactement aux enums et à la table activity_data dans Supabase

/**
 * Type d'activité carbone
 * Correspond à l'enum activity_type_enum dans la base de données
 */
export type ActivityType = 
  | 'energy'
  | 'fuel'
  | 'transport'
  | 'purchase'
  | 'material'
  | 'product_component'
  | 'usage'
  | 'waste'
  | 'service';

/**
 * Catégorie d'activité (Scope ou phase ACV)
 * Correspond à l'enum activity_category_enum dans la base de données
 */
export type ActivityCategory = 
  | 'scope1'
  | 'scope2'
  | 'scope3_upstream'
  | 'scope3_downstream'
  | 'lifecycle_material'
  | 'lifecycle_manufacturing'
  | 'lifecycle_transport'
  | 'lifecycle_usage'
  | 'lifecycle_eol';

/**
 * Qualité de la donnée
 * Correspond à l'enum data_quality_enum dans la base de données
 */
export type DataQuality = 'real' | 'estimated' | 'default';

/**
 * Donnée d'activité carbone (ligne de la table activity_data)
 * Source de vérité unique pour tous les modules (Bilan Carbone, Empreinte Produit, ACV)
 */
export interface ActivityData {
  id: string;
  organization_id: string;
  site_id?: string | null;
  product_id?: string | null;
  supplier_id?: string | null;
  activity_type: ActivityType;
  category: ActivityCategory;
  subcategory?: string | null;
  quantity: number;
  unit: string;
  period_start: string; // ISO date
  period_end: string; // ISO date
  emission_factor_id?: string | null;
  emission_factor_source?: string | null;
  emission_factor_year?: number | null;
  emission_factor_region?: string | null;
  data_quality: DataQuality;
  confidence_score?: number | null; // 0-100
  scope_hint?: 1 | 2 | 3 | null;
  notes?: string | null;
  source_document?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Données nécessaires pour créer une nouvelle activité
 * (sans id, created_at, updated_at qui sont générés automatiquement)
 */
export interface ActivityDataInput {
  organization_id: string;
  site_id?: string | null;
  product_id?: string | null;
  supplier_id?: string | null;
  activity_type: ActivityType;
  category: ActivityCategory;
  subcategory?: string | null;
  quantity: number;
  unit: string;
  period_start: string;
  period_end: string;
  emission_factor_id?: string | null;
  emission_factor_source?: string | null;
  emission_factor_year?: number | null;
  emission_factor_region?: string | null;
  data_quality?: DataQuality;
  confidence_score?: number | null;
  scope_hint?: 1 | 2 | 3 | null;
  notes?: string | null;
  source_document?: string | null;
}

/**
 * Statistiques de qualité des données
 * Retourné par la fonction RPC get_data_quality_stats
 */
export interface DataQualityStats {
  total_count: number;
  real_count: number;
  estimated_count: number;
  default_count: number;
  real_percentage: number;
  estimated_percentage: number;
  default_percentage: number;
  avg_confidence_score: number | null;
}

/**
 * Filtres pour rechercher des données d'activité
 */
export interface ActivityDataFilters {
  organization_id: string;
  site_id?: string | null;
  product_id?: string | null;
  activity_type?: ActivityType | null;
  category?: ActivityCategory | null;
  period_start?: string | null;
  period_end?: string | null;
  data_quality?: DataQuality | null;
  scope_hint?: 1 | 2 | 3 | null;
}

