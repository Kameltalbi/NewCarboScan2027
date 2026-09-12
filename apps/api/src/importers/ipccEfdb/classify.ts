/**
 * Semantic classification — Type of parameter ≠ factor_kind.
 * Empty region ≠ WORLD.
 */
import { isIpccBiogenicCo2Fuel } from "./biogenicFuels.js";
import { parseEfdbValue } from "./parseValue.js";
import type {
  GeographicApplicability,
  IpccClassifiedRecord,
  IpccFactorDto,
  IpccGasCode,
  IpccRawRecord,
  IpccSemanticClass,
} from "./types.js";

function normalizeGas(label: string): IpccGasCode {
  const u = label.toUpperCase();
  if (u.includes("CARBON DIOXIDE") || u === "CO2") return "CO2";
  if (u.includes("METHANE") || u === "CH4") return "CH4";
  if (u.includes("NITROUS OXIDE") || u === "N2O") return "N2O";
  return "OTHER";
}

function gasCodeOf(gases: string[]): IpccGasCode {
  if (gases.length === 0) return "NONE";
  if (gases.length > 1) return "MULTI";
  return normalizeGas(gases[0]!);
}

function isStationaryCombustionCategory(cat: string | null): boolean {
  if (!cat) return false;
  return /^1\.A\.[124]\b/.test(cat.trim());
}

function isKgPerTj(unit: string | null): boolean {
  if (!unit) return false;
  return unit.trim().toLowerCase().replace(/\s+/g, "") === "kg/tj";
}

function looksAuxiliary(rec: IpccRawRecord, unit: string | null): boolean {
  const desc = (rec.description ?? "").toLowerCase();
  const u = (unit ?? "").toLowerCase();
  if (u === "%" || u.includes("fraction")) return true;
  if (u.includes("tj/kt") || u.includes("tj/gg") || u.includes("tj/t")) return true;
  if (desc.includes("net calorific") || desc.includes("calorific value")) return true;
  if (desc.includes("fraction of wastewater") || desc.includes("fraction of")) return true;
  if (desc.includes("oxidation factor") && !desc.includes("emission factor")) return true;
  return false;
}

function looksActivityData(rec: IpccRawRecord, unit: string | null): boolean {
  const desc = (rec.description ?? "").toLowerCase();
  const u = (unit ?? "").toLowerCase();
  if (desc.includes("generation rate")) return true;
  if (u.includes("kg/cap") || u.includes("t/cap") || u.includes("/cap/")) return true;
  if (desc.includes("activity data") || desc.includes("production data")) return true;
  return false;
}

export function classifyIpccRecord(rec: IpccRawRecord): IpccClassifiedRecord {
  const valueParse = parseEfdbValue(rec.valueRaw);
  const gasCode = gasCodeOf(rec.gases);
  const region = rec.region?.trim() || null;

  let geographicApplicability: GeographicApplicability;
  if (!region) {
    geographicApplicability = "IPCC_DEFAULT_UNSPECIFIED";
  } else if (/world|global|worldwide/i.test(region)) {
    geographicApplicability = "REQUIRES_REVIEW";
  } else {
    geographicApplicability = "COUNTRY_SPECIFIC";
  }

  let semanticClass: IpccSemanticClass;
  let exclusionReason: string | null = null;

  if (gasCode === "MULTI") {
    semanticClass = "multi_gas_unsplit";
    exclusionReason = "multi_gas_not_arbitrarily_split";
  } else if (looksAuxiliary(rec, rec.unitRaw)) {
    semanticClass = "auxiliary_parameter";
    exclusionReason = "auxiliary_parameter_not_activity_factor";
  } else if (looksActivityData(rec, rec.unitRaw)) {
    semanticClass = "activity_data";
    exclusionReason = "activity_data_not_emission_factor";
  } else if (
    gasCode === "CO2" ||
    gasCode === "CH4" ||
    gasCode === "N2O"
  ) {
    if (gasCode === "CO2" && isKgPerTj(rec.unitRaw)) {
      // kg CO2/TJ is 1:1 with kgCO2e/TJ for CO2 only — candidate, not auto CO2e blend
      semanticClass = "activity_emission_factor_co2e_candidate";
    } else {
      semanticClass = "ghg_component";
    }
  } else {
    semanticClass = "non_calculable_other";
    exclusionReason = "gas_or_unit_not_qualified_for_activity";
  }

  if (valueParse.class === "missing") {
    exclusionReason = exclusionReason ?? "value_missing";
  } else if (valueParse.class !== "number") {
    exclusionReason = exclusionReason ?? `value_class_${valueParse.class}`;
  }
  if (!rec.unitRaw) {
    exclusionReason = exclusionReason ?? "unit_missing";
  }

  // Operational V1: 2006 IPCC default stationary combustion 1.A.1/2/4, kg/TJ, single GHG, numeric
  const pt = rec.typeOfParameter ?? "";
  const operationalBase =
    pt === "2006 IPCC default" &&
    isStationaryCombustionCategory(rec.ipcc2006Category) &&
    isKgPerTj(rec.unitRaw) &&
    valueParse.class === "number" &&
    valueParse.number !== null &&
    (gasCode === "CO2" || gasCode === "CH4" || gasCode === "N2O") &&
    gasCode !== "MULTI";

  let operationalPromote = false;
  let operationalRole: "activity_co2" | "ghg_component" | null = null;
  if (operationalBase) {
    operationalPromote = true;
    operationalRole = gasCode === "CO2" ? "activity_co2" : "ghg_component";
    // Promoted rows clear exclusion for registry insert; staging still keeps class notes
    exclusionReason = null;
  }

  return {
    ...rec,
    valueParse,
    semanticClass,
    gasCode,
    geographicApplicability,
    exclusionReason,
    operationalPromote,
    operationalRole,
  };
}

export function classifyAll(records: IpccRawRecord[]): IpccClassifiedRecord[] {
  return records.map(classifyIpccRecord);
}

function slugFuel(fuel: string | null): string {
  if (!fuel) return "unspecified_fuel";
  return fuel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

function slugCat(cat: string | null): string {
  if (!cat) return "unknown_cat";
  const m = cat.match(/^(\d+(?:\.\d+)*(?:\.[A-Za-z]+)?)/);
  return (m?.[1] ?? cat).toLowerCase().replace(/[^a-z0-9.]+/g, "_");
}

/**
 * Promote operational rows into calculable registry DTOs.
 * CO2 kg/TJ → activity_emission_factor (kgCO2e/TJ) with documented CO2 identity.
 * CH4/N2O → ghg_component (kg gas / TJ); no silent CO2e derivation.
 */
export function promoteOperationalFactors(
  classified: IpccClassifiedRecord[],
): IpccFactorDto[] {
  const out: IpccFactorDto[] = [];
  for (const c of classified) {
    if (!c.operationalPromote || c.valueParse.number === null) continue;
    const fuel = c.fuel2006 ?? c.fuel1996;
    const cat = c.ipcc2006Category ?? "1.A";
    const gas = c.gasCode;
    if (gas !== "CO2" && gas !== "CH4" && gas !== "N2O") continue;

    const isCo2Activity = c.operationalRole === "activity_co2";
    const biogenicCo2 = isCo2Activity && isIpccBiogenicCo2Fuel(fuel);
    const stableFactorId = `ipcc:efdb:${c.efId}:${slugCat(cat)}:${slugFuel(fuel)}:${gas.toLowerCase()}:kg_per_tj_ncv`;

    const name = isCo2Activity
      ? `IPCC 2006 default — CO2 stationary combustion — ${fuel ?? "fuel"} (${cat})`
      : `IPCC 2006 default — ${gas} component stationary combustion — ${fuel ?? "fuel"} (${cat})`;

    out.push({
      externalCode: c.efId,
      stableFactorId,
      name,
      value: c.valueParse.number,
      originalValue: c.valueParse.raw ?? String(c.valueParse.number),
      unitNumerator: isCo2Activity ? "kgCO2e" : `kg${gas}`,
      unitDenominator: "TJ",
      energyBasis: "net_cv",
      // Biogenic CO2 conserved as calculable value but outside scope totals (GHG Protocol memo).
      lifecycleBoundary: biogenicCo2 ? "outside_of_scopes" : "direct",
      gwpBasis: null,
      factorKind: isCo2Activity ? "activity_emission_factor" : "ghg_component",
      factorType: "physical",
      countryCode: null, // empty region ≠ WORLD
      region: null,
      sourceCategory: cat,
      sourceSubcategory: fuel,
      internalCategory: "energy",
      internalSubcategory: biogenicCo2 ? "stationary_combustion_biogenic" : "stationary_combustion",
      geographicApplicability: c.geographicApplicability,
      gasCode: gas,
      efId: c.efId,
      typeOfParameter: c.typeOfParameter ?? "2006 IPCC default",
      fuel,
      semanticClass: c.semanticClass,
      biogenicCo2,
    });
  }
  out.sort((a, b) => a.stableFactorId.localeCompare(b.stableFactorId));
  return out;
}

export function summarizeClassification(classified: IpccClassifiedRecord[]) {
  const bySemantic: Record<string, number> = {};
  const byValueClass: Record<string, number> = {};
  let operational = 0;
  let autoGlobalActivity = 0;
  for (const c of classified) {
    bySemantic[c.semanticClass] = (bySemantic[c.semanticClass] ?? 0) + 1;
    byValueClass[c.valueParse.class] = (byValueClass[c.valueParse.class] ?? 0) + 1;
    if (c.operationalPromote) operational += 1;
    if (c.operationalRole === "activity_co2") autoGlobalActivity += 1;
  }
  return { bySemantic, byValueClass, operational, autoGlobalActivity };
}
