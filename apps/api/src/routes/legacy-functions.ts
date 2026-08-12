import type { FastifyInstance, FastifyRequest } from "fastify";
import { pool } from "../db.js";

/**
 * Cartographie Edge Functions CarboScan → API PostgreSQL.
 * P0 : aucune route sensible n'est anonyme (ex-verify_jwt=false).
 * Les stubs renvoient 501 + journal d'audit ; les remplacements sont :
 *   generate-carbon-report → POST /v1/reports/from-run
 *   calculate → POST /v1/calculate
 */

const CRITICAL_LEGACY = new Set([
  "generate-carbon-report",
  "generate-report-chunk",
  "estimate-action-impact",
  "ocr-extract",
  "invoice-carbon",
  "wattbim-ingest",
]);

const PROTECTED_LEGACY_ROUTES: Array<{
  method: "GET" | "POST";
  path: string;
  legacy: string;
  note: string;
}> = [
  { method: "POST", path: "/v1/functions/ocr-extract", legacy: "ocr-extract", note: "OCR → evidence draft only (never auto-validated)" },
  { method: "POST", path: "/v1/functions/generate-carbon-report", legacy: "generate-carbon-report", note: "Remplacé par POST /v1/reports/from-run (faits ledger uniquement)" },
  { method: "POST", path: "/v1/functions/estimate-action-impact", legacy: "estimate-action-impact", note: "Estimations uniquement si sourcées ledger — stub 501" },
  { method: "POST", path: "/v1/functions/generate-report-chunk", legacy: "generate-report-chunk", note: "IA reformule faits ; assertFacts obligatoire — stub 501" },
  { method: "POST", path: "/v1/functions/generate-report-pro", legacy: "generate-report-pro", note: "Auth required" },
  { method: "POST", path: "/v1/functions/invoice-carbon", legacy: "invoice-carbon", note: "Evidence origin=invoice_ocr, status=draft" },
  { method: "POST", path: "/v1/functions/calculate", legacy: "calculate", note: "Remplacé par POST /v1/calculate" },
  { method: "POST", path: "/v1/functions/cbam-calc", legacy: "cbam-calc", note: "Hors noyau tant que non branché carbon-engine" },
  { method: "POST", path: "/v1/functions/pcf-calculate", legacy: "pcf-calculate", note: "Hors noyau" },
  { method: "POST", path: "/v1/functions/recalculate-bilans", legacy: "recalculate-bilans", note: "Org-scoped" },
  { method: "POST", path: "/v1/functions/recalculate-on-activity-change", legacy: "recalculate-on-activity-change", note: "Org-scoped" },
  { method: "POST", path: "/v1/functions/emission-factors", legacy: "emission-factors", note: "Use GET /v1/factors" },
  { method: "POST", path: "/v1/functions/import-ademe-factors", legacy: "import-ademe-factors", note: "Admin + versioned import" },
  { method: "POST", path: "/v1/functions/collect-api", legacy: "collect-api", note: "Collect module API" },
  { method: "POST", path: "/v1/functions/chatbot-ai", legacy: "chatbot-ai", note: "Auth + quota ; aucun chiffre inventé" },
  { method: "POST", path: "/v1/functions/generate-estimations", legacy: "generate-estimations", note: "origin=estimated" },
  { method: "POST", path: "/v1/functions/create-user", legacy: "create-user", note: "Admin only" },
  { method: "POST", path: "/v1/functions/create-org-user", legacy: "create-org-user", note: "Org admin" },
  { method: "POST", path: "/v1/functions/create-organization-admin", legacy: "create-organization-admin", note: "Superadmin" },
  { method: "POST", path: "/v1/functions/create-periodic-sessions", legacy: "create-periodic-sessions", note: "Org-scoped" },
  { method: "GET", path: "/v1/functions/get-users", legacy: "get-users", note: "Org admin" },
  { method: "POST", path: "/v1/functions/update-user-password", legacy: "update-user-password", note: "Self or admin" },
  { method: "POST", path: "/v1/functions/track-login-attempt", legacy: "track-login-attempt", note: "Prefer /auth/login" },
  { method: "POST", path: "/v1/functions/notify-pricing-request", legacy: "notify-pricing-request", note: "Public lead — rate-limited" },
  { method: "POST", path: "/v1/functions/send-demo-request", legacy: "send-demo-request", note: "Public lead — rate-limited" },
  { method: "POST", path: "/v1/functions/send-guide-email", legacy: "send-guide-email", note: "Auth required" },
  { method: "POST", path: "/v1/functions/send-collect-notifications", legacy: "send-collect-notifications", note: "Org-scoped" },
  { method: "POST", path: "/v1/functions/send-chatbot-lead-notification", legacy: "send-chatbot-lead-notification", note: "Rate-limited" },
  { method: "POST", path: "/v1/functions/cbam-generate-excel", legacy: "cbam-generate-excel", note: "From ledger only" },
  { method: "POST", path: "/v1/functions/cbam-generate-pdf", legacy: "cbam-generate-pdf", note: "From ledger only" },
  { method: "POST", path: "/v1/functions/wattbim-ingest", legacy: "wattbim-ingest", note: "API key + org — stub 501" },
  { method: "POST", path: "/v1/functions/api-keys", legacy: "api-keys", note: "Org admin" },
];

async function auditBlockedCall(
  request: FastifyRequest,
  legacy: string,
  critical: boolean,
) {
  try {
    await pool.query(
      `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
       VALUES ($1,$2,$3,'legacy_function',$4,$5,$6)`,
      [
        request.user?.organizationId ?? null,
        request.user?.id ?? null,
        critical ? "legacy.critical_blocked" : "legacy.stub_blocked",
        legacy,
        request.ip,
        JSON.stringify({
          path: request.url,
          critical,
          policy: "JWT+org required; verify_jwt=false eliminated",
        }),
      ],
    );
  } catch {
    // Ne jamais faire échouer la réponse 501 si l'audit DB est indisponible
  }
}

export async function registerLegacyFunctionStubs(app: FastifyInstance) {
  app.get("/v1/functions", async () => ({
    backend: "postgresql",
    supabase: false,
    verifyJwtFalse: false,
    criticalLocked: [...CRITICAL_LEGACY],
    routes: PROTECTED_LEGACY_ROUTES,
  }));

  for (const route of PROTECTED_LEGACY_ROUTES) {
    const critical = CRITICAL_LEGACY.has(route.legacy);
    const preHandler = [app.requireOrgMember];
    const config = critical
      ? { rateLimit: { max: 20, timeWindow: "1 minute" } }
      : { rateLimit: { max: 60, timeWindow: "1 minute" } };

    const sendStub = async (request: FastifyRequest, reply: import("fastify").FastifyReply) => {
      await auditBlockedCall(request, route.legacy, critical);
      return reply.code(501).send({
        status: 501,
        error: "Not implemented in Newcarboscan-2027 yet",
        legacyFunction: route.legacy,
        critical,
        migrationNote: route.note,
        policy:
          "JWT + organization membership required; CORS restrictive; rate-limited; audited. No anonymous OpenAI spend.",
        replacement:
          route.legacy === "generate-carbon-report" || route.legacy === "generate-report-chunk"
            ? "POST /v1/reports/from-run"
            : route.legacy === "calculate"
              ? "POST /v1/calculate"
              : undefined,
      });
    };

    if (route.method === "GET") {
      app.get(route.path, { preHandler, config }, sendStub);
    } else {
      app.post(route.path, { preHandler, config }, sendStub);
    }
  }
}

export { CRITICAL_LEGACY, PROTECTED_LEGACY_ROUTES };
