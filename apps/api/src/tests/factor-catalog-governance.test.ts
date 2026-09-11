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
      assert.equal(normal.items.length, 8);

      const approvedHidden = await searchFactors(pool, {
        status: "approved",
        version_status: "approved",
        catalog_status: "hidden",
        limit: 5,
      });
      assert.equal(approvedHidden.items.length, 0);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE emission_factor_versions SET catalog_status = 'visible'
           WHERE status = 'draft' AND dataset_version = '23.9'`,
        );
        const draftVisibleAdmin = await searchFactors(client, {
          status: "draft",
          catalog_status: "visible",
          limit: 5,
        });
        assert.ok(draftVisibleAdmin.items.length >= 1);
        const draftVisibleNormal = await searchFactors(client, { status: "approved", limit: 100 });
        assert.equal(draftVisibleNormal.items.length, 8);
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }

      const deprecated = await searchFactors(pool, { status: "deprecated", limit: 5 });
      assert.equal(deprecated.items.length, 0);
    } finally {
      await pool.end();
    }
  });

  it("superadmin can inspect draft ADEME via status=draft", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const draft = await searchFactors(pool, { status: "draft", source: "ademe", limit: 5 });
      assert.ok(draft.items.length >= 1);
      assert.ok(draft.items.every((i) => i.source.key === "ademe"));
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
      assert.equal(detail!.governance.resolverStatus, "disabled");
    } finally {
      await pool.end();
    }
  });

  it("review_required factor visible in catalog when approved+visible (019B sim)", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ id: string }>(
        `SELECT f.id FROM emission_factors f
         WHERE f.name ILIKE '%Décarbonatation%fabrication du ciment%'
         LIMIT 1`,
      );
      if (!rows[0]) {
        await client.query("ROLLBACK");
        t.skip("review_required cement factor not found");
        return;
      }

      await client.query(
        `UPDATE emission_factor_versions SET status = 'approved', catalog_status = 'visible'
         WHERE dataset_version = '23.9'`,
      );

      const detailRes = await client.query(
        `SELECT f.metadata->'units'->>'normalization_status' AS ns
         FROM emission_factors f WHERE f.id = $1`,
        [rows[0].id],
      );
      const ns = detailRes.rows[0]?.ns;

      const visible = await searchFactors(client, {
        status: "approved",
        q: "Décarbonatation",
        limit: 5,
      });
      assert.ok(
        visible.items.some((i) => i.id === rows[0].id),
        "review_required factor should appear in catalog when version approved+visible",
      );
      const item = visible.items.find((i) => i.id === rows[0].id);
      if (ns) {
        assert.equal(item?.normalizationStatus, ns);
      }

      assert.equal(await legacyFactorCount(client), 8);
      await client.query("ROLLBACK");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
      await pool.end();
    }
  });

  it("019B simulation: catalog expands, legacy stays 8, then ROLLBACK", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const beforeLegacy = await legacyFactorCount(client);
      assert.equal(beforeLegacy, 8);

      const beforeSearch = await searchFactors(client, { status: "approved", limit: 100 });
      assert.equal(beforeSearch.items.length, 8);

      await client.query(
        `UPDATE emission_factor_versions
         SET status = 'approved', catalog_status = 'visible', resolver_status = 'disabled'
         WHERE dataset_version = '23.9'`,
      );

      const countRes = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
         FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible'`,
      );
      const catalogTotal = Number(countRes.rows[0]?.n ?? 0);
      assert.ok(catalogTotal >= 7400, `expected ~7402, got ${catalogTotal}`);

      const afterSearch = await searchFactors(client, { status: "approved", limit: 100 });
      assert.equal(afterSearch.items.length, 100);

      const facets = await getFactorFacets(client, { status: "approved" });
      assert.ok(facets.sources.some((s) => s.value === "ademe" && s.count >= 7000));
      assert.ok(facets.sources.some((s) => s.value === "internal" && s.count === 8));

      assert.equal(await legacyFactorCount(client), 8);

      const ademeSample = afterSearch.items.find((i) => i.source.key === "ademe");
      if (ademeSample) {
        const detail = await getFactorById(client, ademeSample.id, false);
        assert.ok(detail);
        assert.equal(detail!.governance.catalogStatus, "visible");
        assert.equal(detail!.governance.resolverStatus, "disabled");
      }

      await client.query("ROLLBACK");

      const afterRollback = await searchFactors(pool, { status: "approved", limit: 100 });
      assert.equal(afterRollback.items.length, 8);

      const ademeState = await pool.query<{ status: string; catalog_status: string }>(
        `SELECT status, catalog_status FROM emission_factor_versions WHERE dataset_version = '23.9'`,
      );
      assert.equal(ademeState.rows[0]?.status, "draft");
      assert.equal(ademeState.rows[0]?.catalog_status, "hidden");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
      await pool.end();
    }
  });

  it("resolver_status filter has no calculation effect (019)", async (t) => {
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
      assert.equal(enabled.items.length, 0);

      const disabled = await searchFactors(pool, {
        status: "approved",
        resolver_status: "disabled",
        limit: 100,
      });
      assert.equal(disabled.items.length, 8);
    } finally {
      await pool.end();
    }
  });
});
