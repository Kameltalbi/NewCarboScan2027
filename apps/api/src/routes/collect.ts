import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";

const activityInput = z.object({
  category: z.string().max(120).optional().nullable(),
  subcategory: z.string().max(120).optional().nullable(),
  scope: z.number().int().min(1).max(3).optional().nullable(),
  quantity: z.union([z.number(), z.string()]).optional().nullable(),
  unit: z.string().max(64).optional().nullable(),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  factor_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  site_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  activity_type: z.string().max(80).optional().nullable(),
  data_quality: z.string().max(40).optional().nullable(),
  scope_hint: z.string().max(40).optional().nullable(),
  source_document: z.string().max(500).optional().nullable(),
}).passthrough();

function pickActivity(input: Record<string, unknown>, orgId: string, userId: string) {
  return {
    organization_id: orgId,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    scope: input.scope ?? null,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    period_start: input.period_start ?? null,
    period_end: input.period_end ?? null,
    factor_id: input.factor_id ?? null,
    notes: input.notes ?? null,
    site_id: input.site_id ?? null,
    product_id: input.product_id ?? null,
    supplier_id: input.supplier_id ?? null,
    activity_type: input.activity_type ?? null,
    data_quality: input.data_quality ?? "estimated",
    scope_hint: input.scope_hint ?? null,
    source_document: input.source_document ?? null,
    created_by: userId,
  };
}

export async function registerCollectRoutes(app: FastifyInstance) {
  app.get(
    "/v1/collect/activity-data",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [orgId];
      const where = ["organization_id = $1"];
      if (q.siteId) {
        params.push(q.siteId);
        where.push(`site_id = $${params.length}`);
      }
      if (q.category) {
        params.push(q.category);
        where.push(`category = $${params.length}`);
      }
      if (q.activityType) {
        params.push(q.activityType);
        where.push(`activity_type = $${params.length}`);
      }
      if (q.periodStart && q.periodEnd) {
        params.push(q.periodStart, q.periodEnd);
        where.push(
          `(period_start IS NULL OR period_start <= $${params.length}) AND (period_end IS NULL OR period_end >= $${params.length - 1})`,
        );
      } else if (q.periodStart) {
        params.push(q.periodStart);
        where.push(`(period_end IS NULL OR period_end >= $${params.length})`);
      } else if (q.periodEnd) {
        params.push(q.periodEnd);
        where.push(`(period_start IS NULL OR period_start <= $${params.length})`);
      }
      if (q.scopeHint) {
        params.push(q.scopeHint);
        where.push(`scope_hint = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM activity_data WHERE ${where.join(" AND ")}
         ORDER BY period_start DESC NULLS LAST, created_at DESC
         LIMIT 5000`,
        params,
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/collect/activity-data/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      const { rows } = await pool.query(
        `SELECT * FROM activity_data WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Not found" });
      }
      return { item: rows[0] };
    },
  );

  app.post(
    "/v1/collect/activity-data",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const body = request.body as Record<string, unknown> | unknown[];
      const rowsIn = Array.isArray(body) ? body : body?.items && Array.isArray((body as any).items)
        ? (body as any).items
        : [body];
      const orgId = request.user!.organizationId!;
      const created: unknown[] = [];
      for (const raw of rowsIn) {
        const parsed = activityInput.safeParse(raw);
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.flatten() });
        }
        const row = pickActivity(parsed.data as Record<string, unknown>, orgId, request.user!.id);
        const inserted = await pool.query(
          `INSERT INTO activity_data
            (organization_id, category, subcategory, scope, quantity, unit, period_start, period_end,
             factor_id, notes, site_id, product_id, supplier_id, activity_type, data_quality, scope_hint, source_document, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           RETURNING *`,
          [
            row.organization_id, row.category, row.subcategory, row.scope, row.quantity, row.unit,
            row.period_start, row.period_end, row.factor_id, row.notes, row.site_id, row.product_id,
            row.supplier_id, row.activity_type, row.data_quality, row.scope_hint, row.source_document,
            row.created_by,
          ],
        );
        created.push(inserted.rows[0]);
      }
      return { items: created, item: created[0] };
    },
  );

  app.patch(
    "/v1/collect/activity-data/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = activityInput.partial().safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid activity patch" });
      }
      const d = parsed.data as Record<string, unknown>;
      const { rows } = await pool.query(
        `UPDATE activity_data SET
           category = COALESCE($3, category),
           subcategory = COALESCE($4, subcategory),
           scope = COALESCE($5, scope),
           quantity = COALESCE($6, quantity),
           unit = COALESCE($7, unit),
           period_start = COALESCE($8, period_start),
           period_end = COALESCE($9, period_end),
           factor_id = COALESCE($10, factor_id),
           notes = COALESCE($11, notes),
           site_id = COALESCE($12, site_id),
           data_quality = COALESCE($13, data_quality),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.category ?? null,
          d.subcategory ?? null,
          d.scope ?? null,
          d.quantity ?? null,
          d.unit ?? null,
          d.period_start ?? null,
          d.period_end ?? null,
          d.factor_id ?? null,
          d.notes ?? null,
          d.site_id ?? null,
          d.data_quality ?? null,
        ],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Not found" });
      }
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/collect/activity-data/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      await pool.query(
        `DELETE FROM activity_data WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/collect/quality-stats",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT data_quality, count(*)::int AS n
         FROM activity_data
         WHERE organization_id = $1
         GROUP BY data_quality`,
        [orgId],
      );
      const stats: Record<string, number> = { real: 0, estimated: 0, default: 0, total: 0 };
      for (const row of rows) {
        stats[row.data_quality || "estimated"] = row.n;
        stats.total += row.n;
      }
      return { stats };
    },
  );

  app.get(
    "/v1/collect/comments",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [orgId];
      const where = ["organization_id = $1"];
      if (q.sessionId) {
        params.push(q.sessionId);
        where.push(`session_id = $${params.length}`);
      }
      if (q.targetKey) {
        params.push(q.targetKey);
        where.push(`target_key = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM collect_comments
         WHERE ${where.join(" AND ")}
         ORDER BY created_at ASC
         LIMIT 1000`,
        params,
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/collect/comments",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const body = z
        .object({
          content: z.string().min(1).max(8000),
          sessionId: z.string().uuid().optional().nullable(),
          targetType: z.string().max(80).optional(),
          targetKey: z.string().max(200).optional().nullable(),
          targetId: z.string().uuid().optional().nullable(),
          parentId: z.string().uuid().optional().nullable(),
        })
        .safeParse(request.body ?? {});
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() });
      }
      const d = body.data;
      const { rows } = await pool.query(
        `INSERT INTO collect_comments
           (organization_id, session_id, user_id, target_type, target_key, target_id, content, parent_comment_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          request.user!.organizationId,
          d.sessionId ?? null,
          request.user!.id,
          d.targetType ?? "question",
          d.targetKey ?? null,
          d.targetId ?? null,
          d.content,
          d.parentId ?? null,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/collect/comments/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const body = z
        .object({
          isResolved: z.boolean().optional(),
          content: z.string().min(1).max(8000).optional(),
        })
        .safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid comment patch" });
      }
      const d = body.data;
      const { rows } = await pool.query(
        `UPDATE collect_comments SET
           content = COALESCE($3, content),
           is_resolved = COALESCE($4, is_resolved),
           resolved_at = CASE WHEN $4 IS TRUE THEN now() ELSE resolved_at END,
           resolved_by = CASE WHEN $4 IS TRUE THEN $5 ELSE resolved_by END,
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.content ?? null,
          d.isResolved ?? null,
          request.user!.id,
        ],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Not found" });
      }
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/collect/comments/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      await pool.query(
        `DELETE FROM collect_comments WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );
}
