import type { FastifyInstance, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { rawPool } from "../db.js";
import { changePasswordSchema, loginSchema, patchProfileSchema } from "../schemas/index.js";
import { registerSchema } from "../schemas/public.js";
import {
  clearAuthCookies,
  setAuthCookies,
  signToken,
  verifyAuthToken,
  type AuthUser,
} from "../plugins/auth.js";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../lib/passwordPolicy.js";
import { generateTotpSecret, totpUri, verifyTotp } from "../lib/totp.js";
import { decryptSecret, encryptSecret } from "../lib/secretBox.js";
import { z } from "zod";

type MembershipRow = {
  organization_id: string;
  role: string;
  name?: string;
  sector?: string | null;
  country?: string | null;
  status?: string;
};

type SecuritySettings = {
  require_mfa: boolean;
  session_timeout_hours: number;
  max_login_attempts: number;
  password_min_length: number;
  idle_timeout_minutes: number;
};

const DEFAULT_SECURITY: SecuritySettings = {
  require_mfa: false,
  session_timeout_hours: 8,
  max_login_attempts: 5,
  password_min_length: 8,
  idle_timeout_minutes: 30,
};

async function loadSecuritySettings(): Promise<SecuritySettings> {
  const { rows } = await rawPool.query(
    `SELECT value FROM platform_settings WHERE key = 'security'`,
  );
  const value = (rows[0]?.value ?? {}) as Partial<SecuritySettings>;
  return { ...DEFAULT_SECURITY, ...value };
}

async function loadAuthContext(userId: string) {
  const [platform, memberships] = await Promise.all([
    rawPool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]),
    rawPool.query(
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

function issueSession(
  reply: FastifyReply,
  user: AuthUser,
  idleMinutes: number,
) {
  const token = signToken(user);
  setAuthCookies(reply, token, idleMinutes);
  return token;
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const d = parsed.data;
    if (!isStrongPassword(d.password)) {
      return reply.code(400).send({ error: PASSWORD_POLICY_MESSAGE });
    }
    const email = d.email.toLowerCase();

    const existing = await rawPool.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);
    if (existing.rows[0]) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(d.password, 12);
    const client = await rawPool.connect();
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

      const sec = await loadSecuritySettings();
      const token = issueSession(
        reply,
        {
          id: userId,
          email,
          organizationId: orgId,
          role: "owner",
        },
        sec.idle_timeout_minutes,
      );

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

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const { email, password } = parsed.data;
      const ip = request.ip;
      const sec = await loadSecuritySettings();

      const blocked = await rawPool.query(
        `SELECT 1 FROM blocked_ips
         WHERE ip = $1 AND (blocked_until IS NULL OR blocked_until > now())`,
        [ip],
      );
      if (blocked.rows[0]) {
        return reply.code(429).send({ error: "Too many login attempts" });
      }

      const fails = await rawPool.query(
        `SELECT COUNT(*)::int AS n FROM login_attempts
         WHERE success = false
           AND created_at > now() - interval '15 minutes'
           AND (email = $1 OR ip = $2)`,
        [email.toLowerCase(), ip],
      );
      if (fails.rows[0].n >= sec.max_login_attempts) {
        await rawPool.query(
          `INSERT INTO blocked_ips (ip, reason, blocked_until)
           VALUES ($1, 'login_lockout', now() + interval '15 minutes')
           ON CONFLICT (ip) DO UPDATE
             SET reason = EXCLUDED.reason, blocked_until = EXCLUDED.blocked_until`,
          [ip],
        );
        return reply.code(429).send({ error: "Too many login attempts" });
      }

      const { rows } = await rawPool.query(
        `SELECT id, email, password_hash, is_active, full_name, mfa_enabled,
                must_reset_password, mfa_secret_enc
         FROM users WHERE email = $1`,
        [email.toLowerCase()],
      );
      const user = rows[0];
      const ok =
        user &&
        user.is_active &&
        (await bcrypt.compare(password, user.password_hash));

      await rawPool.query(
        `INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, $3)`,
        [email.toLowerCase(), ip, Boolean(ok)],
      );

      if (!ok) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const ctx = await loadAuthContext(user.id);
      if (user.mfa_enabled) {
        const mfaToken = signToken(
          {
            id: user.id,
            email: user.email,
            organizationId: ctx.memberships[0]?.organization_id,
            role: ctx.jwtRole,
            mfaPending: true,
          },
          "10m",
        );
        return {
          mfaRequired: true,
          mfaToken,
          user: { id: user.id, email: user.email, fullName: user.full_name },
        };
      }

      if (sec.require_mfa && !user.mfa_enabled) {
        return reply.code(403).send({
          error: "MFA enrollment required",
          code: "MFA_ENROLL_REQUIRED",
          enrollToken: signToken(
            {
              id: user.id,
              email: user.email,
              organizationId: ctx.memberships[0]?.organization_id,
              role: ctx.jwtRole,
            },
            "15m",
          ),
        });
      }

      const token = issueSession(
        reply,
        {
          id: user.id,
          email: user.email,
          organizationId: ctx.memberships[0]?.organization_id,
          role: ctx.jwtRole,
          platformRole: ctx.platformRole,
          mustResetPassword: Boolean(user.must_reset_password),
        },
        sec.idle_timeout_minutes,
      );

      return {
        token,
        mustResetPassword: Boolean(user.must_reset_password),
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
    },
  );

  app.post("/auth/mfa/verify", async (request, reply) => {
    const body = z
      .object({
        mfaToken: z.string().min(10),
        code: z.string().min(6).max(8),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid MFA payload" });
    }
    let pending: AuthUser;
    try {
      pending = verifyAuthToken(body.data.mfaToken);
    } catch {
      return reply.code(401).send({ error: "Invalid MFA token" });
    }
    if (!pending.mfaPending) {
      return reply.code(401).send({ error: "Invalid MFA token" });
    }
    const { rows } = await rawPool.query(
      `SELECT mfa_secret_enc, email, must_reset_password FROM users WHERE id = $1`,
      [pending.id],
    );
    if (!rows[0]?.mfa_secret_enc) {
      return reply.code(400).send({ error: "MFA not enrolled" });
    }
    const secret = decryptSecret(rows[0].mfa_secret_enc as string);
    if (!verifyTotp(secret, body.data.code)) {
      return reply.code(401).send({ error: "Invalid MFA code" });
    }
    const ctx = await loadAuthContext(pending.id);
    const sec = await loadSecuritySettings();
    const token = issueSession(
      reply,
      {
        id: pending.id,
        email: pending.email,
        organizationId: ctx.memberships[0]?.organization_id,
        role: ctx.jwtRole,
        platformRole: ctx.platformRole,
        mustResetPassword: Boolean(rows[0].must_reset_password),
      },
      sec.idle_timeout_minutes,
    );
    return {
      token,
      user: {
        id: pending.id,
        email: pending.email,
        role: ctx.jwtRole,
        platformRole: ctx.platformRole,
        organizationId: ctx.memberships[0]?.organization_id,
      },
      organizations: ctx.memberships,
    };
  });

  app.post(
    "/auth/mfa/setup",
    { preHandler: [app.requireAuth] },
    async (request) => {
      const secret = generateTotpSecret();
      await rawPool.query(
        `UPDATE users SET mfa_secret_enc = $2, updated_at = now() WHERE id = $1`,
        [request.user!.id, encryptSecret(secret)],
      );
      return {
        secret,
        otpauthUrl: totpUri(request.user!.email, secret),
      };
    },
  );

  app.post(
    "/auth/mfa/enable",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const body = z.object({ code: z.string().min(6).max(8) }).safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ error: "Invalid code" });
      }
      const { rows } = await rawPool.query(
        `SELECT mfa_secret_enc FROM users WHERE id = $1`,
        [request.user!.id],
      );
      if (!rows[0]?.mfa_secret_enc) {
        return reply.code(400).send({ error: "Call /auth/mfa/setup first" });
      }
      const secret = decryptSecret(rows[0].mfa_secret_enc as string);
      if (!verifyTotp(secret, body.data.code)) {
        return reply.code(401).send({ error: "Invalid MFA code" });
      }
      await rawPool.query(
        `UPDATE users SET mfa_enabled = true, mfa_enrolled_at = now(), updated_at = now() WHERE id = $1`,
        [request.user!.id],
      );
      return { ok: true };
    },
  );

  app.post(
    "/auth/mfa/disable",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const body = z
        .object({
          password: z.string().min(1),
          code: z.string().min(6).max(8),
        })
        .safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ error: "Password and MFA code required" });
      }
      const { rows } = await rawPool.query(
        `SELECT password_hash, mfa_secret_enc FROM users WHERE id = $1`,
        [request.user!.id],
      );
      const ok = rows[0] && (await bcrypt.compare(body.data.password, rows[0].password_hash));
      if (!ok) return reply.code(400).send({ error: "Invalid credentials" });
      if (!rows[0].mfa_secret_enc || !verifyTotp(decryptSecret(rows[0].mfa_secret_enc), body.data.code)) {
        return reply.code(401).send({ error: "Invalid MFA code" });
      }
      await rawPool.query(
        `UPDATE users
         SET mfa_enabled = false, mfa_secret_enc = NULL, mfa_enrolled_at = NULL, updated_at = now()
         WHERE id = $1`,
        [request.user!.id],
      );
      return { ok: true };
    },
  );

  app.post("/auth/forgot-password", async (request, reply) => {
    const body = z.object({ email: z.string().email() }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid email" });
    }
    const email = body.data.email.toLowerCase();
    const { rows } = await rawPool.query(`SELECT id FROM users WHERE email = $1`, [email]);
    let resetToken: string | undefined;
    if (rows[0]) {
      resetToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(resetToken).digest("hex");
      await rawPool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')`,
        [rows[0].id, tokenHash],
      );
      request.log.info({ userId: rows[0].id }, "password_reset_issued");
    }
    const payload: { ok: true; resetToken?: string } = { ok: true };
    if (process.env.NODE_ENV !== "production" && resetToken) {
      payload.resetToken = resetToken;
    }
    return payload;
  });

  app.post("/auth/reset-password", async (request, reply) => {
    const body = z
      .object({
        token: z.string().min(10),
        newPassword: z.string().min(8).max(200),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten() });
    }
    if (!isStrongPassword(body.data.newPassword)) {
      return reply.code(400).send({ error: PASSWORD_POLICY_MESSAGE });
    }
    const tokenHash = createHash("sha256").update(body.data.token).digest("hex");
    const { rows } = await rawPool.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [tokenHash],
    );
    if (!rows[0]) {
      return reply.code(400).send({ error: "Invalid or expired token" });
    }
    const hash = await bcrypt.hash(body.data.newPassword, 12);
    await rawPool.query(
      `UPDATE users SET password_hash = $2, must_reset_password = false, updated_at = now() WHERE id = $1`,
      [rows[0].user_id, hash],
    );
    await rawPool.query(
      `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
      [rows[0].id],
    );
    await rawPool.query(`DELETE FROM revoked_tokens WHERE user_id = $1`, [
      rows[0].user_id,
    ]);
    return { ok: true };
  });

  app.post(
    "/auth/logout",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      if (request.user?.jti) {
        const exp = new Date(Date.now() + 8 * 3600 * 1000);
        await rawPool.query(
          `INSERT INTO revoked_tokens (jti, user_id, expires_at)
           VALUES ($1,$2,$3)
           ON CONFLICT (jti) DO NOTHING`,
          [request.user.jti, request.user.id, exp],
        );
      }
      clearAuthCookies(reply);
      return { ok: true };
    },
  );

  app.get(
    "/auth/me",
    { preHandler: [app.requireAuth] },
    async (request) => {
      const ctx = await loadAuthContext(request.user!.id);
      const { rows } = await rawPool.query(
        `SELECT full_name, mfa_enabled FROM users WHERE id = $1`,
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
          mfaEnabled: Boolean(rows[0]?.mfa_enabled),
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
        await rawPool.query(
          `UPDATE users SET full_name = $2, updated_at = now() WHERE id = $1`,
          [userId, parsed.data.fullName],
        );
      }
      await rawPool.query(
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
      const { rows } = await rawPool.query(
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
      if (!isStrongPassword(parsed.data.newPassword)) {
        return reply.code(400).send({ error: PASSWORD_POLICY_MESSAGE });
      }
      const { rows } = await rawPool.query(
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
      await rawPool.query(
        `UPDATE users
         SET password_hash = $2, must_reset_password = false, updated_at = now()
         WHERE id = $1`,
        [request.user!.id, hash],
      );
      return { ok: true };
    },
  );
}
