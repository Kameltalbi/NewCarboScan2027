import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export type AuthUser = {
  id: string;
  email: string;
  organizationId?: string;
  role?: string;
  platformRole?: string;
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
  }
  interface FastifyRequest {
    user?: AuthUser;
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

export function signToken(
  payload: AuthUser,
  expiresIn: jwt.SignOptions["expiresIn"] = "8h",
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate(
    "requireAuth",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const header = request.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Authentication required" });
      }
      try {
        const token = header.slice("Bearer ".length);
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
        request.user = decoded;
      } catch {
        return reply.code(401).send({ error: "Invalid token" });
      }
    },
  );

  app.decorate(
    "requireSuperAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      await app.requireAuth(request, reply);
      if (reply.sent) return;
      const { rows } = await pool.query(
        `SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'superadmin'`,
        [request.user!.id],
      );
      if (!rows[0]) {
        return reply.code(403).send({ error: "Superadmin required" });
      }
      request.user!.platformRole = "superadmin";
      request.user!.role = "superadmin";
    },
  );

  app.decorate(
    "requireOrgMember",
    async (request: FastifyRequest, reply: FastifyReply) => {
      await app.requireAuth(request, reply);
      if (reply.sent) return;

      const orgId =
        (request.headers["x-organization-id"] as string | undefined) ??
        request.user?.organizationId;

      if (!orgId || !request.user) {
        return reply.code(403).send({ error: "Organization required" });
      }

      const sa = await pool.query(
        `SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'superadmin'`,
        [request.user.id],
      );
      const org = await pool.query(
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
        return;
      }

      const { rows } = await pool.query(
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
};
