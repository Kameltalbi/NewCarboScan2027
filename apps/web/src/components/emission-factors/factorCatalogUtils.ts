import type { FactorCatalogSearchItem } from "@/integrations/api/client";
import type { TFunction } from "i18next";

/** UI labels for backend source_key — values sent to API stay technical. */
export function sourceDisplayLabel(
  key: string | null | undefined,
  fallbackName?: string | null,
): string {
  switch (key) {
    case "ademe":
      return "ADEME Base Carbone";
    case "internal":
      return "CarboScan / Core Tunisia";
    case "uk_gov_ghg":
      return "UK Government GHG";
    case "epa_ghg_emission_factors_hub":
      return "EPA GHG Emission Factors Hub";
    case "ipcc_efdb":
      return "IPCC Emission Factor Database";
    default:
      return fallbackName?.trim() || key || "—";
  }
}

const KNOWN_INTERNAL_CATEGORIES = new Set([
  "purchased_goods",
  "purchased_services",
  "energy",
  "waste",
  "transport",
  "freight",
  "land_use",
  "process_fugitive",
  "reference",
  "unknown",
]);

/** Present internal_category codes via i18n — never invent backend values. */
export function internalCategoryLabel(
  t: TFunction,
  code: string | null | undefined,
): string {
  if (!code) return "—";
  if (KNOWN_INTERNAL_CATEGORIES.has(code)) {
    return t(`emissionFactorCatalog.categories.${code}`);
  }
  // Humanize unknown snake_case without inventing domain meaning
  if (/^[a-z0-9_]+$/.test(code)) {
    return code
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return code;
}

/** Frontend-only unit typography. No conversion (Nm3 stays Nm³, never m3). */
export function formatUnitPart(part: string): string {
  return part
    .replace(/kgCO2e/gi, "kgCO₂e")
    .replace(/gCO2e/gi, "gCO₂e")
    .replace(/tCO2e/gi, "tCO₂e")
    .replace(/Nm3/g, "Nm³")
    .replace(/m3/g, "m³")
    .replace(/m2/g, "m²");
}

export function formatFactorUnit(numerator: string, denominator: string): string {
  const num = formatUnitPart(numerator || "");
  if (!denominator || denominator === "1") return num || "—";
  return `${num}/${formatUnitPart(denominator)}`;
}

/** Readable number without inventing precision beyond what Number holds. */
export function formatFactorValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.0001 || abs >= 1_000_000)) {
    return value.toExponential(4);
  }
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatGeography(
  countryCode: string | null | undefined,
  region?: string | null,
): string {
  const parts = [countryCode, region].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export function needsReview(status: string | null | undefined): boolean {
  return status === "review_required";
}

export function factorSubtitle(item: FactorCatalogSearchItem): string | null {
  return item.sourceSubcategory || item.internalSubcategory || item.sourceCategory || null;
}
