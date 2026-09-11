import type { MappingStatus } from "./types.js";

/** CarboScan internal taxonomy mapping from UK Level 1. */
export function mapInternalTaxonomy(level1: string | null): {
  internalCategory: string | null;
  internalSubcategory: string | null;
  status: MappingStatus;
  rule: string;
  review: boolean;
} {
  const l1 = level1 ?? "";
  const sure: Record<string, { cat: string; sub: string | null }> = {
    Fuels: { cat: "energy", sub: "fuels" },
    Bioenergy: { cat: "energy", sub: "bioenergy" },
    "UK electricity": { cat: "energy", sub: "electricity" },
    "UK electricity for EVs": { cat: "energy", sub: "electricity_ev" },
    "UK electricity T&D for EVs": { cat: "energy", sub: "electricity_td_ev" },
    "Transmission and distribution": { cat: "energy", sub: "transmission_distribution" },
    "Heat and steam": { cat: "energy", sub: "heat_steam" },
    "WTT- fuels": { cat: "energy", sub: "wtt_fuels" },
    "WTT- bioenergy": { cat: "energy", sub: "wtt_bioenergy" },
    "WTT- UK electricity": { cat: "energy", sub: "wtt_electricity" },
    "WTT- heat and steam": { cat: "energy", sub: "wtt_heat_steam" },
    "Passenger vehicles": { cat: "transport", sub: "passenger_vehicles" },
    "Business travel- land": { cat: "transport", sub: "business_travel_land" },
    "Business travel- sea": { cat: "transport", sub: "business_travel_sea" },
    "Business travel- air": { cat: "transport", sub: "business_travel_air" },
    "Managed assets- vehicles": { cat: "transport", sub: "managed_assets_vehicles" },
    "WTT- pass vehs & travel- land": { cat: "transport", sub: "wtt_passenger_land" },
    "WTT- business travel- air": { cat: "transport", sub: "wtt_business_travel_air" },
    "WTT- business travel- sea": { cat: "transport", sub: "wtt_business_travel_sea" },
    "Delivery vehicles": { cat: "freight", sub: "delivery_vehicles" },
    "Freighting goods": { cat: "freight", sub: "freighting_goods" },
    "WTT- delivery vehs & freight": { cat: "freight", sub: "wtt_delivery_freight" },
    "Waste disposal": { cat: "waste", sub: "disposal" },
    "Material use": { cat: "purchased_goods", sub: "material_use" },
    "Water supply": { cat: "purchased_services", sub: "water_supply" },
    "Water treatment": { cat: "purchased_services", sub: "water_treatment" },
    Homeworking: { cat: "purchased_services", sub: "homeworking" },
    "Hotel stay": { cat: "purchased_services", sub: "hotel_stay" },
    "Managed assets- electricity": { cat: "energy", sub: "managed_assets_electricity" },
    "Refrigerant & other": { cat: "process_fugitive", sub: "refrigerant_other" },
    "Outside of scopes": { cat: "other", sub: "outside_of_scopes" },
  };

  const hit = sure[l1];
  if (hit) {
    return {
      internalCategory: hit.cat,
      internalSubcategory: hit.sub,
      status: "mapped",
      rule: `uk_level1→${hit.cat}/${hit.sub ?? ""}`,
      review: false,
    };
  }
  return {
    internalCategory: null,
    internalSubcategory: null,
    status: "unmapped",
    rule: `unmapped_level1:${l1 || "(blank)"}`,
    review: true,
  };
}

export function buildSourceSubcategory(
  level2: string | null,
  level3: string | null,
  level4: string | null,
): string | null {
  const parts = [level2, level3, level4].filter((p) => p && p.trim());
  return parts.length ? parts.join(" › ") : null;
}

export function buildFactorName(input: {
  columnText: string | null;
  level1: string | null;
  level2: string | null;
  level3: string | null;
  level4: string | null;
  uom: string | null;
}): string {
  if (input.columnText?.trim()) return input.columnText.trim();
  const tax = [input.level1, input.level2, input.level3, input.level4]
    .filter((p) => p && String(p).trim())
    .join(" / ");
  if (input.uom) return `${tax} (${input.uom})`;
  return tax || "UK GHG factor";
}
