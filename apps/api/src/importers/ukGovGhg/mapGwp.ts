import type { GwpBasis } from "./types.js";

/**
 * Factor-level GWP from methodology Table 1 (2026 paper).
 * Refrigerants: flat file cannot distinguish AR5 vs residual AR6 → unknown.
 */
export function mapGwpBasis(level1: string | null): {
  gwpBasis: GwpBasis;
  rule: string;
  review: boolean;
} {
  const l1 = level1 ?? "";
  if (l1 === "Bioenergy") {
    return { gwpBasis: "AR4", rule: "methodology_table1:Bioenergy→AR4", review: false };
  }
  if (l1 === "Material use") {
    return { gwpBasis: "AR4", rule: "methodology_table1:Material use→AR4", review: false };
  }
  if (l1 === "WTT- bioenergy") {
    return { gwpBasis: "AR4", rule: "methodology_footnote:WTT-bioenergy→AR4", review: false };
  }
  if (l1 === "Hotel stay") {
    return { gwpBasis: "mixed", rule: "methodology_table1:Hotel stay→mixed", review: false };
  }
  if (l1 === "Refrigerant & other") {
    return {
      gwpBasis: "unknown",
      rule: "methodology:refrigerants mostly AR5 else AR6 — not distinguishable per flat-file row",
      review: true,
    };
  }
  // Outside of scopes / remaining families on AR5 per Table 1
  if (
    l1.startsWith("WTT-") ||
    [
      "Fuels",
      "UK electricity",
      "UK electricity for EVs",
      "UK electricity T&D for EVs",
      "Transmission and distribution",
      "Heat and steam",
      "Passenger vehicles",
      "Delivery vehicles",
      "Freighting goods",
      "Business travel- land",
      "Business travel- sea",
      "Business travel- air",
      "Managed assets- electricity",
      "Managed assets- vehicles",
      "Waste disposal",
      "Water supply",
      "Water treatment",
      "Homeworking",
      "Outside of scopes",
    ].includes(l1)
  ) {
    return { gwpBasis: "AR5", rule: `methodology_table1:${l1}→AR5`, review: false };
  }
  return {
    gwpBasis: "unknown",
    rule: `unmapped_gwp_level1:${l1 || "(blank)"}`,
    review: true,
  };
}
