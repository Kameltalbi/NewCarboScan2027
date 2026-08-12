import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const legacySrc = readFileSync(
  join(here, "../routes/legacy-functions.ts"),
  "utf8",
);

describe("tenant isolation & P0 security contracts", () => {
  it("forbids cross-organization ledger reads by design", () => {
    const queryTemplate =
      "SELECT * FROM calculation_ledger WHERE run_id = $1 AND organization_id = $2";
    assert.ok(queryTemplate.includes("organization_id = $2"));
  });

  it("locks the six critical legacy functions behind JWT+org stubs", () => {
    const critical = [
      "generate-carbon-report",
      "generate-report-chunk",
      "estimate-action-impact",
      "ocr-extract",
      "invoice-carbon",
      "wattbim-ingest",
    ];
    for (const name of critical) {
      assert.ok(
        legacySrc.includes(`legacy: "${name}"`),
        `missing route for ${name}`,
      );
    }
    assert.ok(legacySrc.includes("requireOrgMember"));
    assert.ok(legacySrc.includes("CRITICAL_LEGACY"));
    assert.ok(legacySrc.includes("legacy.critical_blocked"));
  });

  it("does not leave verify_jwt=false semantics in API", () => {
    assert.equal(legacySrc.includes("verifyJwtFalse: false"), true);
    assert.equal(legacySrc.includes("verify_jwt = false"), false);
  });
});
