/**
 * Phase 1 production integration — harden calculate + resolve-and-calculate.
 * Does not permanently activate ADEME/UK governance.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import {
  DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR,
  REGISTRY_FACTOR_OVERRIDE_ERROR,
} from "../routes/calculate.js";
import { RESOLVER_CALCULATION_DISABLED_ERROR } from "../services/factorResolver/featureFlags.js";
import {
  ADEME_SAFE_SUBSET_SQL,
  UK_SAFE_SUBSET_SQL,
  EXPECTED_SUBSET_COUNTS,
} from "../services/factorResolver/safeSubsets.js";
import { resolveFactor } from "../services/factorResolver/index.js";

const DATABASE_URL = process.env.DATABASE_URL;

describe("factor resolver production phase 1", { skip: !DATABASE_URL }, () => {
  let pool: pg.Pool;
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;
  let organizationId: string;
  let userId: string;
  let coreElectricityId: string;
  let ademeId: string;
  let ukId: string;
  let prevFlag: string | undefined;

  before(async () => {
    prevFlag = process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    delete process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;

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
    if (!member.rows[0]) throw new Error("no org member fixture");
    userId = member.rows[0].user_id;
    organizationId = member.rows[0].organization_id;
    token = signToken({
      id: userId,
      email: member.rows[0].email,
      organizationId,
      role: "member",
    });

    const core = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = 'internal' AND f.stable_factor_id = 'electricity_kwh' LIMIT 1`,
    );
    coreElectricityId = core.rows[0].id;

    const ademe = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = 'ademe' AND f.status = 'approved' LIMIT 1`,
    );
    ademeId = ademe.rows[0].id;

    const uk = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = 'uk_gov_ghg' AND f.status = 'approved' LIMIT 1`,
    );
    ukId = uk.rows[0].id;
  });

  after(async () => {
    if (prevFlag === undefined) delete process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    else process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = prevFlag;
    await app.close();
    await pool.end();
  });

  function authHeaders() {
    return {
      authorization: `Bearer ${token}`,
      "x-organization-id": organizationId,
      "content-type": "application/json",
    };
  }

  it("non-regression governance + subset counts", async () => {
    const registry = await pool.query(`SELECT COUNT(*)::int AS n FROM emission_factors`);
    assert.equal(registry.rows[0].n, 10024);
    const visible = await pool.query(
      `SELECT COUNT(*)::int AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       WHERE f.status='approved' AND v.status='approved' AND v.catalog_status='visible'`,
    );
    assert.equal(visible.rows[0].n, 10024);

    const gov = await pool.query(
      `SELECT s.source_key, v.calculation_status, v.resolver_status, COUNT(f.id)::int AS n
       FROM emission_factor_versions v
       JOIN factor_sources s ON s.id = v.source_id
       LEFT JOIN emission_factors f ON f.version_id = v.id
       WHERE s.source_key IN ('ademe','uk_gov_ghg','internal')
       GROUP BY 1,2,3`,
    );
    const by = Object.fromEntries(gov.rows.map((r) => [r.source_key, r]));
    // FE V1 migration 024: version-level calc+resolver enabled; safe subset in ruleset
    assert.equal(by.ademe.calculation_status, "enabled");
    assert.equal(by.ademe.resolver_status, "enabled");
    assert.equal(by.uk_gov_ghg.calculation_status, "enabled");
    assert.equal(by.uk_gov_ghg.resolver_status, "enabled");
    assert.equal(by.internal.calculation_status, "enabled");
    assert.equal(by.internal.resolver_status, "enabled");
    assert.equal(by.internal.n, EXPECTED_SUBSET_COUNTS.coreTn);

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

  it("harden /v1/calculate: Core TN OK; ADEME/UK UUID refused; overrides refused", async () => {
    const ok = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers: authHeaders(),
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "core-ok",
            scope: 2,
            factorId: coreElectricityId,
            activityQuantity: "10",
            activityUnit: "kWh",
          },
        ],
      },
    });
    assert.equal(ok.statusCode, 200);
    assert.ok(ok.json().runId);

    const ademe = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers: authHeaders(),
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "ademe-bypass",
            scope: 1,
            factorId: ademeId,
            activityQuantity: "1",
            activityUnit: "kWh",
          },
        ],
      },
    });
    // FE V1: ADEME calc may be enabled at version level — direct UUID still blocked
    assert.equal(ademe.statusCode, 400);
    assert.equal(ademe.json().error, DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);

    const uk = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers: authHeaders(),
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "uk-bypass",
            scope: 1,
            factorId: ukId,
            activityQuantity: "1",
            activityUnit: "kWh",
          },
        ],
      },
    });
    assert.equal(uk.statusCode, 400);
    assert.equal(uk.json().error, DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);

    const override = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers: authHeaders(),
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "override",
            scope: 2,
            factorId: coreElectricityId,
            activityQuantity: "1",
            activityUnit: "kWh",
            factorValue: "999",
          },
        ],
      },
    });
    assert.equal(override.statusCode, 400);
    assert.equal(override.json().error, REGISTRY_FACTOR_OVERRIDE_ERROR);

    // Fake resolverResult / conversion rejected by strict schema
    const fake = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers: authHeaders(),
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: "fake",
            scope: 2,
            factorId: coreElectricityId,
            activityQuantity: "1",
            activityUnit: "kWh",
            resolverResult: { status: "RESOLVED" },
            conversionMultiplier: "0.001",
          },
        ],
      },
    });
    assert.equal(fake.statusCode, 400);
  });

  it("feature flag OFF: resolve-and-calculate refuses; shadow still works", async () => {
    delete process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    const ledgerBefore = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);

    const calc = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      headers: authHeaders(),
      payload: {
        method: "bilan_carbone",
        lineKey: "flag-off",
        scope: 2,
        activity: "electricity",
        quantity: "10",
        unit: "kWh",
        country: "TN",
      },
    });
    assert.equal(calc.statusCode, 403);
    assert.equal(calc.json().error, RESOLVER_CALCULATION_DISABLED_ERROR);

    const shadow = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve",
      headers: authHeaders(),
      payload: {
        activity: "electricity",
        unit: "kWh",
        country: "TN",
        mode: "shadow",
      },
    });
    assert.equal(shadow.statusCode, 200);
    assert.equal(shadow.json().status, "RESOLVED");

    const ledgerAfter = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    assert.equal(ledgerAfter.rows[0].n, ledgerBefore.rows[0].n);
  });

  it("flag ON: fake payload rejected; non-RESOLVED writes nothing", async () => {
    process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = "true";
    const ledgerBefore = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);

    const fakeBody = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      headers: authHeaders(),
      payload: {
        method: "bilan_carbone",
        lineKey: "fake-res",
        scope: 2,
        activity: "electricity",
        quantity: "10",
        unit: "kWh",
        country: "TN",
        factorValue: "999",
        resolverResult: { status: "RESOLVED" },
        conversionMultiplier: "2",
      },
    });
    assert.equal(fakeBody.statusCode, 400);

    const noMatch = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      headers: authHeaders(),
      payload: {
        method: "bilan_carbone",
        lineKey: "nomatch",
        scope: 2,
        activity: "zzzxxyyzz_no_factor",
        quantity: "10",
        unit: "kWh",
        country: "FR",
      },
    });
    assert.ok([404, 422].includes(noMatch.statusCode));
    assert.equal(noMatch.json().error, "FACTOR_NOT_RESOLVED");

    const ledgerAfter = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    assert.equal(ledgerAfter.rows[0].n, ledgerBefore.rows[0].n);
    delete process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
  });

  it("E2E Core TN resolve-and-calculate + ledger provenance", async () => {
    process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = "true";
    const ledgerBefore = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);

    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/factors/resolve-and-calculate",
        headers: authHeaders(),
        payload: {
          method: "bilan_carbone",
          lineKey: "tn-elec-e2e",
          scope: 2,
          activity: "electricity",
          quantity: "1000",
          unit: "kWh",
          country: "TN",
        },
      });
      assert.equal(res.statusCode, 200, JSON.stringify(res.json()));
      const body = res.json() as {
        runId: string;
        totals: { totalKgCo2e?: string; total?: string };
        normalizedQuantity: string;
        resolution: { status: string; selectedFactor: { stableFactorId: string; source: { key: string } } };
        lines: Array<{ resultKgCo2e: string; factorValue: string }>;
      };
      assert.equal(body.resolution.status, "RESOLVED");
      assert.equal(body.resolution.selectedFactor.stableFactorId, "electricity_kwh");
      assert.equal(body.resolution.selectedFactor.source.key, "internal");
      assert.equal(body.normalizedQuantity, "1000");
      assert.equal(Number(body.lines[0].resultKgCo2e), 523);

      const led = await pool.query(
        `SELECT provenance, unit_conversion, activity_quantity::text, activity_unit, factor_checksum
         FROM calculation_ledger WHERE run_id = $1`,
        [body.runId],
      );
      assert.equal(led.rows.length, 1);
      const prov = led.rows[0].provenance;
      assert.equal(prov.source, "api/v1/factors/resolve-and-calculate");
      assert.equal(prov.resolverVersion, "1");
      assert.equal(prov.rulesetVersion, "2026-09-v2");
      assert.equal(prov.stableFactorId, "electricity_kwh");
      assert.equal(prov.sourceKey, "internal");
      assert.equal(prov.originalQuantity, "1000");
      assert.equal(prov.normalizedQuantity, "1000");
      assert.ok(prov.factorChecksum);
      assert.ok(led.rows[0].unit_conversion);
      assert.equal(Number(led.rows[0].activity_quantity), 1000);
      assert.equal(led.rows[0].activity_unit, "kWh");

      const ledgerAfter = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
      assert.equal(ledgerAfter.rows[0].n, ledgerBefore.rows[0].n + 1);
    } finally {
      delete process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    }
  });

  it("shadow matrix statuses still work without calculation", async () => {
    const cases = [
      { activity: "electricity", unit: "kWh", country: "TN" },
      { activity: "electricity", unit: "kWh", country: "FR" },
      { activity: "electricity", unit: "kWh", country: "GB" },
      { activity: "diesel", unit: "L", country: "FR" },
      { activity: "zzzxxyyzz", unit: "kWh", country: "FR" },
    ];
    for (const c of cases) {
      const r = await resolveFactor(pool, {
        ...c,
        mode: "shadow",
        organizationId,
      });
      assert.ok(
        ["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH", "REVIEW_REQUIRED"].includes(
          r.status,
        ),
      );
    }
  });

  it("unauthenticated resolve-and-calculate refused", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      payload: {
        method: "bilan_carbone",
        lineKey: "x",
        scope: 1,
        activity: "electricity",
        quantity: "1",
        unit: "kWh",
        country: "TN",
      },
    });
    assert.ok(res.statusCode === 401 || res.statusCode === 403);
  });

  it("/v1/factors still 8", async () => {
    const factors = await app.inject({
      method: "GET",
      url: "/v1/factors",
      headers: authHeaders(),
    });
    assert.equal(factors.statusCode, 200);
    assert.equal(factors.json().total, 8);
  });
});
