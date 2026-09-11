import type { EnergyBasis, LifecycleBoundary } from "./types.js";

/** Structural unit map only — no magnitude conversion. */
const UOM_MAP: Record<string, { denominator: string; energyBasis: EnergyBasis }> = {
  litres: { denominator: "L", energyBasis: null },
  kg: { denominator: "kg", energyBasis: null },
  tonnes: { denominator: "t", energyBasis: null },
  kWh: { denominator: "kWh", energyBasis: null },
  "kWh (Gross CV)": { denominator: "kWh", energyBasis: "gross_cv" },
  "kWh (Net CV)": { denominator: "kWh", energyBasis: "net_cv" },
  GJ: { denominator: "GJ", energyBasis: null },
  km: { denominator: "km", energyBasis: null },
  miles: { denominator: "mile", energyBasis: null },
  "tonne.km": { denominator: "tonne.km", energyBasis: null },
  "passenger.km": { denominator: "passenger.km", energyBasis: null },
  "cubic metres": { denominator: "m3", energyBasis: null },
  "Room per night": { denominator: "room_night", energyBasis: null },
  "per FTE Working Hour": { denominator: "fte_hour", energyBasis: null },
  "million litres": { denominator: "million_L", energyBasis: null },
};

export function mapUkUnit(uom: string | null): {
  unitNumerator: string;
  unitDenominator: string;
  energyBasis: EnergyBasis;
  originalUom: string | null;
  ok: boolean;
} {
  if (!uom) {
    return {
      unitNumerator: "kgCO2e",
      unitDenominator: "unknown",
      energyBasis: null,
      originalUom: null,
      ok: false,
    };
  }
  const hit = UOM_MAP[uom];
  if (!hit) {
    return {
      unitNumerator: "kgCO2e",
      unitDenominator: "unknown",
      energyBasis: null,
      originalUom: uom,
      ok: false,
    };
  }
  return {
    unitNumerator: "kgCO2e",
    unitDenominator: hit.denominator,
    energyBasis: hit.energyBasis,
    originalUom: uom,
    ok: true,
  };
}

/**
 * Level 1 → lifecycle_boundary.
 * No TTW/WTW synonyms; no automatic composition.
 */
export const LIFECYCLE_BY_LEVEL1: Record<string, { boundary: LifecycleBoundary; rule: string }> = {
  Fuels: { boundary: "direct", rule: "level1:Fuels→direct" },
  Bioenergy: { boundary: "direct", rule: "level1:Bioenergy→direct" },
  "Business travel- air": { boundary: "direct", rule: "level1:Business travel- air→direct" },
  "Business travel- land": { boundary: "direct", rule: "level1:Business travel- land→direct" },
  "Business travel- sea": { boundary: "direct", rule: "level1:Business travel- sea→direct" },
  "Delivery vehicles": { boundary: "direct", rule: "level1:Delivery vehicles→direct" },
  "Freighting goods": { boundary: "direct", rule: "level1:Freighting goods→direct" },
  "Heat and steam": { boundary: "direct", rule: "level1:Heat and steam→direct" },
  Homeworking: { boundary: "direct", rule: "level1:Homeworking→direct" },
  "Hotel stay": { boundary: "direct", rule: "level1:Hotel stay→direct" },
  "Managed assets- electricity": {
    boundary: "direct",
    rule: "level1:Managed assets- electricity→direct",
  },
  "Managed assets- vehicles": { boundary: "direct", rule: "level1:Managed assets- vehicles→direct" },
  "Material use": { boundary: "material_use", rule: "level1:Material use→material_use" },
  "Outside of scopes": {
    boundary: "outside_of_scopes",
    rule: "level1:Outside of scopes→outside_of_scopes",
  },
  "Passenger vehicles": { boundary: "direct", rule: "level1:Passenger vehicles→direct" },
  "Refrigerant & other": { boundary: "direct", rule: "level1:Refrigerant & other→direct" },
  "Transmission and distribution": {
    boundary: "td",
    rule: "level1:Transmission and distribution→td",
  },
  "UK electricity": { boundary: "direct", rule: "level1:UK electricity→direct" },
  "UK electricity T&D for EVs": { boundary: "td", rule: "level1:UK electricity T&D for EVs→td" },
  "UK electricity for EVs": { boundary: "direct", rule: "level1:UK electricity for EVs→direct" },
  "WTT- UK electricity": { boundary: "wtt", rule: "level1:WTT- UK electricity→wtt" },
  "WTT- bioenergy": { boundary: "wtt", rule: "level1:WTT- bioenergy→wtt" },
  "WTT- business travel- air": { boundary: "wtt", rule: "level1:WTT- business travel- air→wtt" },
  "WTT- business travel- sea": { boundary: "wtt", rule: "level1:WTT- business travel- sea→wtt" },
  "WTT- delivery vehs & freight": {
    boundary: "wtt",
    rule: "level1:WTT- delivery vehs & freight→wtt",
  },
  "WTT- fuels": { boundary: "wtt", rule: "level1:WTT- fuels→wtt" },
  "WTT- heat and steam": { boundary: "wtt", rule: "level1:WTT- heat and steam→wtt" },
  "WTT- pass vehs & travel- land": {
    boundary: "wtt",
    rule: "level1:WTT- pass vehs & travel- land→wtt",
  },
  "Waste disposal": { boundary: "waste_treatment", rule: "level1:Waste disposal→waste_treatment" },
  "Water supply": { boundary: "direct", rule: "level1:Water supply→direct" },
  "Water treatment": { boundary: "direct", rule: "level1:Water treatment→direct" },
};

export function mapLifecycle(level1: string | null): {
  boundary: LifecycleBoundary;
  rule: string;
  review: boolean;
} {
  if (!level1) {
    return { boundary: "unknown", rule: "missing_level1", review: true };
  }
  const hit = LIFECYCLE_BY_LEVEL1[level1];
  if (!hit) {
    return { boundary: "unknown", rule: `unmapped_level1:${level1}`, review: true };
  }
  return { boundary: hit.boundary, rule: hit.rule, review: false };
}
