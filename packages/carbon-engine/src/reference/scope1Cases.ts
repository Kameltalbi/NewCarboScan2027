/**
 * Cas de référence Scope 1 — facteurs figés, non opposables.
 * Ces nombres sont ceux du calculateur écran au 29 septembre 2026.
 * Ils ne sont pas une validation ABC ni un extrait du catalogue vivant.
 * Écart autorisé : 0. Unités déjà commensurables.
 */

export type ReferenceAuditStatus = "non-opposable";

export interface ReferenceCase {
  id: string;
  auditStatus: ReferenceAuditStatus;
  validatedBy: readonly ["engineering"];
  manual: string;
  activity: { value: string; unit: string };
  factor: { value: string; unit: string; versionId: string };
  methodologyVersion: "ghg-corporate-1.0.0";
  expectedKgCO2e: string;
  tolerance: "0";
  screen:
    | {
        kind: "default_factor";
        subcategory: string;
        activityType: "energy";
      }
    | {
        kind: "process_factor";
        processName: string;
        ghg: "CO2";
        activityQuantity: string;
        activityUnit: string;
        factorValue: string;
        factorScale: "kg" | "t";
        factorSource: string;
      }
    | {
        kind: "process_direct";
        processName: string;
        ghg: "CO2";
        directValue: string;
        directScale: "kg" | "t";
      };
}

export const SCOPE1_REFERENCE_CASES: readonly ReferenceCase[] = [
  {
    id: "003-combustion-fixe-gaz",
    auditStatus: "non-opposable",
    validatedBy: ["engineering"],
    manual: "1 000 m³ × 2,04 kgCO2e/m³ = 2 040 kgCO2e",
    activity: { value: "1000", unit: "m³" },
    factor: {
      value: "2.04",
      unit: "kgCO2e/m³",
      versionId: "screen-default-fossil-gas-2026-09-29",
    },
    methodologyVersion: "ghg-corporate-1.0.0",
    expectedKgCO2e: "2040",
    tolerance: "0",
    screen: {
      kind: "default_factor",
      subcategory: "fossil_gas",
      activityType: "energy",
    },
  },
  {
    id: "004-carburant-mobile-diesel",
    auditStatus: "non-opposable",
    validatedBy: ["engineering"],
    manual: "500 L × 2,68 kgCO2e/L = 1 340 kgCO2e",
    activity: { value: "500", unit: "L" },
    factor: {
      value: "2.68",
      unit: "kgCO2e/L",
      versionId: "screen-default-fuel-diesel-2026-09-29",
    },
    methodologyVersion: "ghg-corporate-1.0.0",
    expectedKgCO2e: "1340",
    tolerance: "0",
    screen: {
      kind: "default_factor",
      subcategory: "fuel_diesel",
      activityType: "energy",
    },
  },
  {
    id: "005-biomasse-bois-kg",
    auditStatus: "non-opposable",
    validatedBy: ["engineering"],
    manual: "2 500 kg × 0,04 kgCO2e/kg = 100 kgCO2e",
    activity: { value: "2500", unit: "kg" },
    factor: {
      value: "0.04",
      unit: "kgCO2e/kg",
      versionId: "screen-default-biomass-wood-2026-09-29",
    },
    methodologyVersion: "ghg-corporate-1.0.0",
    expectedKgCO2e: "100",
    tolerance: "0",
    screen: {
      kind: "default_factor",
      subcategory: "biomass_wood",
      activityType: "energy",
    },
  },
  {
    id: "006-frigorigene-r410a",
    auditStatus: "non-opposable",
    validatedBy: ["engineering"],
    manual: "3 kg × 2 088 kgCO2e/kg = 6 264 kgCO2e",
    activity: { value: "3", unit: "kg" },
    factor: {
      value: "2088",
      unit: "kgCO2e/kg",
      versionId: "screen-default-fugitive-r410a-2026-09-29",
    },
    methodologyVersion: "ghg-corporate-1.0.0",
    expectedKgCO2e: "6264",
    tolerance: "0",
    screen: {
      kind: "default_factor",
      subcategory: "fugitive_r410a",
      activityType: "energy",
    },
  },
  {
    id: "007-procede-activite-facteur",
    auditStatus: "non-opposable",
    validatedBy: ["engineering"],
    manual: "10 t × 2,5 kgCO2e/t = 25 kgCO2e",
    activity: { value: "10", unit: "t" },
    factor: {
      value: "2.5",
      unit: "kgCO2e/t",
      versionId: "screen-process-factor-kg-2026-09-29",
    },
    methodologyVersion: "ghg-corporate-1.0.0",
    expectedKgCO2e: "25",
    tolerance: "0",
    screen: {
      kind: "process_factor",
      processName: "Four de calcination",
      ghg: "CO2",
      activityQuantity: "10",
      activityUnit: "t",
      factorValue: "2.5",
      factorScale: "kg",
      factorSource: "Mesure site 2026",
    },
  },
  {
    id: "008-procede-emission-directe",
    auditStatus: "non-opposable",
    validatedBy: ["engineering"],
    manual: "1 500 kgCO2e × 1 = 1 500 kgCO2e",
    activity: { value: "1500", unit: "kgCO2e" },
    factor: {
      value: "1",
      unit: "kgCO2e/kgCO2e",
      versionId: "screen-process-direct-2026-09-29",
    },
    methodologyVersion: "ghg-corporate-1.0.0",
    expectedKgCO2e: "1500",
    tolerance: "0",
    screen: {
      kind: "process_direct",
      processName: "Mesure cheminée",
      ghg: "CO2",
      directValue: "1500",
      directScale: "kg",
    },
  },
  {
    id: "009-procede-facteur-en-tonnes",
    auditStatus: "non-opposable",
    validatedBy: ["engineering"],
    manual:
      "Conversion explicite : 1,5 tCO2e/t × 1 000 = 1 500 kgCO2e/t. Puis 10 t × 1 500 kgCO2e/t = 15 000 kgCO2e",
    activity: { value: "10", unit: "t" },
    factor: {
      value: "1500",
      unit: "kgCO2e/t",
      versionId: "screen-process-factor-t-2026-09-29",
    },
    methodologyVersion: "ghg-corporate-1.0.0",
    expectedKgCO2e: "15000",
    tolerance: "0",
    screen: {
      kind: "process_factor",
      processName: "Four de calcination",
      ghg: "CO2",
      activityQuantity: "10",
      activityUnit: "t",
      factorValue: "1.5",
      factorScale: "t",
      factorSource: "Mesure site 2026",
    },
  },
];
