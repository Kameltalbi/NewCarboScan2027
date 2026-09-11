import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../db.js";
import {
  factorFacetsQuerySchema,
  factorIdParamSchema,
  factorResolveBodySchema,
  factorSearchQuerySchema,
} from "../schemas/factors.js";
import type { FactorCatalogFilters } from "../schemas/factors.js";
import {
  decodeSearchCursor,
  facetsCacheKey,
  getFactorById,
  getFactorFacets,
  hasGovernanceFilters,
  normalizeUnitDenominator,
  normalizeUnitNumerator,
  searchFactors,
} from "../services/factorSearch.js";
import { resolveFactor } from "../services/factorResolver/index.js";

function isDraftCatalogRequest(status: string | undefined): boolean {
  return status === "draft" || status === "deprecated";
}

async function requireCatalogAccess(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  query: Pick<
    FactorCatalogFilters,
    "status" | "version_status" | "catalog_status" | "resolver_status" | "calculation_status"
  >,
): Promise<void> {
  if (isDraftCatalogRequest(query.status) || hasGovernanceFilters(query)) {
    await app.requireSuperAdmin(request, reply);
    return;
  }
  await app.requireOrgMember(request, reply);
}

export async function registerFactorRoutes(app: FastifyInstance) {
  /**
   * Legacy list — BilanCarboneCalculator / listFactors().
   * Intentionally decoupled from catalog visibility: internal Core Pack TN only.
   * Stays at 8 FE even after ADEME catalog activation (019B).
   */
  app.get(
    "/v1/factors",
    { preHandler: [app.requireOrgMember] },
    async () => {
      const { rows } = await pool.query(
        `SELECT
           f.id,
           f.stable_factor_id,
           f.version_number,
           f.name,
           f.category,
           f.geography,
           f.unit_numerator,
           f.unit_denominator,
           f.value::text AS value,
           f.uncertainty_pct::text AS uncertainty_pct,
           f.selection_rule,
           f.checksum,
           f.status,
           v.id AS version_id,
           v.version_label,
           v.gwp_set,
           v.source_dataset,
           s.name AS source_name,
           s.license AS source_license
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE f.status = 'approved'
           AND v.status = 'approved'
           AND s.source_key = 'internal'
         ORDER BY f.category, f.name`,
      );
      return { items: rows, total: rows.length };
    },
  );

  app.get(
    "/v1/factors/search",
    async (request, reply) => {
      const parsed = factorSearchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid query parameters",
          details: parsed.error.flatten(),
        });
      }

      const query = {
        ...parsed.data,
        unit_numerator: normalizeUnitNumerator(parsed.data.unit_numerator),
        unit_denominator: normalizeUnitDenominator(parsed.data.unit_denominator),
      };

      await requireCatalogAccess(app, request, reply, query);
      if (reply.sent) return;

      let cursor;
      if (query.cursor) {
        try {
          cursor = decodeSearchCursor(query.cursor);
        } catch {
          return reply.code(400).send({ error: "Invalid cursor" });
        }
      }

      try {
        const result = await searchFactors(pool, query, cursor);
        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: "Factor search failed" });
      }
    },
  );

  app.get(
    "/v1/factors/facets",
    async (request, reply) => {
      const parsed = factorFacetsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid query parameters",
          details: parsed.error.flatten(),
        });
      }

      const query = {
        ...parsed.data,
        unit_numerator: normalizeUnitNumerator(parsed.data.unit_numerator),
        unit_denominator: normalizeUnitDenominator(parsed.data.unit_denominator),
      };

      await requireCatalogAccess(app, request, reply, query);
      if (reply.sent) return;

      const facets = await getFactorFacets(pool, query);
      return {
        cacheKey: facetsCacheKey(query),
        ...facets,
      };
    },
  );

  /**
   * Factor Resolver V1 — shadow mode only.
   * Evaluates catalog-visible factors without enabling resolver_status in DB.
   * Never writes ledger / calculation_runs / activities.
   */
  app.post(
    "/v1/factors/resolve",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = factorResolveBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid resolve payload",
          details: parsed.error.flatten(),
        });
      }

      const organizationId = request.user!.organizationId!;
      if (!organizationId) {
        return reply.code(400).send({ error: "Organization required" });
      }

      try {
        const result = await resolveFactor(pool, {
          ...parsed.data,
          mode: "shadow",
          organizationId,
        });
        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: "Factor resolve failed" });
      }
    },
  );

  app.get(
    "/v1/factors/:id",
    async (request, reply) => {
      const parsed = factorIdParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid factor id" });
      }

      await app.requireOrgMember(request, reply);
      if (reply.sent) return;

      const isSuperAdmin = request.user?.platformRole === "superadmin";

      const factor = await getFactorById(pool, parsed.data.id, !!isSuperAdmin);
      if (!factor) {
        return reply.code(404).send({ error: "Factor not found" });
      }

      if (
        !isSuperAdmin &&
        (factor.status !== "approved" ||
          factor.version.status !== "approved" ||
          factor.governance.catalogStatus !== "visible")
      ) {
        return reply.code(404).send({ error: "Factor not found" });
      }

      return factor;
    },
  );
}
