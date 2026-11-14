import { describe, expect, it } from "vitest";
import {
  clientReportBlockReason,
  electricityCorrectionNotice,
  electricityQuantityToKwh,
  reportUsesUnsourcedTunisiaElectricity,
} from "./tunisiaElectricityNotice";

describe("facteur électricité Tunisie", () => {
  it("couvre le kWh et convertit MWh et GWh sans les appliquer à la migration", () => {
    expect(electricityQuantityToKwh(23208, "kWh")).toBe(23208);
    expect(electricityQuantityToKwh(1, "MWh")).toBe(530 / 0.53);
    expect(electricityQuantityToKwh(1, "GWh")).toBe(1_000_000);
    expect(electricityQuantityToKwh(10, "L")).toBeNull();
  });

  it("marque les bilans figés connus sans réécrire leur total", () => {
    const atlas = electricityCorrectionNotice({
      factorUsed: 0.56,
      electricityKwh: 6_335_390,
      currentTotalKg: 7_864_700,
    });
    expect(atlas.text).toContain("Facteur électricité corrigé depuis la validation");
    expect(atlas.text).toContain("0,56");
    expect(atlas.text).toContain("0,53");
    expect(atlas.deltaT).toBeCloseTo(-190.0617, 3);
    expect(atlas.recalculatedTotalKg).toBeCloseTo(7_674_638.3, 1);
    expect(atlas.deltaPct).toBeCloseTo(-2.416, 2);

    const ktc2024 = electricityCorrectionNotice({
      factorUsed: 0.523,
      electricityKwh: 5_184_200,
      currentTotalKg: 5_126_476.96,
    });
    expect(ktc2024.deltaT).toBeCloseTo(36.2894, 3);
    expect(ktc2024.recalculatedTotalKg).toBeCloseTo(5_162_766.36, 1);

    const ktc2025 = electricityCorrectionNotice({
      factorUsed: 0.523,
      electricityKwh: 5_635_000,
      currentTotalKg: 5_571_088,
    });
    expect(ktc2025.deltaT).toBeCloseTo(39.445, 3);
    expect(ktc2025.recalculatedTotalKg).toBeCloseTo(5_610_533, 1);
  });

  it("bloque le rapport client tant que la source officielle et l'année manquent", () => {
    expect(clientReportBlockReason(false)).toBeNull();
    expect(clientReportBlockReason(true)).toBe("Source du facteur électricité Tunisie à renseigner");
    expect(reportUsesUnsourcedTunisiaElectricity({
      organizationCountry: "Tunisie",
      scope2Kg: 12_300,
      lines: [],
    })).toBe(true);
    expect(reportUsesUnsourcedTunisiaElectricity({
      organizationCountry: "France",
      scope2Kg: 1000,
      lines: [{ subcategory: "gaz", emissionFactor: 2.056 }],
    })).toBe(false);
  });
});
