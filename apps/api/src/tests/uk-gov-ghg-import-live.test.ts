/**
 * Live DB tests for UK GHG 2026 draft import.
 * Requires DATABASE_URL and prior local import (draft only).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import {
  UNAVAILABLE_EMISSION_FACTOR_ERROR,
} from "../routes/calculate.js";
import { UK_DATASET_VERSION, UK_SOURCE_KEY } from "../importers/ukGovGhg/types.js";
import { importUkGovGhg2026 } from "../importers/ukGovGhg/index.js";

const DATABASE_URL = process.env.DATABASE_URL;
const WORKBOOK =
  process.env.UK_GHG_XLSX ??
  "/Users/kameltalbi/Desktop/ghg-conversion-factors-2026-flat-format-revised.xlsx";

describe("uk gov ghg 2026 import (live)", { skip: !DATABASE_URL }, () => {
  it("registry / governance / catalog / legacy invariants", async (t) => {
    const pool = new pg.Pool({ connectionString: DATABASE_URL });
    try {
      const registry = await pool.query(`SELECT COUNT(*)::int AS n FROM emission_factors`);
      assert.equal(registry.rows[0].n, 11445);

      const uk = await pool.query(
        `SELECT COUNT(*)::int AS n,
                COUNT(*) FILTER (WHERE f.value = 0)::int AS zeros
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(uk.rows[0].n, 2622);
      assert.equal(uk.rows[0].zeros, 38);

      const gov = await pool.query(
        `SELECT status, catalog_status, calculation_status, resolver_status
         FROM emission_factor_versions v
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      // After 023/024 activation this suite no longer applies — use activate-catalog-live.
      if (gov.rows[0].status !== "draft" || gov.rows[0].catalog_status !== "hidden") {
        t.skip("UK already catalog-activated (023); see uk-gov-ghg-activate-catalog-live");
        return;
      }
      assert.equal(gov.rows[0].status, "draft");
      assert.equal(gov.rows[0].catalog_status, "hidden");
      assert.equal(gov.rows[0].calculation_status, "enabled");
      assert.equal(gov.rows[0].resolver_status, "enabled");

      const ademeGov = await pool.query(
        `SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
         FROM emission_factor_versions v
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = 'ademe'`,
      );
      assert.equal(ademeGov.rows[0].status, "approved");
      assert.equal(ademeGov.rows[0].catalog_status, "visible");
      assert.equal(ademeGov.rows[0].calculation_status, "enabled");
      assert.equal(ademeGov.rows[0].resolver_status, "enabled");

      const coreGov = await pool.query(
        `SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
         FROM emission_factor_versions v
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = 'internal'`,
      );
      assert.equal(coreGov.rows[0].status, "approved");
      assert.equal(coreGov.rows[0].catalog_status, "visible");
      assert.equal(coreGov.rows[0].calculation_status, "enabled");
      assert.equal(coreGov.rows[0].resolver_status, "enabled");

      const visible = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible'`,
      );
      assert.equal(visible.rows[0].n, 7402);

      const legacy = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND s.source_key = 'internal'`,
      );
      assert.equal(legacy.rows[0].n, 8);

      const ademe = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = 'ademe'`,
      );
      assert.equal(ademe.rows[0].n, 7394);

      // No NULL-as-zero: provenance original_value never blank while value=0 unless source zero
      const nullAsZero = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND (f.metadata->'provenance'->>'original_value') IS NULL`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(nullAsZero.rows[0].n, 0);

      // Value preservation
      const mism = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND f.value IS DISTINCT FROM (f.metadata->'provenance'->>'original_value')::numeric`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(mism.rows[0].n, 0);

      // Stable IDs unique; suffix _1
      const stables = await pool.query(
        `SELECT COUNT(*)::int AS n, COUNT(DISTINCT stable_factor_id)::int AS d
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(stables.rows[0].n, stables.rows[0].d);
      const badSuffix = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND f.external_code !~ '_1$'`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(badSuffix.rows[0].n, 0);

      // Distributions recalculated from DB (must match adapter invariants)
      const gwp = await pool.query(
        `SELECT gwp_basis, COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
         GROUP BY 1 ORDER BY 2 DESC`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      const gwpMap = Object.fromEntries(gwp.rows.map((r) => [r.gwp_basis, r.n]));
      assert.equal(gwpMap.AR5, 2055);
      assert.equal(gwpMap.AR4, 169);
      assert.equal(gwpMap.unknown, 359);
      assert.equal(gwpMap.mixed, 39);

      const geo = await pool.query(
        `SELECT COUNT(*) FILTER (WHERE country_code = 'GB')::int AS gb,
                COUNT(*) FILTER (WHERE country_code IS NULL)::int AS nnull,
                COUNT(*) FILTER (WHERE country_code IS NOT NULL AND country_code <> 'GB')::int AS other
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(geo.rows[0].gb, 2529);
      assert.equal(geo.rows[0].nnull, 60);
      assert.equal(geo.rows[0].other, 33);

      const review = await pool.query(
        `SELECT COUNT(*) FILTER (
                  WHERE f.metadata->>'normalization_status' = 'review_required'
                )::int AS review_required,
                COUNT(*) FILTER (
                  WHERE f.metadata->'taxonomy'->>'mapping_status' = 'unmapped'
                )::int AS taxonomy_unmapped
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(review.rows[0].review_required, 363);
      assert.equal(review.rows[0].taxonomy_unmapped, 0);

      // energy basis Gross/Net
      const eb = await pool.query(
        `SELECT energy_basis, COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND energy_basis IS NOT NULL
         GROUP BY 1`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      const ebMap = Object.fromEntries(eb.rows.map((r) => [r.energy_basis, r.n]));
      assert.equal(ebMap.gross_cv, 62);
      assert.equal(ebMap.net_cv, 62);

      // lifecycle WTT/T&D/direct present
      const life = await pool.query(
        `SELECT lifecycle_boundary, COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
         GROUP BY 1`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      const lifeMap = Object.fromEntries(life.rows.map((r) => [r.lifecycle_boundary, r.n]));
      assert.ok((lifeMap.direct ?? 0) > 0);
      assert.ok((lifeMap.wtt ?? 0) > 0);
      assert.ok((lifeMap.td ?? 0) > 0);
      assert.equal(lifeMap.wtw ?? 0, 0);

      // factor_kind
      const kinds = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND factor_kind = 'activity_emission_factor'`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(kinds.rows[0].n, 2622);

      // FE V1 (024): UK version calc+resolver enabled; auto-resolve limited by safe subset ruleset
      const calc = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND f.status = 'approved' AND v.status = 'approved'
           AND v.calculation_status = 'enabled'`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(calc.rows[0].n, 2622);

      const res = await pool.query(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
           AND v.resolver_status = 'enabled'`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(res.rows[0].n, 2622);
    } finally {
      await pool.end();
    }
  });

  it("idempotent re-import keeps counts", { skip: !existsSync(WORKBOOK) }, async () => {
    const pool = new pg.Pool({ connectionString: DATABASE_URL });
    try {
      const before = await pool.query(
        `SELECT md5(string_agg(f.checksum, ',' ORDER BY f.stable_factor_id)) AS c
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      const result = await importUkGovGhg2026(pool, WORKBOOK);
      assert.equal(result.registryAfter, 11445);
      assert.equal(result.ukCount, 2622);
      assert.equal(result.catalogVisible, 10024);
      assert.equal(result.legacyInternal, 8);
      assert.equal(result.inserted, 0);
      const after = await pool.query(
        `SELECT md5(string_agg(f.checksum, ',' ORDER BY f.stable_factor_id)) AS c
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );
      assert.equal(after.rows[0].c, before.rows[0].c);
    } finally {
      await pool.end();
    }
  });

  it("UK calculate refused; legacy /v1/factors remains 8", async () => {
    const pool = new pg.Pool({ connectionString: DATABASE_URL });
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

      const ukGov = await pool.query<{
        status: string;
        catalog_status: string;
        calculation_status: string;
      }>(
        `SELECT v.status, v.catalog_status, v.calculation_status
         FROM emission_factor_versions v
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2`,
        [UK_SOURCE_KEY, UK_DATASET_VERSION],
      );

      const ukFactor = await pool.query<{ id: string }>(
        `SELECT f.id FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = $1 AND v.dataset_version = $2
         LIMIT 1`,
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
              lineKey: "uk-draft-refuse",
              scope: 1,
              factorId: ukFactor.rows[0].id,
              activityQuantity: "1",
              activityUnit: "kWh",
            },
          ],
        },
      });
      assert.equal(calc.statusCode, 400);
      // Draft/hidden → unavailable; post-023 approved+enabled → direct-calc source gate
      const err = calc.json().error as string;
      if (
        ukGov.rows[0]?.status === "draft" ||
        ukGov.rows[0]?.catalog_status === "hidden" ||
        ukGov.rows[0]?.calculation_status !== "enabled"
      ) {
        assert.equal(err, UNAVAILABLE_EMISSION_FACTOR_ERROR);
      } else {
        const { DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR } = await import(
          "../routes/calculate.js"
        );
        assert.equal(err, DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR);
      }

      const factors = await app.inject({
        method: "GET",
        url: "/v1/factors",
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": fixture.organizationId,
        },
      });
      assert.equal(factors.statusCode, 200);
      const list = factors.json() as { items?: unknown[]; total?: number };
      assert.equal(list.total, 8);
      assert.equal(list.items?.length, 8);
    } finally {
      await app.close();
      await pool.end();
    }
  });
});
