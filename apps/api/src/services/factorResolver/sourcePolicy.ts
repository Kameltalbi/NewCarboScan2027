import type { FactorCandidate, ResolveFactorInput } from "./types.js";

/**
 * Contextual source preference — AFTER methodological compatibility.
 * Lower rank = better.
 */
export function sourcePreferenceRank(
  input: Pick<ResolveFactorInput, "country" | "preferredSource">,
  candidate: Pick<FactorCandidate, "sourceKey">,
): { rank: number; reasonCode: string } {
  const source = candidate.sourceKey;
  if (input.preferredSource && source === input.preferredSource) {
    return { rank: 0, reasonCode: "SOURCE_PREFERRED_EXPLICIT" };
  }

  const country = (input.country ?? "").trim().toUpperCase();
  const preferred =
    country === "TN" || country === "TUN"
      ? "internal"
      : country === "FR" || country === "FRA"
        ? "ademe"
        : country === "GB" || country === "UK"
          ? "uk_gov_ghg"
          : null;

  if (preferred && source === preferred) {
    return { rank: 5, reasonCode: "SOURCE_POLICY_GEO" };
  }
  if (preferred && source !== preferred) {
    return { rank: 20, reasonCode: "SOURCE_NON_PREFERRED" };
  }
  return { rank: 15, reasonCode: "SOURCE_NEUTRAL" };
}
