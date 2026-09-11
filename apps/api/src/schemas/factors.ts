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

export type FactorSearchCursor = {
  r: number;
  id: string;
  /** 1 = fuzzy pool was included (pagination consistency); omitted on legacy cursors. */
  fz?: 0 | 1;
};
