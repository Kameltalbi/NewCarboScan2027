import { describe, expect, it } from "vitest";
import { ATLAS_COUNTERPARTIES } from "./atlasDemoPortfolio";
import { calculateBusinessLoan } from "./businessLoans";
import {
  assessCounterpartyRaw,
  businessLoanInputToRaw,
  portfolioQuality,
} from "./methodology";

describe("Banque Atlas — le moteur recalcule les entrées", () => {
  it("Médina Textile : option 1a, attribution 25 %, scopes séparés", () => {
    const medina = ATLAS_COUNTERPARTIES.find((row) => row.name.startsWith("Médina"));
    expect(medina).toBeTruthy();
    const result = calculateBusinessLoan(medina!.input);
    expect(result.scope12.optionCode).toBe("1a");
    expect(result.scope12.score).toBe(1);
    expect(result.scope12.denominator).toBe(194_000_000);
    expect(result.scope12.attributionFactor).toBeCloseTo(0.25);
    expect(result.scope12.borrowerEmissionsTco2e).toBe(52_000);
    expect(result.scope12.financedEmissionsTco2e).toBeCloseTo(13_000);
    expect(result.scope3.optionCode).toBe("1a");
    expect(result.scope3.borrowerEmissionsTco2e).toBe(28_000);
    expect(result.scope3.financedEmissionsTco2e).toBeCloseTo(7_000);
    expect(result.complementaryTotalTco2e).toBeCloseTo(20_000);

    const replay = assessCounterpartyRaw(businessLoanInputToRaw(medina!.input));
    expect(replay?.scope12.financedEmissionsTco2e).toBeCloseTo(13_000);
    expect(replay?.scope3.score).toBe(1);
  });

  it("Numéris est cotée : le dénominateur est l'EVIC", () => {
    const row = ATLAS_COUNTERPARTIES.find((item) => item.name.startsWith("Numéris"));
    const result = calculateBusinessLoan(row!.input);
    expect(result.scope12.denominatorLabel).toMatch(/EVIC/);
    expect(result.scope12.attributionFactor).toBeCloseTo(0.2);
    expect(result.scope12.financedEmissionsTco2e).toBeCloseTo(1_600);
  });

  it("Delta Immobilière reste un business loan en option 3b", () => {
    const row = ATLAS_COUNTERPARTIES.find((item) => item.name.startsWith("Delta"));
    const result = calculateBusinessLoan(row!.input);
    expect(result.status).not.toBe("not_implemented");
    expect(result.scope12.optionCode).toBe("3b");
    expect(result.scope12.attributionFactor).toBeNull();
    expect(result.scope12.financedEmissionsTco2e).toBeCloseTo(32_960);
  });

  it("le score portefeuille est pondéré par l'encours", () => {
    const results = ATLAS_COUNTERPARTIES.map((row) => calculateBusinessLoan(row.input));
    const quality = portfolioQuality(results);
    const arithmetic =
      results.reduce((sum, row) => sum + (row.scope12.score ?? 0), 0) / results.length;
    expect(quality.scope12).not.toBeNull();
    expect(quality.scope3).not.toBeNull();
    expect(quality.scope12).not.toBeCloseTo(arithmetic);
    const outstanding = results.reduce((sum, row) => sum + (row.outstandingAmount ?? 0), 0);
    const weighted = results.reduce(
      (sum, row) => sum + (row.outstandingAmount ?? 0) * (row.scope12.score ?? 0),
      0,
    );
    expect(quality.scope12).toBeCloseTo(weighted / outstanding);
  });
});
