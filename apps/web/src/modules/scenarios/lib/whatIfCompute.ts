/**
 * Calcul What-If (projection) — ne modifie jamais activity_data ni le bilan réel.
 * Les réductions par poste sont plafonnées au residual du poste (pas de double comptage).
 */

export type WhatIfLeverKind =
  | "consumption_reduction"
  | "supplier_change"
  | "modal_shift"
  | "custom";

export interface WhatIfHypothesis {
  id: string;
  kind: WhatIfLeverKind;
  categoryKey: string;
  categoryLabel: string;
  /** Émissions du poste dans le bilan de référence (tCO₂e). */
  baselineCategoryTco2e: number;
  enabled: boolean;
  /** Réduction % pour kind=consumption_reduction (0–100). */
  reductionPercent?: number | null;
  /**
   * Émissions simulées du poste après changement (tCO₂e).
   * Obligatoire pour supplier_change / modal_shift / custom si pas de reductionTco2eHypothesis.
   */
  simulatedCategoryTco2e?: number | null;
  /** Réduction explicite (hypothèse utilisateur), tCO₂e. */
  reductionTco2eHypothesis?: number | null;
  hypothesisNote?: string | null;
  /** Financier — uniquement si renseigné explicitement. */
  unitPriceCurrent?: number | null;
  unitPriceSimulated?: number | null;
  quantity?: number | null;
  investment?: number | null;
  recurringCostDelta?: number | null;
}

export interface WhatIfLeverImpact {
  id: string;
  categoryKey: string;
  categoryLabel: string;
  kind: WhatIfLeverKind;
  reductionTco2e: number;
  isHypothesis: boolean;
  hypothesisNote: string | null;
  financialDelta: number | null;
}

export interface WhatIfFinancialImpact {
  costCurrent: number;
  costSimulated: number;
  /** Négatif = économie, positif = surcoût (hors investissement). */
  operatingDelta: number;
  investment: number;
  /** operatingDelta + investment */
  totalDelta: number;
}

export interface WhatIfImpact {
  referenceTco2e: number;
  simulatedTco2e: number;
  reductionTco2e: number;
  reductionPercent: number;
  levers: WhatIfLeverImpact[];
  financial: WhatIfFinancialImpact | null;
  financialIncomplete: boolean;
}

export const WHATIF_CALC_VERSION = "whatif-v1";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Réduction demandée par un levier avant plafonnement par poste. */
export function requestedReductionTco2e(h: WhatIfHypothesis): number {
  if (!h.enabled) return 0;
  const base = Math.max(0, num(h.baselineCategoryTco2e));

  if (h.kind === "consumption_reduction") {
    const pct = Math.min(100, Math.max(0, num(h.reductionPercent)));
    return (base * pct) / 100;
  }

  if (h.reductionTco2eHypothesis != null && Number.isFinite(Number(h.reductionTco2eHypothesis))) {
    return Math.max(0, Number(h.reductionTco2eHypothesis));
  }

  if (h.simulatedCategoryTco2e != null && Number.isFinite(Number(h.simulatedCategoryTco2e))) {
    return Math.max(0, base - Number(h.simulatedCategoryTco2e));
  }

  return 0;
}

export function isHypothesisComplete(h: WhatIfHypothesis): boolean {
  if (!h.enabled) return true;
  if (h.kind === "consumption_reduction") {
    return h.reductionPercent != null && Number.isFinite(Number(h.reductionPercent));
  }
  if (h.reductionTco2eHypothesis != null && Number.isFinite(Number(h.reductionTco2eHypothesis))) {
    return true;
  }
  if (h.simulatedCategoryTco2e != null && Number.isFinite(Number(h.simulatedCategoryTco2e))) {
    return true;
  }
  return false;
}

function leverFinancialDelta(h: WhatIfHypothesis): number | null {
  const hasPrices =
    h.unitPriceCurrent != null &&
    h.unitPriceSimulated != null &&
    h.quantity != null &&
    Number.isFinite(Number(h.unitPriceCurrent)) &&
    Number.isFinite(Number(h.unitPriceSimulated)) &&
    Number.isFinite(Number(h.quantity));
  if (!hasPrices && (h.recurringCostDelta == null || !Number.isFinite(Number(h.recurringCostDelta)))) {
    return null;
  }
  let delta = 0;
  if (hasPrices) {
    const current = Number(h.unitPriceCurrent) * Number(h.quantity);
    const simulated = Number(h.unitPriceSimulated) * Number(h.quantity);
    delta += simulated - current;
  }
  if (h.recurringCostDelta != null && Number.isFinite(Number(h.recurringCostDelta))) {
    delta += Number(h.recurringCostDelta);
  }
  return delta;
}

/**
 * Impact instantané combiné. Les leviers sont appliqués dans l'ordre ;
 * chaque poste ne peut pas être réduit au-delà de ses émissions résiduelles.
 */
export function computeWhatIfImpact(
  referenceTotalTco2e: number,
  hypotheses: WhatIfHypothesis[],
): WhatIfImpact {
  const reference = Math.max(0, num(referenceTotalTco2e));
  const residualByCategory = new Map<string, number>();
  for (const h of hypotheses) {
    if (!residualByCategory.has(h.categoryKey)) {
      residualByCategory.set(h.categoryKey, Math.max(0, num(h.baselineCategoryTco2e)));
    }
  }

  const leverImpacts: WhatIfLeverImpact[] = [];
  let totalReduction = 0;
  let financialIncomplete = false;
  let anyFinancial = false;
  let costCurrent = 0;
  let costSimulated = 0;
  let investment = 0;

  for (const h of hypotheses) {
    if (!h.enabled) continue;
    if (!isHypothesisComplete(h)) {
      financialIncomplete = financialIncomplete || true;
      continue;
    }

    const remaining = residualByCategory.get(h.categoryKey) ?? 0;
    const requested = requestedReductionTco2e(h);
    const applied = Math.min(requested, remaining);
    residualByCategory.set(h.categoryKey, Math.max(0, remaining - applied));
    totalReduction += applied;

    const isHypothesis = h.kind !== "consumption_reduction";
    const finDelta = leverFinancialDelta(h);
    if (finDelta == null) {
      if (
        h.unitPriceCurrent != null ||
        h.unitPriceSimulated != null ||
        h.quantity != null ||
        h.investment != null
      ) {
        financialIncomplete = true;
      }
    } else {
      anyFinancial = true;
      if (
        h.unitPriceCurrent != null &&
        h.unitPriceSimulated != null &&
        h.quantity != null
      ) {
        costCurrent += Number(h.unitPriceCurrent) * Number(h.quantity);
        costSimulated += Number(h.unitPriceSimulated) * Number(h.quantity);
      }
      if (h.recurringCostDelta != null) {
        costSimulated += Number(h.recurringCostDelta);
      }
    }
    if (h.investment != null && Number.isFinite(Number(h.investment))) {
      anyFinancial = true;
      investment += Number(h.investment);
    }

    leverImpacts.push({
      id: h.id,
      categoryKey: h.categoryKey,
      categoryLabel: h.categoryLabel,
      kind: h.kind,
      reductionTco2e: applied,
      isHypothesis,
      hypothesisNote: h.hypothesisNote ?? null,
      financialDelta: finDelta,
    });
  }

  const simulated = Math.max(0, reference - totalReduction);
  const reductionPercent = reference > 0 ? (totalReduction / reference) * 100 : 0;

  const financial: WhatIfFinancialImpact | null = anyFinancial
    ? {
        costCurrent,
        costSimulated,
        operatingDelta: costSimulated - costCurrent,
        investment,
        totalDelta: costSimulated - costCurrent + investment,
      }
    : null;

  return {
    referenceTco2e: reference,
    simulatedTco2e: simulated,
    reductionTco2e: totalReduction,
    reductionPercent,
    levers: leverImpacts,
    financial,
    financialIncomplete: financial == null ? true : financialIncomplete,
  };
}

export function hypothesesFromRawLegacy(raw: unknown): WhatIfHypothesis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const whatif = (o.whatif ?? o) as Record<string, unknown>;
  if (!whatif || typeof whatif !== "object") return null;
  if (!whatif.kind || !whatif.categoryKey) return null;
  return {
    id: String(whatif.id ?? ""),
    kind: whatif.kind as WhatIfLeverKind,
    categoryKey: String(whatif.categoryKey),
    categoryLabel: String(whatif.categoryLabel ?? whatif.categoryKey),
    baselineCategoryTco2e: num(whatif.baselineCategoryTco2e),
    enabled: whatif.enabled !== false,
    reductionPercent: whatif.reductionPercent == null ? null : num(whatif.reductionPercent),
    simulatedCategoryTco2e:
      whatif.simulatedCategoryTco2e == null ? null : num(whatif.simulatedCategoryTco2e),
    reductionTco2eHypothesis:
      whatif.reductionTco2eHypothesis == null ? null : num(whatif.reductionTco2eHypothesis),
    hypothesisNote: whatif.hypothesisNote == null ? null : String(whatif.hypothesisNote),
    unitPriceCurrent: whatif.unitPriceCurrent == null ? null : num(whatif.unitPriceCurrent),
    unitPriceSimulated: whatif.unitPriceSimulated == null ? null : num(whatif.unitPriceSimulated),
    quantity: whatif.quantity == null ? null : num(whatif.quantity),
    investment: whatif.investment == null ? null : num(whatif.investment),
    recurringCostDelta:
      whatif.recurringCostDelta == null ? null : num(whatif.recurringCostDelta),
  };
}

export function hypothesisToRawLegacy(h: WhatIfHypothesis): Record<string, unknown> {
  return {
    whatif: {
      ...h,
      calcVersion: WHATIF_CALC_VERSION,
    },
  };
}
