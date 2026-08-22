import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";

const studySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  product_category: z.string().max(80).optional().nullable(),
  description: z.string().max(8000).optional().nullable(),
  sector: z.string().max(120).optional().nullable(),
  production_site: z.string().max(200).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  electricity_mix: z.string().max(80).optional().nullable(),
  functional_unit: z.string().max(200).optional().nullable(),
  perimeter_type: z.string().max(80).optional().nullable(),
  hs_code: z.string().max(40).optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  study_mode: z.string().max(40).optional().nullable(),
  cbam_mode: z.boolean().optional(),
  total_emissions: z.number().optional().nullable(),
  total_energy_mj: z.number().optional().nullable(),
  version: z.number().int().optional().nullable(),
});

const versionSchema = z.object({
  studyId: z.string().uuid(),
  snapshot: z.record(z.unknown()).optional(),
  comment: z.string().max(2000).optional().nullable(),
});

export async function registerPcfRoutes(app: FastifyInstance) {
  app.get(
    "/v1/pcf/studies",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM pcf_studies
         WHERE organization_id = $1
         ORDER BY updated_at DESC NULLS LAST, created_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/pcf/studies/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      const { rows } = await pool.query(
        `SELECT * FROM pcf_studies WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.post(
    "/v1/pcf/studies",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = studySchema.safeParse(request.body ?? {});
      if (!parsed.success || !parsed.data.name) {
        return reply.code(400).send({ error: "Nom d'étude requis" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `INSERT INTO pcf_studies
           (organization_id, name, product_category, description, sector, production_site,
            country, electricity_mix, functional_unit, perimeter_type, hs_code, status,
            study_mode, cbam_mode, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,'draft'),COALESCE($13,'pcf'),$14,$15)
         RETURNING *`,
        [
          request.user!.organizationId,
          d.name,
          d.product_category ?? null,
          d.description ?? null,
          d.sector ?? null,
          d.production_site ?? null,
          d.country ?? null,
          d.electricity_mix ?? null,
          d.functional_unit ?? null,
          d.perimeter_type ?? null,
          d.hs_code ?? null,
          d.status ?? "draft",
          d.study_mode ?? "pcf",
          d.cbam_mode ?? false,
          request.user!.id,
        ],
      );
      return { item: rows[0] };
    },
  );

  app.patch(
    "/v1/pcf/studies/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = studySchema.safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid study" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `UPDATE pcf_studies SET
           name = COALESCE($3, name),
           product_category = COALESCE($4, product_category),
           description = COALESCE($5, description),
           sector = COALESCE($6, sector),
           production_site = COALESCE($7, production_site),
           country = COALESCE($8, country),
           electricity_mix = COALESCE($9, electricity_mix),
           functional_unit = COALESCE($10, functional_unit),
           perimeter_type = COALESCE($11, perimeter_type),
           hs_code = COALESCE($12, hs_code),
           status = COALESCE($13, status),
           study_mode = COALESCE($14, study_mode),
           total_emissions = COALESCE($15, total_emissions),
           total_energy_mj = COALESCE($16, total_energy_mj),
           version = COALESCE($17, version),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.name ?? null,
          d.product_category ?? null,
          d.description ?? null,
          d.sector ?? null,
          d.production_site ?? null,
          d.country ?? null,
          d.electricity_mix ?? null,
          d.functional_unit ?? null,
          d.perimeter_type ?? null,
          d.hs_code ?? null,
          d.status ?? null,
          d.study_mode ?? null,
          d.total_emissions ?? null,
          d.total_energy_mj ?? null,
          d.version ?? null,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "Not found" });
      return { item: rows[0] };
    },
  );

  app.delete(
    "/v1/pcf/studies/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      await pool.query(
        `DELETE FROM pcf_studies WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/pcf/studies/:id/versions",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid id" });
      const owned = await pool.query(
        `SELECT 1 FROM pcf_studies WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      if (!owned.rows[0]) return reply.code(404).send({ error: "Not found" });
      const { rows } = await pool.query(
        `SELECT * FROM pcf_versions
         WHERE study_id = $1 AND organization_id = $2
         ORDER BY version_number DESC NULLS LAST, created_at DESC`,
        [params.data.id, request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/pcf/versions",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = versionSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      const owned = await pool.query(
        `SELECT 1 FROM pcf_studies WHERE id = $1 AND organization_id = $2`,
        [d.studyId, orgId],
      );
      if (!owned.rows[0]) return reply.code(404).send({ error: "Étude introuvable" });
      const last = await pool.query(
        `SELECT version_number FROM pcf_versions
         WHERE study_id = $1 AND organization_id = $2
         ORDER BY version_number DESC NULLS LAST LIMIT 1`,
        [d.studyId, orgId],
      );
      const nextVersion = Number(last.rows[0]?.version_number ?? 0) + 1;
      const { rows } = await pool.query(
        `INSERT INTO pcf_versions
           (organization_id, study_id, version_number, snapshot, comment, created_by)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6)
         RETURNING *`,
        [
          orgId,
          d.studyId,
          nextVersion,
          JSON.stringify(d.snapshot ?? {}),
          d.comment ?? `Calcul v${nextVersion}`,
          request.user!.id,
        ],
      );
      await pool.query(
        `UPDATE pcf_studies SET version = $3, updated_at = now()
         WHERE id = $1 AND organization_id = $2`,
        [d.studyId, orgId, nextVersion],
      );
      return { item: rows[0] };
    },
  );
}
