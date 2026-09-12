import { describe, expect, it } from "vitest";
import {
  formatFactorUnit,
  formatFactorValue,
  formatGeography,
  formatUnitPart,
  internalCategoryLabel,
  needsReview,
  sourceDisplayLabel,
} from "@/components/emission-factors/factorCatalogUtils";

const t = ((key: string) => {
  const map: Record<string, string> = {
    "emissionFactorCatalog.categories.purchased_goods": "Achats de biens",
    "emissionFactorCatalog.categories.process_fugitive": "Procédés et émissions fugitives",
    "emissionFactorCatalog.categories.land_use": "Utilisation des terres",
  };
  return map[key] ?? key;
}) as import("i18next").TFunction;

describe("factorCatalogUtils", () => {
  it("maps source keys to UI labels", () => {
    expect(sourceDisplayLabel("ademe")).toBe("ADEME Base Carbone");
    expect(sourceDisplayLabel("internal")).toBe("CarboScan / Core Tunisia");
    expect(sourceDisplayLabel("uk_gov_ghg")).toBe("UK Government GHG");
    expect(sourceDisplayLabel("epa_ghg_emission_factors_hub")).toBe(
      "EPA GHG Emission Factors Hub",
    );
    expect(sourceDisplayLabel("ipcc_efdb")).toBe("IPCC Emission Factor Database");
    expect(sourceDisplayLabel("other", "Custom")).toBe("Custom");
  });

  it("maps internal categories via i18n without changing API values", () => {
    expect(internalCategoryLabel(t, "purchased_goods")).toBe("Achats de biens");
    expect(internalCategoryLabel(t, "process_fugitive")).toBe(
      "Procédés et émissions fugitives",
    );
    expect(internalCategoryLabel(t, null)).toBe("—");
  });

  it("formats units typographically without converting Nm3 to m3", () => {
    expect(formatFactorUnit("kgCO2e", "kWh")).toBe("kgCO₂e/kWh");
    expect(formatFactorUnit("kgCO2e", "Nm3")).toBe("kgCO₂e/Nm³");
    expect(formatFactorUnit("kgCO2e", "unknown")).toBe("kgCO₂e/unknown");
    expect(formatUnitPart("Nm3")).toBe("Nm³");
    expect(formatUnitPart("Nm3")).not.toBe("m³");
  });

  it("formats geography and review flag", () => {
    expect(formatGeography("FR", "IDF")).toBe("FR · IDF");
    expect(formatGeography(null)).toBe("—");
    expect(needsReview("review_required")).toBe(true);
    expect(needsReview("ok")).toBe(false);
  });

  it("formats values without inventing unit conversion", () => {
    expect(formatFactorValue(5.23)).toMatch(/5/);
    expect(formatFactorValue(525)).toBe("525");
    expect(formatFactorValue(-1.4)).toMatch(/-1/);
  });
});
