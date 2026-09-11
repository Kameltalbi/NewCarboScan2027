import type { FactorCandidate, LifecycleBoundary, ResolveFactorInput } from "./types.js";

export type LifecycleEval = {
  compatible: boolean;
  reasonCode: string;
  warning?: string;
};

/** NULL lifecycle = unknown. Never treat NULL as direct. */
export function evaluateLifecycle(
  input: Pick<ResolveFactorInput, "lifecycleBoundary">,
  candidate: Pick<FactorCandidate, "lifecycleBoundary">,
): LifecycleEval {
  const requested = input.lifecycleBoundary;
  const factor = normalizeBoundary(candidate.lifecycleBoundary);

  if (requested) {
    if (!factor) {
      return {
        compatible: false,
        reasonCode: "LIFECYCLE_FACTOR_UNKNOWN",
        warning: "Factor lifecycle_boundary is NULL (unknown); cannot satisfy explicit request",
      };
    }
    if (factor === requested) {
      return { compatible: true, reasonCode: "LIFECYCLE_EXACT" };
    }
    return { compatible: false, reasonCode: "LIFECYCLE_MISMATCH" };
  }

  // No request: defer multi-boundary ambiguity to orchestration
  if (!factor) {
    return {
      compatible: true,
      reasonCode: "LIFECYCLE_UNKNOWN",
      warning: "Factor lifecycle_boundary unavailable (NULL ≠ direct)",
    };
  }
  return { compatible: true, reasonCode: "LIFECYCLE_PRESENT" };
}

export function detectLifecycleAmbiguity(
  candidates: Array<Pick<FactorCandidate, "lifecycleBoundary">>,
): boolean {
  const set = new Set(
    candidates.map((c) => normalizeBoundary(c.lifecycleBoundary) ?? "__NULL__"),
  );
  // Multiple distinct significant values (including NULL as its own bucket vs known)
  const known = [...set].filter((x) => x !== "__NULL__");
  if (known.length > 1) return true;
  if (known.length === 1 && set.has("__NULL__")) return true;
  return false;
}

function normalizeBoundary(raw: string | null | undefined): LifecycleBoundary | null {
  if (!raw) return null;
  return raw as LifecycleBoundary;
}
