import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { clientSafeError } from "../lib/safeError.js";
import {
  adminModuleToggleSchema,
  adminPlanSchema,
  adminQuotaSchema,
  adminYearSchema,
  deleteOrgSchema,
  orgIdParamSchema,
  patchUserSchema,
  setUserPasswordSchema,
  suspendOrgSchema,
} from "../schemas/index.js";
import bcrypt from "bcryptjs";

const ORG_LIST_SQL = `
  SELECT
    o.id,
    o.name,
    o.slug,
    o.sector,
    o.country,
    o.status,
    o.subscription_plan,
    o.subscription_status,
    o.created_at,
    o.updated_at,
    o.suspended_at,
    o.suspended_reason,
    o.user_id,
    COALESCE(owner.user_id, o.user_id) AS owner_id,
    u.email AS owner_email,
    u.full_name AS owner_name,
    (
      SELECT count(*)::int
      FROM organization_members om2
      WHERE om2.organization_id = o.id
    ) AS member_count
  FROM organizations o
  LEFT JOIN LATERAL (
    SELECT om.user_id
    FROM organization_members om
    WHERE om.organization_id = o.id AND om.role = 'owner'
    ORDER BY om.created_at
    LIMIT 1
  ) owner ON true
  LEFT JOIN users u ON u.id = COALESCE(owner.user_id, o.user_id)
  ORDER BY o.created_at DESC
`;

function mapOrgRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sector: row.sector,
    country: row.country,
    status: row.status,
    subscriptionPlan: row.subscription_plan,
    subscriptionStatus: row.subscription_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    suspendedAt: row.suspended_at,
    suspendedReason: row.suspended_reason,
    memberCount: row.member_count,
    owner: row.owner_id
      ? {
          id: row.owner_id,
          email: row.owner_email,
          fullName: row.owner_name,
        }
      : null,
  };
}

async function writeAudit(
  organizationId: string | null,
  userId: string,
  action: string,
  resourceId: string,
  ip: string | undefined,
  payload: Record<string, unknown>,
) {
  await pool.query(
    `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
     VALUES ($1,$2,$3,'organization',$4,$5,$6)`,
    [organizationId, userId, action, resourceId, ip ?? null, JSON.stringify(payload)],
  );
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get(
    "/v1/admin/organizations",
    { preHandler: [app.requireSuperAdmin] },
    async () => {
      const { rows } = await pool.query(ORG_LIST_SQL);
      return { items: rows.map(mapOrgRow) };
    },
  );

  app.post(
    "/v1/admin/organizations/:id/suspend",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid organization id" });
      }
      const body = suspendOrgSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() });
      }

      const { rows } = await pool.query(
        `UPDATE organizations
         SET status = 'suspended',
             suspended_at = now(),
             suspended_by = $2,
             suspended_reason = $3,
             updated_at = now()
         WHERE id = $1
         RETURNING id, name, status, suspended_at, suspended_reason`,
        [params.data.id, request.user!.id, body.data.reason ?? null],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Organization not found" });
      }

      await writeAudit(
        params.data.id,
        request.user!.id,
        "org.suspend",
        params.data.id,
        request.ip,
        { reason: body.data.reason ?? null, name: rows[0].name },
      );

      return { organization: rows[0] };
    },
  );

  app.post(
    "/v1/admin/organizations/:id/activate",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid organization id" });
      }

      const { rows } = await pool.query(
        `UPDATE organizations
         SET status = 'active',
             suspended_at = NULL,
             suspended_by = NULL,
             suspended_reason = NULL,
             updated_at = now()
         WHERE id = $1
         RETURNING id, name, status`,
        [params.data.id],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Organization not found" });
      }

      await writeAudit(
        params.data.id,
        request.user!.id,
        "org.activate",
        params.data.id,
        request.ip,
        { name: rows[0].name },
      );

      return { organization: rows[0] };
    },
  );

  app.delete(
    "/v1/admin/organizations/:id",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid organization id" });
      }
      const body = deleteOrgSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() });
      }

      const existing = await pool.query(
        `SELECT id, name FROM organizations WHERE id = $1`,
        [params.data.id],
      );
      const org = existing.rows[0] as { id: string; name: string } | undefined;
      if (!org) {
        return reply.code(404).send({ error: "Organization not found" });
      }
      if (org.name.trim() !== body.data.confirmName.trim()) {
        return reply.code(400).send({
          error: "Le nom saisi ne correspond pas à l'organisation",
        });
      }

      await writeAudit(null, request.user!.id, "org.delete", org.id, request.ip, {
        name: org.name,
      });

      await pool.query(`DELETE FROM organizations WHERE id = $1`, [org.id]);

      return { ok: true, id: org.id, name: org.name };
    },
  );

  app.get(
    "/v1/admin/users",
    { preHandler: [app.requireSuperAdmin] },
    async () => {
      const { rows } = await pool.query(`
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.is_active,
          u.created_at,
          (
            SELECT ur.role FROM user_roles ur
            WHERE ur.user_id = u.id
            ORDER BY CASE ur.role
              WHEN 'superadmin' THEN 0
              WHEN 'admin' THEN 1
              WHEN 'financeur' THEN 2
              ELSE 3
            END
            LIMIT 1
          ) AS platform_role,
          (
            SELECT om.role::text FROM organization_members om
            WHERE om.user_id = u.id
            ORDER BY CASE om.role
              WHEN 'owner' THEN 0
              WHEN 'admin' THEN 1
              ELSE 2
            END
            LIMIT 1
          ) AS org_role,
          (
            SELECT o.name FROM organization_members om
            JOIN organizations o ON o.id = om.organization_id
            WHERE om.user_id = u.id
            ORDER BY om.created_at
            LIMIT 1
          ) AS org_name,
          (
            SELECT o.subscription_plan FROM organization_members om
            JOIN organizations o ON o.id = om.organization_id
            WHERE om.user_id = u.id
            ORDER BY om.created_at
            LIMIT 1
          ) AS subscription_plan,
          (
            SELECT la.created_at FROM login_attempts la
            WHERE lower(la.email::text) = lower(u.email::text)
              AND la.success = true
            ORDER BY la.created_at DESC
            LIMIT 1
          ) AS last_sign_in_at
        FROM users u
        ORDER BY u.created_at DESC
      `);

      return {
        items: rows.map((row) => {
          const platformRole = row.platform_role as string | null;
          const orgRole = row.org_role as string | null;
          let role = "user";
          if (platformRole === "superadmin") role = "superadmin";
          else if (platformRole === "admin" || orgRole === "owner" || orgRole === "admin") {
            role = "admin";
          } else if (platformRole === "financeur" || orgRole === "financeur") {
            role = "financeur";
          }
          return {
            id: row.id,
            email: row.email,
            fullName: row.full_name,
            role,
            status: row.is_active ? "active" : "blocked",
            organizationName: row.org_name,
            subscriptionPlan: row.subscription_plan,
            createdAt: row.created_at,
            lastSignInAt: row.last_sign_in_at,
          };
        }),
      };
    },
  );

  app.patch(
    "/v1/admin/users/:id",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid user id" });
      }
      const body = patchUserSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() });
      }
      if (params.data.id === request.user!.id && body.data.isActive === false) {
        return reply.code(400).send({ error: "Impossible de bloquer votre propre compte" });
      }

      if (body.data.isActive !== undefined) {
        const { rowCount } = await pool.query(
          `UPDATE users SET is_active = $2, updated_at = now() WHERE id = $1`,
          [params.data.id, body.data.isActive],
        );
        if (!rowCount) {
          return reply.code(404).send({ error: "User not found" });
        }
      }

      if (body.data.role) {
        await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [
          params.data.id,
        ]);
        if (body.data.role !== "user") {
          await pool.query(
            `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`,
            [params.data.id, body.data.role],
          );
        }
      }

      await writeAudit(null, request.user!.id, "user.patch", params.data.id, request.ip, {
        ...body.data,
      });
      return { ok: true, id: params.data.id };
    },
  );

  app.post(
    "/v1/admin/users/:id/password",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid user id" });
      }
      const body = setUserPasswordSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.code(400).send({ error: body.error.flatten() });
      }
      const hash = await bcrypt.hash(body.data.password, 12);
      const { rowCount } = await pool.query(
        `UPDATE users
         SET password_hash = $2, must_reset_password = false, updated_at = now()
         WHERE id = $1`,
        [params.data.id, hash],
      );
      if (!rowCount) {
        return reply.code(404).send({ error: "User not found" });
      }
      await writeAudit(null, request.user!.id, "user.password", params.data.id, request.ip, {});
      return { ok: true };
    },
  );

  app.delete(
    "/v1/admin/users/:id",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid user id" });
      }
      if (params.data.id === request.user!.id) {
        return reply.code(400).send({ error: "Impossible de supprimer votre propre compte" });
      }
      const existing = await pool.query(
        `SELECT id, email FROM users WHERE id = $1`,
        [params.data.id],
      );
      if (!existing.rows[0]) {
        return reply.code(404).send({ error: "User not found" });
      }
      await writeAudit(null, request.user!.id, "user.delete", params.data.id, request.ip, {
        email: existing.rows[0].email,
      });
      await pool.query(
        `UPDATE organizations SET user_id = NULL WHERE user_id = $1`,
        [params.data.id],
      );
      await pool.query(
        `UPDATE organizations SET suspended_by = NULL WHERE suspended_by = $1`,
        [params.data.id],
      );
      await pool.query(`DELETE FROM users WHERE id = $1`, [params.data.id]);
      return { ok: true, id: params.data.id };
    },
  );

  app.get(
    "/v1/admin/modules",
    { preHandler: [app.requireSuperAdmin] },
    async () => {
      const { rows } = await pool.query(
        `SELECT id, COALESCE(slug, code) AS slug, name, description, icon, route, category, is_active
         FROM modules
         WHERE COALESCE(is_active, true) IS DISTINCT FROM false
         ORDER BY category NULLS LAST, name`,
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/admin/organizations/:id/modules",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid organization id" });
      }
      const { rows } = await pool.query(
        `SELECT m.id AS module_id,
                COALESCE(m.slug, m.code) AS slug,
                m.name,
                m.description,
                m.icon,
                m.route,
                m.category,
                COALESCE(om.enabled, om.active, false) AS enabled
         FROM modules m
         LEFT JOIN organization_modules om
           ON om.module_id = m.id AND om.organization_id = $1
         WHERE COALESCE(m.is_active, true) IS DISTINCT FROM false
         ORDER BY m.category NULLS LAST, m.name`,
        [params.data.id],
      );
      return { items: rows };
    },
  );

  app.put(
    "/v1/admin/organizations/:id/modules",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const body = adminModuleToggleSchema.safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid module toggle" });
      }
      const mod = await pool.query(
        `SELECT id FROM modules WHERE slug = $1 OR code = $1 LIMIT 1`,
        [body.data.slug],
      );
      if (!mod.rows[0]) {
        return reply.code(404).send({ error: "Module not found" });
      }
      await pool.query(
        `INSERT INTO organization_modules
           (organization_id, module_id, enabled, org_id, active, started_at)
         VALUES ($1,$2,$3,$1,$3, now())
         ON CONFLICT (organization_id, module_id) DO UPDATE
           SET enabled = EXCLUDED.enabled, active = EXCLUDED.active`,
        [params.data.id, mod.rows[0].id, body.data.enabled],
      );
      return { ok: true, slug: body.data.slug, enabled: body.data.enabled };
    },
  );

  app.get(
    "/v1/admin/organizations/:id/years",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid organization id" });
      }
      const { rows } = await pool.query(
        `SELECT id, year, is_included, created_at
         FROM organization_years
         WHERE organization_id = $1
         ORDER BY year`,
        [params.data.id],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/admin/organizations/:id/years",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const body = adminYearSchema.safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid year" });
      }
      try {
        const { rows } = await pool.query(
          `INSERT INTO organization_years (organization_id, year, is_included)
           VALUES ($1,$2,$3)
           ON CONFLICT (organization_id, year) DO UPDATE
             SET is_included = EXCLUDED.is_included
           RETURNING id, year, is_included, created_at`,
          [params.data.id, body.data.year, body.data.isIncluded ?? true],
        );
        return { year: rows[0] };
      } catch (err) {
        return reply.code(400).send({
          error: clientSafeError(err, "Year insert failed"),
        });
      }
    },
  );

  app.patch(
    "/v1/admin/organizations/:id/years/:yearId",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const { id, yearId } = request.params as { id: string; yearId: string };
      const body = adminYearSchema.pick({ isIncluded: true }).safeParse(request.body ?? {});
      if (!body.success) {
        return reply.code(400).send({ error: "Invalid year patch" });
      }
      const { rows } = await pool.query(
        `UPDATE organization_years SET is_included = $3
         WHERE id = $2 AND organization_id = $1
         RETURNING id, year, is_included`,
        [id, yearId, body.data.isIncluded ?? true],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Year not found" });
      }
      return { year: rows[0] };
    },
  );

  app.delete(
    "/v1/admin/organizations/:id/years/:yearId",
    { preHandler: [app.requireSuperAdmin] },
    async (request, _reply) => {
      const { id, yearId } = request.params as { id: string; yearId: string };
      await pool.query(
        `DELETE FROM organization_years WHERE id = $2 AND organization_id = $1`,
        [id, yearId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/admin/organizations/:id/quota",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid organization id" });
      }
      const { rows } = await pool.query(
        `SELECT id, year, tokens_total, tokens_used
         FROM report_quota
         WHERE organization_id = $1
         ORDER BY year DESC`,
        [params.data.id],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/admin/organizations/:id/quota",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const body = adminQuotaSchema.safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid quota" });
      }
      const d = body.data;
      const existing = await pool.query(
        `SELECT id, tokens_total, tokens_used FROM report_quota
         WHERE organization_id = $1 AND year = $2`,
        [params.data.id, d.year],
      );
      let tokensTotal = existing.rows[0]?.tokens_total ?? 20;
      let tokensUsed = existing.rows[0]?.tokens_used ?? 0;
      if (d.tokensTotal != null) tokensTotal = d.tokensTotal;
      if (d.addTokens) tokensTotal += d.addTokens;
      if (d.resetUsed) tokensUsed = 0;
      if (d.tokensUsed != null) tokensUsed = d.tokensUsed;
      const { rows } = await pool.query(
        `INSERT INTO report_quota (organization_id, year, tokens_total, tokens_used)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (organization_id, year) DO UPDATE
           SET tokens_total = EXCLUDED.tokens_total,
               tokens_used = EXCLUDED.tokens_used,
               updated_at = now()
         RETURNING id, year, tokens_total, tokens_used`,
        [params.data.id, d.year, tokensTotal, tokensUsed],
      );
      return { quota: rows[0] };
    },
  );

  app.put(
    "/v1/admin/organizations/:id/plan",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const body = adminPlanSchema.safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid plan" });
      }
      const status = body.data.status ?? "active";
      const { rows } = await pool.query(
        `UPDATE organizations
         SET subscription_plan = $2, subscription_status = $3, updated_at = now()
         WHERE id = $1
         RETURNING id, name, subscription_plan, subscription_status`,
        [params.data.id, body.data.planCode, status],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Organization not found" });
      }
      const owner = await pool.query(
        `SELECT user_id FROM organization_members
         WHERE organization_id = $1 AND role = 'owner'
         ORDER BY created_at LIMIT 1`,
        [params.data.id],
      );
      const ownerId = owner.rows[0]?.user_id as string | undefined;
      if (ownerId) {
        await pool.query(
          `INSERT INTO user_subscriptions (organization_id, user_id, plan_code, status)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT DO NOTHING`,
          [params.data.id, ownerId, body.data.planCode, status],
        );
        await pool.query(
          `UPDATE user_subscriptions
           SET plan_code = $3, status = $4
           WHERE organization_id = $1 OR user_id = $2`,
          [params.data.id, ownerId, body.data.planCode, status],
        );
      }
      return { organization: rows[0] };
    },
  );

  app.get(
    "/v1/admin/security-settings",
    { preHandler: [app.requireSuperAdmin] },
    async () => {
      const { rows } = await pool.query(
        `SELECT value FROM platform_settings WHERE key = 'security'`,
      );
      return { settings: rows[0]?.value ?? {} };
    },
  );

  app.put(
    "/v1/admin/security-settings",
    { preHandler: [app.requireSuperAdmin] },
    async (request) => {
      const body = request.body as Record<string, unknown>;
      const settings = {
        require_mfa: Boolean(body.require_mfa),
        session_timeout_hours: Number(body.session_timeout_hours ?? 8),
        max_login_attempts: Number(body.max_login_attempts ?? 5),
        password_min_length: Number(body.password_min_length ?? 8),
        idle_timeout_minutes: Number(body.idle_timeout_minutes ?? 30),
      };
      await pool.query(
        `INSERT INTO platform_settings (key, value, updated_by, updated_at)
         VALUES ('security', $1::jsonb, $2, now())
         ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [JSON.stringify(settings), request.user!.id],
      );
      return { settings };
    },
  );

  app.post(
    "/v1/admin/retention-run",
    { preHandler: [app.requireSuperAdmin] },
    async () => {
      const { rows } = await pool.query(`SELECT ncs_run_retention() AS result`);
      return { result: rows[0]?.result };
    },
  );
}
