import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "./analyze.js";
import { reportDataFromRun, type LedgerLineInput } from "./fromRun.js";
import { DEFAULT_ANALYSIS_OPTIONS } from "./types.js";

function line(patch: Partial<LedgerLineInput> = {}): LedgerLineInput {
  return {
    lineKey: "gas",
    scope: 1,
    activityQuantity: "10",
    activityUnit: "m3",
    factorValue: "2",
    factorUnit: "kgCO2e/m3",
    allocationFactor: "1",
    resultKgCo2e: "20",
    uncertaintyPct: null,
    factorId: "gas_m3",
    factorVersion: "2024",
    factorSource: "Core TN",
    label: "Gaz",
    category: "Énergie",
    site: "Usine",
    dataQuality: "measured",
    accountingClass: "scope",
    ...patch,
  };
}

const base = {
  companyName: "Banque Atlas",
  country: "Tunisie",
  sector: "Banque",
  sites: ["Tunis"],
  year: 2025,
  periodLabel: "Exercice 2025",
  methodology: "GHG Protocol",
  methodologyVersion: "1.0",
  consolidation: "Contrôle opérationnel",
  electricityAccounting: "Location-based",
  employees: "40",
  revenue: null,
  revenueUnit: "TND",
  production: null,
  productionUnit: "unité",
  priorYear: null,
  priorTotalKgCo2e: null,
};

describe("inventaire publié", () => {
  it("reprend le résultat du ledger sans le remplacer", () => {
    const data = reportDataFromRun({
      ...base,
      lines: [line(), line({ lineKey: "bio", accountingClass: "biogenic_co2", resultKgCo2e: "5", scope: 1 })],
    });
    const analysis = analyze(data, DEFAULT_ANALYSIS_OPTIONS);
    assert.equal(analysis.totalKgCo2e, "20");
    assert.equal(data.biogenic.status, "reported");
    assert.equal(data.biogenic.kgCo2e, "5");
    assert.equal(data.lines[0]?.label, "Gaz");
    assert.equal(data.boundary[0]?.status, "not_reported");
  });

  it("plie l'allocation dans la quantité et refuse un résultat divergent", () => {
    const folded = reportDataFromRun({
      ...base,
      lines: [line({ activityQuantity: "10", allocationFactor: "0.5", factorValue: "2", resultKgCo2e: "10" })],
    });
    assert.equal(folded.lines[0]?.quantity, "5");
    assert.equal(analyze(folded, DEFAULT_ANALYSIS_OPTIONS).totalKgCo2e, "10");
    const broken = reportDataFromRun({
      ...base,
      lines: [line({ resultKgCo2e: "99" })],
    });
    assert.throws(() => analyze(broken, DEFAULT_ANALYSIS_OPTIONS), /gas/);
  });

  it("laisse un dénominateur absent vide", () => {
    const data = reportDataFromRun({ ...base, employees: null, lines: [line()] });
    assert.equal(data.denominators[0]?.value, null);
    assert.equal(analyze(data, DEFAULT_ANALYSIS_OPTIONS).intensities[0]?.status, "not_available");
  });
});
