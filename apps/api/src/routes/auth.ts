import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { loginSchema } from "../schemas/index.js";
import { registerSchema } from "../schemas/public.js";
import { signToken } from "../plugins/auth.js";

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

    const memberships = await pool.query(
      `SELECT organization_id, role FROM organization_members WHERE user_id = $1`,
      [user.id],
    );

    const token = signToken({
      id: user.id,
      email: user.email,
      organizationId: memberships.rows[0]?.organization_id,
      role: memberships.rows[0]?.role,
    });

    return {
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name },
      organizations: memberships.rows,
    };
  });

  app.get(
    "/auth/me",
    { preHandler: [app.requireAuth] },
    async (request) => ({ user: request.user }),
  );
}
