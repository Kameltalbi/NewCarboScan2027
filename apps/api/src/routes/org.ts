import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { beginTenantTx, pool } from "../db.js";
import {
  entitySchema,
  inviteMemberSchema,
  normalizeOrgRole,
  orgIdParamSchema,
  patchMemberSchema,
  patchOrganizationSchema,
  siteSchema,
} from "../schemas/index.js";

const ORG_SELECT = `
  id, name, slug, sector, country, status, reference_year, currency,
  energy_unit, mass_unit, distance_unit, logo_url, pilot_name, legal_name,
  subscription_plan, subscription_status, user_id, created_at, updated_at
`;

function mapOrg(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sector: row.sector,
    country: row.country,
    status: row.status,
    referenceYear: row.reference_year,
    currency: row.currency,
    energyUnit: row.energy_unit,
    massUnit: row.mass_unit,
    distanceUnit: row.distance_unit,
    logoUrl: row.logo_url,
    pilotName: row.pilot_name,
    legalName: row.legal_name,
    subscriptionPlan: row.subscription_plan,
    subscriptionStatus: row.subscription_status,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    annualRevenue: row.annual_revenue ?? null,
    employees: row.employees ?? null,
    totalSurface: row.total_surface ?? null,
  };
}

export async function registerOrgRoutes(app: FastifyInstance) {
  app.get(
    "/v1/org",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT ${ORG_SELECT} FROM organizations WHERE id = $1`,
        [orgId],
      );
      return { organization: rows[0] ? mapOrg(rows[0]) : null };
    },
  );

  app.patch(
    "/v1/org",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const parsed = patchOrganizationSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const orgId = request.user!.organizationId!;
      const setLogo = d.logoUrl !== undefined;
      const { rows } = await pool.query(
        `UPDATE organizations SET
           name = COALESCE($2, name),
           legal_name = COALESCE($3, legal_name),
           sector = COALESCE($4, sector),
           country = COALESCE($5, country),
           reference_year = COALESCE($6, reference_year),
           currency = COALESCE($7, currency),
           energy_unit = COALESCE($8, energy_unit),
           mass_unit = COALESCE($9, mass_unit),
           distance_unit = COALESCE($10, distance_unit),
           logo_url = CASE WHEN $13 THEN $11 ELSE logo_url END,
           pilot_name = COALESCE($12, pilot_name),
           updated_at = now()
         WHERE id = $1
         RETURNING ${ORG_SELECT}`,
        [
          orgId,
          d.name ?? null,
          d.legalName ?? null,
          d.sector ?? null,
          d.country ?? null,
          d.referenceYear ?? null,
          d.currency ?? null,
          d.energyUnit ?? null,
          d.massUnit ?? null,
          d.distanceUnit ?? null,
          d.logoUrl ?? null,
          d.pilotName ?? null,
          setLogo,
        ],
      );
      return { organization: mapOrg(rows[0]) };
    },
  );

  app.get(
    "/v1/org/modules",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT m.id AS module_id,
                COALESCE(m.slug, m.code) AS slug,
                m.name,
                m.description,
                m.icon,
                m.route,
                m.category,
                om.started_at,
                om.expires_at
         FROM organization_modules om
         JOIN modules m ON m.id = om.module_id
         WHERE om.organization_id = $1
           AND COALESCE(om.enabled, om.active, true) IS DISTINCT FROM false
         ORDER BY m.category NULLS LAST, m.name`,
        [orgId],
      );
      return { items: rows };
    },
  );

  app.get(
    "/v1/org/members",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT om.user_id, om.role::text AS role, om.created_at,
                u.email, u.full_name, u.is_active,
                p.phone
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE om.organization_id = $1
         ORDER BY om.created_at`,
        [orgId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/org/members",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const parsed = inviteMemberSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const email = d.email.toLowerCase();
      const orgId = request.user!.organizationId!;
      const role = normalizeOrgRole(d.role ?? "viewer");
      if (role === "owner") {
        return reply.code(400).send({ error: "Impossible d'attribuer le rôle owner par invitation" });
      }

      const existing = await pool.query(
        `SELECT id, email, full_name FROM users WHERE email = $1`,
        [email],
      );
      let userId = existing.rows[0]?.id as string | undefined;
      let created = false;

      if (!userId) {
        if (!d.password) {
          return reply.code(404).send({
            error:
              "Utilisateur introuvable. L'utilisateur doit d'abord créer un compte, ou fournissez un mot de passe pour le créer.",
          });
        }
        const fullName =
          d.fullName ||
          [d.firstName, d.lastName].filter(Boolean).join(" ").trim() ||
          email;
        const hash = await bcrypt.hash(d.password, 12);
        const inserted = await pool.query(
          `INSERT INTO users (email, password_hash, full_name)
           VALUES ($1,$2,$3) RETURNING id, email, full_name`,
          [email, hash, fullName],
        );
        userId = inserted.rows[0].id as string;
        created = true;
        await pool.query(
          `INSERT INTO profiles (user_id, full_name)
           VALUES ($1,$2)
           ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
          [userId, fullName],
        );
      }

      const already = await pool.query(
        `SELECT 1 FROM organization_members
         WHERE organization_id = $1 AND user_id = $2`,
        [orgId, userId],
      );
      if (already.rows[0]) {
        return reply.code(409).send({ error: "Cet utilisateur est déjà membre de l'organisation" });
      }

      await pool.query(
        `INSERT INTO organization_members
           (organization_id, user_id, role, invited_by, invited_at, joined_at)
         VALUES ($1,$2,$3::org_role,$4,now(),now())`,
        [orgId, userId, role, request.user!.id],
      );

      return {
        member: {
          user_id: userId,
          email,
          role,
          created,
        },
      };
    },
  );

  app.patch(
    "/v1/org/members/:id",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const body = patchMemberSchema.safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid member patch" });
      }
      const orgId = request.user!.organizationId!;
      const { rowCount } = await pool.query(
        `UPDATE organization_members SET role = $3::org_role
         WHERE organization_id = $1 AND user_id = $2`,
        [orgId, params.data.id, body.data.role],
      );
      if (!rowCount) {
        return reply.code(404).send({ error: "Member not found" });
      }
      return { ok: true };
    },
  );

  app.delete(
    "/v1/org/members/:id",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid user id" });
      }
      if (params.data.id === request.user!.id) {
        return reply.code(400).send({ error: "Impossible de retirer votre propre compte" });
      }
      const orgId = request.user!.organizationId!;
      await pool.query(
        `DELETE FROM organization_members
         WHERE organization_id = $1 AND user_id = $2`,
        [orgId, params.data.id],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/org/entities",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `SELECT id, nom_entreprise AS name, secteur AS sector,
                ca_annuel AS annual_revenue, collaborateurs AS employees,
                created_at, updated_at
         FROM companies
         WHERE organization_id = $1
         ORDER BY nom_entreprise`,
        [orgId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/org/entities",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const parsed = entitySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `INSERT INTO companies (organization_id, user_id, nom_entreprise, secteur, ca_annuel, collaborateurs)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, nom_entreprise AS name, secteur AS sector,
                   ca_annuel AS annual_revenue, collaborateurs AS employees, created_at`,
        [
          orgId,
          request.user!.id,
          parsed.data.name,
          parsed.data.sector ?? null,
          parsed.data.annualRevenue ?? null,
          parsed.data.employees ?? null,
        ],
      );
      return { entity: rows[0] };
    },
  );

  app.patch(
    "/v1/org/entities/:id",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = entitySchema.partial().safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid entity" });
      }
      const orgId = request.user!.organizationId!;
      const { rows } = await pool.query(
        `UPDATE companies SET
           nom_entreprise = COALESCE($3, nom_entreprise),
           secteur = COALESCE($4, secteur),
           ca_annuel = COALESCE($5, ca_annuel),
           collaborateurs = COALESCE($6, collaborateurs),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING id, nom_entreprise AS name, secteur AS sector,
                   ca_annuel AS annual_revenue, collaborateurs AS employees`,
        [
          params.data.id,
          orgId,
          parsed.data.name ?? null,
          parsed.data.sector ?? null,
          parsed.data.annualRevenue ?? null,
          parsed.data.employees ?? null,
        ],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Entity not found" });
      }
      return { entity: rows[0] };
    },
  );

  app.delete(
    "/v1/org/entities/:id",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      await pool.query(
        `DELETE FROM companies WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/org/sites",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const q = request.query as Record<string, string | undefined>;
      const params: unknown[] = [orgId];
      const where = ["organization_id = $1"];
      if (q.companyId) {
        params.push(q.companyId);
        where.push(`company_id = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT id, name, code, address, city, country, site_type, is_active,
                company_id, employees_count, surface_m2, is_consolidated,
                contact_name, contact_email, annual_revenue, created_at, updated_at
         FROM collect_sites
         WHERE ${where.join(" AND ")}
         ORDER BY name`,
        params,
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/org/sites",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const parsed = siteSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      if (!d.name) {
        return reply.code(400).send({ error: "Le nom du site est requis" });
      }
      const { rows } = await pool.query(
        `INSERT INTO collect_sites
           (organization_id, name, code, address, city, country, site_type, is_active,
            is_consolidated, company_id, employees_count, surface_m2, contact_name, contact_email)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id, name, code, address, city, country, site_type, is_active,
                   company_id, employees_count, surface_m2, is_consolidated,
                   contact_name, contact_email, created_at, updated_at`,
        [
          request.user!.organizationId,
          d.name,
          d.code ?? null,
          d.address ?? null,
          d.city ?? null,
          d.country ?? null,
          d.siteType ?? null,
          d.isActive ?? true,
          d.isConsolidated ?? true,
          d.companyId ?? null,
          d.employeesCount ?? null,
          d.surfaceM2 ?? null,
          d.contactName ?? null,
          d.contactEmail ?? null,
        ],
      );
      return { site: rows[0] };
    },
  );

  app.patch(
    "/v1/org/sites/:id",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = siteSchema.safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid site" });
      }
      const d = parsed.data;
      const { rows } = await pool.query(
        `UPDATE collect_sites SET
           name = COALESCE($3, name),
           code = COALESCE($4, code),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           country = COALESCE($7, country),
           site_type = COALESCE($8, site_type),
           is_active = COALESCE($9, is_active),
           is_consolidated = COALESCE($10, is_consolidated),
           company_id = COALESCE($11, company_id),
           employees_count = COALESCE($12, employees_count),
           surface_m2 = COALESCE($13, surface_m2),
           contact_name = COALESCE($14, contact_name),
           contact_email = COALESCE($15, contact_email),
           updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING id, name, code, address, city, country, site_type, is_active,
                   company_id, employees_count, surface_m2, is_consolidated,
                   contact_name, contact_email, created_at, updated_at`,
        [
          params.data.id,
          request.user!.organizationId,
          d.name ?? null,
          d.code ?? null,
          d.address ?? null,
          d.city ?? null,
          d.country ?? null,
          d.siteType ?? null,
          d.isActive ?? null,
          d.isConsolidated ?? null,
          d.companyId ?? null,
          d.employeesCount ?? null,
          d.surfaceM2 ?? null,
          d.contactName ?? null,
          d.contactEmail ?? null,
        ],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Site not found" });
      }
      return { site: rows[0] };
    },
  );

  app.delete(
    "/v1/org/sites/:id",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      await pool.query(
        `DELETE FROM collect_sites WHERE id = $1 AND organization_id = $2`,
        [params.data.id, request.user!.organizationId],
      );
      return { ok: true };
    },
  );

  app.get(
    "/v1/org/years",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const [years, org, activity, bilan] = await Promise.all([
        pool.query(
          `SELECT id, year, is_included, created_at
           FROM organization_years
           WHERE organization_id = $1
           ORDER BY year`,
          [orgId],
        ),
        pool.query(
          `SELECT reference_year FROM organizations WHERE id = $1`,
          [orgId],
        ),
        pool.query(
          `SELECT period_start FROM activity_data
           WHERE organization_id = $1 AND period_start IS NOT NULL
           ORDER BY period_start DESC LIMIT 1`,
          [orgId],
        ),
        pool.query(
          `SELECT year, date_bilan, created_at FROM bilans_carbone
           WHERE organization_id = $1
           ORDER BY year DESC NULLS LAST, created_at DESC LIMIT 1`,
          [orgId],
        ),
      ]);
      const bilanRow = bilan.rows[0];
      const latestBilanYear = bilanRow?.year
        ? Number(bilanRow.year)
        : bilanRow?.date_bilan
          ? new Date(bilanRow.date_bilan).getFullYear()
          : bilanRow?.created_at
            ? new Date(bilanRow.created_at).getFullYear()
            : null;
      return {
        items: years.rows,
        referenceYear: org.rows[0]?.reference_year ?? null,
        latestActivityYear: activity.rows[0]?.period_start
          ? new Date(activity.rows[0].period_start).getFullYear()
          : null,
        latestBilanYear,
      };
    },
  );

  app.get(
    "/v1/org/subscription",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const orgId = request.user!.organizationId!;
      const userId = request.user!.id;
      const [org, subs, orders] = await Promise.all([
        pool.query(
          `SELECT subscription_plan, subscription_status FROM organizations WHERE id = $1`,
          [orgId],
        ),
        pool.query(
          `SELECT id, plan_code, status, created_at
           FROM user_subscriptions
           WHERE organization_id = $1 OR user_id = $2
           ORDER BY created_at DESC
           LIMIT 5`,
          [orgId, userId],
        ),
        pool.query(
          `SELECT id, status, amount, currency, created_at, raw_legacy
           FROM orders
           WHERE organization_id = $1 OR user_id = $2
           ORDER BY created_at DESC
           LIMIT 20`,
          [orgId, userId],
        ),
      ]);
      const orgStatus = org.rows[0]?.subscription_status as string | null;
      const hasActiveSubscription =
        request.user!.role === "superadmin" ||
        orgStatus === "active" ||
        subs.rows.some((s: { status: string }) => s.status === "active") ||
        orders.rows.some((o: { status: string }) => o.status === "validated");
      return {
        hasActiveSubscription,
        plan: org.rows[0]?.subscription_plan ?? subs.rows[0]?.plan_code ?? null,
        status: orgStatus ?? subs.rows[0]?.status ?? null,
        orders: orders.rows.map((row) => {
          const extra =
            row.raw_legacy && typeof row.raw_legacy === "object"
              ? (row.raw_legacy as Record<string, unknown>)
              : {};
          return {
            id: row.id,
            status: row.status,
            amount: row.amount,
            currency: row.currency,
            created_at: row.created_at,
            plan_type: extra.plan_type ?? extra.plan ?? null,
          };
        }),
      };
    },
  );

  app.get(
    "/v1/me/profile",
    { preHandler: [app.requireAuth] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT u.id, u.email, u.full_name,
                p.company_name, p.phone, p.sector, p.company_size
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.id = $1`,
        [request.user!.id],
      );
      return { profile: rows[0] ?? null };
    },
  );

  app.post(
    "/v1/orgs",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const parsed = entitySchema.pick({ name: true, sector: true }).safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      const slugBase = parsed.data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "org";
      const slug = `${slugBase}-${userId.slice(0, 8)}-${Date.now().toString(36)}`;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const org = await client.query(
          `INSERT INTO organizations (name, slug, sector, user_id)
           VALUES ($1,$2,$3,$4) RETURNING id, name, slug`,
          [parsed.data.name, slug, parsed.data.sector ?? null, userId],
        );
        const orgId = org.rows[0].id as string;
        await client.query(
          `INSERT INTO organization_members (organization_id, user_id, role)
           VALUES ($1,$2,'owner')`,
          [orgId, userId],
        );
        await client.query(
          `INSERT INTO companies (organization_id, user_id, nom_entreprise, secteur)
           VALUES ($1,$2,$3,$4)`,
          [orgId, userId, parsed.data.name, parsed.data.sector ?? null],
        );
        await client.query("COMMIT");
        return { organization: org.rows[0] };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  );

  app.delete(
    "/v1/orgs/:id",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      const member = await pool.query(
        `SELECT role FROM organization_members
         WHERE organization_id = $1 AND user_id = $2`,
        [params.data.id, request.user!.id],
      );
      if (!member.rows[0] || !["owner", "admin"].includes(member.rows[0].role)) {
        return reply.code(403).send({ error: "Not allowed" });
      }
      const count = await pool.query(
        `SELECT count(*)::int AS n FROM organization_members WHERE user_id = $1`,
        [request.user!.id],
      );
      if ((count.rows[0]?.n ?? 0) <= 1) {
        return reply.code(400).send({ error: "Impossible de supprimer votre seule organisation" });
      }
      await beginTenantTx({
        organizationId: params.data.id,
        userId: request.user!.id,
        superadmin: false,
      });
      await pool.query(
        `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
         VALUES ($1,$2,'org.self_delete','organization',$1,$3,'{}')`,
        [params.data.id, request.user!.id, request.ip],
      );
      await pool.query(`DELETE FROM organizations WHERE id = $1`, [params.data.id]);
      return { ok: true };
    },
  );

  app.get(
    "/v1/org/orders",
    { preHandler: [app.requireOrgMember] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT * FROM orders
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/org/orders",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return reply.code(400).send({ error: "amount requis" });
      }
      const { rows } = await pool.query(
        `INSERT INTO orders
           (organization_id, user_id, status, amount, currency, raw_legacy)
         VALUES ($1,$2,COALESCE($3,'pending'),$4,COALESCE($5,'TND'),$6::jsonb)
         RETURNING *`,
        [
          request.user!.organizationId,
          request.user!.id,
          typeof body.status === "string" ? body.status : "pending",
          amount,
          typeof body.currency === "string" ? body.currency : "TND",
          JSON.stringify(body.user_data ?? body.payload ?? {}),
        ],
      );
      return { order: rows[0] };
    },
  );

  app.post(
    "/v1/org/recommended-actions",
    { preHandler: [app.requireOrgMember] },
    async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const title = String(body.title ?? body.titre ?? "").trim();
      if (!title) return reply.code(400).send({ error: "title requis" });
      const { rows } = await pool.query(
        `INSERT INTO actions_recommandees
           (organization_id, title, description, payload)
         VALUES ($1,$2,$3,$4::jsonb)
         RETURNING *`,
        [
          request.user!.organizationId,
          title,
          String(body.description ?? ""),
          JSON.stringify(body.payload ?? body),
        ],
      );
      return { item: rows[0] };
    },
  );
}
