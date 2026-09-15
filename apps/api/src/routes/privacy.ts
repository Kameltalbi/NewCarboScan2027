import type { FastifyInstance } from "fastify";
import { pool, rawPool } from "../db.js";

const IDENT = /^[a-z][a-z0-9_]*$/;

export async function registerPrivacyRoutes(app: FastifyInstance) {
  app.get(
    "/v1/org/data-export",
    { preHandler: [app.requireOrgAdmin] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const tables = await rawPool.query<{ table_name: string }>(
        `SELECT DISTINCT c.table_name
         FROM information_schema.columns c
         JOIN information_schema.tables t
           ON t.table_schema = c.table_schema AND t.table_name = c.table_name
         WHERE c.table_schema = 'public'
           AND c.column_name = 'organization_id'
           AND t.table_type = 'BASE TABLE'
         ORDER BY 1`,
      );
      const dump: Record<string, unknown[]> = {};
      for (const row of tables.rows) {
        const name = row.table_name;
        if (!IDENT.test(name)) continue;
        const { rows } = await pool.query(
          `SELECT * FROM ${name} WHERE organization_id = $1`,
          [orgId],
        );
        dump[name] = rows;
      }
      await pool.query(
        `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
         VALUES ($1,$2,'org.export','organization',$1,$3,'{}')`,
        [orgId, request.user!.id, request.ip],
      );
      return {
        exportedAt: new Date().toISOString(),
        organizationId: orgId,
        tables: dump,
      };
    },
  );

  app.delete(
    "/v1/org/account",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const body = (request.body ?? {}) as { confirm?: string };
      if (body.confirm !== "SUPPRIMER") {
        return reply.code(400).send({ error: 'Confirmation "SUPPRIMER" required' });
      }
      const orgId = request.user!.organizationId!;
      await pool.query(
        `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
         VALUES ($1,$2,'org.self_delete','organization',$1,$3,'{}')`,
        [orgId, request.user!.id, request.ip],
      );
      await pool.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
      return { ok: true };
    },
  );
}
