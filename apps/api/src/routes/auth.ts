import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { changePasswordSchema, loginSchema, patchProfileSchema } from "../schemas/index.js";
import { registerSchema } from "../schemas/public.js";
import { signToken } from "../plugins/auth.js";

type MembershipRow = {
  organization_id: string;
  role: string;
  name?: string;
  sector?: string | null;
  country?: string | null;
  status?: string;
};

async function loadAuthContext(userId: string) {
  const [platform, memberships] = await Promise.all([
    pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]),
    pool.query(
      `SELECT om.organization_id, om.role::text AS role,
              o.name, o.sector, o.country, o.status
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1
       ORDER BY om.created_at`,
      [userId],
    ),
  ]);
  const isSuperAdmin = platform.rows.some(
    (r: { role: string }) => r.role === "superadmin",
  );
  const platformRole = isSuperAdmin
    ? "superadmin"
    : (platform.rows[0] as { role: string } | undefined)?.role;
  const jwtRole = isSuperAdmin
    ? "superadmin"
    : (memberships.rows[0] as MembershipRow | undefined)?.role;
  return {
    platformRole,
    jwtRole,
    memberships: memberships.rows as MembershipRow[],
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const d = parsed.data;
    const email = d.email.toLowerCase();

    const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);
    if (existing.rows[0]) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(d.password, 12);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const user = await client.query(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ($1,$2,$3) RETURNING id, email, full_name`,
        [email, passwordHash, d.fullName],
      );
      const userId = user.rows[0].id as string;
      const baseSlug = slugify(d.companyName) || "org";
      const slug = `${baseSlug}-${userId.slice(0, 8)}`;
      const org = await client.query(
        `INSERT INTO organizations (name, slug) VALUES ($1,$2) RETURNING id, name, slug`,
        [d.companyName, slug],
      );
      const orgId = org.rows[0].id as string;
      await client.query(
        `INSERT INTO organization_members (organization_id, user_id, role)
         VALUES ($1,$2,'owner')`,
        [orgId, userId],
      );
      await client.query(
        `INSERT INTO profiles (user_id, full_name, company_name)
         VALUES ($1,$2,$3)
         ON CONFLICT (user_id) DO UPDATE
           SET full_name = EXCLUDED.full_name, company_name = EXCLUDED.company_name`,
        [userId, d.fullName, d.companyName],
      );
      await client.query(
        `INSERT INTO contact_requests
          (request_type, email, phone, company_name, full_name, message, payload, user_id, ip)
         VALUES ('signup',$1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          email,
          d.phone ?? null,
          d.companyName,
          d.fullName,
          d.sector ? `Inscription — secteur ${d.sector}` : "Inscription",
          JSON.stringify({ sector: d.sector ?? null }),
          userId,
          request.ip,
        ],
      );
      await client.query("COMMIT");

      const token = signToken({
        id: userId,
        email,
        organizationId: orgId,
        role: "owner",
      });

      return {
        token,
        user: { id: userId, email, fullName: d.fullName },
        organizations: [{ organization_id: orgId, role: "owner" }],
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const ip = request.ip;

    const { rows } = await pool.query(
      `SELECT id, email, password_hash, is_active, full_name FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    const user = rows[0];
    const ok =
      user &&
      user.is_active &&
      (await bcrypt.compare(password, user.password_hash));

    await pool.query(
      `INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, $3)`,
      [email.toLowerCase(), ip, Boolean(ok)],
    );

    if (!ok) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const ctx = await loadAuthContext(user.id);

    const token = signToken({
      id: user.id,
      email: user.email,
      organizationId: ctx.memberships[0]?.organization_id,
      role: ctx.jwtRole,
      platformRole: ctx.platformRole,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: ctx.jwtRole,
        platformRole: ctx.platformRole,
        organizationId: ctx.memberships[0]?.organization_id,
      },
      organizations: ctx.memberships,
    };
  });

  app.get(
    "/auth/me",
    { preHandler: [app.requireAuth] },
    async (request) => {
      const ctx = await loadAuthContext(request.user!.id);
      const { rows } = await pool.query(
        `SELECT full_name FROM users WHERE id = $1`,
        [request.user!.id],
      );
      return {
        user: {
          id: request.user!.id,
          email: request.user!.email,
          fullName: rows[0]?.full_name ?? null,
          role: ctx.jwtRole,
          platformRole: ctx.platformRole,
          organizationId:
            request.user!.organizationId ?? ctx.memberships[0]?.organization_id,
        },
        organizations: ctx.memberships,
      };
    },
  );

  app.patch(
    "/auth/me",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const parsed = patchProfileSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      if (parsed.data.fullName) {
        await pool.query(
          `UPDATE users SET full_name = $2, updated_at = now() WHERE id = $1`,
          [userId, parsed.data.fullName],
        );
      }
      await pool.query(
        `INSERT INTO profiles (user_id, full_name, company_name, phone, sector)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (user_id) DO UPDATE SET
           full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
           company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
           phone = COALESCE(EXCLUDED.phone, profiles.phone),
           sector = COALESCE(EXCLUDED.sector, profiles.sector),
           updated_at = now()`,
        [
          userId,
          parsed.data.fullName ?? null,
          parsed.data.companyName ?? null,
          parsed.data.phone ?? null,
          parsed.data.sector ?? null,
        ],
      );
      const { rows } = await pool.query(
        `SELECT u.id, u.email, u.full_name,
                p.company_name, p.phone, p.sector
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.id = $1`,
        [userId],
      );
      return { user: rows[0] };
    },
  );

  app.post(
    "/auth/password",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const parsed = changePasswordSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const { rows } = await pool.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [request.user!.id],
      );
      const ok =
        rows[0] &&
        (await bcrypt.compare(parsed.data.currentPassword, rows[0].password_hash));
      if (!ok) {
        return reply.code(400).send({ error: "Mot de passe actuel incorrect" });
      }
      const hash = await bcrypt.hash(parsed.data.newPassword, 12);
      await pool.query(
        `UPDATE users
         SET password_hash = $2, must_reset_password = false, updated_at = now()
         WHERE id = $1`,
        [request.user!.id, hash],
      );
      return { ok: true };
    },
  );
}
