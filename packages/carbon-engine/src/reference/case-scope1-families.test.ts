/**
 * Cas 003 à 009 — familles Scope 1 déjà saisies et procédé.
 * Chaque en-tête de cas porte le calcul manuel. Tolérance 0.
 * Non opposables : validatedBy reste engineering.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateEmission } from "../index.js";
import { SCOPE1_REFERENCE_CASES } from "./scope1Cases.js";

describe("reference cases 003-009 — Scope 1", () => {
  for (const ref of SCOPE1_REFERENCE_CASES) {
    it(`${ref.id} égale le calcul manuel`, () => {
      assert.equal(ref.auditStatus, "non-opposable");
      assert.deepEqual(ref.validatedBy, ["engineering"]);
      assert.equal(ref.tolerance, "0");
      const result = calculateEmission({
        activity: { ...ref.activity },
        factor: { ...ref.factor },
        methodologyVersion: ref.methodologyVersion,
      });
      assert.equal(result.emissionsKgCO2e, ref.expectedKgCO2e);
      assert.equal(result.factorValueUsed, ref.factor.value);
      assert.equal(result.factorVersionId, ref.factor.versionId);
    });
  }
});
