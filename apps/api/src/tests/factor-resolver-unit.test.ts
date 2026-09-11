import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareUnits,
  normalizeResolverUnit,
  isMonetaryUnit,
  candidateDenominatorUnits,
} from "../services/factorResolver/unitCompatibility.js";
import { evaluateGeography } from "../services/factorResolver/geographyPolicy.js";
import { detectLifecycleAmbiguity } from "../services/factorResolver/lifecyclePolicy.js";
import { detectEnergyBasisAmbiguity } from "../services/factorResolver/energyBasisPolicy.js";
import { evaluateGwp } from "../services/factorResolver/gwpPolicy.js";

describe("factorResolver unitCompatibility", () => {
  it("Z exact + safe kg↔tonne + aliases", () => {
    assert.equal(compareUnits("kg", "kg").class, "EXACT");
    assert.equal(compareUnits("kg", "t").class, "SAFE_CONVERSION");
    assert.equal(compareUnits("kg", "t").multiplier, 0.001);
    assert.equal(compareUnits("tonne", "kg").multiplier, 1000);
    assert.equal(normalizeResolverUnit("litres"), "L");
    assert.equal(normalizeResolverUnit("t.km"), "tonne.km");
    assert.equal(compareUnits("t.km", "tonne.km").class, "EXACT");
  });

  it("AA mile↔km safe", () => {
    const r = compareUnits("mile", "km");
    assert.equal(r.class, "SAFE_CONVERSION");
    assert.ok(Math.abs((r.multiplier ?? 0) - 1.609344) < 1e-9);
  });

  it("AB t.km alias", () => {
    assert.equal(normalizeResolverUnit("tkm"), "tonne.km");
    assert.ok(candidateDenominatorUnits("t.km").includes("tonne.km"));
  });

  it("AC AD prohibited semantic conversions", () => {
    assert.equal(compareUnits("m3", "kWh").class, "CONTEXT_REQUIRED");
    assert.equal(compareUnits("L", "kg").class, "CONTEXT_REQUIRED");
    assert.equal(compareUnits("passenger.km", "km").class, "CONTEXT_REQUIRED");
    assert.equal(compareUnits("tonne.km", "km").class, "CONTEXT_REQUIRED");
  });

  it("monetary units", () => {
    assert.equal(isMonetaryUnit("EUR"), true);
    assert.equal(isMonetaryUnit("kEUR"), true);
    assert.equal(isMonetaryUnit("L"), false);
  });
});

describe("factorResolver geographyPolicy", () => {
  it("U ADEME NULL + FR eligible", () => {
    const r = evaluateGeography(
      { country: "FR" },
      { countryCode: null, region: null, sourceKey: "ademe" },
    );
    assert.equal(r.eligible, true);
    assert.equal(r.reasonCode, "FR_IMPLIED_BY_SOURCE_POLICY");
  });

  it("V ADEME NULL + TN not eligible", () => {
    const r = evaluateGeography(
      { country: "TN" },
      { countryCode: null, region: null, sourceKey: "ademe" },
    );
    assert.equal(r.eligible, false);
    assert.equal(r.reasonCode, "GEO_ADEME_NULL_NOT_APPLICABLE");
  });

  it("UK GB not applicable to FR", () => {
    const r = evaluateGeography(
      { country: "FR" },
      { countryCode: "GB", region: null, sourceKey: "uk_gov_ghg" },
    );
    assert.equal(r.eligible, false);
  });
});

describe("factorResolver lifecycle/energy/gwp policies", () => {
  it("L lifecycle ambiguity", () => {
    assert.equal(
      detectLifecycleAmbiguity([
        { lifecycleBoundary: "direct" },
        { lifecycleBoundary: "wtt" },
      ]),
      true,
    );
    assert.equal(
      detectLifecycleAmbiguity([
        { lifecycleBoundary: null },
        { lifecycleBoundary: null },
      ]),
      false,
    );
  });

  it("O energy basis ambiguity", () => {
    assert.equal(
      detectEnergyBasisAmbiguity([
        { energyBasis: "gross_cv" },
        { energyBasis: "net_cv" },
      ]),
      true,
    );
    assert.equal(
      detectEnergyBasisAmbiguity([{ energyBasis: null }, { energyBasis: "gross_cv" }]),
      false,
    );
  });

  it("Q R S GWP policy", () => {
    assert.equal(evaluateGwp({ gwpBasis: "AR5" }, { gwpBasis: "AR5" }).compatible, true);
    assert.equal(evaluateGwp({ gwpBasis: "AR5" }, { gwpBasis: "AR4" }).compatible, false);
    assert.equal(evaluateGwp({}, { gwpBasis: "mixed" }).warning?.includes("mixed"), true);
    assert.equal(evaluateGwp({}, { gwpBasis: "unknown" }).warning?.toLowerCase().includes("unknown"), true);
    assert.equal(evaluateGwp({ gwpBasis: "AR5" }, { gwpBasis: null }).compatible, false);
  });
});
