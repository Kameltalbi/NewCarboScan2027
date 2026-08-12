import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createImportBatch,
  stageEntityRows,
  processImportBatch,
  getImportBatch,
  listImportCatalog,
} from "../services/importPipeline.js";
import { pool } from "../db.js";

const stageSchema = z.object({
  entityType: z.string().min(1).max(100),
  rows: z
    .array(
      z.object({
        legacyId: z.string().optional().nullable(),
        payload: z.record(z.unknown()),
      }),
    )
    .min(1)
    .max(5000),
});

async function requireImportAccess(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const expected = process.env.IMPORT_ADMIN_TOKEN;
  const headerToken = request.headers["x-import-token"];
  if (expected && typeof headerToken === "string" && headerToken === expected) {
    request.user = {
      id: "00000000-0000-4000-8000-000000000001",
      email: "import-bot@local",
      role: "admin",
    };
    return;
  }

  await request.server.requireAuth(request, reply);
  if (reply.sent) return;
  const role = request.user?.role;
  if (role === "owner" || role === "admin") return;
  return reply.code(403).send({
    error: "Import admin required (owner/admin JWT or X-Import-Token)",
  });
}

export async function registerImportRoutes(app: FastifyInstance) {
  app.get("/v1/import/catalog", async () => ({
    items: await listImportCatalog(),
    note: "Importer les entités dans l'ordre sort_order (dépendances respectées).",
  }));

  app.post(
    "/v1/import/batches",
    { preHandler: [requireImportAccess] },
    async (request, reply) => {
      const body = z
        .object({
          label: z.string().min(1).max(200),
          targetOrganizationId: z.string().uuid().optional(),
          source: z.string().optional(),
        })
        .safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() });
      }
      const batch = await createImportBatch({
        label: body.data.label,
        targetOrganizationId: body.data.targetOrganizationId,
        createdBy:
          request.user?.id === "00000000-0000-4000-8000-000000000001"
            ? undefined
            : request.user?.id,
        source: body.data.source,
      });
      return { batch };
    },
  );

  app.post(
    "/v1/import/batches/:batchId/stage",
    { preHandler: [requireImportAccess] },
    async (request, reply) => {
      const { batchId } = request.params as { batchId: string };
      const parsed = stageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const result = await stageEntityRows(
        batchId,
        parsed.data.entityType,
        parsed.data.rows,
      );
      return { batchId, entityType: parsed.data.entityType, ...result };
    },
  );

  app.post(
    "/v1/import/batches/:batchId/process",
    { preHandler: [requireImportAccess] },
    async (request) => {
      const { batchId } = request.params as { batchId: string };
      const limit = Number(
        (request.body as { limitPerEntity?: number } | undefined)
          ?.limitPerEntity ?? 5000,
      );
      return processImportBatch(batchId, limit);
    },
  );

  app.get(
    "/v1/import/batches/:batchId",
    { preHandler: [requireImportAccess] },
    async (request, reply) => {
      const { batchId } = request.params as { batchId: string };
      const data = await getImportBatch(batchId);
      if (!data) return reply.code(404).send({ error: "Batch not found" });
      return data;
    },
  );

  app.get(
    "/v1/import/org-coverage",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT * FROM v_import_org_coverage WHERE organization_id = $1`,
        [orgId],
      );
      return { coverage: rows[0] ?? null };
    },
  );
}
