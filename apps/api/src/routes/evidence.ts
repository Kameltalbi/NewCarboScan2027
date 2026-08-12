import type { FastifyInstance } from "fastify";
import { withOrgClient } from "../db.js";
import {
  evidenceCreateSchema,
  evidenceValidateSchema,
} from "../schemas/index.js";

export async function registerEvidenceRoutes(app: FastifyInstance) {
  app.post(
    "/v1/evidence",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = evidenceCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const orgId = request.user!.organizationId!;

      if (
        (d.origin === "excel_import" || d.origin === "invoice_ocr") &&
        d.validationStatus === "validated"
      ) {
        return reply.code(400).send({
          error:
            "Imported/OCR evidence cannot be created as validated. Submit for review first.",
        });
      }

      const row = await withOrgClient(orgId, async (client) => {
        const { rows } = await client.query(
          `INSERT INTO evidence_records
            (organization_id, author_user_id, created_by, period_start, period_end,
             original_unit, original_quantity, origin, extraction_method, validation_status,
             temporal_quality, geographic_quality, technology_representativeness,
             uncertainty_pct, source_filename, source_type, source_page, source_cell,
             extraction_confidence, data_class)
           VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
           RETURNING *`,
          [
            orgId,
            request.user!.id,
            d.periodStart ?? null,
            d.periodEnd ?? null,
            d.originalUnit,
            d.originalQuantity,
            d.origin,
            d.extractionMethod,
            d.validationStatus,
            d.temporalQuality ?? null,
            d.geographicQuality ?? null,
            d.technologyRepresentativeness ?? null,
            d.uncertaintyPct ?? null,
            d.sourceFilename ?? null,
            d.sourceType ?? null,
            d.sourcePage ?? null,
            d.sourceCell ?? null,
            d.extractionConfidence ?? null,
            d.dataClass ?? null,
          ],
        );

        await client.query(
          `INSERT INTO evidence_history (evidence_id, changed_by, change_type, after_state)
           VALUES ($1,$2,'created',$3)`,
          [rows[0].id, request.user!.id, JSON.stringify(rows[0])],
        );

        await client.query(
          `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
           VALUES ($1,$2,'evidence.create','evidence_record',$3,$4,$5)`,
          [
            orgId,
            request.user!.id,
            rows[0].id,
            request.ip,
            JSON.stringify({ origin: d.origin, status: d.validationStatus }),
          ],
        );

        return rows[0];
      });

      return { evidence: row };
    },
  );

  app.get(
    "/v1/evidence",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      return withOrgClient(orgId, async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM evidence_records
           WHERE organization_id = $1
           ORDER BY created_at DESC
           LIMIT 200`,
          [orgId],
        );
        return { items: rows };
      });
    },
  );

  app.patch(
    "/v1/evidence/:id/validate",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = evidenceValidateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const orgId = request.user!.organizationId!;
      const role = request.user!.role;
      if (
        parsed.data.status === "validated" &&
        role &&
        !["owner", "admin", "editor", "auditor"].includes(role)
      ) {
        return reply.code(403).send({ error: "Insufficient role to validate evidence" });
      }

      const row = await withOrgClient(orgId, async (client) => {
        const existing = await client.query(
          `SELECT * FROM evidence_records WHERE id = $1 AND organization_id = $2`,
          [id, orgId],
        );
        if (!existing.rows[0]) {
          reply.code(404);
          return null;
        }

        const before = existing.rows[0];
        const validated =
          parsed.data.status === "validated"
            ? { by: request.user!.id, at: new Date().toISOString() }
            : { by: null, at: null };

        const { rows } = await client.query(
          `UPDATE evidence_records SET
             validation_status = $1,
             validated_by = $2,
             validated_at = $3,
             updated_at = now()
           WHERE id = $4 AND organization_id = $5
           RETURNING *`,
          [parsed.data.status, validated.by, validated.at, id, orgId],
        );

        await client.query(
          `INSERT INTO evidence_history (evidence_id, changed_by, change_type, before_state, after_state)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            id,
            request.user!.id,
            `status:${parsed.data.status}`,
            JSON.stringify(before),
            JSON.stringify({ ...rows[0], note: parsed.data.note }),
          ],
        );

        await client.query(
          `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
           VALUES ($1,$2,'evidence.validate','evidence_record',$3,$4,$5)`,
          [
            orgId,
            request.user!.id,
            id,
            request.ip,
            JSON.stringify({
              from: before.validation_status,
              to: parsed.data.status,
              note: parsed.data.note,
            }),
          ],
        );

        return rows[0];
      });

      if (!row) return { error: "Not found" };
      return { evidence: row };
    },
  );
}
