import { describe, expect, it } from "vitest";
import { buildPcafTrace, toPcafDataQuality } from "./methodology";

describe("PCAF Part A 2025 — business loans", () => {
  it("applique Outstanding / (equity+debt) × company emissions", () => {
    const trace = buildPcafTrace({
      outstanding: 48_500_000,
      financedKg: 20_370_000,
      currency: "TND",
      dataMethod: "supplier_specific",
      confidenceIndex: 88,
      rawLegacy: {
        pcaf_data_quality: 2,
        pcaf_option: "1b",
        listing: "private",
        attribution_factor: 0.25,
        total_equity_plus_debt_tnd: 194_000_000,
        company_emissions_tco2e: 81_480,
        financed_emissions_tco2e: 20_370,
      },
    });
    expect(trace.citation).toContain("PCAF (2025)");
    expect(trace.assetClassSection).toBe("§5.2");
    expect(trace.optionCode).toBe("1b");
    expect(trace.dataQuality).toBe(2);
    expect(trace.attributionFactor).toBe(0.25);
    expect(trace.companyValueLabel).toContain("equity + debt");
    expect(Math.round(trace.attributionFactor * trace.companyEmissionsTco2e)).toBe(
      20_370,
    );
  });

  it("normalise le score qualité 1–5 (Table 5.2-1)", () => {
    expect(toPcafDataQuality(1)).toBe(1);
    expect(toPcafDataQuality(9)).toBe(5);
    expect(toPcafDataQuality(null)).toBe(5);
  });
});
