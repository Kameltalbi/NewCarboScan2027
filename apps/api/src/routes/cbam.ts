import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";

const uuid = z.string().uuid();
const optStr = z.string().max(500).optional().nullable();
const optNum = z.number().optional().nullable();

const installationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  country: z.string().max(80).optional().nullable(),
  country_code: z.string().max(2).optional().nullable(),
  address: optStr,
  sector: z.string().max(120).optional().nullable(),
  annual_capacity: optNum,
  reference_year: z.number().int().optional().nullable(),
});

const productSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  cn_code: z.string().max(32).optional().nullable(),
  sector: z.string().max(120).optional().nullable(),
  unit: z.string().max(32).optional().nullable(),
});

const productionSchema = z.object({
  installation_id: uuid,
  product_id: uuid,
  year: z.number().int(),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  quantity: optNum,
  unit: z.string().max(32).optional().nullable(),
});

const exportSchema = z.object({
  installation_id: uuid,
  product_id: uuid.optional().nullable(),
  client_name: z.string().max(200).optional().nullable(),
  destination_country: z.string().max(80).optional().nullable(),
  quantity_exported: optNum,
  export_date: z.string().optional().nullable(),
});

async function requireRow(
  table: string,
  id: string,
  orgId: string,
) {
  const { rows } = await pool.query(
    `SELECT id FROM ${table} WHERE id = $1 AND organization_id = $2`,
    [id, orgId],
  );
  return rows[0];
}

export async function registerCbamRoutes(app: FastifyInstance) {
  app.get(
    "/v1/cbam/installations",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM cbam_installations
         WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/cbam/installations",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = installationSchema.safeParse(request.body ?? {});
      if (!parsed.success || !parsed.data.name) {
        return reply.code(400).send({ error: "Nom d'installation requis" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `INSERT INTO cbam_installations
           (organization_id, name, country, country_code, address, sector, annual_capacity, reference_year)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          request.user!.organizationId,
          d.name,
          d.country ?? d.country_code ?? null,
          d.country_code ?? null,
          d.address ?? null,
          d.sector ?? null,
          d.annual_capacity ?? null,
          d.reference_year ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/cbam/installations/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = installationSchema.safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid installation" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `UPDATE cbam_installations SET
           name = COALESCE($3, name),
           country = COALESCE($4, country),
           address = COALESCE($5, address),
           sector = COALESCE($6, sector),
           annual_capacity = COALESCE($7, annual_capacity),
           reference_year = COALESCE($8, reference_year),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.name ?? null,
          d.country ?? null,
          d.address ?? null,
          d.sector ?? null,
          d.annual_capacity ?? null,
          d.reference_year ?? null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/cbam/installations/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      await pool.query(
        `DELETE FROM cbam_installations WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/cbam/products",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM cbam_products
         WHERE organization_id = $1
         ORDER BY name`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/cbam/products",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = productSchema.safeParse(request.body ?? {});
      if (!parsed.success || !parsed.data.name) {
        return reply.code(400).send({ error: "Nom de produit requis" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `INSERT INTO cbam_products (organization_id, name, cn_code, sector, unit)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [
          request.user!.organizationId,
          d.name,
          d.cn_code ?? null,
          d.sector ?? null,
          d.unit ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.get(
    "/v1/cbam/production",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [request.user!.organizationId];
      const where = ["organization_id = $1"];
      if (q.installationId) {
        params.push(q.installationId);
        where.push(`installation_id = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM cbam_production
         WHERE ${where.join(" AND ")}
         ORDER BY year DESC NULLS LAST`,
        params,
      );
      return { items: rows };
    },
  );

  app.put(
    "/v1/cbam/production",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = productionSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      if (!(await requireRow("cbam_installations", d.installation_id, orgId))) {
        return reply.code(404).send({ error: "Installation introuvable" });
      }
      const existing = await pool.query(
        `SELECT id FROM cbam_production
         WHERE organization_id = $1 AND installation_id = $2 AND product_id = $3
           AND year = $4 AND COALESCE(quarter,0) = COALESCE($5,0)`,
        [orgId, d.installation_id, d.product_id, d.year, d.quarter ?? null],
      );
      if (existing.rows[0]) {
        const { rows } = await pool.query(
          `UPDATE cbam_production SET
             quantity = COALESCE($2, quantity),
             unit = COALESCE($3, unit),
             updated_at = now()
           WHERE id = $1 AND organization_id = $4
           RETURNING *`,
          [existing.rows[0].id, d.quantity ?? null, d.unit ?? null, orgId],
        );
        return { item: rows[0] };
      }
      const { rows } = await pool.query(
        `INSERT INTO cbam_production
           (organization_id, installation_id, product_id, year, quarter, quantity, unit)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          orgId,
          d.installation_id,
          d.product_id,
          d.year,
          d.quarter ?? null,
          d.quantity ?? null,
          d.unit ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.get(
    "/v1/cbam/exports",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [request.user!.organizationId];
      const where = ["organization_id = $1"];
      if (q.installationId) {
        params.push(q.installationId);
        where.push(`installation_id = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM cbam_exports
         WHERE ${where.join(" AND ")}
         ORDER BY export_date DESC NULLS LAST, created_at DESC`,
        params,
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/cbam/exports",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = exportSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      if (!(await requireRow("cbam_installations", d.installation_id, orgId))) {
        return reply.code(404).send({ error: "Installation introuvable" });
      }
      const { rows } = await pool.query(
        `INSERT INTO cbam_exports
           (organization_id, installation_id, product_id, client_name, destination_country, quantity_exported, export_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          orgId,
          d.installation_id,
          d.product_id ?? null,
          d.client_name ?? null,
          d.destination_country ?? null,
          d.quantity_exported ?? null,
          d.export_date ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.get(
    "/v1/cbam/energy",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [request.user!.organizationId];
      const where = ["organization_id = $1"];
      if (q.installationId) {
        params.push(q.installationId);
        where.push(`installation_id = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM cbam_energy_consumption WHERE ${where.join(" AND ")}
         ORDER BY year DESC NULLS LAST`,
        params,
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/cbam/emissions-summary",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [request.user!.organizationId];
      const where = ["organization_id = $1"];
      if (q.installationId) {
        params.push(q.installationId);
        where.push(`installation_id = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM cbam_emissions_summary
         WHERE ${where.join(" AND ")}
         ORDER BY year DESC NULLS LAST`,
        params,
      );
      return { items: rows };
    },
  );
}
