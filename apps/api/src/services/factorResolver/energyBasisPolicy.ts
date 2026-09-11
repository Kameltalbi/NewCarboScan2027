import type { EnergyBasis, FactorCandidate, ResolveFactorInput } from "./types.js";

export type EnergyEval = {
  compatible: boolean;
  reasonCode: string;
  warning?: string;
};

export function evaluateEnergyBasis(
  input: Pick<ResolveFactorInput, "energyBasis">,
  candidate: Pick<FactorCandidate, "energyBasis">,
): EnergyEval {
  const requested = input.energyBasis;
  const factor = normalize(candidate.energyBasis);

  if (requested) {
    if (!factor) {
      return {
        compatible: false,
        reasonCode: "ENERGY_BASIS_FACTOR_UNKNOWN",
        warning: "Factor energy_basis is NULL; cannot satisfy explicit Gross/Net request",
      };
    }
    if (factor === requested) {
      return { compatible: true, reasonCode: "ENERGY_BASIS_EXACT" };
    }
    return { compatible: false, reasonCode: "ENERGY_BASIS_MISMATCH" };
  }

  if (!factor) {
    return {
      compatible: true,
      reasonCode: "ENERGY_BASIS_UNKNOWN",
      warning: "Factor energy_basis unavailable",
    };
  }
  return { compatible: true, reasonCode: "ENERGY_BASIS_PRESENT" };
}

export function detectEnergyBasisAmbiguity(
  candidates: Array<Pick<FactorCandidate, "energyBasis">>,
): boolean {
  const set = new Set(candidates.map((c) => normalize(c.energyBasis)).filter(Boolean));
  return set.has("gross_cv") && set.has("net_cv");
}

function normalize(raw: string | null | undefined): EnergyBasis | null {
  if (!raw) return null;
  if (raw === "gross_cv" || raw === "net_cv") return raw;
  return null;
}
