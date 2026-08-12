import type { FastifyInstance } from "fastify";
import { withOrgClient } from "../db.js";

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get(
    "/v1/audit-events",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      return withOrgClient(orgId, async (client) => {
        const { rows } = await client.query(
          `SELECT id, action, resource_type, resource_id, created_at, payload
           FROM audit_events
           WHERE organization_id = $1
           ORDER BY created_at DESC
           LIMIT 100`,
          [orgId],
        );
        return { items: rows };
      });
    },
  );
}
