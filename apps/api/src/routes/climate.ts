import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";

const roadmapSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(8000).optional().nullable(),
  baseline_year: z.number().int().optional().nullable(),
  target_year: z.number().int().optional().nullable(),
  reduction_target_percent: z.number().optional().nullable(),
  baseline_emissions_tco2e: z.number().optional().nullable(),
  target_emissions_tco2e: z.number().optional().nullable(),
  status: z.string().max(40).optional().nullable(),
});

const leverSchema = z.object({
  roadmap_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(80).optional().nullable(),
  description: z.string().max(8000).optional().nullable(),
  scope_concerned: z.array(z.number().int()).optional().nullable(),
  site_id: z.string().uuid().optional().nullable(),
  business_unit: z.string().max(120).optional().nullable(),
  source_emission_targeted: z.string().max(200).optional().nullable(),
  estimated_potential_reduction_tco2e: z.number().optional().nullable(),
  estimated_cost: z.number().optional().nullable(),
  complexity_level: z.string().max(40).optional().nullable(),
  implementation_duration_months: z.number().int().optional().nullable(),
  maturity_level: z.string().max(40).optional().nullable(),
  owner: z.string().max(200).optional().nullable(),
  status: z.string().max(40).optional().nullable(),
});

const actionSchema = z.object({
  roadmap_id: z.string().uuid().optional(),
  lever_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(8000).optional().nullable(),
  action_type: z.string().max(40).optional().nullable(),
  site_id: z.string().uuid().optional().nullable(),
  business_unit: z.string().max(120).optional().nullable(),
  scope_concerned: z.array(z.number().int()).optional().nullable(),
  source_emission_targeted: z.string().max(200).optional().nullable(),
  owner_user_id: z.string().uuid().optional().nullable(),
  owner_name: z.string().max(200).optional().nullable(),
  contributors: z.array(z.string()).optional().nullable(),
  start_date: z.string().optional().nullable(),
  target_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  priority: z.string().max(40).optional().nullable(),
  progress_percent: z.number().int().optional().nullable(),
  budget_estimated: z.number().optional().nullable(),
  budget_actual: z.number().optional().nullable(),
  expected_reduction_tco2e: z.number().optional().nullable(),
  realized_reduction_tco2e: z.number().optional().nullable(),
  expected_savings: z.number().optional().nullable(),
  realized_savings: z.number().optional().nullable(),
  indicator_name: z.string().max(200).optional().nullable(),
  indicator_target: z.string().max(200).optional().nullable(),
  indicator_actual: z.string().max(200).optional().nullable(),
  comments: z.string().max(8000).optional().nullable(),
});

export async function registerClimateRoutes(app: FastifyInstance) {
  app.get(
    "/v1/climate/roadmaps",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM climate_roadmaps
         WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/climate/roadmaps/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      const { rows } = await pool.query(
        `SELECT * FROM climate_roadmaps WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.post(
    "/v1/climate/roadmaps",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = roadmapSchema.safeParse(request.body ?? {});
      if (!parsed.success || !parsed.data.name) {
        return reply.code(400).send({ error: "Nom de feuille de route requis" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `INSERT INTO climate_roadmaps
           (organization_id, name, description, baseline_year, target_year,
            reduction_target_percent, baseline_emissions_tco2e, target_emissions_tco2e,
            status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'draft'),$10)
         RETURNING *`,
        [
          request.user!.organizationId,
          d.name,
          d.description ?? null,
          d.baseline_year ?? null,
          d.target_year ?? null,
          d.reduction_target_percent ?? null,
          d.baseline_emissions_tco2e ?? null,
          d.target_emissions_tco2e ?? null,
          d.status ?? "draft",
          request.user!.id,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/climate/roadmaps/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = roadmapSchema.safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid roadmap" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `UPDATE climate_roadmaps SET
           name = COALESCE($3, name),
           description = COALESCE($4, description),
           baseline_year = COALESCE($5, baseline_year),
           target_year = COALESCE($6, target_year),
           reduction_target_percent = COALESCE($7, reduction_target_percent),
           baseline_emissions_tco2e = COALESCE($8, baseline_emissions_tco2e),
           target_emissions_tco2e = COALESCE($9, target_emissions_tco2e),
           status = COALESCE($10, status),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.name ?? null,
          d.description ?? null,
          d.baseline_year ?? null,
          d.target_year ?? null,
          d.reduction_target_percent ?? null,
          d.baseline_emissions_tco2e ?? null,
          d.target_emissions_tco2e ?? null,
          d.status ?? null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.get(
    "/v1/climate/levers",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const q = request.query as Record<string, string | undefined>;
      if (!q.roadmapId) return reply.code(400).send({ error: "roadmapId requis" });
      const { rows } = await pool.query(
        `SELECT l.* FROM climate_levers l
         JOIN climate_roadmaps r ON r.id = l.roadmap_id
         WHERE l.roadmap_id = $1 AND r.organization_id = $2
         ORDER BY l.created_at DESC`,
        [q.roadmapId, request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/climate/levers",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = leverSchema.safeParse(request.body ?? {});
      if (!parsed.success || !parsed.data.roadmap_id || !parsed.data.name) {
        return reply.code(400).send({ error: "roadmap_id et name requis" });
      }
      const d = parsed.data;
      const owned = await pool.query(
        `SELECT 1 FROM climate_roadmaps WHERE id = $1 AND organization_id = $2`,
        [d.roadmap_id, request.user!.organizationId],
      );
      if (!owned.rows[0]) return reply.code(404).send({ error: "Feuille de route introuvable" });
      const { rows } = await pool.query(
        `INSERT INTO climate_levers
           (organization_id, roadmap_id, name, category, description, scope_concerned,
            site_id, business_unit, source_emission_targeted, estimated_potential_reduction_tco2e,
            estimated_cost, complexity_level, implementation_duration_months, maturity_level, owner, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,COALESCE($16,'identified'))
         RETURNING *`,
        [
          request.user!.organizationId,
          d.roadmap_id,
          d.name,
          d.category ?? null,
          d.description ?? null,
          d.scope_concerned ?? null,
          d.site_id ?? null,
          d.business_unit ?? null,
          d.source_emission_targeted ?? null,
          d.estimated_potential_reduction_tco2e ?? null,
          d.estimated_cost ?? null,
          d.complexity_level ?? null,
          d.implementation_duration_months ?? null,
          d.maturity_level ?? null,
          d.owner ?? null,
          d.status ?? "identified",
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/climate/levers/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = leverSchema.safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid lever" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `UPDATE climate_levers SET
           name = COALESCE($3, name),
           category = COALESCE($4, category),
           description = COALESCE($5, description),
           status = COALESCE($6, status),
           estimated_potential_reduction_tco2e = COALESCE($7, estimated_potential_reduction_tco2e),
           estimated_cost = COALESCE($8, estimated_cost),
           owner = COALESCE($9, owner),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.name ?? null,
          d.category ?? null,
          d.description ?? null,
          d.status ?? null,
          d.estimated_potential_reduction_tco2e ?? null,
          d.estimated_cost ?? null,
          d.owner ?? null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/climate/levers/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      await pool.query(
        `DELETE FROM climate_levers WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/climate/actions",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const q = request.query as Record<string, string | undefined>;
      if (!q.roadmapId) return reply.code(400).send({ error: "roadmapId requis" });
      const params: unknown[] = [q.roadmapId, request.user!.organizationId];
      const where = ["a.roadmap_id = $1", "r.organization_id = $2"];
      if (q.leverId) {
        params.push(q.leverId);
        where.push(`a.lever_id = $${params.length}`);
      }
      if (q.status) {
        params.push(q.status);
        where.push(`a.status = $${params.length}`);
      }
      if (q.priority) {
        params.push(q.priority);
        where.push(`a.priority = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT a.* FROM climate_actions a
         JOIN climate_roadmaps r ON r.id = a.roadmap_id
         WHERE ${where.join(" AND ")}
         ORDER BY a.created_at DESC`,
        params,
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/climate/actions",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = actionSchema.safeParse(request.body ?? {});
      if (!parsed.success || !parsed.data.roadmap_id || !parsed.data.title) {
        return reply.code(400).send({ error: "roadmap_id et title requis" });
      }
      const d = parsed.data;
      const owned = await pool.query(
        `SELECT 1 FROM climate_roadmaps WHERE id = $1 AND organization_id = $2`,
        [d.roadmap_id, request.user!.organizationId],
      );
      if (!owned.rows[0]) return reply.code(404).send({ error: "Feuille de route introuvable" });
      const { rows } = await pool.query(
        `INSERT INTO climate_actions
           (organization_id, roadmap_id, lever_id, title, description, action_type, site_id,
            business_unit, scope_concerned, source_emission_targeted, owner_user_id, owner_name,
            contributors, start_date, target_date, end_date, status, priority, progress_percent,
            budget_estimated, budget_actual, expected_reduction_tco2e, realized_reduction_tco2e,
            expected_savings, realized_savings, indicator_name, indicator_target, indicator_actual, comments)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17,'to_launch'),$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
         RETURNING *`,
        [
          request.user!.organizationId,
          d.roadmap_id,
          d.lever_id ?? null,
          d.title,
          d.description ?? null,
          d.action_type ?? null,
          d.site_id ?? null,
          d.business_unit ?? null,
          d.scope_concerned ?? null,
          d.source_emission_targeted ?? null,
          d.owner_user_id ?? null,
          d.owner_name ?? null,
          d.contributors ?? null,
          d.start_date ?? null,
          d.target_date ?? null,
          d.end_date ?? null,
          d.status ?? "to_launch",
          d.priority ?? null,
          d.progress_percent ?? 0,
          d.budget_estimated ?? null,
          d.budget_actual ?? null,
          d.expected_reduction_tco2e ?? null,
          d.realized_reduction_tco2e ?? null,
          d.expected_savings ?? null,
          d.realized_savings ?? null,
          d.indicator_name ?? null,
          d.indicator_target ?? null,
          d.indicator_actual ?? null,
          d.comments ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/climate/actions/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = actionSchema.safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid action" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `UPDATE climate_actions SET
           title = COALESCE($3, title),
           description = COALESCE($4, description),
           status = COALESCE($5, status),
           priority = COALESCE($6, priority),
           progress_percent = COALESCE($7, progress_percent),
           target_date = COALESCE($8, target_date),
           owner_name = COALESCE($9, owner_name),
           expected_reduction_tco2e = COALESCE($10, expected_reduction_tco2e),
           comments = COALESCE($11, comments),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.title ?? null,
          d.description ?? null,
          d.status ?? null,
          d.priority ?? null,
          d.progress_percent ?? null,
          d.target_date ?? null,
          d.owner_name ?? null,
          d.expected_reduction_tco2e ?? null,
          d.comments ?? null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/climate/actions/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      await pool.query(
        `DELETE FROM climate_actions WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/climate/scenarios",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM climate_scenarios
         WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/climate/scenarios",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const name = String(body.name ?? "").trim();
      if (!name) return reply.code(400).send({ error: "name requis" });
      const { rows } = await pool.query(
        `INSERT INTO climate_scenarios
           (organization_id, name, description, baseline_year, start_year, target_year,
            scenario_type, target_reduction_percent, baseline_emissions_tco2e, target_emissions_tco2e,
            net_zero_flag, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,false),COALESCE($12,'draft'),$13,$14)
         RETURNING *`,
        [
          request.user!.organizationId,
          name,
          body.description ?? null,
          body.baseline_year ?? body.baselineYear ?? null,
          body.start_year ?? body.startYear ?? null,
          body.target_year ?? body.targetYear ?? null,
          body.scenario_type ?? body.scenarioType ?? null,
          body.target_reduction_percent ?? body.targetReductionPercent ?? null,
          body.baseline_emissions_tco2e ?? body.baselineEmissionsTco2e ?? null,
          body.target_emissions_tco2e ?? body.targetEmissionsTco2e ?? null,
          body.net_zero_flag ?? body.netZeroFlag ?? false,
          body.status ?? "draft",
          body.notes ?? null,
          request.user!.id,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/climate/scenarios/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      const body = (request.body ?? {}) as Record<string, unknown>;
      const { rows } = await pool.query(
        `UPDATE climate_scenarios SET
           name = COALESCE($3, name),
           description = COALESCE($4, description),
           status = COALESCE($5, status),
           notes = COALESCE($6, notes),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          typeof body.name === "string" ? body.name : null,
          body.description ?? null,
          typeof body.status === "string" ? body.status : null,
          body.notes ?? null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/climate/scenarios/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      await pool.query(
        `DELETE FROM climate_scenarios WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/climate/scenario-levers",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [request.user!.organizationId];
      const where = ["organization_id = $1"];
      if (q.scenarioId) {
        params.push(q.scenarioId);
        where.push(`scenario_id = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM climate_scenario_levers WHERE ${where.join(" AND ")} ORDER BY created_at`,
        params,
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/climate/scenario-levers",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const scenarioId = String(body.scenario_id ?? body.scenarioId ?? "");
      if (!scenarioId) return reply.code(400).send({ error: "scenario_id requis" });
      const owned = await pool.query(
        `SELECT 1 FROM climate_scenarios WHERE id = $1 AND organization_id = $2`,
        [scenarioId, request.user!.organizationId],
      );
      if (!owned.rows[0]) return reply.code(404).send({ error: "Scénario introuvable" });
      const { rows } = await pool.query(
        `INSERT INTO climate_scenario_levers
           (organization_id, scenario_id, custom_lever_name, category, description, enabled)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6,true))
         RETURNING *`,
        [
          request.user!.organizationId,
          scenarioId,
          body.custom_lever_name ?? body.name ?? null,
          body.category ?? null,
          body.description ?? null,
          body.enabled ?? true,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/climate/scenario-levers/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      const body = (request.body ?? {}) as Record<string, unknown>;
      const { rows } = await pool.query(
        `UPDATE climate_scenario_levers SET
           custom_lever_name = COALESCE($3, custom_lever_name),
           category = COALESCE($4, category),
           description = COALESCE($5, description),
           enabled = COALESCE($6, enabled),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          body.custom_lever_name ?? body.name ?? null,
          body.category ?? null,
          body.description ?? null,
          typeof body.enabled === "boolean" ? body.enabled : null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/climate/scenario-levers/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      await pool.query(
        `DELETE FROM climate_scenario_levers WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/climate/scenario-assumptions",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [request.user!.organizationId];
      const where = ["organization_id = $1"];
      if (q.leverId) {
        params.push(q.leverId);
        where.push(`scenario_lever_id = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM climate_scenario_assumptions WHERE ${where.join(" AND ")}`,
        params,
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/climate/scenario-assumptions",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const leverId = String(body.scenario_lever_id ?? body.scenarioLeverId ?? "");
      if (!leverId) return reply.code(400).send({ error: "scenario_lever_id requis" });
      const { rows } = await pool.query(
        `INSERT INTO climate_scenario_assumptions
           (organization_id, scenario_lever_id, start_year, ramp_up_end_year,
            yearly_reduction_factor, max_coverage_percent, confidence_level, source_reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          request.user!.organizationId,
          leverId,
          body.start_year ?? null,
          body.ramp_up_end_year ?? null,
          body.yearly_reduction_factor ?? null,
          body.max_coverage_percent ?? null,
          body.confidence_level ?? null,
          body.source_reference ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/climate/scenario-assumptions/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      const body = (request.body ?? {}) as Record<string, unknown>;
      const { rows } = await pool.query(
        `UPDATE climate_scenario_assumptions SET
           start_year = COALESCE($3, start_year),
           yearly_reduction_factor = COALESCE($4, yearly_reduction_factor),
           max_coverage_percent = COALESCE($5, max_coverage_percent)
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          body.start_year ?? null,
          body.yearly_reduction_factor ?? null,
          body.max_coverage_percent ?? null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );
}
