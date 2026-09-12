import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import { DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR } from "../routes/calculate.js";
import { ensureTestOrgFixture } from "./helpers/ensureTestOrgFixture.js";

const DATABASE_URL = process.env.DATABASE_URL;

describe("factor resolver HTTP shadow", { skip: !DATABASE_URL }, () => {
  it("auth + shadow resolve + calculate non-regression", async () => {
    const pool = new pg.Pool({ connectionString: DATABASE_URL });
    const app = await buildTestApp();
    try {
      const fixture = await ensureTestOrgFixture(pool);
      const { userId: user_id, email, organizationId: organization_id } = fixture;
      const token = signToken({
        id: user_id,
        email,
        organizationId: organization_id,
        role: "member",
      });

      const unauth = await app.inject({
        method: "POST",
        url: "/v1/factors/resolve",
        payload: { activity: "electricity", unit: "kWh", country: "TN", mode: "shadow" },
      });
      assert.ok(unauth.statusCode === 401 || unauth.statusCode === 403);

      const ledgerBefore = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);

      const res = await app.inject({
        method: "POST",
        url: "/v1/factors/resolve",
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": organization_id,
          "content-type": "application/json",
        },
        payload: {
          activity: "electricity",
          unit: "kWh",
          country: "TN",
          mode: "shadow",
        },
      });
      assert.equal(res.statusCode, 200);
      const body = res.json() as { status: string; resolverVersion: string; rulesetVersion: string };
      assert.ok(body.status);
      assert.equal(body.resolverVersion, "1");
      assert.equal(body.rulesetVersion, "2026-09-v2");

      const ledgerAfter = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
      assert.equal(ledgerAfter.rows[0].n, ledgerBefore.rows[0].n);

      // /v1/factors still 8
      const factors = await app.inject({
        method: "GET",
        url: "/v1/factors",
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": organization_id,
        },
      });
      assert.equal(factors.statusCode, 200);
      assert.equal(factors.json().total, 8);

      // ADEME/UK still refused by calculate
      const uk = await pool.query<{ id: string }>(
        `SELECT f.id FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = 'uk_gov_ghg' LIMIT 1`,
      );
      const calc = await app.inject({
        method: "POST",
        url: "/v1/calculate",
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": organization_id,
          "content-type": "application/json",
        },
        payload: {
          method: "bilan_carbone",
          lines: [
            {
              lineKey: "resolver-shadow-calc-check",
              scope: 1,
              factorId: uk.rows[0].id,
              activityQuantity: "1",
              activityUnit: "kWh",
            },
          ],
        },
      });
      assert.equal(calc.statusCode, 400);
      assert.equal(calc.json().error, DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);
    } finally {
      await app.close();
      await pool.end();
    }
  });
});
