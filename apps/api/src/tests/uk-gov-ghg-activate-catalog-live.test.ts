/**
 * Live tests for UK GHG 2026 catalog activation (023).
 * Expects DATABASE_URL against a DB after migration 023.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import { UNAVAILABLE_EMISSION_FACTOR_ERROR } from "../routes/calculate.js";
import { getFactorFacets, searchFactors } from "../services/factorSearch.js";
import { UK_DATASET_VERSION, UK_SOURCE_KEY } from "../importers/ukGovGhg/types.js";

const DATABASE_URL = process.env.DATABASE_URL_FRESH || process.env.DATABASE_URL;

describe("uk gov ghg 2026 catalog activation (live)", { skip: !DATABASE_URL }, () => {
  it("UK approved/visible counts + ADEME/Core TN non-regression", async () => {
    const pool = new pg.Pool({ connectionString: DATABASE_URL });
    try {
      const registry = await pool.query(`SELECT COUNT(*)::int AS n FROM emission_factors`);
      assert.equal(registry.rows[0].n, 10024);

      const gov = await pool.query(
        `SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status,
                COUNT(f.id)::int AS n,
                COUNT(*) FILTER (WHERE f.status = 'approved')::int AS approved_n
         FROM emission_factor_versions v
         JOIN factor_sources s ON s.id = v.source_id
         LEFT JOIN emission_factors f ON f.version_id = v.id
         WHERE s.source_key = $1 AND v.dataset_version = $2
         GROUP BY 1,2,3,4`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(gov.rows[0].n, 2622);
      assert.equal(gov.rows[0].approved_n, 2622);
      assert.equal(gov.rows[0].status, "approved");
      assert.equal(gov.rows[0].catalog_status, "visible");
      assert.equal(gov.rows[0].calculation_status, "disabled");
      assert.equal(gov.rows[0].resolver_status, "disabled");

      const visible = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible'`,
      );
      assert.equal(visible.rows[0].n, 10024);

      const dist = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE f.metadata->>'normalization_status' = 'review_required')::int AS review_required,
           COUNT(*) FILTER (WHERE f.gwp_basis = 'unknown')::int AS gwp_unknown
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(dist.rows[0].review_required, 363);
      assert.equal(dist.rows[0].gwp_unknown, 359);

      const ademe = await pool.query(
        `SELECT COUNT(f.id)::int AS n, v.status, v.catalog_status, v.calculation_status, v.resolver_status
         FROM emission_factor_versions v
         JOIN factor_sources s ON s.id = v.source_id
         LEFT JOIN emission_factors f ON f.version_id = v.id
         WHERE s.source_key = 'ademe' GROUP BY 2,3,4,5`,
      );
      assert.equal(ademe.rows[0].n, 7394);
      assert.equal(ademe.rows[0].status, "approved");
      assert.equal(ademe.rows[0].catalog_status, "visible");
      assert.equal(ademe.rows[0].calculation_status, "disabled");
      assert.equal(ademe.rows[0].resolver_status, "disabled");

      const core = await pool.query(
        `SELECT COUNT(f.id)::int AS n, v.status, v.catalog_status, v.calculation_status, v.resolver_status
         FROM emission_factor_versions v
         JOIN factor_sources s ON s.id = v.source_id
         LEFT JOIN emission_factors f ON f.version_id = v.id
         WHERE s.source_key = 'internal' GROUP BY 2,3,4,5`,
      );
      assert.equal(core.rows[0].n, 8);
      assert.equal(core.rows[0].status, "approved");
      assert.equal(core.rows[0].catalog_status, "visible");
      assert.equal(core.rows[0].calculation_status, "enabled");
      assert.equal(core.rows[0].resolver_status, "disabled");

      const calcEligible = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND f.status = 'approved' AND v.status = 'approved'
           AND v.calculation_status = 'enabled'`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(calcEligible.rows[0].n, 0);

      const legacy = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal'`,
      );
      assert.equal(legacy.rows[0].n, 8);
    } finally {
      await pool.end();
    }
  });

  it("UK search + facets after activation", async () => {
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      for (const q of ["Butane", "electricity", "diesel", "flight"] as const) {
        const res = await searchFactors(pool, {
          status: "approved",
          q,
          source: UK_SOURCE_KEY,
          limit: 10,
        });
        assert.ok(res.total >= 1, `expected UK hits for q=${q}`);
        assert.ok(res.items.length >= 1, `expected UK items for q=${q}`);
        for (const item of res.items) {
          assert.equal(item.source.key, UK_SOURCE_KEY);
          assert.match(item.source.name, /UK Government/i);
          assert.equal(item.datasetVersion, UK_DATASET_VERSION);
        }
      }

      const facets = await getFactorFacets(pool, { status: "approved" });
      const ukFacet = facets.sources.find((s) => s.value === UK_SOURCE_KEY);
      assert.ok(ukFacet, "UK source missing from facets");
      assert.equal(ukFacet.count, 2622);
      const total = facets.sources.reduce((sum, s) => sum + s.count, 0);
      assert.equal(total, 10024);
    } finally {
      await pool.end();
    }
  });

  it("UK calculate refused; legacy /v1/factors remains 8", async (t) => {
    if (!process.env.DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const app = await buildTestApp();
    try {
      const member = await pool.query<{
        user_id: string;
        email: string;
        organization_id: string;
      }>(
        `SELECT om.user_id, u.email, om.organization_id
         FROM organization_members om JOIN users u ON u.id = om.user_id LIMIT 1`,
      );
      if (!member.rows[0]) {
        t.skip("no org member");
        return;
      }
      const { user_id, email, organization_id } = member.rows[0];
      const token = signToken({
        id: user_id,
        email,
        organizationId: organization_id,
        role: "member",
      });
      const ukFactor = await pool.query<{ id: string }>(
        `SELECT f.id FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND f.status = 'approved'
         LIMIT 1`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.ok(ukFactor.rows[0]?.id);

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
              lineKey: "uk-catalog-refuse",
              scope: 1,
              factorId: ukFactor.rows[0].id,
              activityQuantity: "1",
              activityUnit: "kWh",
            },
          ],
        },
      });
      assert.equal(calc.statusCode, 400);
      assert.equal(calc.json().error, UNAVAILABLE_EMISSION_FACTOR_ERROR);

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

      const searchHttp = await app.inject({
        method: "GET",
        url: `/v1/factors/search?status=approved&source=${UK_SOURCE_KEY}&q=Butane&limit=5`,
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": organization_id,
        },
      });
      assert.equal(searchHttp.statusCode, 200);
      const body = searchHttp.json() as { total: number; items: Array<{ source: { key: string; name: string }; datasetVersion: string }> };
      assert.ok(body.total >= 1);
      assert.equal(body.items[0].source.key, UK_SOURCE_KEY);
      assert.match(body.items[0].source.name, /UK Government/i);
      assert.equal(body.items[0].datasetVersion, UK_DATASET_VERSION);

      const facetsHttp = await app.inject({
        method: "GET",
        url: "/v1/factors/facets?status=approved",
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": organization_id,
        },
      });
      assert.equal(facetsHttp.statusCode, 200);
      const facetBody = facetsHttp.json() as { sources: Array<{ value: string; count: number }> };
      const uk = facetBody.sources.find((s) => s.value === UK_SOURCE_KEY);
      assert.ok(uk);
      assert.equal(uk.count, 2622);
    } finally {
      await app.close();
      await pool.end();
    }
  });
});
