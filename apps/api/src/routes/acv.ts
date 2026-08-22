import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";

const projectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(8000).optional().nullable(),
  functional_unit: z.string().max(200).optional().nullable(),
  scope_definition: z.string().max(8000).optional().nullable(),
  goal_definition: z.string().max(8000).optional().nullable(),
  system_boundaries: z.string().max(8000).optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  allocation_method: z.string().max(80).optional().nullable(),
});

const inventorySchema = z.object({
  project_id: z.string().uuid(),
  category: z.string().max(120).optional().nullable(),
  item: z.string().max(200).optional().nullable(),
  quantity: z.number().optional().nullable(),
  unit: z.string().max(64).optional().nullable(),
  phase: z.string().max(80).optional().nullable(),
  flow_type: z.string().max(40).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  data_source: z.string().max(200).optional().nullable(),
  data_quality: z.number().int().optional().nullable(),
  custom_factor_id: z.string().uuid().optional().nullable(),
  recycled_percentage: z.number().optional().nullable(),
  supplier_country: z.string().max(80).optional().nullable(),
});

const settingsSchema = z.object({
  project_id: z.string().uuid(),
  period_year: z.number().int().optional().nullable(),
  location_default: z.string().max(120).optional().nullable(),
  scope_boundaries: z.array(z.string()).optional().nullable(),
  allocation_rule: z.string().max(80).optional().nullable(),
  cutoff_individual_threshold: z.number().optional().nullable(),
  cutoff_cumulative_threshold: z.number().optional().nullable(),
});

export async function registerAcvRoutes(app: FastifyInstance) {
  app.get(
    "/v1/acv/projects",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM acv_projects
         WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/acv/projects/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      const { rows } = await pool.query(
        `SELECT * FROM acv_projects WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.post(
    "/v1/acv/projects",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = projectSchema.safeParse(request.body ?? {});
      if (!parsed.success || !parsed.data.name) {
        return reply.code(400).send({ error: "Nom de projet requis" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `INSERT INTO acv_projects
           (organization_id, user_id, name, description, functional_unit,
            scope_definition, goal_definition, system_boundaries, status, allocation_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'draft'),$10)
         RETURNING *`,
        [
          request.user!.organizationId,
          request.user!.id,
          d.name,
          d.description ?? null,
          d.functional_unit ?? null,
          d.scope_definition ?? null,
          d.goal_definition ?? null,
          d.system_boundaries ?? null,
          d.status ?? "draft",
          d.allocation_method ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/acv/projects/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = projectSchema.safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid project" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `UPDATE acv_projects SET
           name = COALESCE($3, name),
           description = COALESCE($4, description),
           functional_unit = COALESCE($5, functional_unit),
           scope_definition = COALESCE($6, scope_definition),
           goal_definition = COALESCE($7, goal_definition),
           system_boundaries = COALESCE($8, system_boundaries),
           status = COALESCE($9, status),
           allocation_method = COALESCE($10, allocation_method),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.name ?? null,
          d.description ?? null,
          d.functional_unit ?? null,
          d.scope_definition ?? null,
          d.goal_definition ?? null,
          d.system_boundaries ?? null,
          d.status ?? null,
          d.allocation_method ?? null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/acv/projects/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      await pool.query(
        `DELETE FROM acv_projects WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/acv/inventory",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const q = request.query as Record<string, string | undefined>;
      if (!q.projectId) {
        return reply.code(400).send({ error: "projectId requis" });
      }
      const { rows } = await pool.query(
        `SELECT i.* FROM acv_inventory i
         JOIN acv_projects p ON p.id = i.project_id
         WHERE i.project_id = $1 AND p.organization_id = $2
         ORDER BY i.created_at DESC`,
        [q.projectId, request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/acv/inventory",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = inventorySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const owned = await pool.query(
        `SELECT 1 FROM acv_projects WHERE id = $1 AND organization_id = $2`,
        [d.project_id, request.user!.organizationId],
      );
      if (!owned.rows[0]) return reply.code(404).send({ error: "Projet introuvable" });
      const { rows } = await pool.query(
        `INSERT INTO acv_inventory
           (organization_id, project_id, category, item, quantity, unit, phase, flow_type,
            location, period_start, period_end, data_source, data_quality, custom_factor_id,
            recycled_percentage, supplier_country)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          request.user!.organizationId,
          d.project_id,
          d.category ?? null,
          d.item ?? null,
          d.quantity ?? null,
          d.unit ?? null,
          d.phase ?? null,
          d.flow_type ?? null,
          d.location ?? null,
          d.period_start ?? null,
          d.period_end ?? null,
          d.data_source ?? null,
          d.data_quality ?? null,
          d.custom_factor_id ?? null,
          d.recycled_percentage ?? null,
          d.supplier_country ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/acv/inventory/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = inventorySchema.partial().safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid inventory" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `UPDATE acv_inventory SET
           category = COALESCE($3, category),
           item = COALESCE($4, item),
           quantity = COALESCE($5, quantity),
           unit = COALESCE($6, unit),
           phase = COALESCE($7, phase),
           flow_type = COALESCE($8, flow_type),
           location = COALESCE($9, location),
           data_source = COALESCE($10, data_source),
           data_quality = COALESCE($11, data_quality),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.category ?? null,
          d.item ?? null,
          d.quantity ?? null,
          d.unit ?? null,
          d.phase ?? null,
          d.flow_type ?? null,
          d.location ?? null,
          d.data_source ?? null,
          d.data_quality ?? null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/acv/inventory/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      await pool.query(
        `DELETE FROM acv_inventory WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/acv/inventory-settings",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const q = request.query as Record<string, string | undefined>;
      if (!q.projectId) {
        return reply.code(400).send({ error: "projectId requis" });
      }
      const { rows } = await pool.query(
        `SELECT s.* FROM acv_inventory_settings s
         JOIN acv_projects p ON p.id = s.project_id
         WHERE s.project_id = $1 AND p.organization_id = $2
         ORDER BY s.created_at DESC LIMIT 1`,
        [q.projectId, request.user!.organizationId],
      );
      return { item: rows[0] ?? null };
    },
  );

  app.put(
    "/v1/acv/inventory-settings",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = settingsSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      const owned = await pool.query(
        `SELECT 1 FROM acv_projects WHERE id = $1 AND organization_id = $2`,
        [d.project_id, orgId],
      );
      if (!owned.rows[0]) return reply.code(404).send({ error: "Projet introuvable" });
      const existing = await pool.query(
        `SELECT id FROM acv_inventory_settings WHERE project_id = $1 AND organization_id = $2`,
        [d.project_id, orgId],
      );
      if (existing.rows[0]) {
        const { rows } = await pool.query(
          `UPDATE acv_inventory_settings SET
             period_year = COALESCE($3, period_year),
             location_default = COALESCE($4, location_default),
             scope_boundaries = COALESCE($5, scope_boundaries),
             allocation_rule = COALESCE($6, allocation_rule),
             cutoff_individual_threshold = COALESCE($7, cutoff_individual_threshold),
             cutoff_cumulative_threshold = COALESCE($8, cutoff_cumulative_threshold),
             updated_at = now()
           WHERE id = $1 AND organization_id = $2
           RETURNING *`,
          [
            existing.rows[0].id,
            orgId,
            d.period_year ?? null,
            d.location_default ?? null,
            d.scope_boundaries ?? null,
            d.allocation_rule ?? null,
            d.cutoff_individual_threshold ?? null,
            d.cutoff_cumulative_threshold ?? null,
          ],
        );
        return { item: rows[0] };
      }
      const { rows } = await pool.query(
        `INSERT INTO acv_inventory_settings
           (organization_id, project_id, period_year, location_default, scope_boundaries,
            allocation_rule, cutoff_individual_threshold, cutoff_cumulative_threshold)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          orgId,
          d.project_id,
          d.period_year ?? null,
          d.location_default ?? null,
          d.scope_boundaries ?? null,
          d.allocation_rule ?? null,
          d.cutoff_individual_threshold ?? null,
          d.cutoff_cumulative_threshold ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.get(
    "/v1/acv/materials",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [request.user!.organizationId];
      const where = ["(organization_id = $1 OR organization_id IS NULL OR is_default = true)"];
      if (q.category) {
        params.push(q.category);
        where.push(`category = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM acv_materials WHERE ${where.join(" AND ")} ORDER BY category, name`,
        params,
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/acv/processes",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [request.user!.organizationId];
      const where = ["(organization_id = $1 OR organization_id IS NULL)"];
      if (q.sector) {
        params.push(q.sector);
        where.push(`sector = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM acv_processes WHERE ${where.join(" AND ")} ORDER BY name`,
        params,
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/acv/transport-modes",
    { preHandler: [app.requireOrgMember] },
    async () => {
      const { rows } = await pool.query(
        `SELECT * FROM acv_transport_modes ORDER BY name`,
      );
      return { items: rows };
    },
  );
}
