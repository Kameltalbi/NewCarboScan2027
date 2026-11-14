import { factorDenominator, isTunisiaCountry, unitCompatibility } from "@/lib/factors/factorSelection";

export const INCOMPLETE_LINE_MARK = "A_COMPLETER:";

export interface PreviewFactor {
  id: string;
  name: string;
  value: number;
  unit: string;
  sourceName: string | null;
  factorYear: number | null;
  countryCode: string | null;
  stableFactorId: string | null;
}

export interface LinePreview {
  status: "counted" | "incomplete" | "incompatible";
  provisional: boolean;
  kg: number | null;
  formula: string;
  resultLabel: string;
  warning: string | null;
}

export function formatEmissionAmount(kg: number): string {
  const abs = Math.abs(kg);
  if (abs === 0) return "0 kg CO₂e";
  if (abs < 1000) {
    const digits = abs < 10 ? 1 : 0;
    return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: 1 }).format(kg)} kg CO₂e`;
  }
  const tonnes = kg / 1000;
  const digits = Math.abs(tonnes) < 100 ? 1 : 0;
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: Math.abs(tonnes) < 10 ? 1 : 0,
    maximumFractionDigits: digits,
  }).format(tonnes)} t CO₂e`;
}

export function isProvisionalFactor(factor: PreviewFactor): boolean {
  const tunisiaPack = factor.stableFactorId === "electricity_kwh" || factor.id === "tn-grid-electricity";
  return tunisiaPack && factor.factorYear == null;
}

export function sourceLabel(sourceName: string | null): string {
  if (!sourceName) return "Source non renseignée";
  if (/core pack|interne/i.test(sourceName)) return "Référence interne";
  return sourceName;
}

export function previewLine(input: {
  quantity: number;
  unit: string;
  factor: PreviewFactor | null;
}): LinePreview {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return {
      status: "incomplete",
      provisional: false,
      kg: null,
      formula: "Émissions non calculées",
      resultLabel: "Émissions non calculées",
      warning: "Saisissez une quantité supérieure à zéro.",
    };
  }
  if (!input.factor) {
    return {
      status: "incomplete",
      provisional: false,
      kg: null,
      formula: "Émissions non calculées",
      resultLabel: "Émissions non calculées",
      warning: "Choisissez un facteur, ou enregistrez la ligne à compléter.",
    };
  }
  const compatible = unitCompatibility(input.unit, factorDenominator(input.factor.unit));
  if (!compatible.ok) {
    return {
      status: "incompatible",
      provisional: false,
      kg: null,
      formula: "Émissions non calculées",
      resultLabel: "Émissions non calculées",
      warning: `L’unité ${input.unit} ne correspond pas au facteur, exprimé en ${factorDenominator(input.factor.unit)}.`,
    };
  }
  const kg = input.quantity * compatible.multiplier * input.factor.value;
  const provisional = isProvisionalFactor(input.factor);
  const resultLabel = formatEmissionAmount(kg);
  const quantityLabel = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(input.quantity);
  const factorLabel = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(input.factor.value);
  return {
    status: "counted",
    provisional,
    kg,
    formula: `${quantityLabel} ${input.unit} × ${factorLabel} ${input.factor.unit.replace("CO2", "CO₂")}`,
    resultLabel,
    warning: provisional ? "Source, année et périmètre à documenter." : null,
  };
}

export function proposeTunisiaElectricity(organizationCountry: string | null | undefined, subcategory: string): boolean {
  const key = subcategory.split(":").pop()?.toLowerCase() || "";
  return isTunisiaCountry(organizationCountry) && ["electricite", "electricity", "electricity_grid"].includes(key);
}
