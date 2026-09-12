/**
 * EPA GHG Emission Factors Hub 2025 — explicit table-by-table parsers.
 * Sheet: "Emission Factors Hub" (591 rows). NA is never coerced to 0.
 */
import { createRequire } from "node:module";
import { cleanCell, isNaToken, parseNumeric, slug } from "./helpers.js";
import { EPA_AR5_GWP, EPA_SHEET_NAME, type EpaRawFactor } from "./types.js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx") as typeof import("xlsx");

type SheetMatrix = unknown[][];

function loadMatrix(workbookPath: string): SheetMatrix {
  const wb = XLSX.readFile(workbookPath, { cellDates: false, raw: true });
  const sheet = wb.Sheets[EPA_SHEET_NAME];
  if (!sheet) throw new Error(`Missing sheet ${EPA_SHEET_NAME}`);
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as SheetMatrix;
}

function cell(row: unknown[] | undefined, idx: number): unknown {
  return row?.[idx] ?? null;
}

function pushComponent(
  out: EpaRawFactor[],
  base: Omit<
    EpaRawFactor,
    | "gas"
    | "factorKind"
    | "factorType"
    | "unitNumerator"
    | "unitDenominator"
    | "stemParts"
    | "name"
    | "value"
    | "valueText"
  > & {
    stemBase: string[];
    displayName: string;
  },
  gas: "CO2" | "CH4" | "N2O",
  parsed: { value: number; text: string } | null,
  unitNumerator: string,
  unitDenominator: string,
): void {
  if (!parsed) return;
  out.push({
    ...base,
    stemParts: [...base.stemBase, gas.toLowerCase(), slug(`${unitNumerator}_per_${unitDenominator}`)],
    name: `${base.displayName} — ${gas} (${unitNumerator}/${unitDenominator})`,
    value: parsed.value,
    valueText: parsed.text,
    unitNumerator,
    unitDenominator,
    gas,
    factorKind: "ghg_component",
    factorType: "physical",
  });
}

function maybeDerivedCo2e(
  out: EpaRawFactor[],
  base: {
    table: number;
    tableName: string;
    stemBase: string[];
    displayName: string;
    lifecycleBoundary: EpaRawFactor["lifecycleBoundary"];
    energyBasis: EpaRawFactor["energyBasis"];
    geographicApplicability: EpaRawFactor["geographicApplicability"];
    countryCode: string | null;
    sourceCategory: string;
    sourceSubcategory: string | null;
    dims: Record<string, string | number | boolean | null>;
    unitDenominator: string;
  },
  co2Kg: { value: number; text: string } | null,
  ch4G: { value: number; text: string } | null,
  n2oG: { value: number; text: string } | null,
): void {
  if (!co2Kg || !ch4G || !n2oG) return;
  // Harmonize to kg CO2e / unitDenominator
  const co2e =
    co2Kg.value +
    (ch4G.value / 1000) * EPA_AR5_GWP.CH4 +
    (n2oG.value / 1000) * EPA_AR5_GWP.N2O;
  const text = String(co2e);
  const stemParts = [...base.stemBase, "co2e_derived", slug(`kg_co2e_per_${base.unitDenominator}`)];
  out.push({
    table: base.table,
    tableName: base.tableName,
    stemParts,
    name: `${base.displayName} — CO2e derived AR5 (${base.unitDenominator})`,
    value: co2e,
    valueText: text,
    unitNumerator: "kg CO2e",
    unitDenominator: base.unitDenominator,
    gas: null,
    factorKind: "activity_emission_factor",
    factorType: "physical",
    lifecycleBoundary: base.lifecycleBoundary,
    energyBasis: base.energyBasis,
    gwpBasis: "AR5",
    geographicApplicability: base.geographicApplicability,
    countryCode: base.countryCode,
    sourceCategory: base.sourceCategory,
    sourceSubcategory: base.sourceSubcategory,
    dims: {
      ...base.dims,
      derived: true,
      gwp_ch4: EPA_AR5_GWP.CH4,
      gwp_n2o: EPA_AR5_GWP.N2O,
    },
    derived: true,
    derivedFormula: "CO2_kg + (CH4_g/1000)*28 + (N2O_g/1000)*265",
    derivedFromStems: [
      [...base.stemBase, "co2"].join(":"),
      [...base.stemBase, "ch4"].join(":"),
      [...base.stemBase, "n2o"].join(":"),
    ],
  });
}

function parseTable1(matrix: SheetMatrix, stats: { na: number }): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  const table = 1;
  const tableName = "Stationary Combustion";
  // Rows 16–89 data; unit headers at 15 (solid), 36 (gaseous), 47 (liquid)
  let qtyUnit = "short_ton";
  for (let r = 15; r <= 89; r++) {
    const row = matrix[r]; // 0-based: excel row r+1
    if (!row) continue;
    const u1 = cleanCell(cell(row, 3));
    if (u1 && /mmBtu per/i.test(u1)) {
      if (/short ton/i.test(u1)) qtyUnit = "short_ton";
      else if (/scf/i.test(u1)) qtyUnit = "scf";
      else if (/gallon/i.test(u1)) qtyUnit = "gallon";
      continue;
    }
    const fuel = cleanCell(cell(row, 2));
    if (!fuel || /^source|^notes|^http|^the |^please|^federal|^emission factors|^all co2|^emission/i.test(fuel))
      continue;
    const heat = parseNumeric(cell(row, 3));
    const co2Mm = parseNumeric(cell(row, 4));
    const ch4Mm = parseNumeric(cell(row, 5));
    const n2oMm = parseNumeric(cell(row, 6));
    const co2Qty = parseNumeric(cell(row, 7));
    const ch4Qty = parseNumeric(cell(row, 8));
    const n2oQty = parseNumeric(cell(row, 9));
    const hasNum = Boolean(heat || co2Mm || ch4Mm || n2oMm || co2Qty || ch4Qty || n2oQty);
    if (!hasNum) continue; // section banner

    const fuelSlug = slug(fuel);
    const baseCommon = {
      table,
      tableName,
      lifecycleBoundary: "direct" as const,
      energyBasis: "gross_cv" as const,
      gwpBasis: "AR5" as const,
      geographicApplicability: "REQUIRES_REVIEW" as const,
      countryCode: null,
      sourceCategory: "stationary_combustion",
      sourceSubcategory: fuel,
      dims: { fuel_type: fuel, heat_content_hhv: heat?.value ?? null, heat_content_unit: `mmBtu_per_${qtyUnit}` },
      displayName: `Stationary combustion — ${fuel}`,
    };

    if (co2Mm || ch4Mm || n2oMm) {
      const stemBase = ["t1", fuelSlug, "mmbtu"];
      pushComponent(out, { ...baseCommon, stemBase }, "CO2", co2Mm, "kg CO2", "mmBtu");
      pushComponent(out, { ...baseCommon, stemBase }, "CH4", ch4Mm, "g CH4", "mmBtu");
      pushComponent(out, { ...baseCommon, stemBase }, "N2O", n2oMm, "g N2O", "mmBtu");
      maybeDerivedCo2e(
        out,
        { ...baseCommon, stemBase, unitDenominator: "mmBtu" },
        co2Mm,
        ch4Mm,
        n2oMm,
      );
    }
    if (co2Qty || ch4Qty || n2oQty) {
      const stemBase = ["t1", fuelSlug, qtyUnit];
      pushComponent(out, { ...baseCommon, stemBase }, "CO2", co2Qty, "kg CO2", qtyUnit.replace(/_/g, " "));
      pushComponent(out, { ...baseCommon, stemBase }, "CH4", ch4Qty, "g CH4", qtyUnit.replace(/_/g, " "));
      pushComponent(out, { ...baseCommon, stemBase }, "N2O", n2oQty, "g N2O", qtyUnit.replace(/_/g, " "));
      maybeDerivedCo2e(
        out,
        { ...baseCommon, stemBase, unitDenominator: qtyUnit.replace(/_/g, " ") },
        co2Qty,
        ch4Qty,
        n2oQty,
      );
    }
  }
  void stats;
  return out;
}

function parseTable2(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  for (let r = 103; r <= 112; r++) {
    const row = matrix[r];
    const fuel = cleanCell(cell(row, 2));
    const parsed = parseNumeric(cell(row, 3));
    const unit = cleanCell(cell(row, 4));
    if (!fuel || !parsed || !unit) continue;
    if (/^source|^notes|^http/i.test(fuel)) continue;
    const stemBase = ["t2", slug(fuel)];
    pushComponent(
      out,
      {
        table: 2,
        tableName: "Mobile Combustion CO2",
        stemBase,
        displayName: `Mobile combustion CO2 — ${fuel}`,
        lifecycleBoundary: "direct",
        energyBasis: null,
        gwpBasis: "AR5",
        geographicApplicability: "REQUIRES_REVIEW",
        countryCode: null,
        sourceCategory: "mobile_combustion_co2",
        sourceSubcategory: fuel,
        dims: { fuel_type: fuel, unit },
      },
      "CO2",
      parsed,
      "kg CO2",
      unit,
    );
  }
  return out;
}

function parseTable3(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  let vehicleCarry: string | null = null;
  for (let r = 126; r <= 244; r++) {
    const row = matrix[r];
    const vehicleCell = cleanCell(cell(row, 2));
    if (vehicleCell && /^source|^notes|^vehicle type|^http/i.test(vehicleCell)) break;
    if (vehicleCell) vehicleCarry = vehicleCell;
    const modelYear = cleanCell(cell(row, 3));
    const ch4 = parseNumeric(cell(row, 4));
    const n2o = parseNumeric(cell(row, 5));
    if (!vehicleCarry || !modelYear) continue;
    if (!ch4 && !n2o) continue;
    const stemBase = ["t3", slug(vehicleCarry), slug(modelYear)];
    const base = {
      table: 3,
      tableName: "On-Road Gasoline CH4/N2O",
      stemBase,
      displayName: `On-road gasoline — ${vehicleCarry} (${modelYear})`,
      lifecycleBoundary: "direct" as const,
      energyBasis: null,
      gwpBasis: "AR5" as const,
      geographicApplicability: "US_SPECIFIC" as const,
      countryCode: "US",
      sourceCategory: "mobile_onroad_gasoline",
      sourceSubcategory: vehicleCarry,
      dims: { vehicle_type: vehicleCarry, model_year: modelYear, fuel_type: "gasoline" },
    };
    pushComponent(out, base, "CH4", ch4, "g CH4", "vehicle-mile");
    pushComponent(out, base, "N2O", n2o, "g N2O", "vehicle-mile");
  }
  return out;
}

function parseTable4(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  let vehicleCarry: string | null = null;
  let fuelCarry: string | null = null;
  for (let r = 248; r <= 285; r++) {
    const row = matrix[r];
    const vehicleCell = cleanCell(cell(row, 2));
    if (vehicleCell && /^source|^notes|^vehicle type|^http/i.test(vehicleCell)) break;
    if (vehicleCell) vehicleCarry = vehicleCell;
    const fuelCell = cleanCell(cell(row, 3));
    if (fuelCell) fuelCarry = fuelCell;
    const modelYear = cleanCell(cell(row, 4)) ?? "unspecified";
    const ch4 = parseNumeric(cell(row, 5));
    const n2o = parseNumeric(cell(row, 6));
    if (!vehicleCarry || !fuelCarry) continue;
    if (!ch4 && !n2o) continue;
    const stemBase = ["t4", slug(vehicleCarry), slug(fuelCarry), slug(modelYear)];
    const base = {
      table: 4,
      tableName: "On-Road Diesel/Alternative CH4/N2O",
      stemBase,
      displayName: `On-road — ${vehicleCarry} / ${fuelCarry} (${modelYear})`,
      lifecycleBoundary: "direct" as const,
      energyBasis: null,
      gwpBasis: "AR5" as const,
      geographicApplicability: "US_SPECIFIC" as const,
      countryCode: "US",
      sourceCategory: "mobile_onroad_diesel_alt",
      sourceSubcategory: `${vehicleCarry} / ${fuelCarry}`,
      dims: { vehicle_type: vehicleCarry, fuel_type: fuelCarry, model_year: modelYear },
    };
    pushComponent(out, base, "CH4", ch4, "g CH4", "vehicle-mile");
    pushComponent(out, base, "N2O", n2o, "g N2O", "vehicle-mile");
  }
  return out;
}

function parseTable5(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  let vehicleCarry: string | null = null;
  for (let r = 289; r <= 332; r++) {
    const row = matrix[r];
    const vehicleCell = cleanCell(cell(row, 2));
    if (vehicleCell && /^source|^notes|^vehicle type|^http/i.test(vehicleCell)) break;
    if (vehicleCell) vehicleCarry = vehicleCell;
    const fuel = cleanCell(cell(row, 3));
    const ch4 = parseNumeric(cell(row, 4));
    const n2o = parseNumeric(cell(row, 5));
    if (!vehicleCarry || !fuel) continue;
    if (!ch4 && !n2o) continue;
    const stemBase = ["t5", slug(vehicleCarry), slug(fuel)];
    const base = {
      table: 5,
      tableName: "Non-Road Vehicles CH4/N2O",
      stemBase,
      displayName: `Non-road — ${vehicleCarry} / ${fuel}`,
      lifecycleBoundary: "direct" as const,
      energyBasis: null,
      gwpBasis: "AR5" as const,
      geographicApplicability: "REQUIRES_REVIEW" as const,
      countryCode: null,
      sourceCategory: "mobile_nonroad",
      sourceSubcategory: `${vehicleCarry} / ${fuel}`,
      dims: { vehicle_type: vehicleCarry, fuel_type: fuel },
    };
    pushComponent(out, base, "CH4", ch4, "g CH4", "gallon");
    pushComponent(out, base, "N2O", n2o, "g N2O", "gallon");
  }
  return out;
}

function parseTable6(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  for (let r = 338; r <= 405; r++) {
    const row = matrix[r];
    const acronym = cleanCell(cell(row, 2));
    const name = cleanCell(cell(row, 3));
    if (!acronym || !name) continue;
    if (/^source|^notes|^egrid|^http/i.test(acronym)) continue;
    const totalCo2 = parseNumeric(cell(row, 4));
    const totalCh4 = parseNumeric(cell(row, 5));
    const totalN2o = parseNumeric(cell(row, 6));
    const nbCo2 = parseNumeric(cell(row, 7));
    const nbCh4 = parseNumeric(cell(row, 8));
    const nbN2o = parseNumeric(cell(row, 9));
    const loss = parseNumeric(cell(row, 10));
    if (!totalCo2 && !nbCo2) continue;

    for (const [kind, co2, ch4, n2o] of [
      ["total_output", totalCo2, totalCh4, totalN2o],
      ["non_baseload", nbCo2, nbCh4, nbN2o],
    ] as const) {
      const stemBase = ["t6", slug(acronym), kind];
      const base = {
        table: 6,
        tableName: "Electricity eGRID",
        stemBase,
        displayName: `eGRID ${acronym} — ${kind.replace(/_/g, " ")}`,
        lifecycleBoundary: "direct" as const,
        energyBasis: null,
        gwpBasis: "AR5" as const,
        geographicApplicability: "US_SPECIFIC" as const,
        countryCode: "US",
        sourceCategory: "electricity_egrid",
        sourceSubcategory: acronym,
        dims: {
          egrid_subregion_acronym: acronym,
          egrid_subregion_name: name,
          output_kind: kind,
          grid_gross_loss: loss?.value ?? null,
        },
      };
      pushComponent(out, base, "CO2", co2, "lb CO2", "MWh");
      pushComponent(out, base, "CH4", ch4, "lb CH4", "MWh");
      pushComponent(out, base, "N2O", n2o, "lb N2O", "MWh");
      // Derived: convert lb → kg then apply AR5
      if (co2 && ch4 && n2o) {
        const LB_TO_KG = 0.45359237;
        const co2e =
          co2.value * LB_TO_KG +
          ch4.value * LB_TO_KG * EPA_AR5_GWP.CH4 +
          n2o.value * LB_TO_KG * EPA_AR5_GWP.N2O;
        out.push({
          table: 6,
          tableName: "Electricity eGRID",
          stemParts: [...stemBase, "co2e_derived", "kg_co2e_per_mwh"],
          name: `eGRID ${acronym} — ${kind.replace(/_/g, " ")} — CO2e derived AR5`,
          value: co2e,
          valueText: String(co2e),
          unitNumerator: "kg CO2e",
          unitDenominator: "MWh",
          gas: null,
          factorKind: "activity_emission_factor",
          factorType: "physical",
          lifecycleBoundary: "direct",
          energyBasis: null,
          gwpBasis: "AR5",
          geographicApplicability: "US_SPECIFIC",
          countryCode: "US",
          sourceCategory: "electricity_egrid",
          sourceSubcategory: acronym,
          dims: { ...base.dims, derived: true, lb_to_kg: LB_TO_KG },
          derived: true,
          derivedFormula: "(lb_CO2 + lb_CH4*28 + lb_N2O*265) * 0.45359237",
          derivedFromStems: [
            [...stemBase, "co2"].join(":"),
            [...stemBase, "ch4"].join(":"),
            [...stemBase, "n2o"].join(":"),
          ],
        });
      }
    }
  }
  return out;
}

function parseTable7(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  const row = matrix[409];
  const label = cleanCell(cell(row, 2)) ?? "Steam and Heat";
  const co2 = parseNumeric(cell(row, 3));
  const ch4 = parseNumeric(cell(row, 4));
  const n2o = parseNumeric(cell(row, 5));
  const stemBase = ["t7", "steam_and_heat"];
  const base = {
    table: 7,
    tableName: "Steam and Heat",
    stemBase,
    displayName: "Purchased steam and heat",
    lifecycleBoundary: "direct" as const,
    energyBasis: "gross_cv" as const,
    gwpBasis: "AR5" as const,
    geographicApplicability: "REQUIRES_REVIEW" as const,
    countryCode: null,
    sourceCategory: "steam_heat",
    sourceSubcategory: label,
    dims: {
      assumption: "natural_gas_80pct_thermal_efficiency",
      combustion_only: true,
      not_upstream: true,
      not_wtw: true,
    },
  };
  pushComponent(out, base, "CO2", co2, "kg CO2", "mmBtu");
  pushComponent(out, base, "CH4", ch4, "g CH4", "mmBtu");
  pushComponent(out, base, "N2O", n2o, "g N2O", "mmBtu");
  maybeDerivedCo2e(out, { ...base, unitDenominator: "mmBtu" }, co2, ch4, n2o);
  return out;
}

function parseTable8(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  for (let r = 421; r <= 430; r++) {
    const row = matrix[r];
    const vehicle = cleanCell(cell(row, 2));
    const co2 = parseNumeric(cell(row, 3));
    const ch4 = parseNumeric(cell(row, 4));
    const n2o = parseNumeric(cell(row, 5));
    const unit = cleanCell(cell(row, 6));
    if (!vehicle || !unit) continue;
    if (/^source|^notes|^these factors|^vehicle type/i.test(vehicle)) continue;
    if (!co2 && !ch4 && !n2o) continue;
    const stemBase = ["t8", slug(vehicle), slug(unit)];
    const base = {
      table: 8,
      tableName: "Scope 3 Transportation & Distribution",
      stemBase,
      displayName: `Scope 3 T&D — ${vehicle}`,
      lifecycleBoundary: "direct" as const,
      energyBasis: null,
      gwpBasis: "AR5" as const,
      geographicApplicability: "US_SPECIFIC" as const,
      countryCode: "US",
      sourceCategory: "scope3_transport_distribution",
      sourceSubcategory: vehicle,
      dims: {
        vehicle_type: vehicle,
        unit,
        ghg_protocol_categories: "4,9",
      },
    };
    pushComponent(out, base, "CO2", co2, "kg CO2", unit);
    pushComponent(out, base, "CH4", ch4, "g CH4", unit);
    pushComponent(out, base, "N2O", n2o, "g N2O", unit);
    maybeDerivedCo2e(out, { ...base, unitDenominator: unit }, co2, ch4, n2o);
  }
  return out;
}

function parseTable9(matrix: SheetMatrix, stats: { na: number }): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  const treatments = [
    { col: 3, key: "recycled" },
    { col: 4, key: "landfilled" },
    { col: 5, key: "combusted" },
    { col: 6, key: "composted" },
    { col: 7, key: "anaerobic_digestion_dry" },
    { col: 8, key: "anaerobic_digestion_wet" },
  ] as const;
  for (let r = 435; r <= 499; r++) {
    const row = matrix[r];
    const material = cleanCell(cell(row, 2));
    if (!material) continue;
    if (/^source|^notes|^material|^these factors|^http/i.test(material)) continue;
    for (const t of treatments) {
      const raw = cell(row, t.col);
      if (isNaToken(raw)) {
        stats.na += 1;
        continue;
      }
      const parsed = parseNumeric(raw);
      if (!parsed) continue;
      out.push({
        table: 9,
        tableName: "Waste",
        stemParts: ["t9", slug(material), t.key],
        name: `Waste — ${material} — ${t.key.replace(/_/g, " ")}`,
        value: parsed.value,
        valueText: parsed.text,
        unitNumerator: "metric tons CO2e",
        unitDenominator: "short ton material",
        gas: null,
        factorKind: "activity_emission_factor",
        factorType: "physical",
        lifecycleBoundary: "waste_treatment",
        energyBasis: null,
        gwpBasis: "AR5",
        geographicApplicability: "US_SPECIFIC",
        countryCode: "US",
        sourceCategory: "waste",
        sourceSubcategory: material,
        dims: {
          material,
          treatment_method: t.key,
          ghg_protocol_categories: "5,12",
          already_co2e: true,
        },
      });
    }
  }
  return out;
}

function parseTable10(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  for (let r = 503; r <= 519; r++) {
    const row = matrix[r];
    const vehicle = cleanCell(cell(row, 2));
    const co2 = parseNumeric(cell(row, 3));
    const ch4 = parseNumeric(cell(row, 4));
    const n2o = parseNumeric(cell(row, 5));
    const unit = cleanCell(cell(row, 6));
    if (!vehicle || !unit) continue;
    if (/^source|^notes|^these factors|^vehicle type/i.test(vehicle)) continue;
    if (!co2 && !ch4 && !n2o) continue;
    const stemBase = ["t10", slug(vehicle), slug(unit)];
    const base = {
      table: 10,
      tableName: "Business Travel / Employee Commuting",
      stemBase,
      displayName: `Business travel / commuting — ${vehicle}`,
      lifecycleBoundary: "direct" as const,
      energyBasis: null,
      gwpBasis: "AR5" as const,
      geographicApplicability: "US_SPECIFIC" as const,
      countryCode: "US",
      sourceCategory: "scope3_travel_commuting",
      sourceSubcategory: vehicle,
      dims: { vehicle_mode: vehicle, unit, ghg_protocol_categories: "6,7" },
    };
    pushComponent(out, base, "CO2", co2, "kg CO2", unit);
    pushComponent(out, base, "CH4", ch4, "g CH4", unit);
    pushComponent(out, base, "N2O", n2o, "g N2O", unit);
    maybeDerivedCo2e(out, { ...base, unitDenominator: unit }, co2, ch4, n2o);
  }
  return out;
}

function parseTable11(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  for (let r = 523; r <= 554; r++) {
    const row = matrix[r];
    const name = cleanCell(cell(row, 2));
    const formula = cleanCell(cell(row, 3));
    const gwp = parseNumeric(cell(row, 4));
    if (!name || !gwp) continue;
    if (/^source|^industrial designation/i.test(name)) continue;
    const gasKey = formula ? slug(formula) : slug(name);
    out.push({
      table: 11,
      tableName: "Global Warming Potentials",
      stemParts: ["t11", gasKey, "gwp100"],
      name: `GWP AR5 100-year — ${name}${formula ? ` (${formula})` : ""}`,
      value: gwp.value,
      valueText: gwp.text,
      unitNumerator: "kg CO2e",
      unitDenominator: "kg gas",
      gas: null,
      factorKind: "gwp",
      factorType: "gwp",
      lifecycleBoundary: "other",
      energyBasis: null,
      gwpBasis: "AR5",
      geographicApplicability: "GLOBAL_APPLICABLE",
      countryCode: null,
      sourceCategory: "gwp",
      sourceSubcategory: name,
      dims: {
        industrial_designation: name,
        chemical_formula: formula,
        horizon_years: 100,
        ipcc: "AR5",
      },
    });
  }
  return out;
}

function parseTable12(matrix: SheetMatrix): EpaRawFactor[] {
  const out: EpaRawFactor[] = [];
  for (let r = 560; r <= 589; r++) {
    const row = matrix[r];
    const ashrae = cleanCell(cell(row, 2));
    const gwp = parseNumeric(cell(row, 3));
    const blend = cleanCell(cell(row, 4));
    if (!ashrae || !gwp) continue;
    if (/^source|^ashrae/i.test(ashrae)) continue;
    out.push({
      table: 12,
      tableName: "Blended Refrigerant GWPs",
      stemParts: ["t12", slug(ashrae), "gwp100"],
      name: `GWP AR5 100-year — refrigerant ${ashrae}`,
      value: gwp.value,
      valueText: gwp.text,
      unitNumerator: "kg CO2e",
      unitDenominator: "kg refrigerant",
      gas: null,
      factorKind: "gwp",
      factorType: "gwp",
      lifecycleBoundary: "other",
      energyBasis: null,
      gwpBasis: "AR5",
      geographicApplicability: "GLOBAL_APPLICABLE",
      countryCode: null,
      sourceCategory: "gwp_refrigerant_blend",
      sourceSubcategory: ashrae,
      dims: {
        ashrae_designation: ashrae,
        blend_composition: blend,
        horizon_years: 100,
        ipcc: "AR5",
        note: "blend_gwp_hfc_pfc_constituents_only",
      },
    });
  }
  return out;
}

export type EpaParseResult = {
  factors: EpaRawFactor[];
  sourceRows: number;
  naIgnored: number;
  zeros: number;
  negatives: number;
  byTable: Record<number, number>;
};

export function parseEpaWorkbook(workbookPath: string): EpaParseResult {
  const matrix = loadMatrix(workbookPath);
  const na = { na: 0 };
  const parts = [
    parseTable1(matrix, na),
    parseTable2(matrix),
    parseTable3(matrix),
    parseTable4(matrix),
    parseTable5(matrix),
    parseTable6(matrix),
    parseTable7(matrix),
    parseTable8(matrix),
    parseTable9(matrix, na),
    parseTable10(matrix),
    parseTable11(matrix),
    parseTable12(matrix),
  ];
  const factors = parts.flat();
  const byTable: Record<number, number> = {};
  let zeros = 0;
  let negatives = 0;
  for (const f of factors) {
    byTable[f.table] = (byTable[f.table] ?? 0) + 1;
    if (f.value === 0) zeros += 1;
    if (f.value < 0) negatives += 1;
  }
  return {
    factors,
    sourceRows: matrix.length,
    naIgnored: na.na,
    zeros,
    negatives,
    byTable,
  };
}
