import { describe, expect, it } from "vitest";
import {
  calculateBusinessLoan,
  weightedDataQualityScore,
  type BusinessLoanInput,
} from "./businessLoans";

const denom = {
  assetClass: "business_loans" as const,
  instrument: "business_loan" as const,
  listing: "unlisted" as const,
  outstandingAmount: 10_000_000,
  currency: "TND",
  reportingYear: 2025,
  totalEquity: 20_000_000,
  totalDebt: 30_000_000,
};

function loan(patch: Partial<BusinessLoanInput>): BusinessLoanInput {
  return { ...denom, ...patch };
}

describe("PCAF 2025 business loans — dégradation de la donnée", () => {
  it("choisit 1a puis descend jusqu'à 3c sans inventer d'attribution", () => {
    const verified = calculateBusinessLoan(
      loan({
        scope12: { reported: { verified: true, emissionsTco2e: 1_000, source: "audit", year: 2025 } },
      }),
    );
    expect(verified.scope12.optionCode).toBe("1a");
    expect(verified.scope12.score).toBe(1);
    expect(verified.scope12.attributionFactor).toBeCloseTo(0.2);
    expect(verified.scope12.financedEmissionsTco2e).toBeCloseTo(200);

    const unverified = calculateBusinessLoan(
      loan({
        scope12: { reported: { verified: false, emissionsTco2e: 1_000, source: "rapport", year: 2025 } },
      }),
    );
    expect(unverified.scope12.optionCode).toBe("1b");
    expect(unverified.scope12.score).toBe(2);
    expect(unverified.scope12.financedEmissionsTco2e).toBeCloseTo(200);

    const energy = calculateBusinessLoan(
      loan({
        scope12: {
          energy: {
            quantity: 1_000_000,
            unit: "kWh",
            processEmissionsTco2e: 0,
            factor: {
              tco2ePerUnit: 0.0005,
              perUnit: "kWh",
              source: "démo",
              year: 2025,
              geography: "TN",
            },
          },
        },
      }),
    );
    expect(energy.scope12.optionCode).toBe("2a");
    expect(energy.scope12.score).toBe(2);
    expect(energy.scope12.borrowerEmissionsTco2e).toBeCloseTo(500);
    expect(energy.scope12.financedEmissionsTco2e).toBeCloseTo(100);

    const production = calculateBusinessLoan(
      loan({
        scope12: {
          production: {
            quantity: 100,
            unit: "t",
            factor: { tco2ePerUnit: 2, perUnit: "t", source: "démo", year: 2025 },
          },
        },
      }),
    );
    expect(production.scope12.optionCode).toBe("2b");
    expect(production.scope12.score).toBe(3);
    expect(production.scope12.financedEmissionsTco2e).toBeCloseTo(40);

    const economic = calculateBusinessLoan(
      loan({
        revenue: 5_000_000,
        revenueCurrency: "TND",
        sector: "Textile",
        sectorEmissionsPerRevenue: {
          scope12: {
            tco2ePerUnit: 0.0002,
            perUnit: "TND",
            source: "démo",
            year: 2024,
            geography: "TN",
            currency: "TND",
          },
        },
      }),
    );
    expect(economic.scope12.optionCode).toBe("3a");
    expect(economic.scope12.score).toBe(4);
    expect(economic.scope12.borrowerEmissionsTco2e).toBeCloseTo(1_000);
    expect(economic.scope12.financedEmissionsTco2e).toBeCloseTo(200);

    const assetIntensity = calculateBusinessLoan(
      loan({
        totalEquity: null,
        totalDebt: null,
        sectorEmissionsPerAsset: {
          scope12: {
            tco2ePerUnit: 0.0001,
            perUnit: "TND",
            source: "démo",
            year: 2024,
            currency: "TND",
          },
        },
      }),
    );
    expect(assetIntensity.scope12.optionCode).toBe("3b");
    expect(assetIntensity.scope12.score).toBe(5);
    expect(assetIntensity.scope12.attributionFactor).toBeNull();
    expect(assetIntensity.scope12.financedEmissionsTco2e).toBeCloseTo(1_000);

    const turnover = calculateBusinessLoan(
      loan({
        totalEquity: null,
        totalDebt: null,
        sectorAssetTurnover: { ratio: 2, source: "démo", year: 2024, geography: "TN" },
        sectorEmissionsPerRevenue: {
          scope12: {
            tco2ePerUnit: 0.0001,
            perUnit: "TND",
            source: "démo",
            year: 2024,
            currency: "TND",
          },
        },
      }),
    );
    expect(turnover.scope12.optionCode).toBe("3c");
    expect(turnover.scope12.score).toBe(5);
    expect(turnover.scope12.attributionFactor).toBeNull();
    expect(turnover.scope12.financedEmissionsTco2e).toBeCloseTo(2_000);
  });

  it("ne fabrique pas un ratio si aucune méthode n'est calculable", () => {
    const result = calculateBusinessLoan(loan({}));
    expect(result.scope12.status).toBe("not_calculable");
    expect(result.scope12.attributionFactor).toBeNull();
    expect(result.scope12.financedEmissionsTco2e).toBeNull();
    expect(result.scope12.why).toMatch(/insuffisantes/i);
    expect(result.scope12.improvements.length).toBeGreaterThan(0);
  });

  it("n'attribue pas le score 2 sans émissions d'emprunteur", () => {
    const result = calculateBusinessLoan(
      loan({
        scope12: { energy: { quantity: 10, unit: "kWh", factor: { tco2ePerUnit: 0.001, perUnit: "kWh", source: "x", year: 2025 } } },
      }),
    );
    expect(result.scope12.optionCode).not.toBe("1b");
    expect(result.scope12.optionCode).not.toBe("2a");
    expect(result.scope12.status).toBe("not_calculable");
  });

  it("préfère l'inventaire vérifié à l'énergie", () => {
    const result = calculateBusinessLoan(
      loan({
        scope12: {
          reported: { verified: true, emissionsTco2e: 80, year: 2025 },
          energy: {
            quantity: 1_000_000,
            unit: "kWh",
            processEmissionsTco2e: 0,
            factor: { tco2ePerUnit: 0.001, perUnit: "kWh", source: "x", year: 2025 },
          },
        },
      }),
    );
    expect(result.scope12.optionCode).toBe("1a");
  });

  it("n'applique pas l'option 2a au scope 3", () => {
    const result = calculateBusinessLoan(
      loan({
        scope12: {
          energy: {
            quantity: 1_000,
            unit: "kWh",
            processEmissionsTco2e: 0,
            factor: { tco2ePerUnit: 0.001, perUnit: "kWh", source: "x", year: 2025 },
          },
        },
        scope3: {
          energy: {
            quantity: 1_000,
            unit: "kWh",
            processEmissionsTco2e: 0,
            factor: { tco2ePerUnit: 0.001, perUnit: "kWh", source: "x", year: 2025 },
          },
        },
      }),
    );
    expect(result.scope12.optionCode).toBe("2a");
    expect(result.scope3.optionCode).not.toBe("2a");
    expect(result.scope3.status).toBe("not_calculable");
  });

  it("utilise l'EVIC pour une société cotée et ignore equity + debt", () => {
    const result = calculateBusinessLoan(
      loan({
        listing: "listed",
        evic: 40_000_000,
        totalEquity: 1,
        totalDebt: 1,
        scope12: { reported: { verified: true, emissionsTco2e: 400, year: 2025 } },
      }),
    );
    expect(result.scope12.denominatorLabel).toMatch(/EVIC/);
    expect(result.scope12.attributionFactor).toBeCloseTo(0.25);
    expect(result.scope12.financedEmissionsTco2e).toBeCloseTo(100);
  });

  it("applique la note 77 seulement si equity ou dette manque", () => {
    const result = calculateBusinessLoan(
      loan({
        totalEquity: null,
        totalDebt: 30_000_000,
        totalBalanceSheet: 80_000_000,
        scope12: { reported: { verified: true, emissionsTco2e: 100, year: 2025 } },
      }),
    );
    expect(result.scope12.denominator).toBe(80_000_000);
    expect(result.scope12.attributionFactor).toBeCloseTo(0.125);
    expect(result.scope12.traces.join(" ")).toMatch(/Note 77/);
  });

  it("ramène un equity négatif à zéro", () => {
    const result = calculateBusinessLoan(
      loan({
        totalEquity: -10_000_000,
        totalDebt: 50_000_000,
        outstandingAmount: 10_000_000,
        scope12: { reported: { verified: true, emissionsTco2e: 100, year: 2025 } },
      }),
    );
    expect(result.scope12.denominator).toBe(50_000_000);
    expect(result.scope12.attributionFactor).toBeCloseTo(0.2);
  });

  it("refuse les autres classes d'actifs", () => {
    const result = calculateBusinessLoan(
      loan({ assetClass: "commercial_real_estate" }),
    );
    expect(result.status).toBe("not_implemented");
    expect(result.scope12.financedEmissionsTco2e).toBeNull();
  });

  it("pondère le score par l'encours", () => {
    const score = weightedDataQualityScore([
      { outstanding: 100, score: 1 },
      { outstanding: 300, score: 5 },
      { outstanding: 50, score: null },
    ]);
    expect(score).toBeCloseTo(4);
  });
});
