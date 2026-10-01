import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { orgIdParamSchema } from "../schemas/index.js";
import {
  buildPublishedSnapshot,
  isClosedBilanStatus,
  type BilanFactorLineInput,
} from "../services/bilanSnapshot.js";

const BILAN_UI_ENGINE = "bilan-ui-1";
const BILAN_UI_METHODOLOGY = "bilan-carbone-ui-1";

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
        `SELECT b.*, r.published_snapshot, r.published_at
         FROM bilans_carbone b
         LEFT JOIN calculation_runs r
           ON r.id = b.run_id AND r.organization_id = b.organization_id
         WHERE b.organization_id = $1
         ORDER BY b.created_at DESC
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
        `SELECT b.*, r.published_snapshot, r.published_at
         FROM bilans_carbone b
         LEFT JOIN calculation_runs r
           ON r.id = b.run_id AND r.organization_id = b.organization_id
         WHERE b.id = $1 AND b.organization_id = $2`,
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
      const current = await pool.query(
        `SELECT status FROM bilans_carbone WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      if (!current.rows[0]) {
        return reply.code(404).send({ error: "Not found" });
      }
      if (isClosedBilanStatus(current.rows[0].status)) {
        const rewritesResult =
          d.status != null ||
          d.year != null ||
          d.totalEmission != null ||
          d.scope1Emission != null ||
          d.scope2Emission != null ||
          d.scope3Emission != null ||
          d.questionnaireData != null ||
          d.dateBilan != null;
        if (rewritesResult) {
          return reply.code(409).send({
            error: "Ce bilan est clôturé. Ses facteurs et ses totaux restent ceux de la clôture.",
          });
        }
      }
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
      const current = await pool.query(
        `SELECT status FROM bilans_carbone WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      if (!current.rows[0]) {
        return reply.code(404).send({ error: "Not found" });
      }
      if (isClosedBilanStatus(current.rows[0].status)) {
        return reply.code(409).send({
          error: "Ce bilan est clôturé. Il n'est pas supprimé.",
        });
      }
      await pool.query(
        `DELETE FROM bilans_carbone WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  const closeLineSchema = z.object({
    lineKey: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    category: z.string().min(1).max(120),
    scope: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    quantity: z.number().finite().nonnegative(),
    activityUnit: z.string().min(1).max(64),
    factorValue: z.number().finite().nonnegative(),
    factorUnit: z.string().min(1).max(80),
    factorSource: z.string().min(1).max(500),
    factorName: z.string().min(1).max(200),
    resultKgCo2e: z.number().finite().nonnegative(),
    factorId: z.string().uuid().nullable().optional(),
    factorVersion: z.string().max(120).nullable().optional(),
    factorYear: z.number().int().nullable().optional(),
    factorGeography: z.string().max(120).nullable().optional(),
  });

  app.post(
    "/v1/bilans/:id/close",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = z
        .object({
          periodStart: z.string().max(40).nullable().optional(),
          periodEnd: z.string().max(40).nullable().optional(),
          lines: z.array(closeLineSchema).min(1).max(5000),
        })
        .safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid close payload" });
      }

      const orgId = request.user!.organizationId!;
      const userId = request.user!.id;
      const frozenAt = new Date().toISOString();
      let snapshot;
      try {
        snapshot = buildPublishedSnapshot({
          lines: parsed.data.lines as BilanFactorLineInput[],
          frozenAt,
          periodStart: parsed.data.periodStart ?? null,
          periodEnd: parsed.data.periodEnd ?? null,
          engineVersion: BILAN_UI_ENGINE,
          methodologyVersion: BILAN_UI_METHODOLOGY,
        });
      } catch (error) {
        return reply.code(400).send({
          error: error instanceof Error ? error.message : "Lignes invalides",
        });
      }
      if (!snapshot.lines.some((line) => line.resultKgCo2e > 0)) {
        return reply.code(400).send({ error: "Le bilan à clôturer n'a pas d'émission." });
      }

      const kg = (scope: number) =>
        snapshot.lines
          .filter((line) => line.scope === scope)
          .reduce((sum, line) => sum + line.resultKgCo2e, 0);
      const scope1Kg = kg(1);
      const scope2Kg = kg(2);
      const scope3Kg = kg(3);
      const totalKg = scope1Kg + scope2Kg + scope3Kg;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query(
          `SELECT id, status, questionnaire_data
           FROM bilans_carbone
           WHERE id = $1 AND organization_id = $2
           FOR UPDATE`,
          [params.data.id, orgId],
        );
        if (!current.rows[0]) {
          await client.query("ROLLBACK");
          return reply.code(404).send({ error: "Not found" });
        }
        if (isClosedBilanStatus(current.rows[0].status)) {
          await client.query("ROLLBACK");
          return reply.code(409).send({ error: "Ce bilan est déjà clôturé." });
        }

        const run = await client.query(
          `INSERT INTO calculation_runs
            (organization_id, engine_version, methodology_version, method,
             period_start, period_end, input_hash, result_hash, created_by,
             publish_status, published_at, published_by, published_snapshot)
           VALUES ($1,$2,$3,'bilan_carbone',$4,$5,$6,$7,$8,'published', now(), $8, $9::jsonb)
           RETURNING id, published_snapshot, published_at`,
          [
            orgId,
            snapshot.engineVersion,
            snapshot.methodologyVersion,
            snapshot.periodStart,
            snapshot.periodEnd,
            snapshot.inputHash,
            snapshot.resultHash,
            userId,
            JSON.stringify(snapshot),
          ],
        );
        const runId = run.rows[0].id as string;

        for (const line of snapshot.lines) {
          await client.query(
            `INSERT INTO calculation_ledger
              (run_id, organization_id, line_key, scope, factor_id, formula,
               activity_quantity, activity_unit, factor_value, factor_unit,
               result_kgco2e, engine_version, methodology_version, provenance)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)`,
            [
              runId,
              orgId,
              line.lineKey,
              line.scope,
              line.factorId,
              "quantité × facteur = résultat figé à la clôture",
              line.quantity,
              line.activityUnit,
              line.factorValue,
              line.factorUnit,
              line.resultKgCo2e,
              snapshot.engineVersion,
              snapshot.methodologyVersion,
              JSON.stringify({
                factorName: line.factorName,
                factorSource: line.factorSource,
                factorVersion: line.factorVersion,
                factorYear: line.factorYear,
                factorGeography: line.factorGeography,
                usedAt: line.usedAt,
                category: line.category,
              }),
            ],
          );
        }

        const previous =
          current.rows[0].questionnaire_data &&
          typeof current.rows[0].questionnaire_data === "object"
            ? current.rows[0].questionnaire_data
            : {};
        const questionnaire = {
          ...previous,
          calculatedFrom: "closed_snapshot",
          frozenAt,
          runId,
        };

        const updated = await client.query(
          `UPDATE bilans_carbone SET
             status = 'validated',
             run_id = $3,
             total_emission = $4,
             scope1_emission = $5,
             scope2_emission = $6,
             scope3_emission = $7,
             total_kgco2e = $8,
             scope1_kgco2e = $9,
             scope2_kgco2e = $10,
             scope3_kgco2e = $11,
             questionnaire_data = $12::jsonb,
             updated_at = now()
           WHERE id = $1 AND organization_id = $2
           RETURNING *`,
          [
            params.data.id,
            orgId,
            runId,
            totalKg / 1000,
            scope1Kg / 1000,
            scope2Kg / 1000,
            scope3Kg / 1000,
            totalKg,
            scope1Kg,
            scope2Kg,
            scope3Kg,
            JSON.stringify(questionnaire),
          ],
        );
        await client.query("COMMIT");
        return {
          bilan: {
            ...updated.rows[0],
            published_snapshot: run.rows[0].published_snapshot,
            published_at: run.rows[0].published_at,
          },
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );
}
