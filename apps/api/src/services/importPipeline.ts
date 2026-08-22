import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { pool } from "../db.js";

export const LEGACY_SOURCE = "carboscan_supabase";

export type StageRow = {
  legacyId?: string | null;
  payload: Record<string, unknown>;
};

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function asUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  )
    ? v
    : null;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "org"
  );
}

async function mapId(
  client: PoolClient,
  entityType: string,
  legacyId: string,
  newId: string,
  organizationId: string | null,
  batchId: string,
) {
  await client.query(
    `INSERT INTO import_id_map (entity_type, legacy_id, new_id, organization_id, batch_id)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (entity_type, legacy_id) DO UPDATE
       SET new_id = EXCLUDED.new_id,
           organization_id = COALESCE(EXCLUDED.organization_id, import_id_map.organization_id),
           batch_id = EXCLUDED.batch_id`,
    [entityType, legacyId, newId, organizationId, batchId],
  );
}

async function resolveId(
  client: PoolClient,
  entityType: string,
  legacyId: string | null | undefined,
): Promise<string | null> {
  if (!legacyId) return null;
  const direct = asUuid(legacyId);
  const { rows } = await client.query(
    `SELECT new_id FROM import_id_map WHERE entity_type = $1 AND legacy_id = $2`,
    [entityType, legacyId],
  );
  if (rows[0]?.new_id) return rows[0].new_id as string;
  return direct;
}

export async function createImportBatch(input: {
  label: string;
  targetOrganizationId?: string;
  createdBy?: string;
  source?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO import_batches (label, source, target_organization_id, status, created_by, manifest)
     VALUES ($1, $2::import_source, $3, 'draft', $4, '{}'::jsonb)
     RETURNING *`,
    [
      input.label,
      input.source ?? "carboscan_supabase",
      input.targetOrganizationId ?? null,
      input.createdBy ?? null,
    ],
  );
  return rows[0];
}

export async function stageEntityRows(
  batchId: string,
  entityType: string,
  rows: StageRow[],
) {
  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      const payload = row.payload;
      const legacyId =
        row.legacyId ??
        (typeof payload.id === "string" ? payload.id : null) ??
        (typeof payload.user_id === "string" ? payload.user_id : null);
      const payloadHash = hashPayload(payload);
      const result = await client.query(
        `INSERT INTO import_staging
          (batch_id, entity_type, legacy_id, payload, payload_hash, status)
         VALUES ($1,$2,$3,$4,$5,'pending')
         ON CONFLICT (batch_id, entity_type, payload_hash) DO NOTHING
         RETURNING id`,
        [batchId, entityType, legacyId, JSON.stringify(payload), payloadHash],
      );
      if (result.rowCount) inserted += 1;
      else skipped += 1;
    }
    await client.query(
      `UPDATE import_batches
       SET status = 'staging',
           manifest = jsonb_set(
             COALESCE(manifest, '{}'::jsonb),
             ARRAY[$2],
             to_jsonb(COALESCE((manifest->>$2)::int, 0) + $3)
           ),
           updated_at = now()
       WHERE id = $1`,
      [batchId, entityType, inserted],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return { inserted, skipped };
}

type Importer = (
  client: PoolClient,
  batchId: string,
  stagingId: string,
  payload: Record<string, unknown>,
  legacyId: string | null,
) => Promise<string | null>;

const importers: Record<string, Importer> = {
  users: async (client, batchId, _stagingId, payload, legacyId) => {
    const id = asUuid(payload.id) ?? asUuid(legacyId) ?? cryptoRandomUuid();
    const email = String(payload.email ?? `${id}@imported.local`).toLowerCase();
    const fullName =
      (payload.full_name as string) ||
      (payload.raw_user_meta_data as { full_name?: string } | undefined)?.full_name ||
      null;
    const tempPassword = randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await client.query(
      `INSERT INTO users
        (id, email, password_hash, full_name, is_active, must_reset_password,
         legacy_source, legacy_id, import_batch_id, imported_at, raw_legacy)
       VALUES ($1,$2,$3,$4,true,true,$5,$6,$7,now(),$8)
       ON CONFLICT (email) DO UPDATE SET
         legacy_id = COALESCE(users.legacy_id, EXCLUDED.legacy_id),
         legacy_source = EXCLUDED.legacy_source,
         import_batch_id = EXCLUDED.import_batch_id,
         imported_at = now(),
         raw_legacy = EXCLUDED.raw_legacy,
         updated_at = now()
       RETURNING id`,
      [
        id,
        email,
        passwordHash,
        fullName,
        LEGACY_SOURCE,
        legacyId ?? id,
        batchId,
        JSON.stringify(payload),
      ],
    );
    const { rows } = await client.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);
    const newId = rows[0].id as string;
    await mapId(client, "users", legacyId ?? id, newId, null, batchId);
    if (legacyId && legacyId !== newId) {
      await mapId(client, "users", String(payload.id ?? legacyId), newId, null, batchId);
    }
    return newId;
  },

  organizations: async (client, batchId, _s, payload, legacyId) => {
    const id = asUuid(payload.id) ?? asUuid(legacyId) ?? cryptoRandomUuid();
    const name = String(payload.name ?? payload.nom_entreprise ?? "Organisation importée");
    const slugBase = slugify(name);
    const slug = `${slugBase}-${id.slice(0, 8)}`;
    let ownerId: string | null = null;
    if (payload.user_id) {
      const mapped = await resolveId(client, "users", String(payload.user_id));
      if (mapped) {
        const exists = await client.query(`SELECT 1 FROM users WHERE id = $1`, [mapped]);
        if (exists.rowCount) ownerId = mapped;
      }
    }
    await client.query(
      `INSERT INTO organizations
        (id, name, slug, user_id, country, sector, reference_year, currency,
         energy_unit, mass_unit, distance_unit, logo_url, pilot_name, legal_name,
         subscription_plan, subscription_status, max_users,
         legacy_source, legacy_id, import_batch_id, imported_at, raw_legacy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now(),$21)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         user_id = COALESCE(EXCLUDED.user_id, organizations.user_id),
         country = COALESCE(EXCLUDED.country, organizations.country),
         sector = COALESCE(EXCLUDED.sector, organizations.sector),
         reference_year = COALESCE(EXCLUDED.reference_year, organizations.reference_year),
         currency = COALESCE(EXCLUDED.currency, organizations.currency),
         energy_unit = COALESCE(EXCLUDED.energy_unit, organizations.energy_unit),
         mass_unit = COALESCE(EXCLUDED.mass_unit, organizations.mass_unit),
         distance_unit = COALESCE(EXCLUDED.distance_unit, organizations.distance_unit),
         logo_url = COALESCE(EXCLUDED.logo_url, organizations.logo_url),
         pilot_name = COALESCE(EXCLUDED.pilot_name, organizations.pilot_name),
         legal_name = COALESCE(EXCLUDED.legal_name, organizations.legal_name),
         subscription_plan = COALESCE(EXCLUDED.subscription_plan, organizations.subscription_plan),
         subscription_status = COALESCE(EXCLUDED.subscription_status, organizations.subscription_status),
         max_users = COALESCE(EXCLUDED.max_users, organizations.max_users),
         legacy_source = EXCLUDED.legacy_source,
         legacy_id = EXCLUDED.legacy_id,
         import_batch_id = EXCLUDED.import_batch_id,
         imported_at = now(),
         raw_legacy = EXCLUDED.raw_legacy,
         updated_at = now()`,
      [
        id,
        name,
        slug,
        ownerId,
        payload.country ?? null,
        payload.sector ?? null,
        payload.reference_year ?? null,
        payload.currency ?? null,
        payload.energy_unit ?? null,
        payload.mass_unit ?? null,
        payload.distance_unit ?? null,
        payload.logo_url ?? null,
        payload.pilot_name ?? null,
        payload.legal_name ?? null,
        payload.subscription_plan ?? payload.plan_type ?? null,
        payload.subscription_status ?? null,
        payload.max_users ?? null,
        LEGACY_SOURCE,
        legacyId ?? id,
        batchId,
        JSON.stringify(payload),
      ],
    );
    await mapId(client, "organizations", legacyId ?? id, id, id, batchId);
    return id;
  },

  organization_members: async (client, batchId, _s, payload, _legacyId) => {
    const orgId = await resolveId(
      client,
      "organizations",
      String(payload.organization_id ?? ""),
    );
    const userId = await resolveId(client, "users", String(payload.user_id ?? ""));
    if (!orgId || !userId) {
      throw new Error("organization_members: org/user unresolved");
    }
    const role = String(payload.role ?? "viewer");
    const roleMap: Record<string, string> = {
      owner: "owner",
      admin: "admin",
      editor: "editor",
      viewer: "viewer",
      financeur: "financeur",
      auditor: "auditor",
      member: "viewer", // enum legacy org_member_role
    };
    const safeRole = roleMap[role] ?? "viewer";
    await client.query(
      `INSERT INTO organization_members (organization_id, user_id, role)
       VALUES ($1,$2,$3::org_role)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [orgId, userId, safeRole],
    );
    await mapId(
      client,
      "organization_members",
      `${orgId}:${userId}`,
      userId,
      orgId,
      batchId,
    );
    return userId;
  },

  profiles: async (client, batchId, _s, payload, legacyId) => {
    const userId = await resolveId(
      client,
      "users",
      String(payload.user_id ?? payload.id ?? legacyId ?? ""),
    );
    if (!userId) throw new Error("profiles: user unresolved");
    await client.query(
      `INSERT INTO profiles
        (user_id, full_name, company_name, sector, company_size, phone,
         legacy_source, legacy_id, import_batch_id, imported_at, raw_legacy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10)
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
         company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
         sector = COALESCE(EXCLUDED.sector, profiles.sector),
         phone = COALESCE(EXCLUDED.phone, profiles.phone),
         raw_legacy = EXCLUDED.raw_legacy,
         imported_at = now(),
         import_batch_id = EXCLUDED.import_batch_id`,
      [
        userId,
        payload.full_name ?? null,
        payload.company_name ?? null,
        payload.sector ?? null,
        payload.company_size ?? null,
        payload.phone ?? null,
        LEGACY_SOURCE,
        legacyId ?? userId,
        batchId,
        JSON.stringify(payload),
      ],
    );
    await mapId(client, "profiles", legacyId ?? userId, userId, null, batchId);
    return userId;
  },

  activity_data: async (client, batchId, _s, payload, legacyId) => {
    const id = asUuid(payload.id) ?? asUuid(legacyId) ?? cryptoRandomUuid();
    const orgId = await resolveId(
      client,
      "organizations",
      String(payload.organization_id ?? ""),
    );
    if (!orgId) throw new Error("activity_data: organization unresolved");
    const qty = Number(payload.quantity ?? 0);
    const unit = String(payload.unit ?? "unit");
    await client.query(
      `INSERT INTO activity_data
        (id, organization_id, category, subcategory, scope, quantity, unit,
         period_start, period_end, activity_type, data_quality, notes,
         emission_factor_source, source_document,
         legacy_source, legacy_id, import_batch_id, imported_at, raw_legacy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,'estimated'),$12,$13,$14,$15,$16,$17,now(),$18)
       ON CONFLICT (id) DO UPDATE SET
         quantity = EXCLUDED.quantity,
         unit = EXCLUDED.unit,
         raw_legacy = EXCLUDED.raw_legacy,
         imported_at = now(),
         import_batch_id = EXCLUDED.import_batch_id,
         updated_at = now()`,
      [
        id,
        orgId,
        payload.category ?? payload.activity_type ?? "imported",
        payload.subcategory ?? null,
        payload.scope ?? payload.scope_hint ?? null,
        qty,
        unit,
        payload.period_start ?? null,
        payload.period_end ?? null,
        payload.activity_type ?? null,
        payload.data_quality ?? "estimated",
        payload.notes ?? null,
        payload.emission_factor_source ?? null,
        payload.source_document ?? null,
        LEGACY_SOURCE,
        legacyId ?? id,
        batchId,
        JSON.stringify(payload),
      ],
    );
    await mapId(client, "activity_data", legacyId ?? id, id, orgId, batchId);
    return id;
  },

  bilans_carbone: async (client, batchId, _s, payload, legacyId) => {
    const id = asUuid(payload.id) ?? asUuid(legacyId) ?? cryptoRandomUuid();
    let orgId = await resolveId(
      client,
      "organizations",
      String(payload.organization_id ?? ""),
    );
    // Legacy bilans sometimes only have user_id / company_id
    if (!orgId && payload.user_id) {
      const { rows } = await client.query(
        `SELECT organization_id FROM organization_members WHERE user_id = $1 LIMIT 1`,
        [await resolveId(client, "users", String(payload.user_id))],
      );
      orgId = rows[0]?.organization_id ?? null;
    }
    if (!orgId) throw new Error("bilans_carbone: organization unresolved");
    const year = Number(payload.year ?? payload.reference_year ?? new Date().getFullYear());
    const total = payload.total_kgco2e ?? payload.total_emission ?? null;
    const s1 = payload.scope1_kgco2e ?? payload.scope1_emission ?? null;
    const s2 = payload.scope2_kgco2e ?? payload.scope2_emission ?? null;
    const s3 = payload.scope3_kgco2e ?? payload.scope3_emission ?? null;
    const dateBilan = payload.date_bilan ?? `${year}-12-31`;
    await client.query(
      `INSERT INTO bilans_carbone
        (id, organization_id, name, year, status,
         total_kgco2e, scope1_kgco2e, scope2_kgco2e, scope3_kgco2e,
         total_emission, scope1_emission, scope2_emission, scope3_emission,
         date_bilan, analyse_commentaire, questionnaire_data,
         legacy_source, legacy_id, import_batch_id, imported_at, raw_legacy)
       VALUES ($1,$2,$3,$4,COALESCE($5,'imported'),$6,$7,$8,$9,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),$16)
       ON CONFLICT (id) DO UPDATE SET
         total_kgco2e = EXCLUDED.total_kgco2e,
         scope1_kgco2e = EXCLUDED.scope1_kgco2e,
         scope2_kgco2e = EXCLUDED.scope2_kgco2e,
         scope3_kgco2e = EXCLUDED.scope3_kgco2e,
         total_emission = EXCLUDED.total_emission,
         scope1_emission = EXCLUDED.scope1_emission,
         scope2_emission = EXCLUDED.scope2_emission,
         scope3_emission = EXCLUDED.scope3_emission,
         date_bilan = COALESCE(EXCLUDED.date_bilan, bilans_carbone.date_bilan),
         raw_legacy = EXCLUDED.raw_legacy,
         imported_at = now(),
         updated_at = now()`,
      [
        id,
        orgId,
        payload.name ?? `Bilan ${payload.year ?? year}`,
        year,
        payload.status ?? "imported",
        total,
        s1,
        s2,
        s3,
        dateBilan,
        payload.analyse_commentaire ?? null,
        payload.questionnaire_data ? JSON.stringify(payload.questionnaire_data) : null,
        LEGACY_SOURCE,
        legacyId ?? id,
        batchId,
        JSON.stringify(payload),
      ],
    );
    await mapId(client, "bilans_carbone", legacyId ?? id, id, orgId, batchId);
    return id;
  },
};

/** Generic JSONB-first upsert for shell tables */
function makeJsonShellImporter(
  entityType: string,
  table: string,
  opts: {
    orgRequired: boolean;
    nameColumn?: "name" | "title" | null;
    extraFk?: Array<{ column: string; entityType: string; payloadKey: string; required?: boolean }>;
  },
): Importer {
  return async (client, batchId, _s, payload, legacyId) => {
    const id = asUuid(payload.id) ?? asUuid(legacyId) ?? cryptoRandomUuid();
    let orgId: string | null = null;
    if (payload.organization_id) {
      orgId = await resolveId(
        client,
        "organizations",
        String(payload.organization_id),
      );
    }
    if (opts.orgRequired && !orgId) {
      throw new Error(`${entityType}: organization unresolved`);
    }

    const extras: Record<string, string> = {};
    for (const fk of opts.extraFk ?? []) {
      const resolved = await resolveId(
        client,
        fk.entityType,
        String(payload[fk.payloadKey] ?? ""),
      );
      if (!resolved && fk.required) {
        throw new Error(`${entityType}: ${fk.payloadKey} unresolved`);
      }
      if (resolved) extras[fk.column] = resolved;
    }

    const label =
      (payload.name as string) ||
      (payload.title as string) ||
      (payload.label as string) ||
      (payload.poste_nom as string) ||
      "imported";

    const columns: string[] = ["id"];
    const params: unknown[] = [id];
    const placeholders: string[] = ["$1"];

    const add = (col: string, value: unknown, cast?: string) => {
      columns.push(col);
      params.push(value);
      placeholders.push(
        cast ? `$${params.length}::${cast}` : `$${params.length}`,
      );
    };

    if (orgId !== null || opts.orgRequired) add("organization_id", orgId);
    if (opts.nameColumn === "name") add("name", label);
    if (opts.nameColumn === "title") add("title", label);
    for (const [col, value] of Object.entries(extras)) add(col, value);

    // champs métier fréquents si présents dans le payload
    if (table === "postes_emission") {
      add("poste_nom", payload.poste_nom ?? label);
      add("scope", Number(payload.scope ?? 1));
      add("emission_valeur", Number(payload.emission_valeur ?? payload.emission ?? 0));
      if (payload.unite) add("unite", payload.unite);
      if (payload.facteur_utilise) add("facteur_utilise", payload.facteur_utilise);
    }
    if (table === "collect_files" && payload.filename) {
      add("filename", payload.filename);
      if (payload.storage_uri || payload.file_url) {
        add("storage_uri", payload.storage_uri ?? payload.file_url);
      }
    }
    if (table === "collect_responses") {
      if (payload.field_key) add("field_key", payload.field_key);
      if (payload.value !== undefined) add("value", JSON.stringify(payload.value), "jsonb");
    }

    add("legacy_source", LEGACY_SOURCE);
    add("legacy_id", legacyId ?? id);
    add("import_batch_id", batchId);
    columns.push("imported_at");
    placeholders.push("now()");
    add("raw_legacy", JSON.stringify(payload), "jsonb");

    const updates = columns
      .filter((c) => c !== "id" && c !== "imported_at")
      .map((c) => `${c} = EXCLUDED.${c}`)
      .concat(["imported_at = now()"])
      .join(", ");

    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      params,
    );

    await mapId(client, entityType, legacyId ?? id, id, orgId, batchId);
    return id;
  };
}

// Register JSON shell importers for remaining catalog entities
const JSON_SHELLS: Array<{
  entity: string;
  table: string;
  orgRequired: boolean;
  nameColumn?: "name" | "title" | null;
  extraFk?: Array<{
    column: string;
    entityType: string;
    payloadKey: string;
    required?: boolean;
  }>;
}> = [
  { entity: "collect_sites", table: "collect_sites", orgRequired: true, nameColumn: "name" },
  { entity: "collect_sessions", table: "collect_sessions", orgRequired: true, nameColumn: "name", extraFk: [{ column: "site_id", entityType: "collect_sites", payloadKey: "site_id" }] },
  { entity: "collect_responses", table: "collect_responses", orgRequired: true, nameColumn: null, extraFk: [{ column: "session_id", entityType: "collect_sessions", payloadKey: "session_id", required: true }] },
  { entity: "collect_files", table: "collect_files", orgRequired: true, nameColumn: null, extraFk: [{ column: "session_id", entityType: "collect_sessions", payloadKey: "session_id" }] },
  { entity: "collect_documents", table: "collect_documents", orgRequired: true, nameColumn: "title" },
  { entity: "organization_emission_factors", table: "organization_emission_factors", orgRequired: true, nameColumn: null, extraFk: [{ column: "factor_id", entityType: "emission_factors", payloadKey: "factor_id" }] },
  { entity: "bilans_carbone_detail", table: "bilans_carbone_detail", orgRequired: true, nameColumn: null, extraFk: [{ column: "bilan_id", entityType: "bilans_carbone", payloadKey: "bilan_id", required: true }, { column: "activity_data_id", entityType: "activity_data", payloadKey: "activity_data_id" }] },
  { entity: "postes_emission", table: "postes_emission", orgRequired: false, nameColumn: null, extraFk: [{ column: "bilan_id", entityType: "bilans_carbone", payloadKey: "bilan_id", required: true }] },
  { entity: "cbam_installations", table: "cbam_installations", orgRequired: true, nameColumn: "name" },
  { entity: "cbam_products", table: "cbam_products", orgRequired: true, nameColumn: "name" },
  { entity: "cbam_production", table: "cbam_production", orgRequired: true, nameColumn: null, extraFk: [{ column: "installation_id", entityType: "cbam_installations", payloadKey: "installation_id" }] },
  { entity: "cbam_reports", table: "cbam_reports", orgRequired: true, nameColumn: "title" },
  { entity: "pcf_studies", table: "pcf_studies", orgRequired: true, nameColumn: "name" },
  { entity: "pcf_versions", table: "pcf_versions", orgRequired: true, nameColumn: null, extraFk: [{ column: "study_id", entityType: "pcf_studies", payloadKey: "study_id" }] },
  { entity: "pcf_results", table: "pcf_results", orgRequired: true, nameColumn: null, extraFk: [{ column: "study_id", entityType: "pcf_studies", payloadKey: "study_id" }] },
  { entity: "acv_projects", table: "acv_projects", orgRequired: true, nameColumn: "name" },
  { entity: "inventory", table: "acv_inventory", orgRequired: true, nameColumn: null, extraFk: [{ column: "project_id", entityType: "acv_projects", payloadKey: "project_id" }] },
  { entity: "suppliers", table: "suppliers", orgRequired: true, nameColumn: "name" },
  { entity: "supplier_purchases", table: "supplier_purchases", orgRequired: true, nameColumn: null, extraFk: [{ column: "supplier_id", entityType: "suppliers", payloadKey: "supplier_id" }] },
  { entity: "climate_roadmaps", table: "climate_roadmaps", orgRequired: true, nameColumn: "name" },
  { entity: "climate_actions", table: "climate_actions", orgRequired: true, nameColumn: null, extraFk: [{ column: "roadmap_id", entityType: "climate_roadmaps", payloadKey: "roadmap_id" }] },
  { entity: "generated_reports", table: "generated_reports", orgRequired: true, nameColumn: "title" },
  { entity: "questionnaires", table: "questionnaires", orgRequired: false, nameColumn: "title" },
  { entity: "questionnaire_responses", table: "questionnaire_responses", orgRequired: false, nameColumn: null, extraFk: [{ column: "questionnaire_id", entityType: "questionnaires", payloadKey: "questionnaire_id" }] },
  { entity: "user_subscriptions", table: "user_subscriptions", orgRequired: false, nameColumn: null },
  { entity: "orders", table: "orders", orgRequired: false, nameColumn: null },
];


// Auto-extended shells for newly ported tables (JSONB-first)
const EXTRA_SHELLS: typeof JSON_SHELLS = [
  { entity: "companies", table: "companies", orgRequired: false, nameColumn: null },
  { entity: "collect_notifications", table: "collect_notifications", orgRequired: true, nameColumn: "title" },
  { entity: "collect_comments", table: "collect_comments", orgRequired: false, nameColumn: null, extraFk: [{ column: "session_id", entityType: "collect_sessions", payloadKey: "session_id" }] },
  { entity: "collect_estimations", table: "collect_estimations", orgRequired: false, nameColumn: null, extraFk: [{ column: "session_id", entityType: "collect_sessions", payloadKey: "session_id" }] },
  { entity: "pcf_materials", table: "pcf_materials", orgRequired: false, nameColumn: null, extraFk: [{ column: "study_id", entityType: "pcf_studies", payloadKey: "study_id", required: true }] },
  { entity: "pcf_manufacturing", table: "pcf_manufacturing", orgRequired: false, nameColumn: null, extraFk: [{ column: "study_id", entityType: "pcf_studies", payloadKey: "study_id", required: true }] },
  { entity: "pcf_transport", table: "pcf_transport", orgRequired: false, nameColumn: null, extraFk: [{ column: "study_id", entityType: "pcf_studies", payloadKey: "study_id", required: true }] },
  { entity: "climate_levers", table: "climate_levers", orgRequired: false, nameColumn: "name", extraFk: [{ column: "roadmap_id", entityType: "climate_roadmaps", payloadKey: "roadmap_id", required: true }] },
  { entity: "climate_scenarios", table: "climate_scenarios", orgRequired: true, nameColumn: "name" },
  { entity: "wattbim_buildings", table: "wattbim_buildings", orgRequired: true, nameColumn: "name" },
  { entity: "wattbim_meters", table: "wattbim_meters", orgRequired: true, nameColumn: "name", extraFk: [{ column: "building_id", entityType: "wattbim_buildings", payloadKey: "building_id", required: true }] },
  { entity: "courses", table: "courses", orgRequired: false, nameColumn: "title" },
  { entity: "lessons", table: "lessons", orgRequired: false, nameColumn: "title", extraFk: [{ column: "course_id", entityType: "courses", payloadKey: "course_id", required: true }] },
  { entity: "report_templates", table: "report_templates", orgRequired: false, nameColumn: "title" },
  { entity: "questionnaires", table: "questionnaires", orgRequired: false, nameColumn: "title" },
  {
    entity: "questionnaire_translations",
    table: "questionnaire_translations",
    orgRequired: false,
    nameColumn: null,
    extraFk: [
      {
        column: "questionnaire_id",
        entityType: "questionnaires",
        payloadKey: "questionnaire_id",
        required: true,
      },
    ],
  },
];
JSON_SHELLS.push(...EXTRA_SHELLS);

for (const spec of JSON_SHELLS) {
  if (!importers[spec.entity]) {
    importers[spec.entity] = makeJsonShellImporter(spec.entity, spec.table, {
      orgRequired: spec.orgRequired,
      nameColumn: spec.nameColumn ?? null,
      extraFk: spec.extraFk,
    });
  }
}

// Special-case emission_factors: org optional
importers.emission_factors = async (client, batchId, _s, payload, legacyId) => {
  const id = asUuid(payload.id) ?? asUuid(legacyId) ?? cryptoRandomUuid();
  const orgId = payload.organization_id
    ? await resolveId(client, "organizations", String(payload.organization_id))
    : null;
  await client.query(
    `INSERT INTO emission_factors_legacy
      (id, organization_id, name, factor_name, nom_affiche, slug, emission_factor, unit,
       category, subcategory, source, year,
       legacy_source, legacy_id, import_batch_id, imported_at, raw_legacy)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),$16)
     ON CONFLICT (id) DO UPDATE SET
       emission_factor = EXCLUDED.emission_factor,
       raw_legacy = EXCLUDED.raw_legacy,
       imported_at = now()`,
    [
      id,
      orgId,
      payload.name ?? payload.factor_name ?? payload.nom_affiche ?? null,
      payload.factor_name ?? null,
      payload.nom_affiche ?? null,
      payload.slug ?? null,
      payload.emission_factor ?? payload.value ?? null,
      payload.unit ?? null,
      payload.category ?? null,
      payload.subcategory ?? null,
      payload.source ?? null,
      payload.year ?? null,
      LEGACY_SOURCE,
      legacyId ?? id,
      batchId,
      JSON.stringify(payload),
    ],
  );
  await mapId(client, "emission_factors", legacyId ?? id, id, orgId, batchId);
  return id;
};

function cryptoRandomUuid(): string {
  return randomBytes(16).toString("hex").replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    "$1-$2-$3-$4-$5",
  );
}

const DEDICATED_IMPORTERS = new Set([
  "users",
  "organizations",
  "organization_members",
  "profiles",
  "activity_data",
  "bilans_carbone",
  "emission_factors",
]);

const COLUMN_ALIASES: Record<string, Record<string, string>> = {
  "*": { org_id: "organization_id" },
  modules: { slug: "code" },
  organization_modules: { org_id: "organization_id", active: "enabled" },
  blog_posts: {
    content: "body_html_sanitized",
    body: "body_html_sanitized",
    html: "body_html_sanitized",
    body_html: "body_html_sanitized",
  },
  contact_requests: { type: "request_type", company: "company_name" },
};

type ColInfo = {
  name: string;
  isNullable: boolean;
  dataType: string;
  hasDefault: boolean;
};

const schemaCache = new Map<string, { columns: ColInfo[]; pk: string[] }>();

async function loadTableSchema(client: PoolClient, table: string) {
  const cached = schemaCache.get(table);
  if (cached) return cached;
  const { rows: colRows } = await client.query(
    `SELECT column_name, is_nullable, data_type, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  const columns: ColInfo[] = colRows.map((r) => ({
    name: r.column_name as string,
    isNullable: r.is_nullable === "YES",
    dataType: r.data_type as string,
    hasDefault: r.column_default != null,
  }));
  const { rows: pkRows } = await client.query(
    `SELECT a.attname AS name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
      ORDER BY array_position(i.indkey, a.attnum)`,
    [table],
  );
  const schema = { columns, pk: pkRows.map((r) => r.name as string) };
  schemaCache.set(table, schema);
  return schema;
}

async function userExists(client: PoolClient, userId: string | null) {
  if (!userId) return false;
  const { rowCount } = await client.query(`SELECT 1 FROM users WHERE id = $1`, [
    userId,
  ]);
  return Boolean(rowCount);
}

async function orgExists(client: PoolClient, orgId: string | null) {
  if (!orgId) return false;
  const { rowCount } = await client.query(
    `SELECT 1 FROM organizations WHERE id = $1`,
    [orgId],
  );
  return Boolean(rowCount);
}

async function resolveOrgFromPayload(
  client: PoolClient,
  payload: Record<string, unknown>,
): Promise<string | null> {
  for (const key of ["organization_id", "org_id"] as const) {
    if (!payload[key]) continue;
    const mapped = await resolveId(client, "organizations", String(payload[key]));
    if (await orgExists(client, mapped)) return mapped;
  }
  if (payload.user_id) {
    const uid = await resolveId(client, "users", String(payload.user_id));
    if (uid) {
      const members = await client.query(
        `SELECT organization_id FROM organization_members WHERE user_id = $1 LIMIT 1`,
        [uid],
      );
      if (members.rows[0]?.organization_id) {
        return members.rows[0].organization_id as string;
      }
      const owned = await client.query(
        `SELECT id FROM organizations WHERE user_id = $1 LIMIT 1`,
        [uid],
      );
      if (owned.rows[0]?.id) return owned.rows[0].id as string;
    }
  }
  if (payload.company_id) {
    const viaCompany = await client.query(
      `SELECT m.organization_id
         FROM companies c
         JOIN organization_members m ON m.user_id = c.user_id
        WHERE c.id = $1
        LIMIT 1`,
      [payload.company_id],
    );
    if (viaCompany.rows[0]?.organization_id) {
      return viaCompany.rows[0].organization_id as string;
    }
  }
  return null;
}

function makeSchemaAwareImporter(entityType: string, table: string): Importer {
  return async (client, batchId, _s, payload, legacyId) => {
    const schema = await loadTableSchema(client, table);
    if (schema.columns.length === 0) {
      throw new Error(`${entityType}: table ${table} introuvable`);
    }
    const colByName = new Map(schema.columns.map((c) => [c.name, c]));
    const aliases = {
      ...(COLUMN_ALIASES["*"] ?? {}),
      ...(COLUMN_ALIASES[entityType] ?? {}),
    };

    const values: Record<string, unknown> = {};
    const assign = (col: string, value: unknown) => {
      if (!colByName.has(col) || value === undefined) return;
      const meta = colByName.get(col)!;
      if (
        (meta.dataType === "jsonb" || meta.dataType === "json") &&
        value !== null &&
        typeof value === "object"
      ) {
        values[col] = JSON.stringify(value);
      } else {
        values[col] = value;
      }
    };

    for (const [key, raw] of Object.entries(payload)) {
      const dest = aliases[key] ?? key;
      if (dest === "id" && !colByName.has("id")) continue;
      assign(dest, raw);
    }

    const orgId = await resolveOrgFromPayload(client, payload);
    if (colByName.has("organization_id") && orgId) {
      assign("organization_id", orgId);
    }

    if (colByName.has("user_id") && payload.user_id) {
      const uid = await resolveId(client, "users", String(payload.user_id));
      if (await userExists(client, uid)) assign("user_id", uid);
      else delete values.user_id;
    }

    if (colByName.has("id")) {
      const id = asUuid(payload.id) ?? asUuid(legacyId) ?? cryptoRandomUuid();
      assign("id", id);
    }
    if (colByName.has("legacy_source")) assign("legacy_source", LEGACY_SOURCE);
    if (colByName.has("legacy_id")) {
      assign("legacy_id", legacyId ?? payload.id ?? null);
    }
    if (colByName.has("import_batch_id")) assign("import_batch_id", batchId);
    if (colByName.has("raw_legacy")) assign("raw_legacy", JSON.stringify(payload));

    const insertCols = Object.keys(values).filter((c) => colByName.has(c));
    if (insertCols.length === 0) {
      throw new Error(`${entityType}: aucune colonne mappable`);
    }

    const params = insertCols.map((c) => values[c]);
    const placeholders = insertCols.map((c, i) => {
      const meta = colByName.get(c)!;
      if (meta.dataType === "jsonb" || meta.dataType === "json") {
        return `$${i + 1}::jsonb`;
      }
      return `$${i + 1}`;
    });

    let sql = `INSERT INTO ${table} (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")})`;
    const pk = schema.pk.filter((c) => insertCols.includes(c));
    if (pk.length > 0) {
      const updates = insertCols
        .filter((c) => !pk.includes(c) && c !== "imported_at")
        .map((c) => `${c} = EXCLUDED.${c}`);
      if (colByName.has("imported_at")) updates.push("imported_at = now()");
      const updateSql =
        updates.length > 0 ? updates.join(", ") : `${pk[0]} = EXCLUDED.${pk[0]}`;
      sql += ` ON CONFLICT (${pk.join(", ")}) DO UPDATE SET ${updateSql}`;
    }
    const returning = colByName.has("id") ? "id" : pk[0] ?? insertCols[0];
    sql += ` RETURNING ${returning}`;

    const result = await client.query(sql, params);
    const newId = String(
      result.rows[0]?.id ?? result.rows[0]?.[returning] ?? payload.id ?? legacyId ?? "",
    );
    const mappedUuid = asUuid(newId) ?? cryptoRandomUuid();
    await mapId(
      client,
      entityType,
      String(legacyId ?? payload.id ?? newId),
      mappedUuid,
      orgId,
      batchId,
    );
    return mappedUuid;
  };
}

export async function listImportCatalog() {
  const { rows } = await pool.query(
    `SELECT entity_type, target_table, depends_on, sort_order, preserve_uuid, org_scoped, description, enabled
     FROM import_entity_catalog
     WHERE enabled = true
     ORDER BY sort_order ASC`,
  );
  return rows;
}

export async function processImportBatch(
  batchId: string,
  limitPerEntity = 5000,
  retryErrors = false,
) {
  const catalog = await listImportCatalog();
  const client = await pool.connect();
  const stats: Record<string, { ok: number; error: number; skipped: number }> = {};

  try {
    await client.query(
      `UPDATE import_batches SET status = 'importing', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1`,
      [batchId],
    );
    if (retryErrors) {
      await client.query(
        `UPDATE import_staging
            SET status = 'pending', error_message = NULL, processed_at = NULL
          WHERE batch_id = $1 AND status = 'error'`,
        [batchId],
      );
    }

    for (const entity of catalog) {
      const entityType = entity.entity_type as string;
      const importer = DEDICATED_IMPORTERS.has(entityType)
        ? importers[entityType]
        : makeSchemaAwareImporter(entityType, String(entity.target_table));
      if (!importer) {
        stats[entityType] = { ok: 0, error: 0, skipped: 1 };
        continue;
      }
      stats[entityType] = { ok: 0, error: 0, skipped: 0 };

      const { rows: pending } = await client.query(
        `SELECT id, legacy_id, payload
         FROM import_staging
         WHERE batch_id = $1 AND entity_type = $2 AND status = 'pending'
         ORDER BY created_at ASC
         LIMIT $3`,
        [batchId, entityType, limitPerEntity],
      );

      for (const item of pending) {
        try {
          await client.query("BEGIN");
          const newId = await importer(
            client,
            batchId,
            item.id,
            item.payload as Record<string, unknown>,
            item.legacy_id,
          );
          await client.query(
            `UPDATE import_staging
             SET status = 'imported', imported_record_id = $2, processed_at = now(), error_message = NULL
             WHERE id = $1`,
            [item.id, newId],
          );
          await client.query("COMMIT");
          stats[entityType].ok += 1;
        } catch (e) {
          await client.query("ROLLBACK");
          const message = e instanceof Error ? e.message : String(e);
          await client.query(
            `UPDATE import_staging
             SET status = 'error', error_message = $2, processed_at = now()
             WHERE id = $1`,
            [item.id, message.slice(0, 2000)],
          );
          stats[entityType].error += 1;
        }
      }
    }

    const totalErrors = Object.values(stats).reduce((a, s) => a + s.error, 0);
    await client.query(
      `UPDATE import_batches
       SET status = $2::import_batch_status,
           stats = $3::jsonb,
           finished_at = now(),
           updated_at = now(),
           error_summary = $4
       WHERE id = $1`,
      [
        batchId,
        totalErrors > 0 ? "completed_with_errors" : "completed",
        JSON.stringify(stats),
        totalErrors > 0 ? `${totalErrors} row errors` : null,
      ],
    );

    return { batchId, stats };
  } finally {
    client.release();
  }
}

export async function getImportBatch(batchId: string) {
  const batch = await pool.query(`SELECT * FROM import_batches WHERE id = $1`, [
    batchId,
  ]);
  if (!batch.rows[0]) return null;
  const staging = await pool.query(
    `SELECT entity_type, status, COUNT(*)::int AS count
     FROM import_staging WHERE batch_id = $1
     GROUP BY entity_type, status
     ORDER BY entity_type, status`,
    [batchId],
  );
  return { batch: batch.rows[0], staging: staging.rows };
}
