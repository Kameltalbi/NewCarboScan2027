import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";

const bilanSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  year: z.number().int().optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  totalEmission: z.number().optional().nullable(),
  scope1Emission: z.number().optional().nullable(),
  scope2Emission: z.number().optional().nullable(),
  scope3Emission: z.number().optional().nullable(),
  dateBilan: z.string().optional().nullable(),
  questionnaireData: z.unknown().optional(),
  analyseCommentaire: z.string().max(10000).optional().nullable(),
});

export async function registerBilanRoutes(app: FastifyInstance) {
  app.get(
    "/v1/bilans",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT * FROM bilans_carbone
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT 500`,
        [orgId],
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/bilans/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      const { rows } = await pool.query(
        `SELECT * FROM bilans_carbone WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Not found" });
      }
      return { bilan: rows[0] };
    },
  );

  app.post(
    "/v1/bilans",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = bilanSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `INSERT INTO bilans_carbone
           (organization_id, user_id, name, year, status,
            total_emission, scope1_emission, scope2_emission, scope3_emission,
            date_bilan, questionnaire_data, analyse_commentaire)
         VALUES ($1,$2,$3,$4,COALESCE($5,'draft'),$6,$7,$8,$9,$10,$11::jsonb,$12)
         RETURNING *`,
        [
          request.user!.organizationId,
          request.user!.id,
          d.name ?? null,
          d.year ?? null,
          d.status ?? "draft",
          d.totalEmission ?? 0,
          d.scope1Emission ?? 0,
          d.scope2Emission ?? 0,
          d.scope3Emission ?? 0,
          d.dateBilan ?? null,
          JSON.stringify(d.questionnaireData ?? {}),
          d.analyseCommentaire ?? null,
        ],
      );
      return { bilan: rows[0] };
    },
  );

  app.patch(
    "/v1/bilans/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = bilanSchema.partial().safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid bilan patch" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `UPDATE bilans_carbone SET
           name = COALESCE($3, name),
           year = COALESCE($4, year),
           status = COALESCE($5, status),
           total_emission = COALESCE($6, total_emission),
           scope1_emission = COALESCE($7, scope1_emission),
           scope2_emission = COALESCE($8, scope2_emission),
           scope3_emission = COALESCE($9, scope3_emission),
           date_bilan = COALESCE($10, date_bilan),
           questionnaire_data = COALESCE($11::jsonb, questionnaire_data),
           analyse_commentaire = COALESCE($12, analyse_commentaire),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          params.data.id,
          request.user!.organizationId,
          d.name ?? null,
          d.year ?? null,
          d.status ?? null,
          d.totalEmission ?? null,
          d.scope1Emission ?? null,
          d.scope2Emission ?? null,
          d.scope3Emission ?? null,
          d.dateBilan ?? null,
          d.questionnaireData ? JSON.stringify(d.questionnaireData) : null,
          d.analyseCommentaire ?? null,
        ],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Not found" });
      }
      return { bilan: rows[0] };
    },
  );

  app.delete(
    "/v1/bilans/:id",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      await pool.query(
        `DELETE FROM bilans_carbone WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );
}
