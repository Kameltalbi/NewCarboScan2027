import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {
  decodeSearchCursor,
  getFactorById,
  getFactorFacets,
  getQuerySearchMode,
  getTrigramThreshold,
  searchFactors,
} from "../services/factorSearch.js";

const DATABASE_URL = process.env.DATABASE_URL;

function assertAllFilters(
  items: Array<Record<string, unknown>>,
  expected: Record<string, unknown>,
) {
  for (const item of items) {
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(item[key], value, `filter ${key}=${value}`);
    }
  }
}

describe("factor search live DB", () => {
  it("skips when DATABASE_URL unset", () => {
    if (!DATABASE_URL) assert.ok(true);
  });

  it("approved search excludes ADEME draft by default", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const result = await searchFactors(pool, { status: "approved", limit: 100 });
      assert.equal(result.items.length, 8);
      for (const item of result.items) {
        assert.equal(item.status, "approved");
        assert.ok(item.source.key === "internal" || item.source.name.includes("Core"));
      }
    } finally {
      await pool.end();
    }
  });

  it("external_code 26815 ranks #1 with external_code_exact reason", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const exists = await pool.query(
        `SELECT id FROM emission_factors WHERE external_code = '26815' LIMIT 1`,
      );
      assert.ok(exists.rows[0], "fixture external_code 26815 must exist");

      const result = await searchFactors(
        pool,
        { status: "draft", q: "26815", limit: 5 },
        undefined,
        { debug: true },
      );
      assert.ok(result.items.length >= 1);
      const top = result.items[0] as (typeof result.items)[0] & {
        rankingReason: string;
        externalCode: string;
      };
      assert.equal(top.externalCode, "26815");
      assert.equal(top.rankingReason, "external_code_exact");
      assert.equal(result.items.length, 1);
    } finally {
      await pool.end();
    }
  });

  it("external_code 15319 still ranks #1", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const result = await searchFactors(
        pool,
        { status: "draft", q: "15319", limit: 3 },
        undefined,
        { debug: true },
      );
      assert.equal(result.items[0]?.externalCode, "15319");
      assert.equal(
        (result.items[0] as { rankingReason: string }).rankingReason,
        "external_code_exact",
      );
    } finally {
      await pool.end();
    }
  });

  it("service informatique: no dual-token name match, but IT services found via trigram", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const intersection = await pool.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         WHERE v.status = 'draft'
           AND ef_immutable_unaccent(lower(f.name)) LIKE '%service%'
           AND ef_immutable_unaccent(lower(f.name)) LIKE '%informatique%'`,
      );
      assert.equal(intersection.rows[0].n, 0);

      const result = await searchFactors(
        pool,
        { status: "draft", q: "service informatique", limit: 10 },
        undefined,
        { debug: true },
      );
      assert.ok(result.items.length >= 1);
      assert.ok(
        result.items.some((i) =>
          i.name.toLowerCase().includes("it") ||
          i.name.toLowerCase().includes("informatique") ||
          i.name.toLowerCase().includes("programmation"),
        ),
      );
    } finally {
      await pool.end();
    }
  });

  it("finds electricite without accent", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const result = await searchFactors(pool, {
        status: "draft",
        q: "electricite",
        limit: 5,
      });
      assert.ok(result.items.length >= 1);
      assert.ok(
        result.items.some((i) =>
          i.name.normalize("NFD").toLowerCase().includes("electric"),
        ),
      );
    } finally {
      await pool.end();
    }
  });

  it("electricite does not invoke fuzzy pool (primary prefix sufficient)", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const result = await searchFactors(
        pool,
        { status: "draft", q: "electricite", limit: 5 },
        undefined,
        { debug: true },
      );
      assert.ok(result.items.length >= 1);
      assert.ok(
        result.items.every(
          (i) => (i as { rankingReason: string }).rankingReason !== "trigram_name",
        ),
      );
    } finally {
      await pool.end();
    }
  });

  it("numeric query 26815 never uses trigram_name", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const result = await searchFactors(
        pool,
        { status: "draft", q: "26815", limit: 5 },
        undefined,
        { debug: true },
      );
      assert.equal(result.items.length, 1);
      assert.notEqual((result.items[0] as { rankingReason: string }).rankingReason, "trigram_name");
    } finally {
      await pool.end();
    }
  });

  it("1–2 char queries never use trigram_name", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      for (const q of ["g", "ga"]) {
        const result = await searchFactors(
          pool,
          { status: "draft", q, limit: 5 },
          undefined,
          { debug: true },
        );
        assert.ok(
          result.items.every(
            (i) => (i as { rankingReason: string }).rankingReason !== "trigram_name",
          ),
        );
      }
    } finally {
      await pool.end();
    }
  });

  it("typo diesl still finds diesel candidates", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const result = await searchFactors(pool, {
        status: "draft",
        q: "diesl",
        limit: 5,
      });
      assert.ok(result.items.length >= 1);
      assert.ok(result.items.some((i) => i.name.toLowerCase().includes("diesel")));
    } finally {
      await pool.end();
    }
  });

  it("typo electrcite ranks Electricité before électrolyse", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const result = await searchFactors(
        pool,
        { status: "draft", q: "electrcite", limit: 5 },
        undefined,
        { debug: true },
      );
      assert.ok(result.items.length >= 1);
      const top = result.items[0] as (typeof result.items)[0] & { rankingReason: string };
      assert.equal(top.rankingReason, "trigram_name");
      assert.ok(top.name.normalize("NFD").toLowerCase().includes("electric"));
      assert.ok(!top.name.toLowerCase().includes("electrolyse"));
    } finally {
      await pool.end();
    }
  });

  it("filters Nm3 distinct from m3", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const nm3 = await searchFactors(pool, {
        status: "draft",
        unit_denominator: "Nm3",
        limit: 20,
      });
      const m3 = await searchFactors(pool, {
        status: "draft",
        unit_denominator: "m3",
        limit: 20,
      });
      assert.ok(nm3.items.every((i) => i.unitDenominator === "Nm3"));
      assert.ok(m3.items.every((i) => i.unitDenominator === "m3"));
      assert.ok(!nm3.items.some((i) => i.unitDenominator === "m3"));
    } finally {
      await pool.end();
    }
  });

  it("supports 3-page cursor pagination without duplicates or skips", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const allIds: string[] = [];
      let cursor: string | null | undefined;

      for (let page = 0; page < 3; page++) {
        const result = await searchFactors(
          pool,
          { status: "draft", q: "gaz", limit: 5 },
          cursor ? decodeSearchCursor(cursor) : undefined,
        );
        assert.ok(result.items.length > 0, `page ${page + 1} empty`);
        for (const item of result.items) {
          assert.ok(!allIds.includes(item.id), `duplicate id on page ${page + 1}`);
          allIds.push(item.id);
        }
        if (!result.hasMore) break;
        cursor = result.nextCursor;
        assert.ok(cursor);
      }
      assert.ok(allIds.length >= 10);
    } finally {
      await pool.end();
    }
  });

  it("query length modes: 1/2/3 chars", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    assert.equal(getQuerySearchMode("g"), "minimal");
    assert.equal(getQuerySearchMode("ga"), "prefix");
    assert.equal(getQuerySearchMode("gaz"), "full");
    assert.equal(getTrigramThreshold("gaz"), 0.35);
    assert.equal(getTrigramThreshold("electricite"), 0.25);

    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const q1 = await searchFactors(pool, { status: "draft", q: "g", limit: 10 });
      const q2 = await searchFactors(pool, { status: "draft", q: "ga", limit: 10 });
      const q3 = await searchFactors(pool, { status: "draft", q: "gaz", limit: 10 });
      assert.ok(q1.items.length >= 1);
      assert.ok(q2.items.length >= 1);
      assert.ok(q3.items.length >= q1.items.length);
    } finally {
      await pool.end();
    }
  });

  it("approved facets never expose ADEME draft catalogue", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const facets = await getFactorFacets(pool, { status: "approved" });
      assert.ok(facets.sources.some((s) => s.value === "internal"));
      assert.ok(!facets.sources.some((s) => s.value === "ademe"));
      const total = facets.sources.reduce((sum, s) => sum + s.count, 0);
      assert.equal(total, 8);
    } finally {
      await pool.end();
    }
  });

  it("draft facets can expose ADEME for admin-style audit", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const facets = await getFactorFacets(pool, { status: "draft" });
      assert.ok(facets.sources.some((s) => s.value === "ademe" && s.count >= 7000));
    } finally {
      await pool.end();
    }
  });

  it("explicit filter tests and combinations", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const bySource = await searchFactors(pool, {
        status: "draft",
        source: "ademe",
        limit: 20,
      });
      assert.ok(bySource.items.every((i) => i.source.key === "ademe"));

      const byVersion = await searchFactors(pool, {
        status: "draft",
        dataset_version: "23.9",
        limit: 20,
      });
      assert.ok(byVersion.items.every((i) => i.datasetVersion === "23.9"));

      const byType = await searchFactors(pool, {
        status: "draft",
        factor_type: "physical",
        limit: 20,
      });
      assertAllFilters(byType.items, { factorType: "physical" });

      const byCat = await searchFactors(pool, {
        status: "draft",
        internal_category: "energy",
        limit: 20,
      });
      assertAllFilters(byCat.items, { internalCategory: "energy" });

      const bySub = await searchFactors(pool, {
        status: "draft",
        internal_subcategory: "electricity",
        limit: 20,
      });
      assertAllFilters(bySub.items, { internalSubcategory: "electricity" });

      const byUnitNum = await searchFactors(pool, {
        status: "draft",
        unit_numerator: "kgCO2e",
        limit: 20,
      });
      assertAllFilters(byUnitNum.items, { unitNumerator: "kgCO2e" });

      const byUnitDen = await searchFactors(pool, {
        status: "draft",
        unit_denominator: "kWh",
        limit: 20,
      });
      assertAllFilters(byUnitDen.items, { unitDenominator: "kWh" });

      const combo1 = await searchFactors(pool, {
        status: "draft",
        source: "ademe",
        factor_type: "physical",
        unit_denominator: "kWh",
        limit: 20,
      });
      for (const item of combo1.items) {
        assert.equal(item.source.key, "ademe");
        assert.equal(item.factorType, "physical");
        assert.equal(item.unitDenominator, "kWh");
      }

      const frEnergy = await searchFactors(pool, {
        status: "draft",
        source: "ademe",
        internal_category: "energy",
        country_code: "FR",
        limit: 20,
      });
      for (const item of frEnergy.items) {
        assert.equal(item.source.key, "ademe");
        assert.equal(item.internalCategory, "energy");
        assert.equal(item.countryCode, "FR");
      }

      const withRegion = await pool.query(
        `SELECT DISTINCT region FROM emission_factors WHERE region IS NOT NULL LIMIT 1`,
      );
      if (withRegion.rows[0]?.region) {
        const region = withRegion.rows[0].region as string;
        const byRegion = await searchFactors(pool, {
          status: "draft",
          region,
          limit: 10,
        });
        assert.ok(byRegion.items.every((i) => i.region === region));
      }

      const withYear = await pool.query(
        `SELECT factor_year FROM emission_factors WHERE factor_year IS NOT NULL LIMIT 1`,
      );
      if (withYear.rows[0]?.factor_year) {
        const year = Number(withYear.rows[0].factor_year);
        const byYear = await searchFactors(pool, {
          status: "draft",
          factor_year: year,
          limit: 10,
        });
        assert.ok(byYear.items.every((i) => i.factorYear === year));
      }
    } finally {
      await pool.end();
    }
  });

  it("returns factor detail with provenance subset", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const list = await searchFactors(pool, {
        status: "draft",
        q: "15319",
        limit: 1,
      });
      const detail = await getFactorById(pool, list.items[0].id, true);
      assert.ok(detail);
      assert.ok(detail!.provenance.originalUnit);
      assert.ok(detail!.provenance.originalValue);
      assert.equal(detail!.version.status, "draft");
    } finally {
      await pool.end();
    }
  });

  it("hides draft factor detail when allowDraft=false", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const list = await searchFactors(pool, {
        status: "draft",
        q: "15319",
        limit: 1,
      });
      const detail = await getFactorById(pool, list.items[0].id, false);
      assert.equal(detail, null);
    } finally {
      await pool.end();
    }
  });

  it("search response does not include metadata blob", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });
    try {
      const result = await searchFactors(pool, {
        status: "draft",
        q: "gaz",
        limit: 3,
      });
      for (const item of result.items) {
        assert.ok(!("metadata" in item));
        assert.ok(!("rankScore" in item));
        assert.ok(!("rankingReason" in item));
      }
    } finally {
      await pool.end();
    }
  });
});
