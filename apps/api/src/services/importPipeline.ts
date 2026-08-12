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
    await client.query(
      `INSERT INTO organizations
        (id, name, slug, legacy_source, legacy_id, import_batch_id, imported_at, raw_legacy)
       VALUES ($1,$2,$3,$4,$5,$6,now(),$7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         legacy_source = EXCLUDED.legacy_source,
         legacy_id = EXCLUDED.legacy_id,
         import_batch_id = EXCLUDED.import_batch_id,
         imported_at = now(),
         raw_legacy = EXCLUDED.raw_legacy,
         updated_at = now()`,
      [id, name, slug, LEGACY_SOURCE, legacyId ?? id, batchId, JSON.stringify(payload)],
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
    const allowed = ["owner", "admin", "editor", "viewer", "financeur", "auditor"];
    const safeRole = allowed.includes(role) ? role : "viewer";
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
    await client.query(
      `INSERT INTO bilans_carbone
        (id, organization_id, name, year, status,
         total_kgco2e, scope1_kgco2e, scope2_kgco2e, scope3_kgco2e,
         analyse_commentaire, questionnaire_data,
         legacy_source, legacy_id, import_batch_id, imported_at, raw_legacy)
       VALUES ($1,$2,$3,$4,COALESCE($5,'imported'),$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),$15)
       ON CONFLICT (id) DO UPDATE SET
         total_kgco2e = EXCLUDED.total_kgco2e,
         scope1_kgco2e = EXCLUDED.scope1_kgco2e,
         scope2_kgco2e = EXCLUDED.scope2_kgco2e,
         scope3_kgco2e = EXCLUDED.scope3_kgco2e,
         raw_legacy = EXCLUDED.raw_legacy,
         imported_at = now(),
         updated_at = now()`,
      [
        id,
        orgId,
        payload.name ?? `Bilan ${payload.year ?? ""}`,
        Number(payload.year ?? new Date().getFullYear()),
        payload.status ?? "imported",
        payload.total_kgco2e ?? payload.total_emission ?? null,
        payload.scope1_kgco2e ?? payload.scope1_emission ?? null,
        payload.scope2_kgco2e ?? payload.scope2_emission ?? null,
        payload.scope3_kgco2e ?? payload.scope3_emission ?? null,
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

export async function listImportCatalog() {
  const { rows } = await pool.query(
    `SELECT entity_type, target_table, depends_on, sort_order, preserve_uuid, org_scoped, description, enabled
     FROM import_entity_catalog
     WHERE enabled = true
     ORDER BY sort_order ASC`,
  );
  return rows;
}

export async function processImportBatch(batchId: string, limitPerEntity = 5000) {
  const catalog = await listImportCatalog();
  const client = await pool.connect();
  const stats: Record<string, { ok: number; error: number; skipped: number }> = {};

  try {
    await client.query(
      `UPDATE import_batches SET status = 'importing', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1`,
      [batchId],
    );

    for (const entity of catalog) {
      const entityType = entity.entity_type as string;
      const importer = importers[entityType];
      stats[entityType] = { ok: 0, error: 0, skipped: 0 };
      if (!importer) {
        stats[entityType].skipped += 1;
        continue;
      }

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
