import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  assertReconcileInvariants,
  isImportableKgCo2e,
  parseUkWorkbook,
  reconcileUkRows,
} from "../importers/ukGovGhg/parseWorkbook.js";
import { assertImportableId, normalizeUkRows, parseUkId } from "../importers/ukGovGhg/normalize.js";
import { assertUkWorkbookSha256 } from "../importers/ukGovGhg/sha256.js";
import { mapUkUnit, mapLifecycle, LIFECYCLE_BY_LEVEL1 } from "../importers/ukGovGhg/mapUnitsLifecycle.js";
import { mapGwpBasis } from "../importers/ukGovGhg/mapGwp.js";
import { mapGeography } from "../importers/ukGovGhg/mapGeography.js";
import { UK_EXPECTED_SHA256 } from "../importers/ukGovGhg/types.js";

const WORKBOOK =
  process.env.UK_GHG_XLSX ??
  "/Users/kameltalbi/Desktop/ghg-conversion-factors-2026-flat-format-revised.xlsx";

describe("uk gov ghg 2026 adapter (offline)", { skip: !existsSync(WORKBOOK) }, () => {
  it("verifies SHA-256", () => {
    const sha = assertUkWorkbookSha256(WORKBOOK);
    assert.equal(sha, UK_EXPECTED_SHA256);
  });

  it("reconciles source invariants", () => {
    const rows = parseUkWorkbook(WORKBOOK);
    const stats = reconcileUkRows(rows);
    assertReconcileInvariants(stats);
    assert.equal(stats.sourceRowsWithId, 8740);
    assert.equal(stats.distinctIds, 8740);
    assert.equal(stats.kgCo2eTotalRows, 3425);
    assert.equal(stats.kgCo2eValuedRows, 2622);
    assert.equal(stats.negativeValues, 0);
  });

  it("importable IDs are unique, suffix _1, stems unique", () => {
    const rows = parseUkWorkbook(WORKBOOK).filter(isImportableKgCo2e);
    assert.equal(rows.length, 2622);
    const ids = new Set<string>();
    const stems = new Set<string>();
    for (const r of rows) {
      assert.ok(!ids.has(r.id), `dup id ${r.id}`);
      ids.add(r.id);
      const { stem, suffix } = assertImportableId(r.id);
      assert.equal(suffix, "1");
      assert.ok(!stems.has(stem), `dup stem ${stem}`);
      stems.add(stem);
      assert.equal(parseUkId(r.id).tokens.length, 5);
    }
    assert.equal(stems.size, 2622);
  });

  it("does not coerce NULL to zero; preserves zeros", () => {
    const rows = parseUkWorkbook(WORKBOOK);
    const co2e = rows.filter((r) => (r.ghgUnit ?? "").trim() === "kg CO2e");
    const nulls = co2e.filter((r) => r.valueIsNull);
    const zeros = co2e.filter((r) => r.valueIsZero);
    assert.equal(nulls.length, 3425 - 2622);
    assert.ok(zeros.length > 0);
    for (const z of zeros) {
      assert.equal(z.value, 0);
      assert.equal(z.valueIsNull, false);
    }
  });

  it("maps Gross/Net CV and units without magnitude change", () => {
    assert.deepEqual(mapUkUnit("kWh (Gross CV)"), {
      unitNumerator: "kgCO2e",
      unitDenominator: "kWh",
      energyBasis: "gross_cv",
      originalUom: "kWh (Gross CV)",
      ok: true,
    });
    assert.deepEqual(mapUkUnit("kWh (Net CV)"), {
      unitNumerator: "kgCO2e",
      unitDenominator: "kWh",
      energyBasis: "net_cv",
      originalUom: "kWh (Net CV)",
      ok: true,
    });
    assert.equal(mapUkUnit("kWh").energyBasis, null);
    assert.equal(mapUkUnit("litres").unitDenominator, "L");
  });

  it("maps lifecycle for all known Level 1 without WTW derivation", () => {
    assert.equal(mapLifecycle("WTT- fuels").boundary, "wtt");
    assert.equal(mapLifecycle("Transmission and distribution").boundary, "td");
    assert.equal(mapLifecycle("Fuels").boundary, "direct");
    assert.equal(mapLifecycle("Material use").boundary, "material_use");
    assert.equal(mapLifecycle("Waste disposal").boundary, "waste_treatment");
    assert.equal(mapLifecycle("Outside of scopes").boundary, "outside_of_scopes");
    assert.ok(Object.keys(LIFECYCLE_BY_LEVEL1).length >= 30);
  });

  it("maps GWP without blanket AR5", () => {
    assert.equal(mapGwpBasis("Fuels").gwpBasis, "AR5");
    assert.equal(mapGwpBasis("Bioenergy").gwpBasis, "AR4");
    assert.equal(mapGwpBasis("Material use").gwpBasis, "AR4");
    assert.equal(mapGwpBasis("WTT- bioenergy").gwpBasis, "AR4");
    assert.equal(mapGwpBasis("Hotel stay").gwpBasis, "mixed");
    assert.equal(mapGwpBasis("Refrigerant & other").gwpBasis, "unknown");
  });

  it("maps geography without blanket GB", () => {
    assert.equal(
      mapGeography({
        level1: "Hotel stay",
        level2: "Hotel stay",
        level3: "France",
        level4: null,
        columnText: null,
      }).countryCode,
      "FR",
    );
    assert.equal(
      mapGeography({
        level1: "Business travel- air",
        level2: "Flights",
        level3: null,
        level4: null,
        columnText: null,
      }).countryCode,
      null,
    );
    assert.equal(
      mapGeography({
        level1: "Fuels",
        level2: "Gaseous fuels",
        level3: "Butane",
        level4: null,
        columnText: null,
      }).countryCode,
      "GB",
    );
  });

  it("normalizes to 2622 DTOs with unique stable ids", () => {
    const rows = parseUkWorkbook(WORKBOOK);
    const { dtos, zerosImported } = normalizeUkRows(rows);
    assert.equal(dtos.length, 2622);
    assert.equal(new Set(dtos.map((d) => d.stableFactorId)).size, 2622);
    assert.ok(dtos.every((d) => d.factorKind === "activity_emission_factor"));
    assert.ok(dtos.every((d) => d.externalCode.endsWith("_1")));
    assert.ok(dtos.some((d) => d.energyBasis === "gross_cv"));
    assert.ok(dtos.some((d) => d.energyBasis === "net_cv"));
    assert.ok(dtos.some((d) => d.lifecycleBoundary === "wtt"));
    assert.ok(dtos.some((d) => d.lifecycleBoundary === "td"));
    assert.ok(dtos.some((d) => d.countryCode === null));
    assert.ok(dtos.some((d) => d.countryCode === "FR" || d.countryCode === "DE"));

    // Distributions recalculated from adapter output (not hard-coded import result)
    const gwp: Record<string, number> = {};
    const life: Record<string, number> = {};
    let gb = 0;
    let geoNull = 0;
    let geoOther = 0;
    let reviewRequired = 0;
    let taxonomyUnmapped = 0;
    for (const d of dtos) {
      gwp[d.gwpBasis] = (gwp[d.gwpBasis] ?? 0) + 1;
      life[d.lifecycleBoundary] = (life[d.lifecycleBoundary] ?? 0) + 1;
      if (d.countryCode === "GB") gb += 1;
      else if (d.countryCode == null) geoNull += 1;
      else geoOther += 1;
      if (d.normalizationStatus === "review_required") reviewRequired += 1;
      if (d.taxonomyStatus === "unmapped") taxonomyUnmapped += 1;
    }
    assert.equal(gwp.AR5, 2055);
    assert.equal(gwp.AR4, 169);
    assert.equal(gwp.unknown, 359);
    assert.equal(gwp.mixed, 39);
    assert.equal(gb, 2529);
    assert.equal(geoNull, 60);
    assert.equal(geoOther, 33);
    assert.equal(reviewRequired, 363);
    assert.equal(taxonomyUnmapped, 0);
    assert.equal(zerosImported, 38);
    assert.equal(life.wtw ?? 0, 0);
  });
});
