import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decodeSearchCursor,
  encodeSearchCursor,
  getQuerySearchMode,
  getTrigramThreshold,
  isNumericCodeQuery,
  normalizeUnitDenominator,
  normalizeUnitNumerator,
  TRIGRAM_THRESHOLD_LONG,
  TRIGRAM_THRESHOLD_SHORT,
} from "../services/factorSearch.js";
import { factorSearchQuerySchema } from "../schemas/factors.js";

describe("factor search schemas & helpers", () => {
  it("defaults status to approved and limit to 20", () => {
    const parsed = factorSearchQuerySchema.parse({});
    assert.equal(parsed.status, "approved");
    assert.equal(parsed.limit, 20);
  });

  it("rejects limit above 100", () => {
    const result = factorSearchQuerySchema.safeParse({ limit: 101 });
    assert.equal(result.success, false);
  });

  it("rejects unknown query keys (strict)", () => {
    const result = factorSearchQuerySchema.safeParse({ foo: "bar" });
    assert.equal(result.success, false);
  });

  it("normalizes unit aliases", () => {
    assert.equal(normalizeUnitDenominator("litre"), "L");
    assert.equal(normalizeUnitDenominator("passager.km"), "passenger.km");
    assert.equal(normalizeUnitDenominator("Nm3"), "Nm3");
    assert.equal(normalizeUnitDenominator("m3"), "m3");
    assert.notEqual(normalizeUnitDenominator("m3"), "Nm3");
    assert.equal(normalizeUnitNumerator("kg co2e"), "kgCO2e");
  });

  it("round-trips opaque cursor", () => {
    const cursor = { r: 88.5, id: "b1000000-0000-4000-8000-000000000001" };
    const encoded = encodeSearchCursor(cursor);
    assert.notEqual(encoded, JSON.stringify(cursor));
    assert.deepEqual(decodeSearchCursor(encoded), cursor);
  });

  it("rejects invalid cursor", () => {
    assert.throws(() => decodeSearchCursor("not-valid"), /INVALID_CURSOR/);
    assert.throws(
      () => decodeSearchCursor(encodeSearchCursor({ r: 1, id: "not-a-uuid" })),
      /INVALID_CURSOR/,
    );
  });

  it("query length modes and trigram thresholds", () => {
    assert.equal(getQuerySearchMode("g"), "minimal");
    assert.equal(getQuerySearchMode("ga"), "prefix");
    assert.equal(getQuerySearchMode("gaz"), "full");
    assert.equal(getTrigramThreshold("g"), null);
    assert.equal(getTrigramThreshold("ga"), null);
    assert.equal(getTrigramThreshold("gaz"), TRIGRAM_THRESHOLD_SHORT);
    assert.equal(getTrigramThreshold("electricite"), TRIGRAM_THRESHOLD_LONG);
    assert.equal(isNumericCodeQuery("26815"), true);
    assert.equal(isNumericCodeQuery("gaz"), false);
  });
});
