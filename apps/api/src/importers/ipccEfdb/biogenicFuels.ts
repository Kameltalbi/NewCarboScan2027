/**
 * IPCC 2006 Vol.2 Table 2.2 — biomass / biofuel CO2 (biogenic).
 * 11 fuels × 4 stationary categories (1.A.1 / 1.A.2 / 1.A.4*) = 44 factors.
 * "Municipal Wastes (non-biomass fraction)" is fossil — never biogenic.
 */
const BIOGENIC_FUEL_NAMES = new Set([
  "Wood/Wood Waste",
  "Sulphite Lyes (Black Liquor)",
  "Other Primary Solid Biomass",
  "Charcoal",
  "Biogasoline",
  "Biodiesels",
  "Other Liquid Biofuels",
  "Landfill Gas",
  "Sludge Gas",
  "Other Biogas",
  "Municipal Wastes (biomass fraction)",
]);

/** Normalize EFDB fuel cell (newlines / whitespace). */
export function normalizeIpccFuelName(fuel: string | null | undefined): string {
  if (!fuel) return "";
  return fuel.replace(/\s+/g, " ").trim();
}

export function isIpccBiogenicCo2Fuel(fuel: string | null | undefined): boolean {
  const n = normalizeIpccFuelName(fuel);
  if (!n) return false;
  if (/non-biomass/i.test(n)) return false;
  return BIOGENIC_FUEL_NAMES.has(n);
}

export const IPCC_BIOGENIC_CO2_FUEL_COUNT = 11;
/** Expected biogenic CO2 activity factors in operational V1 (11 fuels × 4 cats). */
export const IPCC_BIOGENIC_CO2_ACTIVITY_EXPECTED = 44;
