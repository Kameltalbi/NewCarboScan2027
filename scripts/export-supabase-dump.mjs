#!/usr/bin/env node
/**
 * Export CarboScan (Supabase Postgres) → dump JSON for NewCarboScan import.
 *
 * Does not copy auth passwords. Users get a temporary password on import
 * (must_reset_password=true). UUIDs are preserved.
 *
 * Usage:
 *   SUPABASE_DB_URL='postgresql://postgres.[ref]:[pwd]@.../postgres' \
 *     node scripts/export-supabase-dump.mjs [--org UUID] [--out dumps/export.json]
 *
 * Get SUPABASE_DB_URL from Supabase → Settings → Database → URI (direct, not pooler if possible).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_TABLE = {
  users: "auth.users",
  inventory: "public.inventory",
  emission_factors: "public.emission_factors",
  results: "public.results",
};

const GLOBAL_TABLES = new Set([
  "modules",
  "emission_factors",
  "emission_factors_co2",
  "unit_conversions",
  "impact_factors",
  "acv_materials",
  "acv_processes",
  "acv_transport_modes",
  "supplier_monetary_factors",
  "report_templates",
  "report_paragraphs",
  "report_charts",
  "courses",
  "lessons",
  "lesson_resources",
  "quizzes",
  "quiz_questions",
  "contact_requests",
  "blog_posts",
]);

function parseArgs(argv) {
  const out = { org: null, outFile: resolve(ROOT, "dumps/supabase-export.json"), includeGlobal: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--org") out.org = argv[++i];
    else if (a === "--out") out.outFile = resolve(argv[++i]);
    else if (a === "--no-global") out.includeGlobal = false;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node scripts/export-supabase-dump.mjs [--org UUID] [--out file.json] [--no-global]
Requires SUPABASE_DB_URL (Postgres URI of the CarboScan Supabase project).`);
      process.exit(0);
    }
  }
  return out;
}

async function loadPg() {
  const candidates = [
    resolve(ROOT, "node_modules/pg/lib/index.js"),
    resolve(ROOT, "apps/api/node_modules/pg/lib/index.js"),
  ];
  for (const file of candidates) {
    try {
      return await import(pathToFileURL(file).href);
    } catch {
      /* try next */
    }
  }
  throw new Error("Package pg introuvable. Lancez `npm install` à la racine du projet.");
}

async function tableExists(client, qualified) {
  const [schema, name] = qualified.includes(".")
    ? qualified.split(".")
    : ["public", qualified];
  const { rows } = await client.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2`,
    [schema, name],
  );
  return rows.length > 0;
}

async function columnsOf(client, qualified) {
  const [schema, name] = qualified.includes(".")
    ? qualified.split(".")
    : ["public", qualified];
  const { rows } = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2`,
    [schema, name],
  );
  return new Set(rows.map((r) => r.column_name));
}

async function fetchAll(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

function qualify(entityType) {
  return SOURCE_TABLE[entityType] ?? `public.${entityType}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("Set SUPABASE_DB_URL to the CarboScan Postgres URI (Supabase → Database).");
    process.exit(1);
  }
  if (args.org && !/^[0-9a-f-]{36}$/i.test(args.org)) {
    console.error("--org must be a UUID");
    process.exit(1);
  }

  const pg = await loadPg();
  const Client = pg.default?.Client ?? pg.Client;
  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const catalog = [
      "users",
      "profiles",
      "user_roles",
      "organizations",
      "organization_members",
      "organization_years",
      "organization_modules",
      "modules",
      "companies",
      "collect_sites",
      "collect_sessions",
      "collect_responses",
      "collect_files",
      "collect_documents",
      "collect_notifications",
      "collect_comments",
      "collect_estimations",
      "collect_ai_suggestions",
      "collect_periodic_history",
      "collect_historical_stats",
      "periodic_collections",
      "periodic_collection_executions",
      "collection_checklist",
      "data_validation_periods",
      "activity_data",
      "activity_data_history",
      "activity_energy",
      "activity_data_to_bilan_detail",
      "emission_factors",
      "organization_emission_factors",
      "emission_factors_co2",
      "unit_conversions",
      "bilans_carbone",
      "bilans_carbone_detail",
      "postes_emission",
      "carbon_assessments",
      "emissions_totals",
      "cbam_installations",
      "cbam_products",
      "cbam_production",
      "cbam_reports",
      "cbam_exports",
      "cbam_energy_consumption",
      "cbam_electricity_consumption",
      "cbam_emission_allocation",
      "cbam_emissions_summary",
      "cbam_installation_products",
      "cbam_shipment_emissions",
      "pcf_studies",
      "pcf_versions",
      "pcf_results",
      "pcf_materials",
      "pcf_manufacturing",
      "pcf_transport",
      "pcf_packaging",
      "pcf_usage",
      "pcf_wastes",
      "pcf_end_of_life",
      "pcf_scenarios",
      "pcf_subcontracting",
      "pcf_co_product_allocations",
      "pcf_collect_allocations",
      "acv_projects",
      "inventory",
      "acv_results",
      "impact_factors",
      "acv_inventory_settings",
      "acv_impact_results",
      "acv_materials",
      "acv_processes",
      "acv_transport_modes",
      "acv_product_components",
      "acv_lifecycle_modules",
      "acv_scenarios",
      "acv_co_products",
      "acv_process_flows",
      "suppliers",
      "supplier_contacts",
      "supplier_purchases",
      "supplier_monetary_factors",
      "supplier_questionnaires",
      "supplier_questionnaire_sends",
      "supplier_invitations",
      "supplier_score_history",
      "supplier_action_plans",
      "climate_roadmaps",
      "climate_levers",
      "climate_actions",
      "climate_action_milestones",
      "climate_priority_scores",
      "climate_kpis",
      "climate_scenarios",
      "climate_scenario_levers",
      "climate_scenario_assumptions",
      "climate_scenario_targets",
      "climate_scenario_results",
      "climate_scenario_contributions",
      "net_zero_trajectories",
      "generated_reports",
      "report_templates",
      "report_paragraphs",
      "report_paragraph_history",
      "report_charts",
      "report_chart_instances",
      "report_quota",
      "report_generations",
      "questionnaires",
      "questionnaire_responses",
      "user_subscriptions",
      "orders",
      "courses",
      "lessons",
      "lesson_resources",
      "quizzes",
      "quiz_questions",
      "user_progress",
      "wattbim_buildings",
      "wattbim_meters",
      "wattbim_readings",
      "wattbim_alerts",
      "wattbim_savings",
      "wattbim_api_keys",
      "sim_scenarios",
      "sim_runs",
      "sim_run_lines",
      "contact_requests",
      "blog_posts",
    ];

    const entities = {};
    const skipped = [];
    const counts = {};

    let orgIds = null;
    let userIds = null;

    if (args.org) {
      orgIds = [args.org];
      const orgs = await fetchAll(
        client,
        `SELECT id, user_id FROM public.organizations WHERE id = $1`,
        [args.org],
      );
      if (orgs.length === 0) {
        throw new Error(`Organisation ${args.org} introuvable dans Supabase`);
      }
      const members = await tableExists(client, "public.organization_members")
        ? await fetchAll(
            client,
            `SELECT user_id FROM public.organization_members WHERE organization_id = $1`,
            [args.org],
          )
        : [];
      userIds = [
        ...new Set(
          [orgs[0].user_id, ...members.map((m) => m.user_id)].filter(Boolean),
        ),
      ];
    }

    for (const entityType of catalog) {
      if (!args.includeGlobal && GLOBAL_TABLES.has(entityType) && args.org) {
        skipped.push(`${entityType} (global, --no-global)`);
        continue;
      }
      const table = qualify(entityType);
      if (!(await tableExists(client, table))) {
        skipped.push(`${entityType} (table absente: ${table})`);
        continue;
      }

      let rows;
      if (entityType === "users") {
        const filter = userIds ? `WHERE u.id = ANY($1::uuid[])` : "";
        const params = userIds ? [userIds] : [];
        try {
          rows = await fetchAll(
            client,
            `SELECT u.id, u.email, u.raw_user_meta_data, u.raw_app_meta_data,
                    u.created_at, u.updated_at, u.last_sign_in_at,
                    u.email_confirmed_at, u.phone
               FROM auth.users u
               ${filter}`,
            params,
          );
        } catch (e) {
          throw new Error(`Export auth.users failed: ${e instanceof Error ? e.message : e}`);
        }
        rows = rows.map((u) => ({
          ...u,
          full_name: u.raw_user_meta_data?.full_name ?? u.raw_user_meta_data?.name ?? null,
        }));
      } else {
        const cols = await columnsOf(client, table);
        const params = [];
        const filters = [];
        if (orgIds && cols.has("organization_id")) {
          params.push(orgIds);
          filters.push(`organization_id = ANY($${params.length}::uuid[])`);
        } else if (userIds && cols.has("user_id") && !cols.has("organization_id") && args.org) {
          params.push(userIds);
          filters.push(`user_id = ANY($${params.length}::uuid[])`);
        } else if (args.org && !cols.has("organization_id") && !GLOBAL_TABLES.has(entityType)) {
          skipped.push(`${entityType} (pas de organization_id, scoped --org)`);
          continue;
        }
        const sql = `SELECT * FROM ${table}${filters.length ? ` WHERE ${filters.join(" AND ")}` : ""}`;
        rows = await fetchAll(client, sql, params);
      }

      if (!rows.length) continue;
      entities[entityType] = rows;
      counts[entityType] = rows.length;
      console.log(`${entityType}: ${rows.length}`);
    }

    // Owner membership from organizations.user_id when not already in members
    const orgs = entities.organizations ?? [];
    const members = entities.organization_members ?? [];
    const memberKeys = new Set(
      members.map((m) => `${m.organization_id}:${m.user_id}`),
    );
    const synthesized = [];
    for (const org of orgs) {
      if (!org.user_id) continue;
      const key = `${org.id}:${org.user_id}`;
      if (memberKeys.has(key)) continue;
      synthesized.push({
        organization_id: org.id,
        user_id: org.user_id,
        role: "owner",
        synthesized_from: "organizations.user_id",
      });
      memberKeys.add(key);
    }
    if (synthesized.length) {
      entities.organization_members = [...members, ...synthesized];
      counts.organization_members = entities.organization_members.length;
      console.log(`organization_members: +${synthesized.length} owners synthétisés`);
    }

    const dump = {
      label: args.org
        ? `carboscan-org-${args.org.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}`
        : `carboscan-all-${new Date().toISOString().slice(0, 10)}`,
      source: "carboscan_supabase",
      exportedAt: new Date().toISOString(),
      targetOrganizationId: args.org ?? undefined,
      counts,
      skipped,
      entities,
    };

    mkdirSync(dirname(args.outFile), { recursive: true });
    writeFileSync(args.outFile, JSON.stringify(dump));
    console.log(`\nWrote ${args.outFile}`);
    console.log("Tables exportées:", Object.keys(entities).length);
    console.log("Ignorées:", skipped.length);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
