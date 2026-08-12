/**
 * Pack de facteurs publics versionné pour le testeur gratuit.
 * Remplace les facteurs hardcodés côté React — source unique côté API.
 */
export const FREE_BILAN_FACTOR_PACK = {
  version: "free-bilan-2027.1",
  geography: "TN",
  unit: "kgCO2e",
  factors: {
    gas_m3: { id: "free-gas", value: 2.056, unit: "kgCO2e/m3", scope: 1 as const },
    fuel_liters: { id: "free-fuel", value: 2.68, unit: "kgCO2e/L", scope: 1 as const },
    fleet_essence: { id: "free-fleet-essence", value: 2.31, unit: "kgCO2e/L", scope: 1 as const },
    fleet_diesel: { id: "free-fleet-diesel", value: 2.68, unit: "kgCO2e/L", scope: 1 as const },
    refrigerant_kg: { id: "free-refrig", value: 1345, unit: "kgCO2e/kg", scope: 1 as const },
    electricity_kwh: { id: "free-elec-tn", value: 0.523, unit: "kgCO2e/kWh", scope: 2 as const },
    heat_kwh: { id: "free-heat", value: 0.2, unit: "kgCO2e/kWh", scope: 2 as const },
    purchases_dt: { id: "free-purchases", value: 0.5, unit: "kgCO2e/TND", scope: 3 as const },
    raw_materials_t: { id: "free-raw", value: 1.2, unit: "kgCO2e/t", scope: 3 as const },
    trips_car: { id: "free-trip-car", value: 0.2 * 200, unit: "kgCO2e/trip", scope: 3 as const },
    trips_train: { id: "free-trip-train", value: 0.041 * 200, unit: "kgCO2e/trip", scope: 3 as const },
    trips_flight: { id: "free-trip-flight", value: 0.255 * 200, unit: "kgCO2e/trip", scope: 3 as const },
    commute_voiture: { id: "free-commute-car", value: 0.2, unit: "kgCO2e/km", scope: 3 as const },
    commute_public: { id: "free-commute-pt", value: 0.05, unit: "kgCO2e/km", scope: 3 as const },
    freight_camion: { id: "free-freight-truck", value: 0.1 * 300, unit: "kgCO2e/t", scope: 3 as const },
    freight_maritime: { id: "free-freight-sea", value: 0.015 * 300, unit: "kgCO2e/t", scope: 3 as const },
    waste_recyclage: { id: "free-waste-rec", value: 0.05, unit: "kgCO2e/t", scope: 3 as const },
    waste_incineration: { id: "free-waste-inc", value: 0.7, unit: "kgCO2e/t", scope: 3 as const },
    waste_decharge: { id: "free-waste-land", value: 0.4, unit: "kgCO2e/t", scope: 3 as const },
  },
} as const;

export type FreeBilanAnswers = Record<string, string>;

function n(answers: FreeBilanAnswers, field: string): number {
  return Number(answers[field]) || 0;
}

export function buildFreeBilanLines(answers: FreeBilanAnswers) {
  const f = FREE_BILAN_FACTOR_PACK.factors;
  const lines: Array<{
    lineKey: string;
    scope: 1 | 2 | 3;
    factorId: string;
    activityQuantity: string;
    activityUnit: string;
    factorValue: string;
    factorUnit: string;
  }> = [];

  const push = (
    lineKey: string,
    scope: 1 | 2 | 3,
    factor: { id: string; value: number; unit: string },
    qty: number,
    activityUnit: string,
  ) => {
    if (qty <= 0) return;
    lines.push({
      lineKey,
      scope,
      factorId: factor.id,
      activityQuantity: String(qty),
      activityUnit,
      factorValue: String(factor.value),
      factorUnit: factor.unit,
    });
  };

  push("gas", 1, f.gas_m3, n(answers, "gas_m3"), "m3");
  push("fuel", 1, f.fuel_liters, n(answers, "fuel_liters"), "L");

  const fleetLiters = n(answers, "fleet_fuel_liters");
  if (answers.fleet_fuel === "essence") push("fleet", 1, f.fleet_essence, fleetLiters, "L");
  else if (answers.fleet_fuel === "diesel") push("fleet", 1, f.fleet_diesel, fleetLiters, "L");
  else if (answers.fleet_fuel === "mixte") {
    push("fleet_essence", 1, f.fleet_essence, fleetLiters / 2, "L");
    push("fleet_diesel", 1, f.fleet_diesel, fleetLiters / 2, "L");
  }

  push("refrigerant", 1, f.refrigerant_kg, n(answers, "refrigerant_kg"), "kg");

  const renewablePct = Math.min(100, Math.max(0, n(answers, "renewable_pct"))) / 100;
  const elecQty = n(answers, "electricity_kwh") * (1 - renewablePct);
  push("electricity", 2, f.electricity_kwh, elecQty, "kWh");
  push("heat", 2, f.heat_kwh, n(answers, "heat_kwh"), "kWh");

  push("purchases", 3, f.purchases_dt, n(answers, "purchases_dt"), "TND");
  push("raw_materials", 3, f.raw_materials_t, n(answers, "raw_materials_t"), "t");
  push("trips_car", 3, f.trips_car, n(answers, "trips_car"), "trip");
  push("trips_train", 3, f.trips_train, n(answers, "trips_train"), "trip");
  push("trips_flight", 3, f.trips_flight, n(answers, "trips_flight"), "trip");

  const employees = n(answers, "employees");
  const commuteKm = n(answers, "commute_km");
  const commuteQty = employees * commuteKm * 2 * 5 * 47;
  if (answers.commute_mode === "voiture") push("commute", 3, f.commute_voiture, commuteQty, "km");
  else if (answers.commute_mode === "velo") {
    /* zero */
  } else if (commuteQty > 0) push("commute", 3, f.commute_public, commuteQty, "km");

  const freightT = n(answers, "freight_t");
  if (answers.freight_mode === "maritime") push("freight", 3, f.freight_maritime, freightT, "t");
  else if (freightT > 0) push("freight", 3, f.freight_camion, freightT, "t");

  const wasteT = n(answers, "waste_t");
  if (answers.waste_treatment === "recyclage") push("waste", 3, f.waste_recyclage, wasteT, "t");
  else if (answers.waste_treatment === "incineration")
    push("waste", 3, f.waste_incineration, wasteT, "t");
  else if (wasteT > 0) push("waste", 3, f.waste_decharge, wasteT, "t");

  return lines;
}
