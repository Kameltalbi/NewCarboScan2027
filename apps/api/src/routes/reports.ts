import type { FastifyInstance } from "fastify";
import {
  buildFactualReportCommentary,
  assertEveryNumberInTextExistsInStructuredFacts,
  assertNoInventedClimateClaims,
  type CalculationResult,
} from "@newcarboscan/carbon-engine";
import { withOrgClient } from "../db.js";
import { reportFromRunSchema } from "../schemas/index.js";
import { clientSafeError } from "../lib/safeError.js";

/**
 * Remplace generate-carbon-report (P0).
 * Aucune invention de trajectoire / ROI / incertitude globale.
 */
export async function registerReportRoutes(app: FastifyInstance) {
  app.post(
    "/v1/reports/from-run",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const parsed = reportFromRunSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const orgId = request.user!.organizationId!;

      try {
        const report = await withOrgClient(orgId, async (client) => {
          const run = await client.query(
            `SELECT * FROM calculation_runs
             WHERE id = $1 AND organization_id = $2`,
            [parsed.data.runId, orgId],
          );
          if (!run.rows[0]) {
            reply.code(404);
            return null;
          }

          const lines = await client.query(
            `SELECT * FROM calculation_ledger
             WHERE run_id = $1 AND organization_id = $2
             ORDER BY line_key`,
            [parsed.data.runId, orgId],
          );

          const lineAccountingClass = (
            row: (typeof lines.rows)[number],
          ): "scope" | "biogenic_co2" => {
            const prov = row.provenance as
              | { accountingClass?: string; biogenicCo2?: boolean }
              | null
              | undefined;
            if (
              prov?.accountingClass === "biogenic_co2" ||
              prov?.biogenicCo2 === true
            ) {
              return "biogenic_co2";
            }
            return "scope";
          };

          const totals = lines.rows.reduce(
            (
              acc: {
                scope1: number;
                scope2: number;
                scope3: number;
                total: number;
                biogenicCo2: number;
              },
              row,
            ) => {
              const v = Number(row.result_kgco2e);
              if (lineAccountingClass(row) === "biogenic_co2") {
                acc.biogenicCo2 += v;
                return acc;
              }
              if (row.scope === 1) acc.scope1 += v;
              if (row.scope === 2) acc.scope2 += v;
              if (row.scope === 3) acc.scope3 += v;
              acc.total += v;
              return acc;
            },
            { scope1: 0, scope2: 0, scope3: 0, total: 0, biogenicCo2: 0 },
          );

          const methodologyVersion =
            run.rows[0].methodology_version ?? "ghg-corporate-1.0.0";
          const factual: CalculationResult = {
            engineVersion: run.rows[0].engine_version,
            methodologyVersion,
            lines: lines.rows.map((r) => ({
              lineKey: r.line_key,
              scope: r.scope,
              evidenceId: r.evidence_id ?? undefined,
              factorId: r.factor_id,
              formula: r.formula,
              activityQuantity: String(r.activity_quantity),
              activityUnit: r.activity_unit,
              factorValue: String(r.factor_value),
              factorUnit: r.factor_unit,
              allocationFactor: String(r.allocation_factor),
              resultKgCo2e: String(r.result_kgco2e),
              uncertaintyPct: r.uncertainty_pct
                ? String(r.uncertainty_pct)
                : undefined,
              engineVersion: r.engine_version,
              methodologyVersion: r.methodology_version ?? methodologyVersion,
              accountingClass: lineAccountingClass(r),
            })),
            totals: {
              scope1: String(totals.scope1),
              scope2: String(totals.scope2),
              scope3: String(totals.scope3),
              total: String(totals.total),
              biogenicCo2: String(totals.biogenicCo2),
            },
            inputHash: run.rows[0].input_hash,
            resultHash: run.rows[0].result_hash,
          };

          const commentary = buildFactualReportCommentary(factual);
          const joined = Object.values(commentary).join(" ");
          const banned = assertNoInventedClimateClaims(joined);
          if (!banned.ok) {
            throw new Error(
              `Invented climate claims blocked: ${banned.matches.join(", ")}`,
            );
          }
          const numbersCheck = assertEveryNumberInTextExistsInStructuredFacts(
            commentary.resultats,
            [
              factual.totals.total,
              factual.totals.scope1,
              factual.totals.scope2,
              factual.totals.scope3,
            ],
          );
          if (!numbersCheck.ok) {
            throw new Error(
              `Unsourced numbers in report: ${numbersCheck.unknownNumbers.join(", ")}`,
            );
          }

          const inserted = await client.query(
            `INSERT INTO reports
              (organization_id, run_id, title, structured_content, ai_commentary, created_by)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING id, created_at`,
            [
              orgId,
              parsed.data.runId,
              parsed.data.title,
              JSON.stringify({
                totals: factual.totals,
                engineVersion: factual.engineVersion,
                methodologyVersion: factual.methodologyVersion,
                resultHash: factual.resultHash,
                lineCount: factual.lines.length,
                factsAsserted: true,
              }),
              JSON.stringify(commentary),
              request.user!.id,
            ],
          );

          for (const line of lines.rows) {
            await client.query(
              `INSERT INTO report_line_links (report_id, ledger_line_id, section_key)
               VALUES ($1,$2,'resultats')
               ON CONFLICT DO NOTHING`,
              [inserted.rows[0].id, line.id],
            );
          }

          await client.query(
            `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
             VALUES ($1,$2,'report.from_run','report',$3,$4,$5)`,
            [
              orgId,
              request.user!.id,
              inserted.rows[0].id,
              request.ip,
              JSON.stringify({ runId: parsed.data.runId, factsAsserted: true }),
            ],
          );

          return {
            id: inserted.rows[0].id,
            createdAt: inserted.rows[0].created_at,
            structuredContent: {
              totals: factual.totals,
              engineVersion: factual.engineVersion,
              resultHash: factual.resultHash,
            },
            aiCommentary: commentary,
          };
        });

        if (!report) {
          return reply.send({ error: "Run not found for organization" });
        }
        return { report };
      } catch (err) {
        return reply.code(400).send({
          error: clientSafeError(err, "Report generation failed"),
        });
      }
    },
  );
}
