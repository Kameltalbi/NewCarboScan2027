import type { FastifyInstance } from "fastify";
import {
  calculateCarbonBalance,
  buildFactualReportCommentary,
  ENGINE_VERSION,
  type CalculationInputLine,
} from "@newcarboscan/carbon-engine";
import { withOrgClient } from "../db.js";
import { calculateSchema } from "../schemas/index.js";
import { PRODUCTION_SAFE_FACTOR_SQL } from "../services/factorResolver/productionSafeSubset.js";

export const REGISTRY_FACTOR_OVERRIDE_ERROR =
  "Registry emission factors cannot override factorValue or factorUnit";

export const UNAVAILABLE_EMISSION_FACTOR_ERROR =
  "Invalid or unavailable emission factor";

/**
 * Direct UUID calculation is restricted to Core TN (internal).
 * ADEME/UK/EPA must never become calculable via /v1/calculate merely because
 * their version calculation_status is enabled — use resolve-and-calculate.
 * Version enablement still cannot load factors outside PRODUCTION_SAFE_FACTOR_SQL.
 */
export const DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR =
  "Direct calculation is restricted to Core TN (internal) factors; use POST /v1/factors/resolve-and-calculate for other sources";

/** Sources allowed on legacy/direct POST /v1/calculate (factorId path). */
export const DIRECT_CALCULATE_ALLOWED_SOURCE_KEYS = ["internal"] as const;

type FactorMeta = {
  versionId: string;
  checksum: string | null;
  stableFactorId: string | null;
  externalCode: string | null;
  sourceKey: string | null;
  datasetVersion: string | null;
};

export async function registerCalculateRoutes(app: FastifyInstance) {
  app.post(
    "/v1/calculate",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = calculateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const orgId = request.user!.organizationId!;
      const lines: CalculationInputLine[] = [];
      const factorMeta = new Map<string, FactorMeta>();

      try {
        await withOrgClient(orgId, async (client) => {
          for (const line of parsed.data.lines) {
            if (line.evidenceId) {
              const ev = await client.query(
                `SELECT id FROM evidence_records
                 WHERE id = $1 AND organization_id = $2`,
                [line.evidenceId, orgId],
              );
              if (!ev.rows[0]) {
                throw new Error(`Evidence not found: ${line.evidenceId}`);
              }
            }

            if (line.factorValue !== undefined || line.factorUnit !== undefined) {
              throw new Error(REGISTRY_FACTOR_OVERRIDE_ERROR);
            }

            // Central safe-subset gate: enabling EPA/ADEME/UK versions never
            // exposes REVIEW/GWP/components (or out-of-subset rows) by UUID.
            const factor = await client.query(
              `SELECT f.id, f.value::text AS value,
                      f.unit_numerator,
                      f.unit_denominator,
                      (f.unit_numerator || '/' || f.unit_denominator) AS unit,
                      f.uncertainty_pct::text AS uncertainty_pct,
                      f.checksum, f.version_id,
                      f.stable_factor_id, f.external_code,
                      v.dataset_version,
                      s.source_key
               FROM emission_factors f
               JOIN emission_factor_versions v ON v.id = f.version_id
               JOIN factor_sources s ON s.id = v.source_id
               WHERE f.id = $1
                 AND f.status = 'approved'
                 AND v.status = 'approved'
                 AND v.calculation_status = 'enabled'
                 AND ${PRODUCTION_SAFE_FACTOR_SQL}`,
              [line.factorId],
            );
            if (!factor.rows[0]) {
              throw new Error(UNAVAILABLE_EMISSION_FACTOR_ERROR);
            }

            const f = factor.rows[0];
            // Harden: non-internal cannot bypass Resolver via direct UUID.
            if (f.source_key !== "internal") {
              throw new Error(DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);
            }

            factorMeta.set(line.factorId, {
              versionId: f.version_id,
              checksum: f.checksum,
              stableFactorId: f.stable_factor_id,
              externalCode: f.external_code,
              sourceKey: f.source_key,
              datasetVersion: f.dataset_version,
            });

            lines.push({
              lineKey: line.lineKey,
              scope: line.scope,
              evidenceId: line.evidenceId,
              factorId: line.factorId,
              activityQuantity: line.activityQuantity,
              activityUnit: line.activityUnit,
              factorValue: f.value,
              factorUnit: f.unit,
              allocationFactor: line.allocationFactor,
              uncertaintyPct: line.uncertaintyPct,
              activityUncertaintyPct: line.activityUncertaintyPct,
              factorUncertaintyPct: f.uncertainty_pct ?? undefined,
              formula: line.formula,
            });
          }
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Invalid calculation input";
        return reply.code(400).send({ error: message });
      }

      const result = calculateCarbonBalance(lines, "ghg-corporate-1.0.0");

      const runId = await withOrgClient(orgId, async (client) => {
        const run = await client.query(
          `INSERT INTO calculation_runs
            (organization_id, engine_version, methodology_version, method,
             period_start, period_end, input_hash, result_hash, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING id`,
          [
            orgId,
            ENGINE_VERSION,
            result.methodologyVersion,
            parsed.data.method,
            parsed.data.periodStart ?? null,
            parsed.data.periodEnd ?? null,
            result.inputHash,
            result.resultHash,
            request.user!.id,
          ],
        );
        const id = run.rows[0].id as string;

        for (const line of result.lines) {
          const meta = factorMeta.get(line.factorId);
          await client.query(
            `INSERT INTO calculation_ledger
              (run_id, organization_id, line_key, scope, evidence_id, factor_id,
               factor_version_id, factor_checksum, formula,
               activity_quantity, activity_unit, factor_value, factor_unit, allocation_factor,
               result_kgco2e, uncertainty_pct, engine_version, methodology_version, provenance)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
            [
              id,
              orgId,
              line.lineKey,
              line.scope,
              line.evidenceId ?? null,
              line.factorId,
              meta?.versionId ?? null,
              meta?.checksum ?? null,
              line.formula,
              line.activityQuantity,
              line.activityUnit,
              line.factorValue,
              line.factorUnit,
              line.allocationFactor,
              line.resultKgCo2e,
              line.uncertaintyPct ?? null,
              line.engineVersion,
              line.methodologyVersion,
              JSON.stringify({
                source: "api/v1/calculate",
                factorResolvedFromDb: true,
                stableFactorId: meta?.stableFactorId ?? null,
                externalCode: meta?.externalCode ?? null,
                sourceKey: meta?.sourceKey ?? null,
                datasetVersion: meta?.datasetVersion ?? null,
                clientOverride: false,
              }),
            ],
          );
        }

        await client.query(
          `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
           VALUES ($1,$2,'calculate','calculation_run',$3,$4,$5)`,
          [
            orgId,
            request.user!.id,
            id,
            request.ip,
            JSON.stringify({
              method: parsed.data.method,
              lineCount: result.lines.length,
              resultHash: result.resultHash,
            }),
          ],
        );

        return id;
      });

      return {
        runId,
        engineVersion: ENGINE_VERSION,
        methodologyVersion: result.methodologyVersion,
        totals: result.totals,
        inputHash: result.inputHash,
        resultHash: result.resultHash,
        commentary: buildFactualReportCommentary(result),
        lines: result.lines,
      };
    },
  );
}
