#!/usr/bin/env node
/**
 * Import CLI — charge un dump JSON CarboScan dans Newcarboscan-2027.
 *
 * Format attendu (fichier ou stdin):
 * {
 *   "label": "migration-client-acme",
 *   "entities": {
 *     "users": [ { "id": "...", "email": "..." }, ... ],
 *     "organizations": [ ... ],
 *     "activity_data": [ ... ]
 *   }
 * }
 *
 * Usage:
 *   IMPORT_ADMIN_TOKEN=... API_URL=http://localhost:8080 \
 *     node scripts/import-client-dump.mjs ./dump.json
 *
 * Auth: header X-Import-Token (bootstrap) OU Bearer JWT owner/admin.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const API_URL = process.env.API_URL ?? "http://localhost:8080";
const TOKEN = process.env.IMPORT_ADMIN_TOKEN ?? "";
const BEARER = process.env.IMPORT_BEARER ?? "";

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers["X-Import-Token"] = TOKEN;
  if (BEARER) headers.Authorization = `Bearer ${BEARER}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/import-client-dump.mjs <dump.json>");
    process.exit(1);
  }
  const dump = JSON.parse(readFileSync(resolve(file), "utf8"));
  const catalog = await api("/v1/import/catalog");
  const order = catalog.items.map((i) => i.entity_type);

  if (!TOKEN && !BEARER) {
    console.error("Set IMPORT_ADMIN_TOKEN (recommended) or IMPORT_BEARER");
    process.exit(1);
  }

  const batchRes = await api("/v1/import/batches", {
    method: "POST",
    body: {
      label: dump.label ?? `import-${new Date().toISOString()}`,
      targetOrganizationId: dump.targetOrganizationId,
      source: "carboscan_supabase",
    },
  });
  const batchId = batchRes.batch.id;
  console.log("Batch", batchId);

  for (const entityType of order) {
    const rows = dump.entities?.[entityType];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    console.log(`Staging ${entityType}: ${rows.length}`);
    // chunk 500
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((payload) => ({
        legacyId: payload.id ?? payload.user_id ?? null,
        payload,
      }));
      await api(`/v1/import/batches/${batchId}/stage`, {
        method: "POST",
        body: { entityType, rows: chunk },
      });
    }
  }

  console.log("Processing…");
  const result = await api(`/v1/import/batches/${batchId}/process`, {
    method: "POST",
    body: { limitPerEntity: 20000 },
  });
  console.log(JSON.stringify(result, null, 2));

  const status = await api(`/v1/import/batches/${batchId}`);
  console.log("Final status:", status.batch.status);
  console.log("Staging summary:", status.staging);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
