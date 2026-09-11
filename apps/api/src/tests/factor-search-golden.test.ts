import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { searchFactors } from "../services/factorSearch.js";

const DATABASE_URL = process.env.DATABASE_URL;

const GOLDEN_QUERIES = [
  "gaz naturel",
  "electricite",
  "diesel",
  "train",
  "avion",
  "dechets",
  "acier",
  "beton",
  "service informatique",
  "26815",
  "electrcite",
  "diesl",
  "methan",
];

describe("factor search golden queries v2 (debug)", () => {
  it("logs top 5 with ranking_reason for manual inspection", async (t) => {
    if (!DATABASE_URL) {
      t.skip("DATABASE_URL unset");
      return;
    }
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
    try {
      for (const q of GOLDEN_QUERIES) {
        const result = await searchFactors(
          pool,
          { status: "draft", q, limit: 5 },
          undefined,
          { debug: true },
        );
        console.log(`\n=== q=${q} (${result.items.length} hits) ===`);
        for (const [i, item] of result.items.entries()) {
          const row = item as typeof item & {
            rankScore: number;
            rankingReason: string;
          };
          console.log(
            `${i + 1}. rank=${row.rankScore} reason=${row.rankingReason} code=${row.externalCode} | ${row.name.slice(0, 60)} | ${row.value} ${row.unitNumerator}/${row.unitDenominator} | ${row.sourceCategory ?? "-"} | ${row.countryCode ?? "-"}`,
          );
        }
        if (result.items.length === 0) {
          console.log("(no results — acceptable if catalogue has no semantic match)");
        }
      }
      assert.ok(true);
    } finally {
      await pool.end();
    }
  });
});
