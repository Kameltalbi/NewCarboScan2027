import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool, rawPool } from "../db.js";
import { signWebhookBody, verifyWebhookSignature } from "../lib/webhookHmac.js";
import { decryptSecret, encryptSecret } from "../lib/secretBox.js";

export async function dispatchOrgWebhooks(
  organizationId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, url, secret_hash FROM organization_webhooks
     WHERE organization_id = $1 AND is_active = true AND revoked_at IS NULL
       AND (events @> ARRAY[$2]::text[] OR events @> ARRAY['*']::text[])`,
    [organizationId, event],
  );
  const body = JSON.stringify({ event, organizationId, payload, ts: Date.now() });
  for (const hook of rows) {
    const secret = decryptSecret(hook.secret_hash as string);
    const sig = signWebhookBody(secret, body);
    try {
      const res = await fetch(hook.url as string, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-signature": sig,
          "x-carboscan-event": event,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, organization_id, event, status_code)
         VALUES ($1,$2,$3,$4)`,
        [hook.id, organizationId, event, res.status],
      );
    } catch (err) {
      await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, organization_id, event, error)
         VALUES ($1,$2,$3,$4)`,
        [
          hook.id,
          organizationId,
          event,
          err instanceof Error ? err.message : "delivery_failed",
        ],
      );
    }
  }
}

export async function registerWebhookRoutes(app: FastifyInstance) {
  app.get(
    "/v1/org/webhooks",
    { preHandler: [app.requireOrgAdmin] },
    async (request) => {
      const { rows } = await pool.query(
        `SELECT id, url, secret_prefix, events, is_active, created_at, revoked_at
         FROM organization_webhooks
         WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [request.user!.organizationId],
      );
      return { items: rows };
    },
  );

  app.post(
    "/v1/org/webhooks",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const parsed = z
        .object({
          url: z.string().url().max(2000),
          events: z.array(z.string().max(80)).max(20).optional(),
        })
        .safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const plaintext = `whsec_${randomBytes(24).toString("base64url")}`;
      const secretHash = encryptSecret(plaintext);
      const { rows } = await pool.query(
        `INSERT INTO organization_webhooks
           (organization_id, url, secret_hash, secret_prefix, events, created_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, url, secret_prefix, events, is_active, created_at`,
        [
          request.user!.organizationId,
          parsed.data.url,
          secretHash,
          plaintext.slice(0, 12),
          parsed.data.events ?? ["evidence.validated", "run.published"],
          request.user!.id,
        ],
      );
      return { item: rows[0], secret: plaintext };
    },
  );

  app.delete(
    "/v1/org/webhooks/:id",
    { preHandler: [app.requireOrgAdmin] },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;
      const { rowCount } = await pool.query(
        `UPDATE organization_webhooks
         SET revoked_at = now(), is_active = false
         WHERE id = $1 AND organization_id = $2 AND revoked_at IS NULL`,
        [id, request.user!.organizationId],
      );
      if (!rowCount) return reply.code(404).send({ error: "Webhook not found" });
      return { ok: true };
    },
  );

  app.post("/v1/webhooks/incoming/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const { rows } = await rawPool.query(
      `SELECT id, organization_id, secret_hash, is_active, revoked_at
       FROM organization_webhooks WHERE id = $1`,
      [id],
    );
    const hook = rows[0];
    if (!hook || hook.revoked_at || hook.is_active === false) {
      return reply.code(404).send({ error: "Unknown webhook" });
    }
    const raw = JSON.stringify(request.body ?? {});
    const header = request.headers["x-webhook-signature"];
    const sig = Array.isArray(header) ? header[0] : header;
    const secret = decryptSecret(hook.secret_hash as string);
    if (!verifyWebhookSignature(secret, raw, sig)) {
      return reply.code(401).send({ error: "Invalid webhook signature" });
    }
    await rawPool.query(
      `INSERT INTO webhook_deliveries (webhook_id, organization_id, event, status_code)
       VALUES ($1,$2,'incoming',200)`,
      [hook.id, hook.organization_id],
    );
    return { ok: true };
  });
}
