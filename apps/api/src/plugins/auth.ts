import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import { beginTenantTx, endTenantTx, pool, rawPool, tenantAls } from "../db.js";

export type AuthUser = {
  id: string;
  email: string;
  organizationId?: string;
  role?: string;
  platformRole?: string;
  jti?: string;
  mustResetPassword?: boolean;
  mfaPending?: boolean;
};

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireOrgMember: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireSuperAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireOrgAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireOrgWriter: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    user?: AuthUser;
    apiKeyId?: string;
    apiKeyScopes?: string[];
    tenantStore?: import("../db.js").TenantStore;
  }
}

const WEAK_JWT_SECRETS = new Set([
  "change-me-in-production",
  "dev-only-change-me",
  "change-me-long-random-jwt-secret",
]);

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  const weak = !secret || WEAK_JWT_SECRETS.has(secret);
  if (isProd && (weak || (secret && secret.length < 32))) {
    throw new Error(
      "JWT_SECRET must be set to a strong secret in production (not an example placeholder, ≥32 chars).",
    );
  }
  if (weak) {
    return secret || "dev-only-change-me";
  }
  return secret as string;
})();

const WRITE_ROLES = new Set(["superadmin", "owner", "admin", "editor"]);

function cookieOpts(maxAgeSec: number) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "strict" : "lax") as "strict" | "lax",
    maxAge: maxAgeSec,
  };
}

export function signToken(
  payload: AuthUser,
  expiresIn: jwt.SignOptions["expiresIn"] = "8h",
): string {
  const jti = payload.jti ?? randomUUID();
  return jwt.sign({ ...payload, jti }, JWT_SECRET, { expiresIn });
}

export function verifyAuthToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export function setAuthCookies(
  reply: FastifyReply,
  token: string,
  idleMinutes = 30,
) {
  reply.setCookie("ncs_access", token, cookieOpts(8 * 3600));
  reply.setCookie("ncs_idle", String(Date.now()), cookieOpts(idleMinutes * 60));
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie("ncs_access", { path: "/" });
  reply.clearCookie("ncs_idle", { path: "/" });
}

function readBearerOrCookie(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  const cookieTok = request.cookies?.ncs_access;
  if (cookieTok) return cookieTok;
  return undefined;
}

async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
  rawKey: string,
): Promise<boolean> {
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const { rows } = await rawPool.query(
    `SELECT id, organization_id, created_by, scopes, rate_limit_rpm, revoked_at, is_active
     FROM api_keys WHERE key_hash = $1`,
    [keyHash],
  );
  const key = rows[0];
  if (!key || key.revoked_at || key.is_active === false) {
    await reply.code(401).send({ error: "Invalid API key" });
    return false;
  }
  const rpm = Number(key.rate_limit_rpm ?? 60);
  const { rows: counted } = await rawPool.query(
    `SELECT COUNT(*)::int AS n FROM api_request_logs
     WHERE api_key_id = $1 AND created_at > now() - interval '1 minute'`,
    [key.id],
  );
  if (counted[0].n >= rpm) {
    await reply.code(429).send({ error: "API key rate limit exceeded" });
    return false;
  }
  request.apiKeyId = key.id as string;
  request.apiKeyScopes = (key.scopes as string[]) ?? [];
  request.user = {
    id: (key.created_by as string) || "00000000-0000-4000-8000-000000000002",
    email: "api-key@local",
    organizationId: key.organization_id as string,
    role: "editor",
  };
  await beginTenantTx({
    organizationId: key.organization_id as string,
    userId: request.user.id,
    superadmin: false,
  });
  await rawPool.query(
    `UPDATE api_keys SET last_used_at = now() WHERE id = $1`,
    [key.id],
  );
  return true;
}

function bindTenant(request: FastifyRequest) {
  if (!request.tenantStore) request.tenantStore = {};
  tenantAls.enterWith(request.tenantStore);
}

export const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate(
    "requireAuth",
    async (request: FastifyRequest, reply: FastifyReply) => {
      bindTenant(request);
      const apiKeyHeader = request.headers["x-api-key"];
      if (typeof apiKeyHeader === "string" && apiKeyHeader.startsWith("ncs_")) {
        const ok = await authenticateApiKey(request, reply, apiKeyHeader);
        if (!ok || reply.sent) return;
        return;
      }

      const token = readBearerOrCookie(request);
      if (!token) {
        return reply.code(401).send({ error: "Authentication required" });
      }
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUser & {
          jti?: string;
          mrp?: boolean;
          mfaPending?: boolean;
        };
        if (decoded.mfaPending) {
          return reply.code(401).send({ error: "MFA verification required" });
        }
        if (decoded.jti) {
          const revoked = await rawPool.query(
            `SELECT 1 FROM revoked_tokens WHERE jti = $1`,
            [decoded.jti],
          );
          if (revoked.rows[0]) {
            return reply.code(401).send({ error: "Invalid token" });
          }
        }
        const idleCookie = request.cookies?.ncs_idle;
        const idleMin = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 30);
        if (idleCookie) {
          const last = Number(idleCookie);
          if (Number.isFinite(last) && Date.now() - last > idleMin * 60 * 1000) {
            return reply.code(401).send({ error: "Session expired" });
          }
        }
        request.user = {
          id: decoded.id,
          email: decoded.email,
          organizationId: decoded.organizationId,
          role: decoded.role,
          platformRole: decoded.platformRole,
          jti: decoded.jti,
          mustResetPassword: decoded.mustResetPassword ?? decoded.mrp,
        };
        const url = request.routeOptions.url ?? request.url;
        if (
          request.user.mustResetPassword &&
          url !== "/auth/password" &&
          url !== "/auth/logout"
        ) {
          return reply
            .code(403)
            .send({ error: "Password reset required", code: "MUST_RESET_PASSWORD" });
        }
        reply.setCookie("ncs_idle", String(Date.now()), cookieOpts(idleMin * 60));
      } catch {
        return reply.code(401).send({ error: "Invalid token" });
      }
    },
  );

  app.decorate(
    "requireSuperAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      bindTenant(request);
      await app.requireAuth(request, reply);
      if (reply.sent) return;
      const { rows } = await rawPool.query(
        `SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'superadmin'`,
        [request.user!.id],
      );
      if (!rows[0]) {
        return reply.code(403).send({ error: "Superadmin required" });
      }
      request.user!.platformRole = "superadmin";
      request.user!.role = "superadmin";
      await beginTenantTx({
        userId: request.user!.id,
        superadmin: true,
        organizationId: request.user!.organizationId,
      });
    },
  );

  app.decorate(
    "requireOrgMember",
    async (request: FastifyRequest, reply: FastifyReply) => {
      bindTenant(request);
      await app.requireAuth(request, reply);
      if (reply.sent) return;

      const orgId =
        (request.headers["x-organization-id"] as string | undefined) ??
        request.user?.organizationId;

      if (!orgId || !request.user) {
        return reply.code(403).send({ error: "Organization required" });
      }

      const sa = await rawPool.query(
        `SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'superadmin'`,
        [request.user.id],
      );
      const org = await rawPool.query(
        `SELECT status FROM organizations WHERE id = $1`,
        [orgId],
      );
      if (!org.rows[0]) {
        return reply.code(404).send({ error: "Organization not found" });
      }
      if (org.rows[0].status === "suspended" && !sa.rows[0]) {
        return reply.code(403).send({ error: "Organisation suspendue" });
      }
      if (sa.rows[0]) {
        request.user.organizationId = orgId;
        request.user.role = "superadmin";
        request.user.platformRole = "superadmin";
        await beginTenantTx({
          organizationId: orgId,
          userId: request.user.id,
          superadmin: true,
        });
        return;
      }

      const { rows } = await rawPool.query(
        `SELECT role FROM organization_members
         WHERE organization_id = $1 AND user_id = $2`,
        [orgId, request.user.id],
      );
      if (!rows[0]) {
        return reply
          .code(403)
          .send({ error: "Not a member of this organization" });
      }
      request.user.organizationId = orgId;
      request.user.role = rows[0].role;
      await beginTenantTx({
        organizationId: orgId,
        userId: request.user.id,
        superadmin: false,
      });
    },
  );

  app.decorate(
    "requireOrgAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      await app.requireOrgMember(request, reply);
      if (reply.sent) return;
      const role = request.user?.role;
      if (role === "superadmin" || role === "owner" || role === "admin") {
        return;
      }
      return reply.code(403).send({ error: "Organization admin required" });
    },
  );

  app.decorate(
    "requireOrgWriter",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (reply.sent || !request.user?.organizationId) return;
      const role = request.user.role ?? "viewer";
      const orgId = request.user.organizationId;
      const userId = request.user.id;
      const routeKey = `${request.method}:${request.routeOptions.url ?? request.url}`;
      const { rows } = await pool.query(
        `SELECT permission_key, allowed FROM user_permission_overrides
         WHERE organization_id = $1 AND user_id = $2
           AND permission_key IN ($3, 'write', $4)`,
        [orgId, userId, routeKey, request.routeOptions.url ?? ""],
      );
      if (rows.some((r: { allowed: boolean }) => r.allowed === false)) {
        return reply.code(403).send({ error: "Permission denied" });
      }
      if (WRITE_ROLES.has(role)) return;
      if (rows.some((r: { allowed: boolean }) => r.allowed === true)) return;
      return reply.code(403).send({ error: "Read-only role" });
    },
  );

  app.addHook("onRoute", (route) => {
    const methods = (
      Array.isArray(route.method) ? route.method : [route.method]
    ) as string[];
    const isWrite = methods.some((m) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(m),
    );
    const url = route.url ?? "";
    if (!isWrite) return;
    if (!url.startsWith("/v1/")) return;
    if (url.startsWith("/v1/public")) return;
    const existing = route.preHandler;
    const handlers = existing
      ? Array.isArray(existing)
        ? [...existing]
        : [existing]
      : [];
    const already = handlers.some(
      (h) => h === app.requireOrgWriter || (h as { name?: string }).name === "requireOrgWriter",
    );
    if (!already) handlers.push(app.requireOrgWriter);
    route.preHandler = handlers;
  });

  app.addHook("onResponse", async (request, reply) => {
    bindTenant(request);
    if (request.apiKeyId) {
      try {
        await rawPool.query(
          `INSERT INTO api_request_logs
            (api_key_id, organization_id, endpoint, method, status, duration_ms, ip_address, user_agent)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            request.apiKeyId,
            request.user?.organizationId ?? null,
            request.url,
            request.method,
            reply.statusCode,
            Math.round(reply.elapsedTime),
            request.ip,
            request.headers["user-agent"] ?? null,
          ],
        );
      } catch {
        /* logging must not fail the response */
      }
    }
    await endTenantTx(reply.statusCode < 500);
  });
};
