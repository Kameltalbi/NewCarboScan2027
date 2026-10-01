/** Types — module Transition & trajectoires */

export type ObjectiveType =
  | "absolute_reduction"
  | "intensity_reduction"
  | "by_scope"
  | "by_category"
  | "by_site"
  | "energy"
  | "other";

export type ObjectiveOrigin = "internal" | "external_framework";

/** Ne jamais dériver « validated » d'une simple courbe 1,5 °C. */
export type ObjectiveValidationStatus =
  | "reference_trajectory"
  | "company_objective"
  | "submitted"
  | "validated";

export type ObjectiveStatus = "draft" | "active" | "archived";

export interface ClimateObjective {
  id: string;
  organization_id: string;
  name: string;
  objective_type: ObjectiveType;
  origin: ObjectiveOrigin;
  validation_status: ObjectiveValidationStatus;
  is_primary: boolean;
  perimeter: string | null;
  scopes: number[] | null;
  category_key: string | null;
  site_id: string | null;
  baseline_year: number;
  baseline_value: number | null;
  baseline_unit: string | null;
  target_year: number;
  target_value: number | null;
  reduction_percent: number | null;
  unit: string | null;
  framework_version_id: string | null;
  framework_version_label?: string | null;
  framework_method_key?: string | null;
  framework_code?: string | null;
  framework_name?: string | null;
  validation_body: string | null;
  validation_date: string | null;
  validation_reference: string | null;
  owner_name: string | null;
  notes: string | null;
  status: ObjectiveStatus;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClimateFrameworkVersion {
  id: string;
  framework_id: string;
  version_label: string;
  method_key: string;
  effective_from: string | null;
  scopes_applicable: number[] | null;
  parameters: Record<string, unknown>;
  source_url: string | null;
  source_document: string | null;
  assumptions: string | null;
  status: string;
  notes: string | null;
}

export interface ClimateFramework {
  id: string;
  code: string;
  name: string;
  publisher: string | null;
  description: string | null;
  versions: ClimateFrameworkVersion[];
}

export type TrajectoryAlignment =
  | "on_track"
  | "above"
  | "ahead"
  | "unknown";

export interface TransitionChartPoint {
  year: number;
  actual: number | null;
  companyTarget: number | null;
  scenario: number | null;
  /** Courbe de référence 1,5 °C (snapshot versionné) — jamais = validation SBTi */
  reference15: number | null;
}

export interface ClimateReferenceTrajectory {
  id: string;
  organization_id: string;
  name: string;
  status: "draft" | "active" | "archived";
  framework_version_id: string | null;
  framework: string;
  framework_version: string;
  methodology: string;
  method_key: string;
  ambition: string;
  target_type: string;
  base_year: number;
  target_year: number;
  baseline_emissions: number;
  scope1_emissions: number | null;
  scope2_emissions: number | null;
  scope3_emissions: number | null;
  scope_boundary: number[] | null;
  dlarr_percent: number;
  reduction_percent: number;
  target_emissions: number;
  annual_points: Array<{ year: number; emissionsT: number }>;
  parameters: Record<string, unknown>;
  assumptions: string | null;
  source_url: string | null;
  source_document: string | null;
  weighting_status: string | null;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export const VALIDATION_STATUS_LABEL: Record<ObjectiveValidationStatus, string> = {
  reference_trajectory: "Trajectoire de référence",
  company_objective: "Objectif entreprise",
  submitted: "Objectif soumis",
  validated: "Objectif validé",
};

export const OBJECTIVE_TYPE_LABEL: Record<ObjectiveType, string> = {
  absolute_reduction: "Réduction absolue",
  intensity_reduction: "Réduction d'intensité",
  by_scope: "Par scope",
  by_category: "Par catégorie",
  by_site: "Par site",
  energy: "Objectif énergétique",
  other: "Autre",
};
