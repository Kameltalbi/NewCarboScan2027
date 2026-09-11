import { z } from "zod";

export const FACTOR_STATUS_VALUES = ["approved", "draft", "deprecated"] as const;
export const CATALOG_STATUS_VALUES = ["hidden", "visible"] as const;
export const RESOLVER_STATUS_VALUES = ["disabled", "enabled"] as const;
export const CALCULATION_STATUS_VALUES = ["disabled", "enabled"] as const;
export const FACTOR_TYPE_VALUES = [
  "physical",
  "monetary",
  "gwp",
  "lca",
  "supplier",
  "avoided_emission",
  "other",
  "unknown",
] as const;

export const factorSearchQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    source: z.string().trim().max(64).optional(),
    dataset_version: z.string().trim().max(64).optional(),
    factor_type: z.enum(FACTOR_TYPE_VALUES).optional(),
    internal_category: z.string().trim().max(64).optional(),
    internal_subcategory: z.string().trim().max(64).optional(),
    country_code: z.string().trim().max(16).optional(),
    region: z.string().trim().max(120).optional(),
    unit_numerator: z.string().trim().max(32).optional(),
    unit_denominator: z.string().trim().max(32).optional(),
    factor_year: z.coerce.number().int().min(1900).max(2100).optional(),
    status: z.enum(FACTOR_STATUS_VALUES).optional().default("approved"),
    /** Admin-only: explicit version data status filter (does not overload `status`). */
    version_status: z.enum(FACTOR_STATUS_VALUES).optional(),
    /** Admin-only: catalog visibility filter. */
    catalog_status: z.enum(CATALOG_STATUS_VALUES).optional(),
    /** Admin-only: resolver eligibility filter (no effect on calculations in 019). */
    resolver_status: z.enum(RESOLVER_STATUS_VALUES).optional(),
    /** Admin-only: calculation eligibility filter. */
    calculation_status: z.enum(CALCULATION_STATUS_VALUES).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    cursor: z.string().max(512).optional(),
  })
  .strict();

export const factorFacetsQuerySchema = factorSearchQuerySchema
  .omit({ limit: true, cursor: true })
  .strict();

export type FactorSearchQuery = z.infer<typeof factorSearchQuerySchema>;
export type FactorFacetsQuery = z.infer<typeof factorFacetsQuerySchema>;
export type FactorCatalogFilters = FactorFacetsQuery;

export const factorIdParamSchema = z.object({
  id: z.string().uuid(),
});

/** Shadow Factor Resolver V1 — production mode not accepted by API yet. */
export const factorResolveBodySchema = z
  .object({
    activity: z.string().trim().min(1).max(200),
    quantity: z.string().trim().max(64).optional(),
    unit: z.string().trim().min(1).max(32),
    country: z.string().trim().max(16).optional(),
    region: z.string().trim().max(120).optional(),
    reportingYear: z.number().int().min(1900).max(2100).optional(),
    internalCategory: z.string().trim().max(64).optional(),
    internalSubcategory: z.string().trim().max(64).optional(),
    lifecycleBoundary: z
      .enum([
        "direct",
        "wtt",
        "td",
        "wtw",
        "cradle_to_gate",
        "material_use",
        "waste_treatment",
        "outside_of_scopes",
        "other",
        "unknown",
      ])
      .optional(),
    energyBasis: z.enum(["gross_cv", "net_cv"]).optional(),
    gwpBasis: z.enum(["AR4", "AR5", "AR6", "mixed", "unknown"]).optional(),
    preferredSource: z.string().trim().max(64).optional(),
    methodology: z.string().trim().max(64).optional(),
    factorTypeHint: z.enum(["physical", "monetary"]).optional(),
    mode: z.literal("shadow").default("shadow"),
  })
  .strict();

export type FactorResolveBody = z.infer<typeof factorResolveBodySchema>;

/** Production resolve-and-calculate — no client factorId/value/conversion/resolverResult. */
export const factorResolveAndCalculateBodySchema = z
  .object({
    method: z.enum(["ghg_protocol", "bilan_carbone", "cbam", "pcf"]),
    periodStart: z.string().date().optional(),
    periodEnd: z.string().date().optional(),
    lineKey: z.string().min(1).max(200),
    scope: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    evidenceId: z.string().uuid().optional(),
    activity: z.string().trim().min(1).max(200),
    quantity: z.string().trim().min(1).max(64),
    unit: z.string().trim().min(1).max(32),
    country: z.string().trim().max(16).optional(),
    region: z.string().trim().max(120).optional(),
    reportingYear: z.number().int().min(1900).max(2100).optional(),
    internalCategory: z.string().trim().max(64).optional(),
    internalSubcategory: z.string().trim().max(64).optional(),
    lifecycleBoundary: z
      .enum([
        "direct",
        "wtt",
        "td",
        "wtw",
        "cradle_to_gate",
        "material_use",
        "waste_treatment",
        "outside_of_scopes",
        "other",
        "unknown",
      ])
      .optional(),
    energyBasis: z.enum(["gross_cv", "net_cv"]).optional(),
    gwpBasis: z.enum(["AR4", "AR5", "AR6", "mixed", "unknown"]).optional(),
    preferredSource: z.string().trim().max(64).optional(),
    methodology: z.string().trim().max(64).optional(),
    factorTypeHint: z.enum(["physical", "monetary"]).optional(),
  })
  .strict();

export type FactorResolveAndCalculateBody = z.infer<
  typeof factorResolveAndCalculateBodySchema
>;

export type FactorSearchCursor = {
  r: number;
  id: string;
  /** 1 = fuzzy pool was included (pagination consistency); omitted on legacy cursors. */
  fz?: 0 | 1;
};
