import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import {
  createApiKeySchema,
  orgIdParamSchema,
  permissionOverrideSchema,
} from "../schemas/index.js";

function mapApiKey(row: Record<string, unknown>) {
  const raw = (row.raw_legacy as Record<string, unknown> | null) ?? {};
  return {
    id: row.id,
    name: row.name,
    app_name: row.app_name ?? row.name,
    key_prefix: row.key_prefix,
    scopes: row.scopes ?? [],
    env: raw.env ?? "live",
    is_active: row.is_active !== false && !row.revoked_at,
    revoked_at: row.revoked_at,
    last_used_at: row.last_used_at,
    created_at: row.created_at,
  };
}

export async function registerOrgSettingsRoutes(app: FastifyInstance) {
  app.get(
    "/v1/org/members/:id/permissions",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid user id" });
      }
      const { rows } = await pool.query(
        `SELECT id, permission_key, allowed
         FROM user_permission_overrides
         WHERE organization_id = $1 AND user_id = $2`,
        [request.user!.organizationId, params.data.id],
      );
      return {
        items: rows.map((row) => ({
          id: row.id,
          permission_key: row.permission_key,
          granted: row.allowed,
          allowed: row.allowed,
        })),
      };
    },
  );

  app.put(
    "/v1/org/members/:id/permissions",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const body = permissionOverrideSchema.safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid permission override" });
      }
      const orgId = request.user!.organizationId!;
      const userId = params.data.id;
      const { permissionKey, allowed } = body.data;

      if (allowed === null) {
        await pool.query(
          `DELETE FROM user_permission_overrides
           WHERE organization_id = $1 AND user_id = $2 AND permission_key = $3`,
          [orgId, userId, permissionKey],
        );
        return { ok: true, removed: true };
      }

      const updated = await pool.query(
        `UPDATE user_permission_overrides
         SET allowed = $4
         WHERE organization_id = $1 AND user_id = $2 AND permission_key = $3
         RETURNING id, permission_key, allowed`,
        [orgId, userId, permissionKey, allowed],
      );
      const row = updated.rows[0]
        ? updated.rows[0]
        : (
            await pool.query(
              `INSERT INTO user_permission_overrides
                 (organization_id, user_id, permission_key, allowed)
               VALUES ($1,$2,$3,$4)
               RETURNING id, permission_key, allowed`,
              [orgId, userId, permissionKey, allowed],
            )
          ).rows[0];
      return {
        item: {
          id: row.id,
          permission_key: row.permission_key,
          granted: row.allowed,
          allowed: row.allowed,
        },
      };
    },
  );

  app.get(
    "/v1/org/api-keys",
    { preHandler: [app.requireOrgAdmin] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT id, name, app_name, key_prefix, scopes, is_active,
                revoked_at, last_used_at, created_at, raw_legacy
         FROM api_keys
         WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows.map(mapApiKey) };
    },
  );

  app.post(
    "/v1/org/api-keys",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const parsed = createApiKeySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const name = d.name || d.appName || d.app_name;
      if (!name) {
        return reply.code(400).send({ error: "Le nom de l'application est requis" });
      }
      const plaintext = `ncs_${randomBytes(24).toString("base64url")}`;
      const keyHash = createHash("sha256").update(plaintext).digest("hex");
      const prefix = plaintext.slice(0, 12);
      const { rows } = await pool.query(
        `INSERT INTO api_keys
           (organization_id, name, app_name, key_hash, key_prefix, scopes,
            created_by, is_active, raw_legacy)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8::jsonb)
         RETURNING id, name, app_name, key_prefix, scopes, is_active,
                   revoked_at, last_used_at, created_at, raw_legacy`,
        [
          request.user!.organizationId,
          name,
          name,
          keyHash,
          prefix,
          d.scopes ?? ["read:activity"],
          request.user!.id,
          JSON.stringify({ env: d.env ?? "live" }),
        ],
      );
      return {
        item: mapApiKey(rows[0]),
        key: plaintext,
      };
    },
  );

  app.delete(
    "/v1/org/api-keys/:id",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      const { rowCount } = await pool.query(
        `UPDATE api_keys
         SET revoked_at = now(), is_active = false
         WHERE id = $1 AND organization_id = $2 AND revoked_at IS NULL`,
        [params.data.id, request.user!.organizationId],
      );
      if (!rowCount) {
        return reply.code(404).send({ error: "Clé introuvable" });
      }
      return { ok: true };
    },
  );

  app.get(
    "/v1/org/api-logs",
    { preHandler: [app.requireOrgAdmin] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT id, endpoint, method, status, duration_ms, created_at, api_key_id
         FROM api_request_logs
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );
}
