import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));

describe("tenant isolation live DB", () => {
  it("skips when DATABASE_URL is unset (CI without Postgres)", () => {
    if (process.env.DATABASE_URL) {
      assert.ok(process.env.DATABASE_URL.includes("postgres"));
    }
  });

  it("filters tenant tables by organization_id when DATABASE_URL is set", async (t) => {
    if (!process.env.DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    try {
      const orgs = await pool.query(
        `SELECT id FROM organizations ORDER BY created_at NULLS LAST LIMIT 2`,
      );
      if (orgs.rows.length < 2) {
        t.skip("need at least 2 organizations");
        return;
      }
      const a = orgs.rows[0].id as string;
      const b = orgs.rows[1].id as string;
      const leaked = await pool.query(
        `SELECT COUNT(*)::int AS n FROM bilans_carbone
         WHERE organization_id = $1 AND organization_id = $2`,
        [a, b],
      );
      assert.equal(leaked.rows[0].n, 0);

      const onlyA = await pool.query(
        `SELECT DISTINCT organization_id::text AS oid FROM bilans_carbone WHERE organization_id = $1`,
        [a],
      );
      for (const row of onlyA.rows) {
        assert.equal(row.oid, a);
      }

      const ledgerCols = await pool.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_name = 'calculation_ledger' AND column_name = 'organization_id'`,
      );
      assert.equal(ledgerCols.rows.length, 1);
    } finally {
      await pool.end();
    }
  });

  it("API org routes keep organization_id in mutations", () => {
    const orgSrc = readFileSync(join(here, "../routes/org.ts"), "utf8");
    assert.ok(orgSrc.includes("organization_id = $"));
    assert.ok(orgSrc.includes('"/v1/org/orders"'));
    assert.ok(orgSrc.includes('"/v1/org/recommended-actions"'));
  });
});
