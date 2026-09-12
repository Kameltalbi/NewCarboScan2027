/**
 * IPCC EFDB stationary combustion V1 — resolve-and-calculate + TN eligibility + exclusions.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import { ensureTestOrgFixture } from "./helpers/ensureTestOrgFixture.js";
import {
  UNAVAILABLE_EMISSION_FACTOR_ERROR,
  DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR,
} from "../routes/calculate.js";
import {
  IPCC_EFDB_SOURCE_KEY,
  IPCC_SAFE_SUBSET_EXPECTED_COUNTS,
  IPCC_SAFE_SUBSET_RULESET,
  IPCC_AUTO_GLOBAL_ACTIVITY_SAFE_SQL,
  RULESET_VERSION,
  resolveAndCalculate,
  resolveFactor,
} from "../services/factorResolver/index.js";
import { evaluateGeography } from "../services/factorResolver/geographyPolicy.js";

const DATABASE_URL = process.env.DATABASE_URL;

describe("IPCC EFDB stationary combustion V1", { skip: !DATABASE_URL }, () => {
  let pool: pg.Pool;
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;
  let organizationId: string;
  let prevFlag: string | undefined;
  let dieselCo2Id: string;
  let ch4ComponentId: string;
  let hasIpcc = false;

  before(async () => {
    prevFlag = process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = "true";
    pool = new pg.Pool({ connectionString: DATABASE_URL });
    const src = await pool.query(
      `SELECT 1 FROM factor_sources WHERE source_key = $1`,
      [IPCC_EFDB_SOURCE_KEY],
    );
    hasIpcc = src.rows.length > 0;
    if (!hasIpcc) {
      await pool.end();
      return;
    }

    app = await buildTestApp();
    const fixture = await ensureTestOrgFixture(pool);
    organizationId = fixture.organizationId;
    token = signToken({
      id: fixture.userId,
      email: fixture.email,
      organizationId,
      role: "member",
    });

    const gov = await pool.query<{
      calculation_status: string;
      resolver_status: string;
      catalog_status: string;
    }>(
      `SELECT v.calculation_status, v.resolver_status, v.catalog_status
       FROM emission_factor_versions v
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND v.dataset_version = 'efdb_snapshot_2026_09'`,
      [IPCC_EFDB_SOURCE_KEY],
    );
    assert.equal(gov.rows[0]?.catalog_status, "visible");
    assert.equal(gov.rows[0]?.calculation_status, "enabled");
    assert.equal(gov.rows[0]?.resolver_status, "enabled");

    const auto = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE ${IPCC_AUTO_GLOBAL_ACTIVITY_SAFE_SQL}`,
    );
    assert.equal(Number(auto.rows[0].n), IPCC_SAFE_SUBSET_EXPECTED_COUNTS.autoGlobalActivity);

    const diesel = await pool.query<{ id: string; value: string }>(
      `SELECT f.id, f.value::text AS value FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND f.external_code = '117614'`,
      [IPCC_EFDB_SOURCE_KEY],
    );
    dieselCo2Id = diesel.rows[0].id;
    assert.equal(Number(diesel.rows[0].value), 74100);

    const ch4 = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND f.factor_kind = 'ghg_component' LIMIT 1`,
      [IPCC_EFDB_SOURCE_KEY],
    );
    ch4ComponentId = ch4.rows[0].id;
  });

  after(async () => {
    if (prevFlag === undefined) delete process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    else process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = prevFlag;
    if (app) await app.close();
    if (pool) await pool.end();
  });

  it("geo: missing/WORLD refuse IPCC; TN/FR eligible as default unspecified", async () => {
    if (!hasIpcc) return;
    const cand = {
      sourceKey: IPCC_EFDB_SOURCE_KEY,
      countryCode: null as string | null,
      region: null as string | null,
      stableFactorId: "ipcc:efdb:117614",
      name: "diesel CO2",
      geographicApplicability: "IPCC_DEFAULT_UNSPECIFIED",
    };
    assert.equal(evaluateGeography({ country: undefined }, cand).eligible, false);
    assert.equal(evaluateGeography({ country: "WORLD" }, cand).eligible, false);
    assert.equal(evaluateGeography({ country: "TN" }, cand).eligible, true);
    assert.equal(evaluateGeography({ country: "FR" }, cand).eligible, true);
    assert.equal(RULESET_VERSION, "2026-09-v5");
  });

  it("US/TN diesel stationary CO2 resolve-and-calculate matches 74100 kgCO2e/TJ + ledger", async () => {
    if (!hasIpcc) return;
    const result = await resolveAndCalculate(pool, {
      organizationId,
      userId: (await ensureTestOrgFixture(pool)).userId,
      method: "ghg_protocol",
      lineKey: "ipcc-diesel-co2",
      scope: 1,
      resolve: {
        activity: "stationary combustion diesel oil energy industries CO2",
        unit: "TJ",
        quantity: "1",
        country: "TN",
        preferredSource: IPCC_EFDB_SOURCE_KEY,
        lifecycleBoundary: "direct",
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.resolution.selectedFactor?.source.key, IPCC_EFDB_SOURCE_KEY);
    assert.equal(result.resolution.selectedFactor?.id, dieselCo2Id);
    assert.ok(Math.abs(Number(result.lines[0].resultKgCo2e) - 74100) < 1e-6);
    assert.equal(result.resolution.provenance.ipccSafeSubsetRuleset, IPCC_SAFE_SUBSET_RULESET);
    assert.equal(result.resolution.provenance.ipccSafeClass, "AUTO_GLOBAL_ACTIVITY");
    assert.equal(result.resolution.provenance.noteEmptyRegionIsNotWorld, true);

    const led = await pool.query<{ factor_id: string; provenance: Record<string, unknown> }>(
      `SELECT factor_id, provenance FROM calculation_ledger WHERE run_id = $1`,
      [result.runId],
    );
    assert.equal(led.rows[0].factor_id, dieselCo2Id);
    assert.equal(led.rows[0].provenance.ipccSafeSubsetRuleset, IPCC_SAFE_SUBSET_RULESET);
    assert.equal(led.rows[0].provenance.rulesetVersion, RULESET_VERSION);
  });

  it("CH4 component UUID unavailable on direct calculate (not activity)", async () => {
    if (!hasIpcc) return;
    const res = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers: {
        authorization: `Bearer ${token}`,
        "x-organization-id": organizationId,
        "content-type": "application/json",
      },
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "ipcc-ch4-block",
            scope: 1,
            factorId: ch4ComponentId,
            activityQuantity: "1",
            activityUnit: "TJ",
          },
        ],
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, UNAVAILABLE_EMISSION_FACTOR_ERROR);
  });

  it("AUTO_GLOBAL CO2 UUID on direct calculate is source-restricted", async () => {
    if (!hasIpcc) return;
    const res = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers: {
        authorization: `Bearer ${token}`,
        "x-organization-id": organizationId,
        "content-type": "application/json",
      },
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "ipcc-direct",
            scope: 1,
            factorId: dieselCo2Id,
            activityQuantity: "1",
            activityUnit: "TJ",
          },
        ],
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);
  });

  it("TN electricity still prefers Core TN (non-regression)", async () => {
    if (!hasIpcc) return;
    const tn = await resolveFactor(pool, {
      mode: "production",
      organizationId,
      activity: "electricity",
      unit: "kWh",
      country: "TN",
    });
    assert.equal(tn.status, "RESOLVED");
    assert.equal(tn.selectedFactor?.source.key, "internal");
  });

  it("staging keeps auxiliaries and exclusions", async () => {
    if (!hasIpcc) return;
    const aux = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM ipcc_efdb_records WHERE semantic_class = 'auxiliary_parameter'`,
    );
    assert.ok(Number(aux.rows[0].n) > 0);
    const missing = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM ipcc_efdb_records WHERE value_parse->>'class' = 'missing'`,
    );
    assert.equal(Number(missing.rows[0].n), 294);
    const multi = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM ipcc_efdb_records WHERE semantic_class = 'multi_gas_unsplit'`,
    );
    assert.equal(Number(multi.rows[0].n), 1807);
  });
});
