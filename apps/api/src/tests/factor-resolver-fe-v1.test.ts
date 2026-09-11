/**
 * FE V1 — Core TN + ADEME/UK safe-subset production path.
 * Requires migration 024 governance (calc+resolver enabled) and flag ON for calc.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import { resolveFactor } from "../services/factorResolver/index.js";
import { DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR } from "../routes/calculate.js";
import { EXPECTED_SUBSET_COUNTS } from "../services/factorResolver/safeSubsets.js";
import {
  ADEME_SAFE_SUBSET_SQL,
  UK_SAFE_SUBSET_SQL,
} from "../services/factorResolver/safeSubsets.js";
import { RULESET_VERSION } from "../services/factorResolver/types.js";

const DATABASE_URL = process.env.DATABASE_URL;
const MARKER = "fe-v1-test";

describe("factor resolver FE V1", { skip: !DATABASE_URL }, () => {
  let pool: pg.Pool;
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;
  let organizationId: string;
  let prevFlag: string | undefined;
  const createdRuns: string[] = []; // retained for debugging; ledger is immutable

  before(async () => {
    prevFlag = process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = "true";
    pool = new pg.Pool({ connectionString: DATABASE_URL });
    app = await buildTestApp();

    const member = await pool.query<{
      user_id: string;
      email: string;
      organization_id: string;
    }>(
      `SELECT om.user_id, u.email, om.organization_id
       FROM organization_members om JOIN users u ON u.id = om.user_id LIMIT 1`,
    );
    if (!member.rows[0]) throw new Error("no org member");
    organizationId = member.rows[0].organization_id;
    token = signToken({
      id: member.rows[0].user_id,
      email: member.rows[0].email,
      organizationId,
      role: "member",
    });
  });

  after(async () => {
    // calculation_ledger is immutable — do not delete test runs; flag them in lineKey only.
    if (prevFlag === undefined) delete process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    else process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = prevFlag;
    await app.close();
    await pool.end();
  });

  function headers() {
    return {
      authorization: `Bearer ${token}`,
      "x-organization-id": organizationId,
      "content-type": "application/json",
    };
  }

  async function rac(payload: Record<string, unknown>) {
    return app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      headers: headers(),
      payload,
    });
  }

  it("governance + safe subset counts after 024", async () => {
    const registry = await pool.query(`SELECT COUNT(*)::int AS n FROM emission_factors`);
    assert.equal(registry.rows[0].n, 10024);

    const gov = await pool.query(
      `SELECT s.source_key, v.calculation_status, v.resolver_status, COUNT(f.id)::int AS n
       FROM emission_factor_versions v
       JOIN factor_sources s ON s.id = v.source_id
       LEFT JOIN emission_factors f ON f.version_id = v.id
       WHERE s.source_key IN ('ademe','uk_gov_ghg','internal')
       GROUP BY 1,2,3`,
    );
    const by = Object.fromEntries(gov.rows.map((r) => [r.source_key, r]));
    assert.equal(by.internal.calculation_status, "enabled");
    assert.equal(by.internal.resolver_status, "enabled");
    assert.equal(by.internal.n, 8);
    assert.equal(by.ademe.calculation_status, "enabled");
    assert.equal(by.ademe.resolver_status, "enabled");
    assert.equal(by.ademe.n, 7394);
    assert.equal(by.uk_gov_ghg.calculation_status, "enabled");
    assert.equal(by.uk_gov_ghg.resolver_status, "enabled");
    assert.equal(by.uk_gov_ghg.n, 2622);

    const ademeSafe = await pool.query(
      `SELECT COUNT(*)::int AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE ${ADEME_SAFE_SUBSET_SQL}`,
    );
    assert.equal(ademeSafe.rows[0].n, EXPECTED_SUBSET_COUNTS.ademeSafe);

    const ukSafe = await pool.query(
      `SELECT COUNT(*)::int AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE ${UK_SAFE_SUBSET_SQL}`,
    );
    assert.equal(ukSafe.rows[0].n, EXPECTED_SUBSET_COUNTS.ukSafe);
  });

  it("heat EN synonym resolves Core TN heat_kwh", async () => {
    const r = await resolveFactor(pool, {
      activity: "heat",
      unit: "kWh",
      country: "TN",
      quantity: "100",
      mode: "production",
      organizationId,
    });
    assert.equal(r.status, "RESOLVED");
    assert.equal(r.selectedFactor?.stableFactorId, "heat_kwh");
    assert.equal(r.selectedFactor?.source.key, "internal");
  });

  it("matrix resolve statuses + selected sources", async () => {
    const cases: Array<{
      name: string;
      input: Parameters<typeof resolveFactor>[1];
      expectStatus?: string | string[];
      expectSource?: string;
      expectStable?: string;
    }> = [
      {
        name: "electricity_TN",
        input: {
          activity: "electricity",
          unit: "kWh",
          country: "TN",
          mode: "production",
          organizationId,
        },
        expectStatus: "RESOLVED",
        expectSource: "internal",
        expectStable: "electricity_kwh",
      },
      {
        name: "electricity_FR",
        input: {
          activity: "electricity",
          unit: "kWh",
          country: "FR",
          mode: "production",
          organizationId,
        },
        expectStatus: ["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT"],
      },
      {
        name: "electricity_GB_direct",
        input: {
          activity: "electricity",
          unit: "kWh",
          country: "GB",
          lifecycleBoundary: "direct",
          mode: "production",
          organizationId,
        },
        expectStatus: ["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT"],
      },
      {
        name: "electricity_GB_no_lifecycle",
        input: {
          activity: "electricity",
          unit: "kWh",
          country: "GB",
          mode: "production",
          organizationId,
        },
        expectStatus: ["REQUIRES_CONTEXT", "AMBIGUOUS", "NO_MATCH", "RESOLVED"],
      },
      {
        name: "gas_FR",
        input: {
          activity: "natural gas",
          unit: "kWh",
          country: "FR",
          mode: "production",
          organizationId,
        },
        expectStatus: ["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH"],
      },
      {
        name: "gas_GB_direct",
        input: {
          activity: "natural gas",
          unit: "kWh",
          country: "GB",
          lifecycleBoundary: "direct",
          mode: "production",
          organizationId,
        },
        expectStatus: ["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH"],
      },
      {
        name: "diesel_L",
        input: {
          activity: "diesel",
          unit: "L",
          country: "FR",
          quantity: "100",
          mode: "production",
          organizationId,
        },
        expectStatus: ["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH"],
      },
      {
        name: "flight",
        input: {
          activity: "flight",
          unit: "passenger.km",
          country: "FR",
          mode: "production",
          organizationId,
        },
        expectStatus: ["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH"],
      },
      {
        name: "freight",
        input: {
          activity: "freight",
          unit: "tonne.km",
          country: "GB",
          lifecycleBoundary: "direct",
          mode: "production",
          organizationId,
        },
        expectStatus: ["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH"],
      },
      {
        name: "diesel_wtt",
        input: {
          activity: "diesel",
          unit: "L",
          country: "GB",
          lifecycleBoundary: "wtt",
          mode: "production",
          organizationId,
        },
        expectStatus: ["NO_MATCH", "REQUIRES_CONTEXT", "AMBIGUOUS", "REVIEW_REQUIRED"],
      },
      {
        name: "kg_tonne_path",
        input: {
          activity: "refrigerant",
          unit: "t",
          country: "TN",
          quantity: "0.002",
          internalCategory: "process_fugitive",
          mode: "production",
          organizationId,
        },
        expectStatus: ["RESOLVED", "NO_MATCH", "REQUIRES_CONTEXT"],
      },
      {
        name: "no_match",
        input: {
          activity: "zzzxxyyzz_no_factor",
          unit: "kWh",
          country: "FR",
          mode: "production",
          organizationId,
        },
        expectStatus: "NO_MATCH",
      },
    ];

    for (const c of cases) {
      const r = await resolveFactor(pool, c.input);
      const allowed = Array.isArray(c.expectStatus) ? c.expectStatus : [c.expectStatus!];
      assert.ok(allowed.includes(r.status), `${c.name}: got ${r.status}, want ${allowed}`);
      if (c.expectSource) assert.equal(r.selectedFactor?.source.key, c.expectSource, c.name);
      if (c.expectStable) assert.equal(r.selectedFactor?.stableFactorId, c.expectStable, c.name);
      if (r.status === "RESOLVED" && r.selectedFactor) {
        assert.ok(
          ["internal", "ademe", "uk_gov_ghg"].includes(r.selectedFactor.source.key),
          c.name,
        );
      }
    }
  });

  it("E2E resolve-and-calculate TN electricity math + ledger", async () => {
    const before = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    const res = await rac({
      method: "bilan_carbone",
      lineKey: `${MARKER}-tn-elec`,
      scope: 2,
      activity: "electricity",
      quantity: "1000",
      unit: "kWh",
      country: "TN",
    });
    assert.equal(res.statusCode, 200, JSON.stringify(res.json()));
    const body = res.json() as {
      runId: string;
      resolution: { status: string; selectedFactor: { stableFactorId: string; source: { key: string } }; rulesetVersion: string };
      lines: Array<{ resultKgCo2e: string; factorValue: string }>;
      normalizedQuantity: string;
    };
    createdRuns.push(body.runId);
    assert.equal(body.resolution.status, "RESOLVED");
    assert.equal(body.resolution.selectedFactor.stableFactorId, "electricity_kwh");
    assert.equal(body.resolution.selectedFactor.source.key, "internal");
    assert.equal(body.resolution.rulesetVersion, RULESET_VERSION);
    assert.equal(Number(body.lines[0].resultKgCo2e), 523);

    const led = await pool.query(
      `SELECT provenance, unit_conversion, result_kgco2e::text FROM calculation_ledger WHERE run_id=$1`,
      [body.runId],
    );
    assert.equal(led.rows.length, 1);
    assert.equal(led.rows[0].provenance.rulesetVersion, RULESET_VERSION);
    assert.equal(led.rows[0].provenance.sourceKey, "internal");
    assert.equal(Number(led.rows[0].result_kgco2e), 523);
    const after = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    assert.equal(after.rows[0].n, before.rows[0].n + 1);
  });

  it("E2E FR electricity via ADEME safe subset when RESOLVED", async () => {
    const res = await rac({
      method: "bilan_carbone",
      lineKey: `${MARKER}-fr-elec`,
      scope: 2,
      activity: "electricity",
      quantity: "100",
      unit: "kWh",
      country: "FR",
    });
    const body = res.json() as {
      runId?: string;
      error?: string;
      resolution?: { status: string; selectedFactor?: { source: { key: string } } };
      lines?: Array<{ resultKgCo2e: string; factorValue: string }>;
      normalizedQuantity?: string;
    };
    if (res.statusCode === 200) {
      createdRuns.push(body.runId!);
      assert.equal(body.resolution?.status, "RESOLVED");
      assert.equal(body.resolution?.selectedFactor?.source.key, "ademe");
      const fv = Number(body.lines![0].factorValue);
      const qty = Number(body.normalizedQuantity);
      assert.ok(Math.abs(Number(body.lines![0].resultKgCo2e) - qty * fv) < 1e-6);
    } else {
      assert.ok([404, 422].includes(res.statusCode));
      assert.equal(body.error, "FACTOR_NOT_RESOLVED");
      assert.ok(
        ["AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH", "REVIEW_REQUIRED"].includes(
          body.resolution?.status ?? "",
        ),
      );
    }
  });

  it("E2E GB electricity direct via UK safe subset when RESOLVED", async () => {
    const res = await rac({
      method: "bilan_carbone",
      lineKey: `${MARKER}-gb-elec`,
      scope: 2,
      activity: "electricity",
      quantity: "100",
      unit: "kWh",
      country: "GB",
      lifecycleBoundary: "direct",
    });
    const body = res.json() as {
      runId?: string;
      error?: string;
      resolution?: { status: string; selectedFactor?: { source: { key: string } } };
      lines?: Array<{ resultKgCo2e: string; factorValue: string }>;
      normalizedQuantity?: string;
    };
    if (res.statusCode === 200) {
      createdRuns.push(body.runId!);
      assert.equal(body.resolution?.selectedFactor?.source.key, "uk_gov_ghg");
      const fv = Number(body.lines![0].factorValue);
      const qty = Number(body.normalizedQuantity);
      assert.ok(Math.abs(Number(body.lines![0].resultKgCo2e) - qty * fv) < 1e-6);
    } else {
      assert.ok([404, 422].includes(res.statusCode));
      assert.equal(body.error, "FACTOR_NOT_RESOLVED");
    }
  });

  it("safe conversion t→kg refrigerant E2E", async () => {
    const res = await rac({
      method: "bilan_carbone",
      lineKey: `${MARKER}-ref`,
      scope: 1,
      activity: "refrigerant",
      quantity: "0.002",
      unit: "t",
      country: "TN",
      internalCategory: "process_fugitive",
    });
    assert.equal(res.statusCode, 200, JSON.stringify(res.json()));
    const body = res.json() as {
      runId: string;
      normalizedQuantity: string;
      normalizedUnit: string;
      lines: Array<{ resultKgCo2e: string }>;
    };
    createdRuns.push(body.runId);
    assert.equal(body.normalizedQuantity, "2");
    assert.equal(body.normalizedUnit, "kg");
    assert.equal(Number(body.lines[0].resultKgCo2e), 2690);
  });

  it("non-RESOLVED writes nothing; ADEME/UK UUID bypass blocked", async () => {
    const before = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    const nomatch = await rac({
      method: "bilan_carbone",
      lineKey: `${MARKER}-nm`,
      scope: 1,
      activity: "zzzxxyyzz_no_factor",
      quantity: "1",
      unit: "kWh",
      country: "FR",
    });
    assert.equal(nomatch.statusCode, 404);

    const ademeId = (
      await pool.query<{ id: string }>(
        `SELECT f.id FROM emission_factors f
         JOIN emission_factor_versions v ON v.id=f.version_id
         JOIN factor_sources s ON s.id=v.source_id
         WHERE s.source_key='ademe' AND f.status='approved' LIMIT 1`,
      )
    ).rows[0]!.id;
    const ukId = (
      await pool.query<{ id: string }>(
        `SELECT f.id FROM emission_factors f
         JOIN emission_factor_versions v ON v.id=f.version_id
         JOIN factor_sources s ON s.id=v.source_id
         WHERE s.source_key='uk_gov_ghg' AND f.status='approved' LIMIT 1`,
      )
    ).rows[0]!.id;

    const ademeDirect = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers: headers(),
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: `${MARKER}-ademe`,
            scope: 1,
            factorId: ademeId,
            activityQuantity: "1",
            activityUnit: "kWh",
          },
        ],
      },
    });
    assert.equal(ademeDirect.statusCode, 400);
    assert.equal(ademeDirect.json().error, DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);

    const ukDirect = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers: headers(),
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: `${MARKER}-uk`,
            scope: 1,
            factorId: ukId,
            activityQuantity: "1",
            activityUnit: "kWh",
          },
        ],
      },
    });
    assert.equal(ukDirect.statusCode, 400);
    assert.equal(ukDirect.json().error, DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);

    const fake = await rac({
      method: "bilan_carbone",
      lineKey: `${MARKER}-fake`,
      scope: 2,
      activity: "electricity",
      quantity: "1",
      unit: "kWh",
      country: "TN",
      factorValue: "999",
      resolverResult: { status: "RESOLVED" },
      conversionMultiplier: "2",
    });
    assert.equal(fake.statusCode, 400);

    const after = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    assert.equal(after.rows[0].n, before.rows[0].n);
  });

  it("shadow still works; /v1/factors still 8", async () => {
    const shadow = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve",
      headers: headers(),
      payload: { activity: "electricity", unit: "kWh", country: "TN", mode: "shadow" },
    });
    assert.equal(shadow.statusCode, 200);
    assert.equal(shadow.json().status, "RESOLVED");
    assert.equal(shadow.json().rulesetVersion, RULESET_VERSION);

    const factors = await app.inject({
      method: "GET",
      url: "/v1/factors",
      headers: headers(),
    });
    assert.equal(factors.json().total, 8);
  });
});
