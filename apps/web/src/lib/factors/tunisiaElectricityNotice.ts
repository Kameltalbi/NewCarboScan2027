/** Facteur électricité Tunisie. Source officielle et année du mix : non renseignées. */

export const TN_ELECTRICITY_KG_PER_KWH = 0.53;
export const TN_ELECTRICITY_OFFICIAL_SOURCE: string | null = null;
export const TN_ELECTRICITY_OFFICIAL_YEAR: number | null = null;
export const TN_ELECTRICITY_REPORT_BLOCK = "Source du facteur électricité Tunisie à renseigner";
export const ELECTRICITY_CORRECTION_MARKER = "Facteur électricité corrigé depuis la validation";

const ELECTRICITY_KEYS = new Set(["electricite", "electricity", "electricity_grid"]);

export function electricityQuantityToKwh(quantity: number, unit: string): number | null {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "kwh") return quantity;
  if (normalized === "mwh") return quantity * 1000;
  if (normalized === "gwh") return quantity * 1_000_000;
  return null;
}

export function electricityCorrectionNotice(input: {
  factorUsed: number;
  electricityKwh: number;
  currentTotalKg: number;
}): {
  marker: string;
  factorUsed: number;
  factorCorrect: number;
  deltaKg: number;
  deltaT: number;
  deltaPct: number;
  recalculatedTotalKg: number;
  text: string;
} {
  const deltaKg = input.electricityKwh * (TN_ELECTRICITY_KG_PER_KWH - input.factorUsed);
  const recalculatedTotalKg = input.currentTotalKg + deltaKg;
  const deltaPct = input.currentTotalKg === 0 ? 0 : (deltaKg / input.currentTotalKg) * 100;
  const number = (value: number, digits: number) =>
    value.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const factor = (value: number) =>
    value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  const text = [
    ELECTRICITY_CORRECTION_MARKER,
    `Facteur utilisé : ${factor(input.factorUsed)} kgCO2e/kWh.`,
    `Facteur correct : ${factor(TN_ELECTRICITY_KG_PER_KWH)} kgCO2e/kWh.`,
    `Écart estimé : ${number(deltaKg / 1000, 1)} tCO2e (${number(deltaPct, 1)} %).`,
  ].join(" ");
  return {
    marker: ELECTRICITY_CORRECTION_MARKER,
    factorUsed: input.factorUsed,
    factorCorrect: TN_ELECTRICITY_KG_PER_KWH,
    deltaKg,
    deltaT: deltaKg / 1000,
    deltaPct,
    recalculatedTotalKg,
    text,
  };
}

export function clientReportBlockReason(usesTunisiaElectricity: boolean): string | null {
  if (!usesTunisiaElectricity) return null;
  if (TN_ELECTRICITY_OFFICIAL_SOURCE && TN_ELECTRICITY_OFFICIAL_YEAR != null) return null;
  return TN_ELECTRICITY_REPORT_BLOCK;
}

export function reportUsesUnsourcedTunisiaElectricity(input: {
  organizationCountry?: string | null;
  scope2Kg?: number;
  lines?: Array<{
    subcategory?: string | null;
    category?: string | null;
    unit?: string | null;
    emissionFactor?: number | null;
    emissionFactorSource?: string | null;
  }>;
}): boolean {
  const country = (input.organizationCountry || "").trim().toLowerCase();
  const tunisia = country === "tn" || country === "tun" || country === "tunisie" || country === "tunisia";
  const lines = input.lines ?? [];
  const electricity = lines.filter((line) => {
    const key = (line.subcategory || line.category || "").split(":").pop()?.toLowerCase() || "";
    return ELECTRICITY_KEYS.has(key) || /électri|electri/i.test(`${line.subcategory || ""} ${line.category || ""}`);
  });
  if (electricity.length > 0) {
    return electricity.some((line) => {
      const source = line.emissionFactorSource || "";
      const factor = line.emissionFactor;
      return tunisia || /tunisie|\bTN\b|core pack tn/i.test(source) || factor === 0.53 || factor === 0.523 || factor === 0.56;
    });
  }
  return tunisia && lines.length === 0 && (input.scope2Kg || 0) > 0;
}
