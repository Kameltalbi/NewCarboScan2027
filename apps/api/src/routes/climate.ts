import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";
import {
  CNZS_V131_META,
  computeCnzsV131CombinedScope12AbsoluteContraction,
} from "../services/climate/cnzsV131AbsoluteContraction.js";

/** Delete/archive must 404 when the row is outside the caller's organization. */
async function deleteOwnedOr404(
  reply: FastifyReply,
  sql: string,
  params: unknown[],
) {
  const result = await pool.query(sql, params);
  if (!result.rowCount) {
    return reply.code(404).send({ error: "Not found" });
  }
  return { ok: true as const };
}

const roadmapSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(8000).optional().nullable(),
  baseline_year: z.number().int().optional().nullable(),
  target_year: z.number().int().optional().nullable(),
  reduction_target_percent: z.number().optional().nullable(),
  baseline_emissions_tco2e: z.number().optional().nullable(),
  target_emissions_tco2e: z.number().optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  trajectory_kind: z.enum(["reference", "personalized"]).optional().nullable(),
  intermediate_targets: z.array(z.object({
    year: z.number().int(),
    reduction_percent: z.number().min(0).max(100),
  })).optional().nullable(),
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

const mobilizationSchema = z.object({
  audience: z.enum(["employees", "management", "suppliers", "other"]),
  stakeholders: z.string().min(1).max(500),
  title: z.string().min(1).max(300),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  owner_name: z.string().min(1).max(200),
  support: z.string().max(2000).optional().nullable(),
  action_id: z.string().uuid().optional().nullable(),
});

const riskSchema = z.object({
  title: z.string().min(1).max(300),
  category: z.enum(["physical", "transition", "other"]),
  probability: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  risk_level: z.enum(["low", "medium", "high"]),
  measure: z.string().max(8000).optional().nullable(),
  action_id: z.string().uuid().optional().nullable(),
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
  estimation_method: z.enum(["measure", "invoice", "supplier_quote", "internal_estimate"]).optional().nullable(),
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
           trajectory_kind = CASE WHEN $11::boolean THEN $12::text ELSE trajectory_kind END,
           intermediate_targets = CASE WHEN $13::boolean THEN $14::jsonb ELSE intermediate_targets END,
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
          d.trajectory_kind !== undefined,
          d.trajectory_kind ?? null,
          d.intermediate_targets !== undefined,
          d.intermediate_targets == null ? null : JSON.stringify(d.intermediate_targets),
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
      return deleteOwnedOr404(
        reply,
        `DELETE FROM climate_levers WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
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
            expected_savings, realized_savings, indicator_name, indicator_target, indicator_actual, comments, estimation_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17,'to_launch'),$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
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
          d.estimation_method ?? null,
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
           action_type = CASE WHEN $12::boolean THEN $13::text ELSE action_type END,
           site_id = CASE WHEN $14::boolean THEN $15::uuid ELSE site_id END,
           start_date = CASE WHEN $16::boolean THEN $17::date ELSE start_date END,
           budget_estimated = CASE WHEN $18::boolean THEN $19::numeric ELSE budget_estimated END,
           indicator_name = CASE WHEN $20::boolean THEN $21::text ELSE indicator_name END,
           indicator_target = CASE WHEN $22::boolean THEN $23::text ELSE indicator_target END,
           source_emission_targeted = CASE WHEN $24::boolean THEN $25::text ELSE source_emission_targeted END,
           estimation_method = CASE WHEN $26::boolean THEN $27::text ELSE estimation_method END,
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
          d.action_type !== undefined,
          d.action_type ?? null,
          d.site_id !== undefined,
          d.site_id ?? null,
          d.start_date !== undefined,
          d.start_date ?? null,
          d.budget_estimated !== undefined,
          d.budget_estimated ?? null,
          d.indicator_name !== undefined,
          d.indicator_name ?? null,
          d.indicator_target !== undefined,
          d.indicator_target ?? null,
          d.source_emission_targeted !== undefined,
          d.source_emission_targeted ?? null,
          d.estimation_method !== undefined,
          d.estimation_method ?? null,
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
      return deleteOwnedOr404(
        reply,
        `DELETE FROM climate_actions WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
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
      return deleteOwnedOr404(
        reply,
        `DELETE FROM climate_scenarios WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
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
      return deleteOwnedOr404(
        reply,
        `DELETE FROM climate_scenario_levers WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
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

  async function ownedAction(organizationId: string, actionId: string | null | undefined) {
    if (!actionId) return true;
    const { rows } = await pool.query(
      `SELECT 1 FROM climate_actions WHERE id = $1 AND organization_id = $2`,
      [actionId, organizationId],
    );
    return Boolean(rows[0]);
  }

  app.get(
    "/v1/climate/risks",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM climate_risks
         WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/climate/risks",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = riskSchema.safeParse(request.body ?? {});
      if (!parsed.success) return reply.code(400).send({ error: "Risque incomplet" });
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      if (!(await ownedAction(orgId, d.action_id))) {
        return reply.code(400).send({ error: "Action introuvable" });
      }
      const { rows } = await pool.query(
        `INSERT INTO climate_risks
           (organization_id, title, category, probability, impact, risk_level, measure, action_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [orgId, d.title, d.category, d.probability, d.impact, d.risk_level, d.measure ?? null, d.action_id ?? null],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/climate/risks/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = riskSchema.safeParse(request.body ?? {});
      if (!params.success || !parsed.success) return reply.code(400).send({ error: "Risque incomplet" });
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      if (!(await ownedAction(orgId, d.action_id))) {
        return reply.code(400).send({ error: "Action introuvable" });
      }
      const { rows } = await pool.query(
        `UPDATE climate_risks SET
           title = $3,
           category = $4,
           probability = $5,
           impact = $6,
           risk_level = $7,
           measure = $8,
           action_id = $9,
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [params.data.id, orgId, d.title, d.category, d.probability, d.impact, d.risk_level, d.measure ?? null, d.action_id ?? null],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/climate/risks/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      return deleteOwnedOr404(
        reply,
        `DELETE FROM climate_risks WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
    },
  );

  app.get(
    "/v1/climate/mobilizations",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM stakeholder_mobilizations
         WHERE organization_id = $1
         ORDER BY occurred_on DESC NULLS LAST, created_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/climate/mobilizations",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = mobilizationSchema.safeParse(request.body ?? {});
      if (!parsed.success) return reply.code(400).send({ error: "Mobilisation incomplète" });
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      if (!(await ownedAction(orgId, d.action_id))) {
        return reply.code(400).send({ error: "Action introuvable" });
      }
      const { rows } = await pool.query(
        `INSERT INTO stakeholder_mobilizations
           (organization_id, audience, stakeholders, title, occurred_on, owner_name, support, action_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [orgId, d.audience, d.stakeholders, d.title, d.occurred_on, d.owner_name, d.support ?? null, d.action_id ?? null],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/climate/mobilizations/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = mobilizationSchema.safeParse(request.body ?? {});
      if (!params.success || !parsed.success) return reply.code(400).send({ error: "Mobilisation incomplète" });
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      if (!(await ownedAction(orgId, d.action_id))) {
        return reply.code(400).send({ error: "Action introuvable" });
      }
      const { rows } = await pool.query(
        `UPDATE stakeholder_mobilizations SET
           audience = $3,
           stakeholders = $4,
           title = $5,
           occurred_on = $6,
           owner_name = $7,
           support = $8,
           action_id = $9,
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [params.data.id, orgId, d.audience, d.stakeholders, d.title, d.occurred_on, d.owner_name, d.support ?? null, d.action_id ?? null],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/climate/mobilizations/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      return deleteOwnedOr404(
        reply,
        `DELETE FROM stakeholder_mobilizations WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
    },
  );

  // ---- Transition : frameworks + objectives ----
  const objectiveSchema = z.object({
    name: z.string().min(1).max(300),
    objective_type: z.enum([
      "absolute_reduction",
      "intensity_reduction",
      "by_scope",
      "by_category",
      "by_site",
      "energy",
      "other",
    ]),
    origin: z.enum(["internal", "external_framework"]).optional(),
    validation_status: z
      .enum(["reference_trajectory", "company_objective", "submitted", "validated"])
      .optional(),
    is_primary: z.boolean().optional(),
    perimeter: z.string().max(80).optional().nullable(),
    scopes: z.array(z.number().int()).optional().nullable(),
    category_key: z.string().max(200).optional().nullable(),
    site_id: z.string().uuid().optional().nullable(),
    baseline_year: z.number().int(),
    baseline_value: z.number().optional().nullable(),
    baseline_unit: z.string().max(40).optional().nullable(),
    target_year: z.number().int(),
    target_value: z.number().optional().nullable(),
    reduction_percent: z.number().optional().nullable(),
    unit: z.string().max(40).optional().nullable(),
    framework_version_id: z.string().uuid().optional().nullable(),
    validation_body: z.string().max(200).optional().nullable(),
    validation_date: z.string().optional().nullable(),
    validation_reference: z.string().max(300).optional().nullable(),
    owner_name: z.string().max(200).optional().nullable(),
    notes: z.string().max(8000).optional().nullable(),
    status: z.enum(["draft", "active", "archived"]).optional(),
    parameters: z.record(z.unknown()).optional().nullable(),
  });

  app.get(
    "/v1/climate/frameworks",
    { preHandler: [app.requireOrgMember] },
    async () => {
      const { rows: frameworks } = await pool.query(
        `SELECT f.*,
           COALESCE(
             json_agg(v.* ORDER BY v.created_at DESC)
               FILTER (WHERE v.id IS NOT NULL),
             '[]'
           ) AS versions
         FROM climate_frameworks f
         LEFT JOIN climate_framework_versions v ON v.framework_id = f.id
         GROUP BY f.id
         ORDER BY f.code`,
      );
      return { items: frameworks };
    },
  );

  app.get(
    "/v1/climate/objectives",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT o.*,
           fv.version_label AS framework_version_label,
           fv.method_key AS framework_method_key,
           f.code AS framework_code,
           f.name AS framework_name
         FROM climate_objectives o
         LEFT JOIN climate_framework_versions fv ON fv.id = o.framework_version_id
         LEFT JOIN climate_frameworks f ON f.id = fv.framework_id
         WHERE o.organization_id = $1
         ORDER BY o.is_primary DESC, o.target_year ASC, o.created_at DESC`,
        [orgId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/climate/objectives",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = objectiveSchema.safeParse(request.body ?? {});
      if (!parsed.success) return reply.code(400).send({ error: "Objectif incomplet", details: parsed.error.flatten() });
      const d = parsed.data;
      if (d.target_year <= d.baseline_year) {
        return reply.code(400).send({ error: "L'année cible doit être postérieure à l'année de référence" });
      }
      // Never auto-mark as SBTi-validated
      let validationStatus = d.validation_status ?? "company_objective";
      if (validationStatus === "validated" && !d.validation_body && !d.validation_reference) {
        return reply.code(400).send({
          error: "Statut « validé » exige un organisme et/ou une référence de validation",
        });
      }
      const orgId = request.user!.organizationId!;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (d.is_primary) {
          await client.query(
            `UPDATE climate_objectives SET is_primary = false, updated_at = now()
             WHERE organization_id = $1 AND is_primary = true`,
            [orgId],
          );
        }
        const { rows } = await client.query(
          `INSERT INTO climate_objectives (
             organization_id, name, objective_type, origin, validation_status, is_primary,
             perimeter, scopes, category_key, site_id,
             baseline_year, baseline_value, baseline_unit,
             target_year, target_value, reduction_percent, unit,
             framework_version_id, validation_body, validation_date, validation_reference,
             owner_name, notes, status, parameters, created_by
           ) VALUES (
             $1,$2,$3,$4,$5,$6,
             $7,$8,$9,$10,
             $11,$12,$13,
             $14,$15,$16,$17,
             $18,$19,$20,$21,
             $22,$23,$24,$25,$26
           ) RETURNING *`,
          [
            orgId,
            d.name,
            d.objective_type,
            d.origin ?? "internal",
            validationStatus,
            d.is_primary ?? false,
            d.perimeter ?? "organization",
            d.scopes ?? [1, 2, 3],
            d.category_key ?? null,
            d.site_id ?? null,
            d.baseline_year,
            d.baseline_value ?? null,
            d.baseline_unit ?? "tCO2e",
            d.target_year,
            d.target_value ?? null,
            d.reduction_percent ?? null,
            d.unit ?? "tCO2e",
            d.framework_version_id ?? null,
            d.validation_body ?? null,
            d.validation_date ?? null,
            d.validation_reference ?? null,
            d.owner_name ?? null,
            d.notes ?? null,
            d.status ?? "active",
            JSON.stringify(d.parameters ?? {}),
            request.user!.id ?? null,
          ],
        );
        await client.query("COMMIT");
        return { item: rows[0] };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  );

  app.patch(
    "/v1/climate/objectives/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = objectiveSchema.partial().safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Objectif invalide" });
      }
      const d = parsed.data;
      if (d.validation_status === "validated" && !d.validation_body && !d.validation_reference) {
        return reply.code(400).send({
          error: "Statut « validé » exige un organisme et/ou une référence de validation",
        });
      }
      const orgId = request.user!.organizationId!;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (d.is_primary === true) {
          await client.query(
            `UPDATE climate_objectives SET is_primary = false, updated_at = now()
             WHERE organization_id = $1 AND is_primary = true AND id <> $2`,
            [orgId, params.data.id],
          );
        }
        const { rows } = await client.query(
          `UPDATE climate_objectives SET
             name = COALESCE($3, name),
             objective_type = COALESCE($4, objective_type),
             origin = COALESCE($5, origin),
             validation_status = COALESCE($6, validation_status),
             is_primary = COALESCE($7, is_primary),
             perimeter = COALESCE($8, perimeter),
             scopes = COALESCE($9, scopes),
             category_key = COALESCE($10, category_key),
             site_id = COALESCE($11, site_id),
             baseline_year = COALESCE($12, baseline_year),
             baseline_value = COALESCE($13, baseline_value),
             baseline_unit = COALESCE($14, baseline_unit),
             target_year = COALESCE($15, target_year),
             target_value = COALESCE($16, target_value),
             reduction_percent = COALESCE($17, reduction_percent),
             unit = COALESCE($18, unit),
             framework_version_id = COALESCE($19, framework_version_id),
             validation_body = COALESCE($20, validation_body),
             validation_date = COALESCE($21, validation_date),
             validation_reference = COALESCE($22, validation_reference),
             owner_name = COALESCE($23, owner_name),
             notes = COALESCE($24, notes),
             status = COALESCE($25, status),
             parameters = COALESCE($26, parameters),
             updated_at = now()
           WHERE id = $1 AND organization_id = $2
           RETURNING *`,
          [
            params.data.id,
            orgId,
            d.name ?? null,
            d.objective_type ?? null,
            d.origin ?? null,
            d.validation_status ?? null,
            d.is_primary ?? null,
            d.perimeter ?? null,
            d.scopes ?? null,
            d.category_key ?? null,
            d.site_id ?? null,
            d.baseline_year ?? null,
            d.baseline_value ?? null,
            d.baseline_unit ?? null,
            d.target_year ?? null,
            d.target_value ?? null,
            d.reduction_percent ?? null,
            d.unit ?? null,
            d.framework_version_id ?? null,
            d.validation_body ?? null,
            d.validation_date ?? null,
            d.validation_reference ?? null,
            d.owner_name ?? null,
            d.notes ?? null,
            d.status ?? null,
            d.parameters != null ? JSON.stringify(d.parameters) : null,
          ],
        );
        await client.query("COMMIT");
        if (!rows[0]) return reply.code(404).send({ error: "Not found" });
        return { item: rows[0] };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  );

  app.delete(
    "/v1/climate/objectives/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      // Soft archive preferred over hard delete
      const { rows } = await pool.query(
        `UPDATE climate_objectives SET status = 'archived', is_primary = false, updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING id`,
        [params.data.id, request.user!.organizationId],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );

  // ---- Transition Phase 2 : trajectoires de référence versionnées ----
  const referenceTrajectorySchema = z.object({
    name: z.string().min(1).max(300).optional(),
    baseline_year: z.number().int(),
    target_year: z.number().int(),
    scope1_emissions: z.number().nonnegative(),
    scope2_emissions: z.number().nonnegative(),
    framework_version_id: z.string().uuid().optional().nullable(),
    most_recent_year: z.number().int().optional().nullable(),
    company_net_zero_year: z.number().int().optional().nullable(),
  });

  app.get(
    "/v1/climate/reference-trajectories",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM climate_reference_trajectories
         WHERE organization_id = $1
         ORDER BY calculated_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/climate/reference-trajectories",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = referenceTrajectorySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: "Trajectoire incomplète", details: parsed.error.flatten() });
      }
      const d = parsed.data;
      if (d.target_year <= d.baseline_year) {
        return reply.code(400).send({ error: "L'année cible doit être postérieure à l'année de référence" });
      }
      if (d.scope1_emissions + d.scope2_emissions <= 0) {
        return reply.code(400).send({ error: "Les émissions Scope 1 + 2 doivent être > 0" });
      }

      let result;
      try {
        result = computeCnzsV131CombinedScope12AbsoluteContraction({
          baselineYear: d.baseline_year,
          targetYear: d.target_year,
          mostRecentYear: d.most_recent_year ?? d.baseline_year,
          scope1EmissionsT: d.scope1_emissions,
          scope2EmissionsT: d.scope2_emissions,
          companyNetZeroYear: d.company_net_zero_year ?? null,
        });
      } catch (e) {
        return reply.code(400).send({
          error: e instanceof Error ? e.message : "Calcul de trajectoire impossible",
        });
      }

      const orgId = request.user!.organizationId!;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Résoudre la version framework active (snapshot link)
        let frameworkVersionId = d.framework_version_id ?? null;
        if (!frameworkVersionId) {
          const { rows: fv } = await client.query(
            `SELECT v.id FROM climate_framework_versions v
             JOIN climate_frameworks f ON f.id = v.framework_id
             WHERE f.code = 'sbti' AND v.method_key = $1
             ORDER BY v.status = 'active' DESC, v.created_at DESC
             LIMIT 1`,
            [CNZS_V131_META.methodKey],
          );
          frameworkVersionId = fv[0]?.id ?? null;
        }

        // Une seule trajectoire active par org pour ce method_key (Phase 2)
        await client.query(
          `UPDATE climate_reference_trajectories
           SET status = 'archived', updated_at = now()
           WHERE organization_id = $1 AND status = 'active' AND method_key = $2`,
          [orgId, CNZS_V131_META.methodKey],
        );

        const { rows } = await client.query(
          `INSERT INTO climate_reference_trajectories (
             organization_id, name, status, framework_version_id,
             framework, framework_version, methodology, method_key, ambition, target_type,
             base_year, target_year, baseline_emissions,
             scope1_emissions, scope2_emissions, scope_boundary,
             dlarr_percent, reduction_percent, target_emissions,
             annual_points, parameters, assumptions,
             source_url, source_document, weighting_status,
             calculated_at, created_by
           ) VALUES (
             $1,$2,'active',$3,
             $4,$5,$6,$7,$8,$9,
             $10,$11,$12,
             $13,$14,$15,
             $16,$17,$18,
             $19,$20,$21,
             $22,$23,$24,
             now(),$25
           ) RETURNING *`,
          [
            orgId,
            d.name ?? "Trajectoire de référence 1,5 °C",
            frameworkVersionId,
            result.framework,
            `Corporate Net-Zero Standard ${result.versionLabel}`,
            result.methodology,
            result.methodKey,
            result.ambition,
            result.targetType,
            result.baselineYear,
            result.targetYear,
            result.baselineEmissionsT,
            result.scope1EmissionsT,
            result.scope2EmissionsT,
            [1, 2],
            result.dlarrPercent,
            result.reductionPercent,
            result.targetEmissionsT,
            JSON.stringify(result.annualPoints),
            JSON.stringify(result.parameters),
            result.assumptions.join("\n"),
            CNZS_V131_META.sourceUrl,
            CNZS_V131_META.sourceDocument,
            result.weightingStatus,
            request.user!.id ?? null,
          ],
        );

        await client.query("COMMIT");
        return { item: rows[0], computation: result };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  );

  app.delete(
    "/v1/climate/reference-trajectories/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      const { rows } = await pool.query(
        `UPDATE climate_reference_trajectories
         SET status = 'archived', updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING id`,
        [params.data.id, request.user!.organizationId],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );
}
