import type { FastifyInstance } from "fastify";
import {
  calculateCarbonBalance,
  buildFactualReportCommentary,
} from "@newcarboscan/carbon-engine";
import { pool } from "../db.js";
import {
  freeBilanSchema,
  publicLeadSchema,
} from "../schemas/public.js";
import {
  FREE_BILAN_FACTOR_PACK,
  buildFreeBilanLines,
} from "../services/freeBilan.js";

function sanitizeBlogHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+=(["']).*?\1/gi, "")
    .replace(/\son\w+=\S+/gi, "");
}

export async function registerPublicRoutes(app: FastifyInstance) {
  app.post("/v1/public/leads", async (request, reply) => {
    const parsed = publicLeadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const d = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO contact_requests
        (request_type, email, phone, company_name, full_name, message, payload, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, created_at`,
      [
        d.requestType,
        d.email.toLowerCase(),
        d.phone ?? null,
        d.companyName ?? null,
        d.fullName ?? null,
        d.message ?? null,
        JSON.stringify(d.payload ?? {}),
        request.ip,
      ],
    );
    return {
      ok: true,
      id: rows[0].id,
      createdAt: rows[0].created_at,
      note:
        d.requestType === "guide_download"
          ? "Lead enregistré. L'envoi email du guide sera branché sans stockage Supabase."
          : "Lead enregistré.",
    };
  });

  app.get("/v1/public/blog", async (request) => {
    const lang =
      typeof (request.query as { lang?: string }).lang === "string"
        ? (request.query as { lang?: string }).lang!.slice(0, 2)
        : "fr";
    const { rows } = await pool.query(
      `SELECT id, title, slug, excerpt, author_name, featured_image_url,
              published_at, tags, meta_title, meta_description, language, created_at
       FROM blog_posts
       WHERE published = true
         AND (status = 'published' OR status IS NULL)
         AND language = $1
         AND (published_at IS NULL OR published_at <= now())
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT 100`,
      [lang],
    );
    return { items: rows };
  });

  app.get("/v1/public/blog/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { rows } = await pool.query(
      `SELECT id, title, slug, excerpt,
              COALESCE(body_html_sanitized, content, '') AS content,
              author_name, featured_image_url, published_at, tags,
              meta_title, meta_description, language, created_at
       FROM blog_posts
       WHERE slug = $1
         AND published = true
         AND (status = 'published' OR status IS NULL)
       LIMIT 1`,
      [slug],
    );
    if (!rows[0]) return reply.code(404).send({ error: "Not found" });
    const post = rows[0];
    post.content = sanitizeBlogHtml(String(post.content ?? ""));
    return { post };
  });

  app.get("/v1/public/emission-factors", async () => {
    const items = Object.entries(FREE_BILAN_FACTOR_PACK.factors).map(
      ([key, factor]) => ({
        id: factor.id,
        key,
        name: key,
        emission_factor: factor.value,
        unit: factor.unit,
        scope: factor.scope,
        source: FREE_BILAN_FACTOR_PACK.version,
        geography: FREE_BILAN_FACTOR_PACK.geography,
        category: `scope${factor.scope}`,
      }),
    );
    return {
      pack: FREE_BILAN_FACTOR_PACK.version,
      total: items.length,
      items,
      note: "Pack public du testeur gratuit. Le registre complet sera porté avec les tables.",
    };
  });

  app.post("/v1/public/free-bilan/calculate", async (request, reply) => {
    const parsed = freeBilanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const lines = buildFreeBilanLines(parsed.data.answers);
    if (lines.length === 0) {
      return reply.code(400).send({
        error: "Aucune donnée d'activité exploitable pour le calcul",
      });
    }

    const result = calculateCarbonBalance(lines);
    const commentary = buildFactualReportCommentary(result);

    if (parsed.data.lead?.email) {
      await pool.query(
        `INSERT INTO contact_requests
          (request_type, email, company_name, full_name, message, payload, ip)
         VALUES ('free_bilan',$1,$2,$3,$4,$5,$6)`,
        [
          parsed.data.lead.email.toLowerCase(),
          parsed.data.lead.companyName ??
            parsed.data.answers.company_name ??
            null,
          parsed.data.lead.fullName ?? null,
          "Testeur gratuit bilan carbone",
          JSON.stringify({
            resultHash: result.resultHash,
            totals: result.totals,
            factorPack: FREE_BILAN_FACTOR_PACK.version,
          }),
          request.ip,
        ],
      );
    }

    const categories = result.lines.map((l) => ({
      key: l.lineKey,
      value: Number(l.resultKgCo2e),
      scope: l.scope,
      formula: l.formula,
      factorId: l.factorId,
    }));

    return {
      factorPack: FREE_BILAN_FACTOR_PACK.version,
      engineVersion: result.engineVersion,
      totals: {
        scope1: Number(result.totals.scope1),
        scope2: Number(result.totals.scope2),
        scope3: Number(result.totals.scope3),
        total: Number(result.totals.total),
      },
      categories,
      inputHash: result.inputHash,
      resultHash: result.resultHash,
      commentary,
      disclaimer:
        "Estimation indicative basée sur un pack de facteurs public versionné. Ce n'est pas un bilan certifié. Aucune trajectoire climatique ni ROI n'est affirmé.",
    };
  });
}
