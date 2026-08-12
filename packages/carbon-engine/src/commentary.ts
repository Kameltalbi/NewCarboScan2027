import type { CalculationResult } from "./calculateCarbonBalance.js";

/**
 * Commentaire de rapport SANS inventer de chiffres.
 * Les versions moteur/méthode restent dans structured_content (pas dans la prose)
 * pour éviter les faux positifs du contrôle assertFacts.
 */
export function buildFactualReportCommentary(result: CalculationResult): {
  resultats: string;
  methode: string;
  limites: string;
} {
  return {
    resultats: `Empreinte calculée : total ${result.totals.total} kgCO₂e — Scope 1 ${result.totals.scope1}, Scope 2 ${result.totals.scope2}, Scope 3 ${result.totals.scope3}.`,
    methode:
      "Calcul déterministe activité × facteur × allocation. Aucune valeur quantitative n'est générée par IA.",
    limites:
      "Seules les incertitudes présentes dans le ledger ou les preuves liées sont reportées. Aucune trajectoire climatique, retour sur investissement ou fourchette de réduction n'est affirmée sans ligne de calcul sourcée. Résultat non vérifié par un tiers sauf mention contraire.",
  };
}

/** Patterns explicitement interdits dans les textes réglementaires. */
const FORBIDDEN_CLAIM_PATTERNS: RegExp[] = [
  /30\s*[-–—]\s*50\s*%/i,
  /-\s*40\s*%/i,
  /1[,.]5\s*°\s*C/i,
  /ROI\s*(inférieur|<)\s*à?\s*24/i,
  /±\s*15\s*%/,
  /\+\/-\s*15\s*%/,
];

export function assertNoInventedClimateClaims(text: string): {
  ok: boolean;
  matches: string[];
} {
  const matches: string[] = [];
  for (const re of FORBIDDEN_CLAIM_PATTERNS) {
    const m = text.match(re);
    if (m) matches.push(m[0]);
  }
  return { ok: matches.length === 0, matches };
}
