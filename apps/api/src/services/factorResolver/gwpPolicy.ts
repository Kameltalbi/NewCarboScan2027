import type { FactorCandidate, GwpBasis, ResolveFactorInput } from "./types.js";

export type GwpEval = {
  compatible: boolean;
  reasonCode: string;
  warning?: string;
  softBlock?: boolean;
};

/**
 * GWP policy V1.
 * Without request: AR4/5/6 OK; mixed/unknown/NULL → warnings.
 * With explicit request: exact OK; known different → incompatible;
 * mixed/unknown/NULL cannot auto-resolve as exact (softBlock).
 */
export function evaluateGwp(
  input: Pick<ResolveFactorInput, "gwpBasis">,
  candidate: Pick<FactorCandidate, "gwpBasis">,
): GwpEval {
  const requested = input.gwpBasis;
  const factor = normalize(candidate.gwpBasis);

  if (requested) {
    if (factor === requested) {
      return { compatible: true, reasonCode: "GWP_EXACT" };
    }
    if (factor === "AR4" || factor === "AR5" || factor === "AR6") {
      return { compatible: false, reasonCode: "GWP_MISMATCH" };
    }
    // mixed / unknown / NULL cannot demonstrate compatibility
    return {
      compatible: false,
      softBlock: true,
      reasonCode: "GWP_UNPROVABLE",
      warning: `Requested GWP ${requested} but factor gwp_basis is ${factor ?? "NULL"}`,
    };
  }

  if (!factor) {
    return {
      compatible: true,
      reasonCode: "GWP_NULL",
      warning: "Factor gwp_basis NULL (treated as unknown semantics)",
    };
  }
  if (factor === "unknown") {
    return {
      compatible: true,
      reasonCode: "GWP_UNKNOWN",
      warning: "Factor gwp_basis is unknown",
    };
  }
  if (factor === "mixed") {
    return {
      compatible: true,
      reasonCode: "GWP_MIXED",
      warning: "Factor gwp_basis is mixed",
    };
  }
  return { compatible: true, reasonCode: `GWP_${factor}` };
}

function normalize(raw: string | null | undefined): GwpBasis | null {
  if (!raw) return null;
  if (raw === "AR4" || raw === "AR5" || raw === "AR6" || raw === "mixed" || raw === "unknown") {
    return raw;
  }
  return null;
}
