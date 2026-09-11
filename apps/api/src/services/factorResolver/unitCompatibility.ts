/**
 * Unit compatibility for Factor Resolver V1.
 * Exact + safe dimensional conversions only. No semantic inventing.
 */

export type UnitCompatClass =
  | "EXACT"
  | "SAFE_CONVERSION"
  | "CONTEXT_REQUIRED"
  | "INCOMPATIBLE";

export type UnitCompatibility = {
  class: UnitCompatClass;
  fromUnit: string;
  toUnit: string;
  /** Multiply activity quantity by this to express it in factor denominator units. */
  multiplier: number | null;
  reasonCode: string;
};

const SYNTAX_ALIASES: Record<string, string> = {
  litre: "L",
  litres: "L",
  l: "L",
  liter: "L",
  liters: "L",
  tonne: "t",
  tonnes: "t",
  ton: "t",
  tons: "t",
  "m³": "m3",
  "m^3": "m3",
  nm3: "Nm3",
  "nm³": "Nm3",
  kwh: "kWh",
  mwh: "MWh",
  gwh: "GWh",
  gj: "GJ",
  mj: "MJ",
  mile: "mile",
  miles: "mile",
  km: "km",
  g: "g",
  kg: "kg",
  "t.km": "tonne.km",
  "t·km": "tonne.km",
  "tonne.kilometre": "tonne.km",
  "tonne.kilometres": "tonne.km",
  "tonne.kilometers": "tonne.km",
  "tonne.kilometer": "tonne.km",
  "tonnes.km": "tonne.km",
  "tkm": "tonne.km",
  "passenger.km": "passenger.km",
  "passager.km": "passenger.km",
  "passager-km": "passenger.km",
  keuro: "kEUR",
  "k€": "kEUR",
  euro: "EUR",
  eur: "EUR",
  dt: "TND",
  tnd: "TND",
};

/** Mass family: base = kg */
const MASS_TO_KG: Record<string, number> = {
  g: 0.001,
  kg: 1,
  t: 1000,
};

/** Distance family: base = km */
const DIST_TO_KM: Record<string, number> = {
  km: 1,
  mile: 1.609344,
};

/** Transport-work family already aliased to tonne.km — exact only after alias. */

const MONETARY = new Set(["EUR", "kEUR", "TND"]);

const CONTEXTUAL_PAIRS = new Set([
  "m3|kWh",
  "kWh|m3",
  "Nm3|kWh",
  "kWh|Nm3",
  "L|kg",
  "kg|L",
  "L|t",
  "t|L",
  "passenger.km|km",
  "km|passenger.km",
  "tonne.km|km",
  "km|tonne.km",
]);

export function normalizeResolverUnit(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  if (SYNTAX_ALIASES[lower]) return SYNTAX_ALIASES[lower];
  // Preserve known canonical casing
  if (trimmed === "kWh" || trimmed === "MWh" || trimmed === "GWh") return trimmed;
  if (trimmed === "Nm3") return "Nm3";
  if (trimmed === "kEUR") return "kEUR";
  return SYNTAX_ALIASES[lower] ?? trimmed;
}

export function isMonetaryUnit(unit: string): boolean {
  return MONETARY.has(normalizeResolverUnit(unit));
}

function pairKey(a: string, b: string): string {
  return `${a}|${b}`;
}

/**
 * Compare activity unit vs factor denominator unit.
 * multiplier: activity_qty * multiplier = qty in factor units.
 */
export function compareUnits(activityUnit: string, factorDenominator: string): UnitCompatibility {
  const from = normalizeResolverUnit(activityUnit);
  const to = normalizeResolverUnit(factorDenominator);

  if (!from || !to) {
    return {
      class: "INCOMPATIBLE",
      fromUnit: from,
      toUnit: to,
      multiplier: null,
      reasonCode: "UNIT_MISSING",
    };
  }

  if (from === to) {
    return {
      class: "EXACT",
      fromUnit: from,
      toUnit: to,
      multiplier: 1,
      reasonCode: "UNIT_EXACT",
    };
  }

  if (CONTEXTUAL_PAIRS.has(pairKey(from, to))) {
    return {
      class: "CONTEXT_REQUIRED",
      fromUnit: from,
      toUnit: to,
      multiplier: null,
      reasonCode: "UNIT_CONTEXT_REQUIRED",
    };
  }

  // Mass safe conversions
  if (from in MASS_TO_KG && to in MASS_TO_KG) {
    const multiplier = MASS_TO_KG[from]! / MASS_TO_KG[to]!;
    return {
      class: "SAFE_CONVERSION",
      fromUnit: from,
      toUnit: to,
      multiplier,
      reasonCode: "UNIT_SAFE_MASS",
    };
  }

  // Distance safe conversions
  if (from in DIST_TO_KM && to in DIST_TO_KM) {
    const multiplier = DIST_TO_KM[from]! / DIST_TO_KM[to]!;
    return {
      class: "SAFE_CONVERSION",
      fromUnit: from,
      toUnit: to,
      multiplier,
      reasonCode: "UNIT_SAFE_DISTANCE",
    };
  }

  // Energy SI prefixes (safe)
  const energy: Record<string, number> = { kWh: 1, MWh: 1000, GWh: 1_000_000 };
  if (from in energy && to in energy) {
    const multiplier = energy[from]! / energy[to]!;
    return {
      class: "SAFE_CONVERSION",
      fromUnit: from,
      toUnit: to,
      multiplier,
      reasonCode: "UNIT_SAFE_ENERGY",
    };
  }

  // Monetary: no FX — only exact after alias
  if (MONETARY.has(from) || MONETARY.has(to)) {
    return {
      class: "INCOMPATIBLE",
      fromUnit: from,
      toUnit: to,
      multiplier: null,
      reasonCode: "UNIT_MONETARY_MISMATCH",
    };
  }

  return {
    class: "INCOMPATIBLE",
    fromUnit: from,
    toUnit: to,
    multiplier: null,
    reasonCode: "UNIT_INCOMPATIBLE",
  };
}

/** Denominators to include in SQL prefilter for a given activity unit. */
export function candidateDenominatorUnits(activityUnit: string): string[] {
  const u = normalizeResolverUnit(activityUnit);
  const out = new Set<string>([u]);
  if (u in MASS_TO_KG) {
    for (const k of Object.keys(MASS_TO_KG)) out.add(k);
  }
  if (u in DIST_TO_KM) {
    for (const k of Object.keys(DIST_TO_KM)) out.add(k);
  }
  if (u === "kWh" || u === "MWh" || u === "GWh") {
    out.add("kWh");
    out.add("MWh");
    out.add("GWh");
  }
  if (u === "tonne.km") {
    out.add("tonne.km");
    out.add("t.km"); // DB may still store legacy spelling before alias on row
  }
  return [...out];
}

export function applyQuantityConversion(
  quantity: string | undefined,
  multiplier: number | null,
): string | null {
  if (quantity === undefined || multiplier === null) return null;
  const n = Number(quantity);
  if (!Number.isFinite(n)) return null;
  // Avoid float noise for common cases
  const converted = n * multiplier;
  return String(converted);
}
