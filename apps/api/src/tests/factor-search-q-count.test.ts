/**
 * Regression: searchFactors total/count must share filters with page results,
 * including numeric/short `q` (bind-param allocation).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { decodeSearchCursor, searchFactors } from "../services/factorSearch.js";
import { CATALOG_VISIBLE_TOTAL, CORE_TN_COUNT } from "./helpers/registryCounts.js";

const DATABASE_URL = process.env.DATABASE_URL;

describe("factorSearch q + count parity", { skip: !DATABASE_URL }, () => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL!, max: 3 });

  it("search without q: total = public catalog", async () => {
    const res = await searchFactors(pool, { status: "approved", limit: 20 });
    assert.equal(res.total, CATALOG_VISIBLE_TOTAL);
    assert.equal(res.items.length, 20);
    assert.equal(res.hasMore, true);
  });

  it("search with numeric q (bind regression)", async () => {
    const res = await searchFactors(pool, { status: "approved", q: "26815", limit: 20 });
    assert.equal(res.total, 1);
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0]?.externalCode, "26815");
    assert.equal(res.hasMore, false);
  });

  it("search with short q (prefix mode)", async () => {
    const res = await searchFactors(pool, { status: "approved", q: "el", limit: 10 });
    assert.ok(res.total >= res.items.length);
    assert.ok(res.total > 0);
  });

  it("q + source filter", async () => {
    const res = await searchFactors(pool, {
      status: "approved",
      q: "electricity",
      source: "internal",
      limit: 20,
    });
    assert.ok(res.total >= 1);
    assert.ok(res.total <= CORE_TN_COUNT);
    assert.ok(res.items.every((i) => i.source.key === "internal"));
  });

  it("q + geography (country_code)", async () => {
    const res = await searchFactors(pool, {
      status: "approved",
      q: "electricity",
      country_code: "GB",
      limit: 20,
    });
    assert.ok(res.total >= 0);
    assert.ok(res.items.every((i) => i.countryCode === "GB"));
    assert.ok(res.items.every((i) => i.source.key !== "epa_ghg_emission_factors_hub"));
  });

  it("q + pagination: page size and total stable", async () => {
    const page1 = await searchFactors(pool, { status: "approved", q: "diesel", limit: 5 });
    assert.ok(page1.total >= page1.items.length);
    if (page1.hasMore && page1.nextCursor) {
      const cursor = decodeSearchCursor(page1.nextCursor);
      const page2 = await searchFactors(pool, { status: "approved", q: "diesel", limit: 5 }, cursor);
      assert.equal(page2.total, page1.total);
      assert.ok(page2.items.length >= 1);
      assert.notEqual(page2.items[0]?.id, page1.items[0]?.id);
    }
  });

  it("count without results still binds", async () => {
    const res = await searchFactors(pool, {
      status: "approved",
      q: "zzzxxyyzz_no_match_999",
      limit: 20,
    });
    assert.equal(res.total, 0);
    assert.equal(res.items.length, 0);
  });
});
