import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";

const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  siret: z.string().max(32).optional().nullable(),
  naf_code: z.string().max(32).optional().nullable(),
  country: z.string().max(8).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  postal_code: z.string().max(32).optional().nullable(),
  contact_name: z.string().max(120).optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal("")),
  contact_phone: z.string().max(40).optional().nullable(),
  contact_role: z.string().max(80).optional().nullable(),
  purchase_category: z.string().max(120).optional().nullable(),
  purchase_subcategory: z.string().max(120).optional().nullable(),
  scope3_ghg_category: z.number().int().min(1).max(15).optional().nullable(),
  carbon_score: z.string().max(8).optional().nullable(),
  confidence_index: z.number().int().min(0).max(100).optional().nullable(),
  engagement_status: z.string().max(40).optional().nullable(),
  data_method: z.string().max(40).optional().nullable(),
  has_carbon_footprint: z.boolean().optional().nullable(),
  has_sbti_target: z.boolean().optional().nullable(),
  has_cdp_disclosure: z.boolean().optional().nullable(),
  has_iso14001: z.boolean().optional().nullable(),
  has_ecovadis: z.boolean().optional().nullable(),
  cdp_score: z.string().max(8).optional().nullable(),
  annual_spend: z.number().optional().nullable(),
  annual_spend_currency: z.string().max(8).optional().nullable(),
  annual_spend_year: z.number().int().optional().nullable(),
  criticality: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().optional().nullable(),
});

const SUPPLIER_SELECT = `
  id, organization_id, name, siret, naf_code, country, city, address, postal_code,
  contact_name, contact_email, contact_phone, contact_role,
  purchase_category, purchase_subcategory, scope3_ghg_category,
  carbon_score, carbon_intensity_kgco2e, confidence_index,
  engagement_status, data_method,
  has_carbon_footprint, has_sbti_target, has_cdp_disclosure, cdp_score,
  has_iso14001, has_ecovadis, ecovadis_score,
  annual_spend, annual_spend_currency, annual_spend_year, criticality,
  notes, tags, is_active, last_data_update, created_at, updated_at, raw_legacy
`;

export async function registerSupplierRoutes(app: FastifyInstance) {
  app.get(
    "/v1/suppliers",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const q = request.query as Record<string, string | undefined>;
      const activeOnly = q.active !== "false";
      const params: unknown[] = [orgId];
      const where = ["organization_id = $1"];
      if (activeOnly) {
        where.push("COALESCE(is_active, true) IS DISTINCT FROM false");
      }
      const { rows } = await pool.query(
        `SELECT ${SUPPLIER_SELECT}
         FROM suppliers
         WHERE ${where.join(" AND ")}
         ORDER BY name NULLS LAST`,
        params,
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/suppliers/stats",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT
           COUNT(*)::int AS total_suppliers,
           COUNT(*) FILTER (WHERE engagement_status IN ('engaged', 'scored'))::int AS engaged_suppliers,
           COUNT(*) FILTER (WHERE carbon_score IS NOT NULL)::int AS scored_suppliers,
           COUNT(*) FILTER (WHERE carbon_score IN ('A+', 'A'))::int AS top_performers,
           COALESCE(SUM(annual_spend), 0)::float8 AS total_spend,
           COALESCE(AVG(confidence_index) FILTER (WHERE confidence_index IS NOT NULL), 0)::int AS avg_confidence,
           COUNT(DISTINCT NULLIF(country, ''))::int AS countries_count
         FROM suppliers
         WHERE organization_id = $1
           AND COALESCE(is_active, true) IS DISTINCT FROM false`,
        [orgId],
      );
      const { rows: purchaseRows } = await pool.query(
        `SELECT
           COALESCE(SUM(calculated_emissions_kgco2e), 0)::float8 AS total_emissions,
           COUNT(*)::int AS purchase_rows
         FROM supplier_purchases
         WHERE organization_id = $1`,
        [orgId],
      );
      const base = rows[0] || {};
      const purchases = purchaseRows[0] || {};
      return {
        stats: {
          total_suppliers: Number(base.total_suppliers || 0),
          engaged_suppliers: Number(base.engaged_suppliers || 0),
          scored_suppliers: Number(base.scored_suppliers || 0),
          top_performers: Number(base.top_performers || 0),
          total_spend: Number(base.total_spend || 0),
          total_emissions: Number(purchases.total_emissions || 0),
          avg_confidence: Number(base.avg_confidence || 0),
          questionnaires_sent: 0,
          questionnaires_completed: 0,
          countries_count: Number(base.countries_count || 0),
        },
      };
    },
  );

  app.get(
    "/v1/suppliers/purchases",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT id, organization_id, supplier_id, reference_year, description,
                amount, currency, purchase_category, ghg_scope3_category,
                calculated_emissions_kgco2e, data_method, uncertainty_percent,
                source_type, is_validated, notes, created_at, updated_at
         FROM supplier_purchases
         WHERE organization_id = $1
         ORDER BY reference_year DESC NULLS LAST, created_at DESC`,
        [orgId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/suppliers",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const parsed = createSupplierSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `INSERT INTO suppliers (
           organization_id, name, siret, naf_code, country, city, address, postal_code,
           contact_name, contact_email, contact_phone, contact_role,
           purchase_category, purchase_subcategory, scope3_ghg_category,
           carbon_score, confidence_index, engagement_status, data_method,
           has_carbon_footprint, has_sbti_target, has_cdp_disclosure,
           has_iso14001, has_ecovadis, cdp_score,
           annual_spend, annual_spend_currency, annual_spend_year, criticality,
           notes, is_active
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,
           $9,$10,$11,$12,
           $13,$14,$15,
           $16,$17,$18,$19,
           $20,$21,$22,
           $23,$24,$25,
           $26,$27,$28,$29,
           $30,COALESCE($31, true)
         )
         RETURNING ${SUPPLIER_SELECT}`,
        [
          orgId,
          d.name,
          d.siret ?? null,
          d.naf_code ?? null,
          d.country ?? "TN",
          d.city ?? null,
          d.address ?? null,
          d.postal_code ?? null,
          d.contact_name ?? null,
          d.contact_email || null,
          d.contact_phone ?? null,
          d.contact_role ?? null,
          d.purchase_category ?? null,
          d.purchase_subcategory ?? null,
          d.scope3_ghg_category ?? null,
          d.carbon_score ?? null,
          d.confidence_index ?? 0,
          d.engagement_status ?? "not_contacted",
          d.data_method ?? "estimated",
          d.has_carbon_footprint ?? false,
          d.has_sbti_target ?? false,
          d.has_cdp_disclosure ?? false,
          d.has_iso14001 ?? false,
          d.has_ecovadis ?? false,
          d.cdp_score ?? null,
          d.annual_spend ?? null,
          d.annual_spend_currency ?? null,
          d.annual_spend_year ?? null,
          d.criticality ?? "medium",
          d.notes ?? null,
          d.is_active ?? true,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.get(
    "/v1/suppliers/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "id invalide" });
      }
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT ${SUPPLIER_SELECT}
         FROM suppliers
         WHERE id = $1 AND organization_id = $2`,
        [params.data.id, orgId],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Contrepartie introuvable" });
      }
      const { rows: purchases } = await pool.query(
        `SELECT id, organization_id, supplier_id, reference_year, description,
                amount, currency, purchase_category, ghg_scope3_category,
                calculated_emissions_kgco2e, data_method, uncertainty_percent,
                source_type, is_validated, notes, raw_legacy, created_at, updated_at
         FROM supplier_purchases
         WHERE organization_id = $1 AND supplier_id = $2
         ORDER BY reference_year DESC NULLS LAST, created_at DESC`,
        [orgId, params.data.id],
      );
      return { item: rows[0], purchases };
    },
  );
}
