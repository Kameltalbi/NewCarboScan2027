/**
 * Live tests for UK GHG 2026 seed bootstrap (draft/hidden).
 * Prefer DATABASE_URL_FRESH=...newcarboscan_uk_fresh for fresh-DB assertions.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import { DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR } from "../routes/calculate.js";
import { UK_DATASET_VERSION, UK_SOURCE_KEY } from "../importers/ukGovGhg/types.js";

const DATABASE_URL = process.env.DATABASE_URL_FRESH || process.env.DATABASE_URL;

describe("uk gov ghg 2026 bootstrap (live)", { skip: !DATABASE_URL }, () => {
  it("UK draft/hidden counts + distributions + ADEME/Core TN", async (t) => {
    const pool = new pg.Pool({ connectionString: DATABASE_URL });
    try {
      const registry = await pool.query(`SELECT COUNT(*)::int AS n FROM emission_factors`);
      assert.equal(registry.rows[0].n, 11445);

      const gov = await pool.query(
        `SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status, COUNT(f.id)::int AS n
         FROM emission_factor_versions v
         JOIN factor_sources s ON s.id = v.source_id
         LEFT JOIN emission_factors f ON f.version_id = v.id
         WHERE s.source_key = $1 AND v.dataset_version = $2
         GROUP BY 1,2,3,4`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(gov.rows[0].n, 2622);
      // After 023 catalog activation this suite no longer applies — use activate-catalog-live.
      if (gov.rows[0].status !== "draft" || gov.rows[0].catalog_status !== "hidden") {
        t.skip("UK already catalog-activated (023); see uk-gov-ghg-activate-catalog-live");
        return;
      }
      assert.equal(gov.rows[0].status, "draft");
      assert.equal(gov.rows[0].catalog_status, "hidden");
      assert.equal(gov.rows[0].calculation_status, "enabled");
      assert.equal(gov.rows[0].resolver_status, "enabled");

      const visible = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible'`,
      );
      assert.equal(visible.rows[0].n, 7402);

      const dist = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE f.gwp_basis = 'AR5')::int AS ar5,
           COUNT(*) FILTER (WHERE f.gwp_basis = 'AR4')::int AS ar4,
           COUNT(*) FILTER (WHERE f.gwp_basis = 'unknown')::int AS gwp_unknown,
           COUNT(*) FILTER (WHERE f.gwp_basis = 'mixed')::int AS mixed,
           COUNT(*) FILTER (WHERE f.country_code = 'GB')::int AS gb,
           COUNT(*) FILTER (WHERE f.country_code IS NULL)::int AS geo_null,
           COUNT(*) FILTER (WHERE f.country_code IS NOT NULL AND f.country_code <> 'GB')::int AS geo_other,
           COUNT(*) FILTER (WHERE f.metadata->>'normalization_status' = 'review_required')::int AS review_required,
           COUNT(*) FILTER (WHERE f.metadata->'taxonomy'->>'mapping_status' = 'unmapped')::int AS unmapped,
           COUNT(*) FILTER (WHERE f.value = 0)::int AS zeros
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(dist.rows[0].ar5, 2055);
      assert.equal(dist.rows[0].ar4, 169);
      assert.equal(dist.rows[0].gwp_unknown, 359);
      assert.equal(dist.rows[0].mixed, 39);
      assert.equal(dist.rows[0].gb, 2529);
      assert.equal(dist.rows[0].geo_null, 60);
      assert.equal(dist.rows[0].geo_other, 33);
      assert.equal(dist.rows[0].review_required, 363);
      assert.equal(dist.rows[0].unmapped, 0);
      assert.equal(dist.rows[0].zeros, 38);

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
      assert.equal(ademe.rows[0].calculation_status, "enabled");
      assert.equal(ademe.rows[0].resolver_status, "enabled");

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
      assert.equal(core.rows[0].resolver_status, "enabled");

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

  it("UK calculate refused on primary DATABASE_URL if auth fixture exists", async (t) => {
    if (!process.env.DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const app = await buildTestApp();
    try {
      const { ensureTestOrgFixture } = await import("./helpers/ensureTestOrgFixture.js");
      const fixture = await ensureTestOrgFixture(pool);
      const token = signToken({
        id: fixture.userId,
        email: fixture.email,
        organizationId: fixture.organizationId,
        role: "member",
      });
      const ukFactor = await pool.query<{ id: string }>(
        `SELECT f.id FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2 LIMIT 1`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      const calc = await app.inject({
        method: "POST",
        url: "/v1/calculate",
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": fixture.organizationId,
          "content-type": "application/json",
        },
        payload: {
          method: "bilan_carbone",
          lines: [
            {
              lineKey: "uk-bootstrap-refuse",
              scope: 1,
              factorId: ukFactor.rows[0].id,
              activityQuantity: "1",
              activityUnit: "kWh",
            },
          ],
        },
      });
      assert.equal(calc.statusCode, 400);
      assert.equal(calc.json().error, DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);

      const factors = await app.inject({
        method: "GET",
        url: "/v1/factors",
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": fixture.organizationId,
        },
      });
      assert.equal(factors.statusCode, 200);
      assert.equal(factors.json().total, 8);
    } finally {
      await app.close();
      await pool.end();
    }
  });
});
