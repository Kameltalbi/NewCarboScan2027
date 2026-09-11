import { isImportableKgCo2e } from "./parseWorkbook.js";
import { mapGwpBasis } from "./mapGwp.js";
import { mapGeography } from "./mapGeography.js";
import { buildFactorName, buildSourceSubcategory, mapInternalTaxonomy } from "./mapTaxonomy.js";
import { mapLifecycle, mapUkUnit } from "./mapUnitsLifecycle.js";
import type { UkCanonicalDto, UkRawRow } from "./types.js";

export function parseUkId(id: string): { stem: string; suffix: string; tokens: string[] } {
  const tokens = id.split("_");
  if (tokens.length < 2) {
    throw new Error(`UK ID malformed (need ≥2 tokens): ${id}`);
  }
  const suffix = tokens[tokens.length - 1]!;
  const stem = tokens.slice(0, -1).join("_");
  return { stem, suffix, tokens };
}

export function assertImportableId(id: string): { stem: string; suffix: string } {
  const { stem, suffix, tokens } = parseUkId(id);
  if (tokens.length !== 5) {
    throw new Error(`UK ID expected 5 tokens, got ${tokens.length}: ${id}`);
  }
  if (suffix !== "1") {
    throw new Error(`UK kg CO2e importable row must end with _1, got: ${id}`);
  }
  return { stem, suffix };
}

export function normalizeUkRows(allRows: UkRawRow[]): {
  dtos: UkCanonicalDto[];
  skippedNullCo2e: number;
  componentsNotImported: number;
  secrNotImported: number;
  zerosImported: number;
} {
  const byId = new Map(allRows.map((r) => [r.id, r]));

  let skippedNullCo2e = 0;
  let componentsNotImported = 0;
  let secrNotImported = 0;
  let zerosImported = 0;

  for (const r of allRows) {
    const g = (r.ghgUnit ?? "").trim();
    if (g === "kg CO2e" && r.valueIsNull) skippedNullCo2e += 1;
    if (g.startsWith("kg CO2e of ")) componentsNotImported += 1;
    if (g.toLowerCase().startsWith("kwh")) secrNotImported += 1;
  }

  const importable = allRows.filter(isImportableKgCo2e);
  const stems = new Set<string>();
  const dtos: UkCanonicalDto[] = [];

  for (const row of importable) {
    const { stem } = assertImportableId(row.id);
    if (stems.has(stem)) {
      throw new Error(`Duplicate stem among importable kg CO2e rows: ${stem} (id=${row.id})`);
    }
    stems.add(stem);

    if (row.value === null || row.valueIsNull || row.valueText == null) {
      throw new Error(`Importable row has null value: ${row.id}`);
    }
    if (row.valueIsZero) zerosImported += 1;

    const unit = mapUkUnit(row.uom);
    if (!unit.ok) {
      throw new Error(`Unrecognized UOM for ${row.id}: ${row.uom}`);
    }

    const life = mapLifecycle(row.level1);
    const gwp = mapGwpBasis(row.level1);
    const geo = mapGeography({
      level1: row.level1,
      level2: row.level2,
      level3: row.level3,
      level4: row.level4,
      columnText: row.columnText,
    });
    const tax = mapInternalTaxonomy(row.level1);

    const review =
      life.review || gwp.review || geo.review || tax.review || !unit.ok || tax.status !== "mapped";

    const co2 = byId.get(`${stem}_2`);
    const ch4 = byId.get(`${stem}_3`);
    const n2o = byId.get(`${stem}_4`);
    const hasAnyComp = Boolean(co2 || ch4 || n2o);
    const ghgComponents =
      hasAnyComp
        ? {
            co2_co2e:
              co2 && !co2.valueIsNull && co2.value !== null ? co2.value : null,
            ch4_co2e:
              ch4 && !ch4.valueIsNull && ch4.value !== null ? ch4.value : null,
            n2o_co2e:
              n2o && !n2o.valueIsNull && n2o.value !== null ? n2o.value : null,
          }
        : null;

    dtos.push({
      externalCode: row.id,
      stem,
      stableFactorId: `uk-gov:2026:${stem}`,
      name: buildFactorName({
        columnText: row.columnText,
        level1: row.level1,
        level2: row.level2,
        level3: row.level3,
        level4: row.level4,
        uom: row.uom,
      }),
      value: row.value,
      unitNumerator: unit.unitNumerator,
      unitDenominator: unit.unitDenominator,
      energyBasis: unit.energyBasis,
      lifecycleBoundary: life.boundary,
      lifecycleRule: life.rule,
      gwpBasis: gwp.gwpBasis,
      gwpRule: gwp.rule,
      factorKind: "activity_emission_factor",
      factorType: "physical",
      countryCode: geo.countryCode,
      geographyRule: geo.rule,
      sourceCategory: row.level1 ?? "unknown",
      sourceSubcategory: buildSourceSubcategory(row.level2, row.level3, row.level4),
      internalCategory: tax.internalCategory,
      internalSubcategory: tax.internalSubcategory,
      taxonomyStatus: tax.status,
      taxonomyRule: tax.rule,
      normalizationStatus: review ? "review_required" : "ok",
      sourceScope: row.scope,
      level1: row.level1,
      level2: row.level2,
      level3: row.level3,
      level4: row.level4,
      columnText: row.columnText,
      originalUom: unit.originalUom,
      originalGhgUnit: "kg CO2e",
      originalValue: row.valueText,
      ghgComponents,
    });
  }

  // stable id uniqueness
  const stables = new Set(dtos.map((d) => d.stableFactorId));
  if (stables.size !== dtos.length) {
    throw new Error("stable_factor_id collision among UK DTOs");
  }

  return { dtos, skippedNullCo2e, componentsNotImported, secrNotImported, zerosImported };
}
