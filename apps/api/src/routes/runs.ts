import type { FastifyInstance } from "fastify";
import { withOrgClient } from "../db.js";
import { publishRunSchema } from "../schemas/index.js";

/**
 * Runs publiés + provenance ligne (6 questions).
 */
export async function registerRunRoutes(app: FastifyInstance) {
  app.get(
    "/v1/runs",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      return withOrgClient(orgId, async (client) => {
        const { rows } = await client.query(
          `SELECT id, engine_version, methodology_version, method, period_start, period_end,
                  input_hash, result_hash, status, publish_status, published_at, created_at
           FROM calculation_runs
           WHERE organization_id = $1
           ORDER BY created_at DESC
           LIMIT 50`,
          [orgId],
        );
        return { items: rows };
      });
    },
  );

  app.get(
    "/v1/runs/:runId",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const orgId = request.user!.organizationId!;
      const { runId } = request.params as { runId: string };
      return withOrgClient(orgId, async (client) => {
        const run = await client.query(
          `SELECT * FROM calculation_runs WHERE id = $1 AND organization_id = $2`,
          [runId, orgId],
        );
        if (!run.rows[0]) {
          reply.code(404);
          return { error: "Run not found" };
        }
        const lines = await client.query(
          `SELECT id, line_key, scope, evidence_id, factor_id, formula,
                  activity_quantity::text, activity_unit,
                  factor_value::text, factor_unit, allocation_factor::text,
                  result_kgco2e::text, uncertainty_pct::text,
                  engine_version, methodology_version, factor_checksum
           FROM calculation_ledger
           WHERE run_id = $1 AND organization_id = $2
           ORDER BY line_key`,
          [runId, orgId],
        );
        return { run: run.rows[0], lines: lines.rows };
      });
    },
  );

  app.post(
    "/v1/runs/:runId/publish",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const orgId = request.user!.organizationId!;
      const { runId } = request.params as { runId: string };
      const parsed = publishRunSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const result = await withOrgClient(orgId, async (client) => {
        const run = await client.query(
          `SELECT * FROM calculation_runs WHERE id = $1 AND organization_id = $2`,
          [runId, orgId],
        );
        if (!run.rows[0]) {
          reply.code(404);
          return null;
        }
        if (run.rows[0].publish_status === "published") {
          return { run: run.rows[0], alreadyPublished: true };
        }

        if (parsed.data.supersedePrevious) {
          await client.query(
            `UPDATE calculation_runs
             SET publish_status = 'superseded'
             WHERE organization_id = $1
               AND publish_status = 'published'
               AND id <> $2
               AND method = $3`,
            [orgId, runId, run.rows[0].method],
          );
        }

        const lines = await client.query(
          `SELECT l.*, e.validation_status, e.origin, e.source_filename,
                  e.validated_by, e.validated_at,
                  f.name AS factor_name, f.stable_factor_id, f.version_number,
                  f.checksum AS factor_checksum, f.value::text AS factor_db_value
           FROM calculation_ledger l
           LEFT JOIN evidence_records e ON e.id = l.evidence_id
           LEFT JOIN emission_factors f ON f.id = l.factor_id
           WHERE l.run_id = $1 AND l.organization_id = $2
           ORDER BY l.line_key`,
          [runId, orgId],
        );

        const snapshot = {
          frozenAt: new Date().toISOString(),
          engineVersion: run.rows[0].engine_version,
          methodologyVersion: run.rows[0].methodology_version,
          method: run.rows[0].method,
          periodStart: run.rows[0].period_start,
          periodEnd: run.rows[0].period_end,
          inputHash: run.rows[0].input_hash,
          resultHash: run.rows[0].result_hash,
          exclusions: run.rows[0].exclusions ?? [],
          assumptions: run.rows[0].assumptions ?? [],
          scopeNotes: run.rows[0].scope_notes ?? null,
          lines: lines.rows.map((row) => ({
            lineKey: row.line_key,
            scope: row.scope,
            formula: row.formula,
            activityQuantity: String(row.activity_quantity),
            activityUnit: row.activity_unit,
            factorId: row.factor_id,
            factorName: row.factor_name,
            stableFactorId: row.stable_factor_id,
            factorVersionNumber: row.factor_version_number,
            factorValue: String(row.factor_value),
            factorUnit: row.factor_unit,
            factorChecksum: row.factor_checksum,
            resultKgCo2e: String(row.result_kgco2e),
            uncertaintyPct: row.uncertainty_pct != null ? String(row.uncertainty_pct) : null,
            evidenceId: row.evidence_id,
            evidenceOrigin: row.origin,
            evidenceSource: row.source_filename,
            evidenceValidationStatus: row.validation_status,
            evidenceValidatedBy: row.validated_by,
            evidenceValidatedAt: row.validated_at,
          })),
        };

        const { rows } = await client.query(
          `UPDATE calculation_runs SET
             publish_status = 'published',
             published_at = now(),
             published_by = $1,
             published_snapshot = $2::jsonb
           WHERE id = $3 AND organization_id = $4
           RETURNING *`,
          [request.user!.id, JSON.stringify(snapshot), runId, orgId],
        );

        await client.query(
          `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
           VALUES ($1,$2,'run.publish','calculation_run',$3,$4,$5)`,
          [
            orgId,
            request.user!.id,
            runId,
            request.ip,
            JSON.stringify({
              resultHash: rows[0].result_hash,
              lineCount: snapshot.lines.length,
              snapshotFrozen: true,
            }),
          ],
        );

        return { run: rows[0], alreadyPublished: false, snapshot };
      });

      if (!result) return { error: "Not found" };
      if (result && !result.alreadyPublished) {
        const { dispatchOrgWebhooks } = await import("./webhooks.js");
        void dispatchOrgWebhooks(orgId, "run.published", {
          runId,
          resultHash: result.run?.result_hash ?? null,
        });
      }
      return result;
    },
  );

  /**
   * Six questions pour une ligne de ledger.
   */
  app.get(
    "/v1/ledger/:lineId/provenance",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const orgId = request.user!.organizationId!;
      const { lineId } = request.params as { lineId: string };

      const provenance = await withOrgClient(orgId, async (client) => {
        const { rows } = await client.query(
          `SELECT
             l.id AS ledger_line_id,
             l.line_key,
             l.scope,
             l.formula,
             l.activity_quantity::text AS activity_quantity,
             l.activity_unit,
             l.factor_value::text AS factor_value,
             l.factor_unit,
             l.result_kgco2e::text AS result_kgco2e,
             l.uncertainty_pct::text AS uncertainty_pct,
             l.engine_version,
             l.methodology_version,
             l.factor_checksum,
             l.created_at AS calculated_at,
             r.id AS run_id,
             r.publish_status,
             r.published_at,
             r.input_hash,
             r.result_hash,
             e.id AS evidence_id,
             e.original_quantity::text AS evidence_quantity,
             e.original_unit AS evidence_unit,
             e.period_start,
             e.period_end,
             e.origin,
             e.source_type,
             e.source_filename,
             e.source_page,
             e.source_cell,
             e.extraction_method,
             e.extraction_confidence,
             e.validation_status,
             e.validated_by,
             e.validated_at,
             e.data_class,
             vu.full_name AS validated_by_name,
             vu.email AS validated_by_email,
             f.id AS factor_id,
             f.name AS factor_name,
             f.stable_factor_id,
             f.version_number AS factor_version_number,
             f.geography AS factor_geography,
             f.selection_rule,
             f.checksum AS factor_row_checksum,
             v.version_label AS factor_pack_version,
             v.gwp_set,
             v.source_dataset,
             s.name AS factor_source_org,
             s.license AS factor_license
           FROM calculation_ledger l
           JOIN calculation_runs r ON r.id = l.run_id
           LEFT JOIN evidence_records e ON e.id = l.evidence_id
           LEFT JOIN users vu ON vu.id = e.validated_by
           LEFT JOIN emission_factors f ON f.id = l.factor_id
           LEFT JOIN emission_factor_versions v ON v.id = COALESCE(l.factor_version_id, f.version_id)
           LEFT JOIN factor_sources s ON s.id = v.source_id
           WHERE l.id = $1 AND l.organization_id = $2`,
          [lineId, orgId],
        );
        return rows[0] ?? null;
      });

      if (!provenance) {
        return reply.code(404).send({ error: "Ledger line not found" });
      }

      const sixQuestions = {
        quelleDonnee: {
          value: provenance.evidence_quantity ?? provenance.activity_quantity,
          unit: provenance.evidence_unit ?? provenance.activity_unit,
          periodStart: provenance.period_start,
          periodEnd: provenance.period_end,
          dataClass: provenance.data_class,
        },
        quelleSource: {
          origin: provenance.origin,
          sourceType: provenance.source_type,
          filename: provenance.source_filename,
          page: provenance.source_page,
          cell: provenance.source_cell,
          extractionMethod: provenance.extraction_method,
          extractionConfidence: provenance.extraction_confidence,
        },
        quelFacteur: {
          id: provenance.factor_id,
          name: provenance.factor_name,
          stableFactorId: provenance.stable_factor_id,
          value: provenance.factor_value,
          unit: provenance.factor_unit,
          geography: provenance.factor_geography,
          selectionRule: provenance.selection_rule,
        },
        quelleFormule: {
          formula: provenance.formula,
          resultKgCO2e: provenance.result_kgco2e,
          uncertaintyPct: provenance.uncertainty_pct,
        },
        quelleVersion: {
          engineVersion: provenance.engine_version,
          methodologyVersion: provenance.methodology_version,
          factorPackVersion: provenance.factor_pack_version,
          factorVersionNumber: provenance.factor_version_number,
          gwpSet: provenance.gwp_set,
          sourceDataset: provenance.source_dataset,
          factorSourceOrg: provenance.factor_source_org,
          factorLicense: provenance.factor_license,
          factorChecksum:
            provenance.factor_checksum ?? provenance.factor_row_checksum,
          runInputHash: provenance.input_hash,
          runResultHash: provenance.result_hash,
        },
        quiAValide: {
          evidenceStatus: provenance.validation_status,
          validatedBy: provenance.validated_by_name ?? provenance.validated_by_email,
          validatedAt: provenance.validated_at,
          runPublishStatus: provenance.publish_status,
          runPublishedAt: provenance.published_at,
        },
      };

      return {
        lineId,
        runId: provenance.run_id,
        scope: provenance.scope,
        lineKey: provenance.line_key,
        proofId: `proof_${lineId.replace(/-/g, "").slice(0, 12)}`,
        sixQuestions,
        raw: provenance,
      };
    },
  );
}
