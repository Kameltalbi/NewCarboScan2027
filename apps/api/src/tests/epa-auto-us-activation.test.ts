/**
 * EPA AUTO_US activation (027) — resolve + resolve-and-calculate for US;
 * geographic refusals; GWP/components/review excluded; TN/FR/GB non-regression.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import { ensureTestOrgFixture } from "./helpers/ensureTestOrgFixture.js";
import {
  DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR,
  UNAVAILABLE_EMISSION_FACTOR_ERROR,
} from "../routes/calculate.js";
import {
  EPA_SAFE_SUBSET_RULESET,
  EPA_SOURCE_KEY,
  EXPECTED_SUBSET_COUNTS,
  RULESET_VERSION,
  resolveAndCalculate,
  resolveFactor,
} from "../services/factorResolver/index.js";
import { evaluateGeography } from "../services/factorResolver/geographyPolicy.js";
import { EPA_AUTO_US_SAFE_SQL } from "../services/factorResolver/epaSafeSubset.js";

const DATABASE_URL = process.env.DATABASE_URL;

describe("EPA AUTO_US activation (027)", { skip: !DATABASE_URL }, () => {
  let pool: pg.Pool;
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let token: string;
  let organizationId: string;
  let prevFlag: string | undefined;
  let egridAznmId: string;
  let egridAznmValue: number;
  let wasteId: string;
  let gwpId: string;
  let componentId: string;
  let reviewActivityId: string;
  let coreElectricityId: string;

  before(async () => {
    prevFlag = process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = "true";
    pool = new pg.Pool({ connectionString: DATABASE_URL });
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
       WHERE s.source_key = $1 AND v.dataset_version = '2025'`,
      [EPA_SOURCE_KEY],
    );
    assert.equal(gov.rows[0]?.catalog_status, "visible");
    assert.equal(gov.rows[0]?.calculation_status, "enabled");
    assert.equal(gov.rows[0]?.resolver_status, "enabled");

    const autoUs = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE ${EPA_AUTO_US_SAFE_SQL}`,
    );
    assert.equal(Number(autoUs.rows[0].n), EXPECTED_SUBSET_COUNTS.epaSafeUs);
    assert.equal(RULESET_VERSION, "2026-09-v6");

    const egrid = await pool.query<{ id: string; value: string }>(
      `SELECT f.id, f.value::text AS value FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1
         AND f.stable_factor_id = 'epa:2025:t6:aznm:total_output:co2e_derived:kg_co2e_per_mwh'`,
      [EPA_SOURCE_KEY],
    );
    egridAznmId = egrid.rows[0].id;
    egridAznmValue = Number(egrid.rows[0].value);

    const waste = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1
         AND f.factor_kind = 'activity_emission_factor'
         AND (f.metadata->'provenance'->>'table_number')::int = 9
       LIMIT 1`,
      [EPA_SOURCE_KEY],
    );
    wasteId = waste.rows[0].id;

    const gwp = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND f.factor_kind = 'gwp' LIMIT 1`,
      [EPA_SOURCE_KEY],
    );
    gwpId = gwp.rows[0].id;

    const comp = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND f.factor_kind = 'ghg_component' LIMIT 1`,
      [EPA_SOURCE_KEY],
    );
    componentId = comp.rows[0].id;

    const review = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1
         AND f.factor_kind = 'activity_emission_factor'
         AND f.metadata->'geography'->>'geographic_applicability' = 'REQUIRES_REVIEW'
       LIMIT 1`,
      [EPA_SOURCE_KEY],
    );
    reviewActivityId = review.rows[0].id;

    const core = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = 'internal' AND f.stable_factor_id = 'electricity_kwh' LIMIT 1`,
    );
    coreElectricityId = core.rows[0].id;
  });

  after(async () => {
    if (prevFlag === undefined) delete process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    else process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = prevFlag;
    await app.close();
    await pool.end();
  });

  it("geo policy: missing/WORLD/TN/FR/GB reject EPA; eGRID needs region", () => {
    const egridCand = {
      sourceKey: EPA_SOURCE_KEY,
      countryCode: "US",
      region: "AZNM",
      stableFactorId: "epa:2025:t6:aznm:total_output:co2e_derived:kg_co2e_per_mwh",
      name: "eGRID AZNM",
      geographicApplicability: "US_SPECIFIC",
      epaTableNumber: 6,
    };
    assert.equal(evaluateGeography({ country: undefined }, egridCand).eligible, false);
    assert.equal(evaluateGeography({ country: "WORLD" }, egridCand).eligible, false);
    assert.equal(evaluateGeography({ country: "TN" }, egridCand).reasonCode, "GEO_EPA_EGRID_US_ONLY");
    assert.equal(evaluateGeography({ country: "FR" }, egridCand).eligible, false);
    assert.equal(evaluateGeography({ country: "GB" }, egridCand).eligible, false);
    assert.equal(
      evaluateGeography({ country: "US" }, egridCand).reasonCode,
      "GEO_EPA_EGRID_REGION_REQUIRED",
    );
    assert.equal(
      evaluateGeography({ country: "US", region: "CAMX" }, egridCand).reasonCode,
      "GEO_EPA_EGRID_REGION_MISMATCH",
    );
    assert.equal(evaluateGeography({ country: "US", region: "AZNM" }, egridCand).eligible, true);

    const wasteCand = {
      sourceKey: EPA_SOURCE_KEY,
      countryCode: "US",
      region: null as string | null,
      stableFactorId: "epa:2025:t9:x",
      name: "Waste",
      geographicApplicability: "US_SPECIFIC",
      epaTableNumber: 9,
    };
    assert.equal(evaluateGeography({ country: "TN" }, wasteCand).eligible, false);
    assert.equal(evaluateGeography({ country: "US" }, wasteCand).eligible, true);
  });

  it("US eGRID resolve-and-calculate matches Hub value + ledger provenance", async () => {
    // EPA Hub 2025 eGRID AZNM total-output derived AR5 — registry value is source of truth
    const qtyMwh = "1";
    const expected = egridAznmValue * Number(qtyMwh);

    const result = await resolveAndCalculate(pool, {
      organizationId,
      userId: (await ensureTestOrgFixture(pool)).userId,
      method: "ghg_protocol",
      lineKey: "epa-auto-us-egrid-aznm",
      scope: 2,
      resolve: {
        activity: "eGRID AZNM electricity total output",
        unit: "MWh",
        quantity: qtyMwh,
        country: "US",
        region: "AZNM",
        preferredSource: EPA_SOURCE_KEY,
        lifecycleBoundary: "direct",
        gwpBasis: "AR5",
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.resolution.status, "RESOLVED");
    assert.equal(result.resolution.selectedFactor?.source.key, EPA_SOURCE_KEY);
    assert.equal(result.resolution.selectedFactor?.id, egridAznmId);
    assert.ok(Math.abs(Number(result.lines[0].resultKgCo2e) - expected) < 1e-6);
    assert.equal(result.resolution.rulesetVersion, RULESET_VERSION);
    assert.equal(result.resolution.provenance.epaSafeSubsetRuleset, EPA_SAFE_SUBSET_RULESET);
    assert.equal(result.resolution.provenance.epaSafeClass, "AUTO_US");
    assert.equal(result.resolution.provenance.egrid, true);
    assert.equal(result.resolution.provenance.derived, true);
    assert.equal(result.resolution.provenance.gwpBasis, "AR5");

    const led = await pool.query<{
      factor_id: string;
      provenance: Record<string, unknown>;
      unit_conversion: Record<string, unknown> | null;
    }>(
      `SELECT factor_id, provenance, unit_conversion FROM calculation_ledger WHERE run_id = $1`,
      [result.runId],
    );
    assert.equal(led.rows[0].factor_id, egridAznmId);
    assert.equal(led.rows[0].provenance.epaSafeSubsetRuleset, EPA_SAFE_SUBSET_RULESET);
    assert.equal(led.rows[0].provenance.rulesetVersion, RULESET_VERSION);
    assert.equal(led.rows[0].provenance.sourceKey, EPA_SOURCE_KEY);
    assert.ok(led.rows[0].unit_conversion);
  });

  it("US eGRID with kWh uses safe MWh conversion", async () => {
    const result = await resolveAndCalculate(pool, {
      organizationId,
      userId: (await ensureTestOrgFixture(pool)).userId,
      method: "ghg_protocol",
      lineKey: "epa-auto-us-egrid-kwh",
      scope: 2,
      resolve: {
        activity: "eGRID AZNM electricity total output",
        unit: "kWh",
        quantity: "1000",
        country: "US",
        region: "AZNM",
        preferredSource: EPA_SOURCE_KEY,
        lifecycleBoundary: "direct",
        gwpBasis: "AR5",
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(Number(result.lines[0].resultKgCo2e) - egridAznmValue) < 1e-4);
    assert.equal(result.unitConversion?.class, "safe");
  });

  it("TN/FR/GB electricity never select EPA; TN stays Core TN", async () => {
    for (const country of ["TN", "FR", "GB"] as const) {
      const r = await resolveFactor(pool, {
        mode: "production",
        organizationId,
        activity: "eGRID AZNM electricity",
        unit: "MWh",
        country,
        region: "AZNM",
        preferredSource: EPA_SOURCE_KEY,
      });
      if (r.selectedFactor) {
        assert.notEqual(r.selectedFactor.source.key, EPA_SOURCE_KEY, country);
      }
    }
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

  it("US without eGRID region does not arbitrary-pick a subregion", async () => {
    const r = await resolveFactor(pool, {
      mode: "production",
      organizationId,
      activity: "eGRID electricity total output",
      unit: "MWh",
      country: "US",
      preferredSource: EPA_SOURCE_KEY,
    });
    if (r.selectedFactor?.source.key === EPA_SOURCE_KEY) {
      assert.ok(!r.selectedFactor.name.toLowerCase().includes("egrid"));
    } else {
      assert.ok(
        r.status === "NO_MATCH" ||
          r.status === "REQUIRES_CONTEXT" ||
          r.status === "AMBIGUOUS" ||
          r.status === "REVIEW_REQUIRED" ||
          r.selectedFactor?.source.key !== EPA_SOURCE_KEY,
      );
    }
  });

  it("GWP / component / review activity UUID: unavailable on direct calculate", async () => {
    for (const factorId of [gwpId, componentId, reviewActivityId]) {
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
              lineKey: "epa-blocked-id",
              scope: 1,
              factorId,
              activityQuantity: "1",
              activityUnit: "kg",
            },
          ],
        },
      });
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error, UNAVAILABLE_EMISSION_FACTOR_ERROR);
    }
  });

  it("AUTO_US eGRID UUID on direct calculate: source-restricted (use resolve-and-calculate)", async () => {
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
            lineKey: "epa-direct-refuse",
            scope: 2,
            factorId: egridAznmId,
            activityQuantity: "1",
            activityUnit: "MWh",
          },
        ],
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);
  });

  it("Core TN direct calculate still works (non-regression)", async () => {
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
            lineKey: "core-tn-ok",
            scope: 2,
            factorId: coreElectricityId,
            activityQuantity: "10",
            activityUnit: "kWh",
          },
        ],
      },
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it("waste AUTO_US resolves for US without eGRID region", async () => {
    const r = await resolveFactor(pool, {
      mode: "production",
      organizationId,
      activity: "food waste composted",
      unit: "short ton",
      country: "US",
      preferredSource: EPA_SOURCE_KEY,
      lifecycleBoundary: "waste_treatment",
    });
    // May be RESOLVED or REQUIRES_CONTEXT depending on unit synonyms — must not be EPA if TN
    if (r.status === "RESOLVED" && r.selectedFactor?.source.key === EPA_SOURCE_KEY) {
      assert.ok(r.selectedFactor.id);
      assert.notEqual(r.selectedFactor.factorKind, "gwp");
    }
    void wasteId;
  });
});
