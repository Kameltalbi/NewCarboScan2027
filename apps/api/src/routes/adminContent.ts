import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import {
  adminBlogSchema,
  adminCreateOrgSchema,
  adminOrderPatchSchema,
  adminPromoSchema,
  orgIdParamSchema,
} from "../schemas/index.js";

function extra(row: { raw_legacy?: unknown; payload?: unknown }) {
  const src = row.raw_legacy ?? row.payload;
  return src && typeof src === "object" && !Array.isArray(src)
    ? (src as Record<string, unknown>)
    : {};
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function sanitizeBlogHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+=(["']).*?\1/gi, "")
    .replace(/\son\w+=\S+/gi, "");
}

function mapOrder(row: Record<string, unknown>) {
  const x = extra(row);
  return {
    id: row.id,
    user_id: row.user_id,
    organization_id: row.organization_id,
    status: row.status,
    amount: row.amount != null ? Number(row.amount) : 0,
    currency: row.currency,
    created_at: row.created_at,
    updated_at: x.updated_at ?? row.created_at,
    plan_type: x.plan_type ?? x.plan ?? null,
    payment_method: x.payment_method ?? null,
    validated_by: x.validated_by ?? null,
    validated_at: x.validated_at ?? null,
    user_data: x.user_data ?? {
      email: row.user_email,
      organization: row.org_name,
      name: row.user_name,
    },
    user_email: row.user_email ?? null,
    org_name: row.org_name ?? null,
  };
}

function mapPromo(row: Record<string, unknown>) {
  const x = extra(row);
  return {
    id: row.id,
    code: row.code,
    description: x.description ?? null,
    discount_type: x.discount_type ?? "percentage",
    discount_value: Number(x.discount_value ?? row.discount_percent ?? 0),
    discount_percent: row.discount_percent != null ? Number(row.discount_percent) : null,
    minimum_amount: Number(x.minimum_amount ?? 0),
    max_uses: x.max_uses ?? null,
    current_uses: Number(x.current_uses ?? 0),
    valid_from: x.valid_from ?? row.created_at,
    valid_until: x.valid_until ?? null,
    is_active: row.active ?? true,
    applicable_plans: x.applicable_plans ?? [],
    created_at: row.created_at,
    updated_at: x.updated_at ?? row.created_at,
  };
}

function mapBlog(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    author_name: row.author_name,
    featured_image_url: row.featured_image_url,
    published_at: row.published_at,
    status: row.status,
    tags: row.tags ?? [],
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    language: row.language,
    created_at: row.created_at,
    published: row.published,
  };
}

export async function registerAdminContentRoutes(app: FastifyInstance) {
  app.get(
    "/v1/admin/orders",
    { preHandler: [app.requireSuperAdmin] },
    async () => {
      const { rows } = await pool.query(
        `SELECT o.*, u.email AS user_email, u.full_name AS user_name, org.name AS org_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         LEFT JOIN organizations org ON org.id = o.organization_id
         ORDER BY o.created_at DESC
         LIMIT 500`,
      );
      return { items: rows.map(mapOrder) };
    },
  );

  app.patch(
    "/v1/admin/orders/:id",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const body = adminOrderPatchSchema.safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "Invalid order patch" });
      }
      const existing = await pool.query(`SELECT * FROM orders WHERE id = $1`, [
        params.data.id,
      ]);
      if (!existing.rows[0]) {
        return reply.code(404).send({ error: "Order not found" });
      }
      const prev = extra(existing.rows[0]);
      const nextExtra: Record<string, unknown> = {
        ...prev,
        updated_at: new Date().toISOString(),
      };
      if (body.data.planType) nextExtra.plan_type = body.data.planType;
      if (body.data.userData) nextExtra.user_data = body.data.userData;
      if (body.data.startDate) nextExtra.start_date = body.data.startDate;
      if (body.data.endDate) nextExtra.end_date = body.data.endDate;
      if (body.data.status) {
        nextExtra.validated_by = request.user!.id;
        nextExtra.validated_at = new Date().toISOString();
      }
      const nextStatus = body.data.status ?? existing.rows[0].status;
      const nextUserId = body.data.userId ?? existing.rows[0].user_id;
      const { rows } = await pool.query(
        `UPDATE orders
         SET status = $2, raw_legacy = $3::jsonb, user_id = $4
         WHERE id = $1
         RETURNING *`,
        [params.data.id, nextStatus, JSON.stringify(nextExtra), nextUserId],
      );
      const order = rows[0];
      if (body.data.status === "validated") {
        const plan = String(nextExtra.plan_type ?? nextExtra.plan ?? "essential");
        const orgId = order.organization_id as string | null;
        const userId = order.user_id as string | null;
        if (orgId) {
          await pool.query(
            `UPDATE organizations
             SET subscription_plan = $2, subscription_status = 'active', updated_at = now()
             WHERE id = $1`,
            [orgId, plan],
          );
        }
        if (userId) {
          const found = await pool.query(
            `SELECT id FROM user_subscriptions WHERE user_id = $1 LIMIT 1`,
            [userId],
          );
          if (found.rows[0]) {
            await pool.query(
              `UPDATE user_subscriptions SET plan_code = $2, status = 'active'
               WHERE id = $1`,
              [found.rows[0].id, plan],
            );
          } else {
            await pool.query(
              `INSERT INTO user_subscriptions (organization_id, user_id, plan_code, status)
               VALUES ($1,$2,$3,'active')`,
              [orgId, userId, plan],
            );
          }
        }
      }
      return { order: mapOrder(order) };
    },
  );

  app.delete(
    "/v1/admin/orders/:id",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      await pool.query(`DELETE FROM orders WHERE id = $1`, [params.data.id]);
      return { ok: true };
    },
  );

  app.get(
    "/v1/admin/blog",
    { preHandler: [app.requireSuperAdmin] },
    async () => {
      const { rows } = await pool.query(
        `SELECT * FROM blog_posts ORDER BY created_at DESC LIMIT 500`,
      );
      return { items: rows.map(mapBlog) };
    },
  );

  app.post(
    "/v1/admin/blog",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const parsed = adminBlogSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const slug = d.slug || slugify(d.title);
      const published = d.status === "published";
      const html = sanitizeBlogHtml(d.content ?? "");
      const { rows } = await pool.query(
        `INSERT INTO blog_posts
           (slug, title, excerpt, content, body_html_sanitized, author_name, author_user_id,
            featured_image_url, status, published, published_at, tags, meta_title, meta_description, language)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [
          slug,
          d.title,
          d.excerpt ?? null,
          d.content ?? null,
          html,
          d.authorName ?? null,
          request.user!.id,
          d.featuredImageUrl ?? null,
          d.status ?? "draft",
          published,
          published ? new Date().toISOString() : null,
          d.tags ?? [],
          d.metaTitle ?? null,
          d.metaDescription ?? null,
          d.language ?? "fr",
        ],
      );
      return { post: mapBlog(rows[0]) };
    },
  );

  app.patch(
    "/v1/admin/blog/:id",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = adminBlogSchema.partial().safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid blog patch" });
      }
      const d = parsed.data;
      const html = d.content != null ? sanitizeBlogHtml(d.content) : null;
      const published = d.status === "published" ? true : d.status === "draft" ? false : null;
      const { rows } = await pool.query(
        `UPDATE blog_posts SET
           title = COALESCE($2, title),
           slug = COALESCE($3, slug),
           excerpt = COALESCE($4, excerpt),
           content = COALESCE($5, content),
           body_html_sanitized = COALESCE($6, body_html_sanitized),
           author_name = COALESCE($7, author_name),
           featured_image_url = COALESCE($8, featured_image_url),
           status = COALESCE($9, status),
           published = COALESCE($10, published),
           published_at = CASE WHEN $10 = true THEN COALESCE(published_at, now()) ELSE published_at END,
           tags = COALESCE($11, tags),
           meta_title = COALESCE($12, meta_title),
           meta_description = COALESCE($13, meta_description),
           language = COALESCE($14, language),
           updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          params.data.id,
          d.title ?? null,
          d.slug ?? null,
          d.excerpt ?? null,
          d.content ?? null,
          html,
          d.authorName ?? null,
          d.featuredImageUrl ?? null,
          d.status ?? null,
          published,
          d.tags ?? null,
          d.metaTitle ?? null,
          d.metaDescription ?? null,
          d.language ?? null,
        ],
      );
      if (!rows[0]) {
        return reply.code(404).send({ error: "Post not found" });
      }
      return { post: mapBlog(rows[0]) };
    },
  );

  app.delete(
    "/v1/admin/blog/:id",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      await pool.query(`DELETE FROM blog_posts WHERE id = $1`, [params.data.id]);
      return { ok: true };
    },
  );

  app.get(
    "/v1/admin/promo-codes",
    { preHandler: [app.requireSuperAdmin] },
    async () => {
      const { rows } = await pool.query(
        `SELECT * FROM promo_codes ORDER BY created_at DESC`,
      );
      return { items: rows.map(mapPromo) };
    },
  );

  app.post(
    "/v1/admin/promo-codes",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const parsed = adminPromoSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const payload = {
        description: d.description ?? null,
        discount_type: d.discountType ?? "percentage",
        discount_value: d.discountValue ?? d.discountPercent ?? 0,
        minimum_amount: d.minimumAmount ?? 0,
        max_uses: d.maxUses ?? null,
        current_uses: 0,
        valid_from: d.validFrom ?? new Date().toISOString().slice(0, 10),
        valid_until: d.validUntil ?? null,
        applicable_plans: d.applicablePlans ?? [],
      };
      try {
        const { rows } = await pool.query(
          `INSERT INTO promo_codes (code, discount_percent, active, payload)
           VALUES ($1,$2,$3,$4::jsonb)
           RETURNING *`,
          [
            d.code.toUpperCase(),
            payload.discount_type === "percentage" ? payload.discount_value : null,
            d.isActive ?? true,
            JSON.stringify(payload),
          ],
        );
        return { promo: mapPromo(rows[0]) };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Insert failed";
        if (message.includes("duplicate") || message.includes("unique")) {
          return reply.code(409).send({ error: "Ce code promo existe déjà" });
        }
        throw err;
      }
    },
  );

  app.patch(
    "/v1/admin/promo-codes/:id",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      const parsed = adminPromoSchema.partial().safeParse(request.body ?? {});
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid promo patch" });
      }
      const existing = await pool.query(`SELECT * FROM promo_codes WHERE id = $1`, [
        params.data.id,
      ]);
      if (!existing.rows[0]) {
        return reply.code(404).send({ error: "Promo not found" });
      }
      const d = parsed.data;
      const prev = extra(existing.rows[0]);
      const payload = {
        ...prev,
        description: d.description ?? prev.description,
        discount_type: d.discountType ?? prev.discount_type,
        discount_value: d.discountValue ?? d.discountPercent ?? prev.discount_value,
        minimum_amount: d.minimumAmount ?? prev.minimum_amount,
        max_uses: d.maxUses === undefined ? prev.max_uses : d.maxUses,
        valid_from: d.validFrom ?? prev.valid_from,
        valid_until: d.validUntil === undefined ? prev.valid_until : d.validUntil,
        applicable_plans: d.applicablePlans ?? prev.applicable_plans,
        updated_at: new Date().toISOString(),
      };
      const { rows } = await pool.query(
        `UPDATE promo_codes SET
           code = COALESCE($2, code),
           discount_percent = COALESCE($3, discount_percent),
           active = COALESCE($4, active),
           payload = $5::jsonb
         WHERE id = $1
         RETURNING *`,
        [
          params.data.id,
          d.code ? d.code.toUpperCase() : null,
          payload.discount_type === "percentage" ? payload.discount_value : existing.rows[0].discount_percent,
          d.isActive ?? null,
          JSON.stringify(payload),
        ],
      );
      return { promo: mapPromo(rows[0]) };
    },
  );

  app.delete(
    "/v1/admin/promo-codes/:id",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const params = orgIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid id" });
      }
      await pool.query(`DELETE FROM promo_codes WHERE id = $1`, [params.data.id]);
      return { ok: true };
    },
  );

  app.post(
    "/v1/admin/organizations",
    { preHandler: [app.requireSuperAdmin] },
    async (request, reply) => {
      const parsed = adminCreateOrgSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      const email = d.email.toLowerCase();
      const exists = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (exists.rows[0]) {
        return reply.code(409).send({ error: "Email already registered" });
      }
      const hash = await bcrypt.hash(d.password, 12);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const user = await client.query(
          `INSERT INTO users (email, password_hash, full_name)
           VALUES ($1,$2,$3) RETURNING id, email, full_name`,
          [email, hash, d.fullName],
        );
        const userId = user.rows[0].id as string;
        const slug = `${slugify(d.name)}-${userId.slice(0, 8)}`;
        const org = await client.query(
          `INSERT INTO organizations (name, slug, sector, user_id, subscription_plan, subscription_status)
           VALUES ($1,$2,$3,$4,$5,'active')
           RETURNING id, name, slug`,
          [d.name, slug, d.sector ?? null, userId, d.plan ?? "essential"],
        );
        const orgId = org.rows[0].id as string;
        await client.query(
          `INSERT INTO organization_members (organization_id, user_id, role)
           VALUES ($1,$2,'owner')`,
          [orgId, userId],
        );
        await client.query(
          `INSERT INTO profiles (user_id, full_name, company_name, phone, sector)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (user_id) DO UPDATE
             SET full_name = EXCLUDED.full_name, company_name = EXCLUDED.company_name`,
          [userId, d.fullName, d.name, d.phone ?? null, d.sector ?? null],
        );
        await client.query("COMMIT");
        return {
          organization: org.rows[0],
          user: { id: userId, email },
        };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  );
}
