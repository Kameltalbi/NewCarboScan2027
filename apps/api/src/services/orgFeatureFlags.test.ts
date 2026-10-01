import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultFinancedEmissionsEnabled,
  isPcafSupplierPayload,
} from "./orgFeatureFlags.js";

describe("orgFeatureFlags", () => {
  it("defaults financed emissions from organization type", () => {
    assert.equal(defaultFinancedEmissionsEnabled("enterprise"), false);
    assert.equal(defaultFinancedEmissionsEnabled("financial_institution"), true);
  });

  it("detects PCAF supplier payloads via Scope 3 category 15", () => {
    assert.equal(isPcafSupplierPayload({ scope3_ghg_category: 15 }), true);
    assert.equal(isPcafSupplierPayload({ scope3_ghg_category: 1 }), false);
    assert.equal(isPcafSupplierPayload({}), false);
  });
});
