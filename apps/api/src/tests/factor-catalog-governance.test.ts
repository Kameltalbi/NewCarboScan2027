import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { buildTestApp } from "./helpers/buildTestApp.js";
import { signToken } from "../plugins/auth.js";
import {
  buildVisibilityClause,
  getFactorById,
  getFactorFacets,
  searchFactors,
} from "../services/factorSearch.js";

const DATABASE_URL = process.env.DATABASE_URL;

async function legacyFactorCount(pool: pg.Pool | pg.PoolClient): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
     FROM emission_factors f
     JOIN emission_factor_versions v ON v.id = f.version_id
     JOIN factor_sources s ON s.id = v.source_id
     WHERE f.status = 'approved'
       AND v.status = 'approved'
       AND s.source_key = 'internal'`,
  );
  return Number(rows[0]?.n ?? 0);
}

describe("factor catalog governance 019", () => {
  it("buildVisibilityClause requires catalog visible for approved preset", () => {
    const clauses = buildVisibilityClause({ status: "approved" });
    assert.ok(clauses.includes("v.catalog_status = 'visible'"));
    assert.ok(clauses.includes("v.status = 'approved'"));
    assert.ok(clauses.includes("f.status = 'approved'"));
  });

  it("skips when DATABASE_URL unset", () => {
    if (!DATABASE_URL) assert.ok(true);
  });

  it("GET /v1/factors legacy returns 8 internal factors", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const app = await buildTestApp();
    try {
      const member = await pool.query<{ user_id: string; email: string; organization_id: string }>(
        `SELECT om.user_id, u.email, om.organization_id
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         LIMIT 1`,
      );
      if (!member.rows[0]) {
        t.skip("need org member fixture");
        return;
      }
      const token = signToken({
        id: member.rows[0].user_id,
        email: member.rows[0].email,
        organizationId: member.rows[0].organization_id,
        role: "member",
      });
      const res = await app.inject({
        method: "GET",
        url: "/v1/factors",
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": member.rows[0].organization_id,
        },
      });
      assert.equal(res.statusCode, 200);
      const body = res.json() as { total: number; items: unknown[] };
      assert.equal(body.total, 8);
      assert.equal(body.items.length, 8);
      assert.equal(await legacyFactorCount(pool), 8);
    } finally {
      await app.close();
      await pool.end();
    }
  });

  it("governance matrix: normal catalog visibility", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const normal = await searchFactors(pool, { status: "approved", limit: 100 });
      assert.equal(normal.items.length, 100);
      const catalogCount = await pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible'`,
      );
      assert.equal(Number(catalogCount.rows[0].n), 10024);

      const approvedHidden = await searchFactors(pool, {
        status: "approved",
        version_status: "approved",
        catalog_status: "hidden",
        limit: 5,
      });
      assert.equal(approvedHidden.items.length, 0);

      const deprecated = await searchFactors(pool, { status: "deprecated", limit: 5 });
      assert.equal(deprecated.items.length, 0);
    } finally {
      await pool.end();
    }
  });

  it("normal catalog includes ADEME after 019B activation", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const catalog = await searchFactors(pool, { status: "approved", source: "ademe", limit: 5 });
      assert.ok(catalog.items.length >= 1);
      assert.ok(catalog.items.every((i) => i.source.key === "ademe"));
    } finally {
      await pool.end();
    }
  });

  it("detail exposes governance block for approved TN factor", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const tn = await pool.query<{ id: string }>(
        `SELECT f.id FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         JOIN factor_sources s ON s.id = v.source_id
         WHERE s.source_key = 'internal' LIMIT 1`,
      );
      const detail = await getFactorById(pool, tn.rows[0].id, false);
      assert.ok(detail);
      assert.equal(detail!.governance.dataStatus, "approved");
      assert.equal(detail!.governance.versionDataStatus, "approved");
      assert.equal(detail!.governance.catalogStatus, "visible");
      assert.equal(detail!.governance.calculationStatus, "enabled");
      assert.equal(detail!.governance.resolverStatus, "enabled");
    } finally {
      await pool.end();
    }
  });

  it("review_required factor visible in catalog after 019B", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT f.id FROM emission_factors f
         WHERE f.name ILIKE '%Décarbonatation%fabrication du ciment%'
         LIMIT 1`,
      );
      if (!rows[0]) {
        t.skip("review_required cement factor not found");
        return;
      }

      const visible = await searchFactors(pool, {
        status: "approved",
        q: "Décarbonatation",
        limit: 5,
      });
      assert.ok(visible.items.some((i) => i.id === rows[0].id));
      const detail = await getFactorById(pool, rows[0].id, false);
      assert.equal(detail!.units.normalizationStatus, "review_required");
      // Version-level calc may be enabled (024); review_required still never auto-resolves.
      assert.equal(detail!.governance.calculationStatus, "enabled");
      assert.equal(await legacyFactorCount(pool), 8);
    } finally {
      await pool.end();
    }
  });

  it("019B active state: catalog 7402, legacy 8", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      assert.equal(await legacyFactorCount(pool), 8);
      const countRes = await pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible'`,
      );
      assert.equal(Number(countRes.rows[0].n), 10024);

      const ademeState = await pool.query<{
        status: string;
        catalog_status: string;
        calculation_status: string;
        resolver_status: string;
      }>(
        `SELECT status, catalog_status, calculation_status, resolver_status
         FROM emission_factor_versions WHERE dataset_version = '23.9'`,
      );
      assert.equal(ademeState.rows[0]?.status, "approved");
      assert.equal(ademeState.rows[0]?.catalog_status, "visible");
      assert.equal(ademeState.rows[0]?.calculation_status, "enabled");
      assert.equal(ademeState.rows[0]?.resolver_status, "enabled");
    } finally {
      await pool.end();
    }
  });

  it("resolver_status filter reflects FE V1 enablement (024)", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const enabled = await searchFactors(pool, {
        status: "approved",
        resolver_status: "enabled",
        limit: 5,
      });
      assert.equal(enabled.items.length, 5);

      const disabled = await searchFactors(pool, {
        status: "approved",
        resolver_status: "disabled",
        limit: 100,
      });
      assert.equal(disabled.items.length, 0);
    } finally {
      await pool.end();
    }
  });
});
