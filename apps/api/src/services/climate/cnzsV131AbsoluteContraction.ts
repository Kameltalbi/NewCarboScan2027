/**
 * SBTi Corporate Net-Zero Standard v1.3.1 — Absolute Contraction Approach (Near-Term, 1.5 °C)
 *
 * Sources officielles :
 * - SBTi Corporate Net-Zero Standard V1.3.1 (14 April 2026)
 * - SBTi CNZS V1.3.1 Method Appendix v1.0 (April 2026)
 *   https://files.sciencebasedtargets.org/production/files/CNZS-V1.3.1-Method-Appendix.pdf
 *
 * STATUT DE LA PONDÉRATION COMBINED SCOPE 1+2
 * -------------------------------------------
 * Les paramètres Scope 1 / Scope 2 (NZA, NZY, LARR_min) sont officiels (Table 2).
 * Les équations génériques 1–8 sont officielles.
 * La pondération des dLARR S1 et S2 par part d'émissions :
 *   dLARR_blend = w1 × dLARR_S1 + w2 × dLARR_S2
 * est une **méthode reconstruite / inférée** : elle n'est pas citée mot pour mot dans
 * le texte récupéré de l'annexe (Step 1 Combined S1+2 « additional substeps »),
 * mais elle reproduit Table 1 (BY 2025 : 100:0 → 4,2 % ; 50:50 → ~5,13 % ; 0:100 → ~6,67 %).
 * Ne pas la présenter comme une citation officielle SBTi.
 *
 * Une trajectoire calculée ici n'est PAS une validation SBTi.
 */

export const CNZS_V131_META = {
  framework: "sbti",
  frameworkName: "Science Based Targets initiative (SBTi)",
  standard: "Corporate Net-Zero Standard",
  versionLabel: "v1.3.1",
  methodKey: "aca_near_term_1_5c_cnzs_v1_3_1",
  methodology: "Absolute Contraction Approach",
  targetType: "Near-Term",
  ambition: "1.5C",
  sourceUrl: "https://sciencebasedtargets.org/corporate-net-zero-v1",
  sourceDocument:
    "SBTi Corporate Net-Zero Standard V1.3.1 Method Appendix v1.0 (April 2026)",
  sourceDocumentUrl:
    "https://files.sciencebasedtargets.org/production/files/CNZS-V1.3.1-Method-Appendix.pdf",
  weightingStatus: "inferred_from_table1_and_table2" as const,
  weightingNote:
    "Pondération S1/S2 par part d'émissions : méthode reconstruite pour reproduire Table 1 ; non citée explicitement dans le texte récupéré de l'annexe.",
} as const;

/** Table 2 — paramètres officiels CNZS v1.3.1 Method Appendix */
export const CNZS_V131_SCOPE_PARAMS = {
  scope1: {
    nza: 0.9, // 90 %
    nzy: 2050,
    larrMin: 0.042, // 4.2 %
  },
  scope2: {
    nza: 1.0, // 100 %
    nzy: 2040,
    larrMin: 0.042, // 4.2 %
  },
} as const;

export interface CnzsV131Input {
  baselineYear: number;
  targetYear: number;
  /** Most recent year for FLA / dynamic steps. Defaults to baselineYear when equal. */
  mostRecentYear?: number;
  scope1EmissionsT: number;
  scope2EmissionsT: number;
  /** Optional company net-zero year if earlier than pathway NZ years */
  companyNetZeroYear?: number | null;
}

export interface CnzsV131AnnualPoint {
  year: number;
  emissionsT: number;
}

export interface CnzsV131Result {
  framework: typeof CNZS_V131_META.framework;
  versionLabel: typeof CNZS_V131_META.versionLabel;
  methodKey: typeof CNZS_V131_META.methodKey;
  methodology: typeof CNZS_V131_META.methodology;
  ambition: typeof CNZS_V131_META.ambition;
  targetType: typeof CNZS_V131_META.targetType;
  baselineYear: number;
  targetYear: number;
  mostRecentYear: number;
  scope1EmissionsT: number;
  scope2EmissionsT: number;
  baselineEmissionsT: number;
  scope1Share: number;
  scope2Share: number;
  /** Initial scope rates before blend / floor (fraction per year) */
  scope1InitialDlarr: number;
  scope2InitialDlarr: number;
  /** Blended rate before floor */
  blendedDlarrBeforeFloor: number;
  /** Final dLARR BY→TY after max(LARR_min, …) — fraction per year */
  dlarr: number;
  /** Same as dlarr, in percent per year */
  dlarrPercent: number;
  /** Adjusted target ambition BY→TY (fraction) */
  reductionFraction: number;
  reductionPercent: number;
  targetEmissionsT: number;
  annualPoints: CnzsV131AnnualPoint[];
  parameters: Record<string, unknown>;
  weightingStatus: typeof CNZS_V131_META.weightingStatus;
  assumptions: string[];
}

function assertFinitePositive(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} invalide : ${value}`);
  }
}

/**
 * Eq. 1 (par scope) : dLARR_mry→ty = NZA / (NZY − MRY)
 * NZY peut être raccourci si l'entreprise a une NZ plus tôt.
 */
export function initialScopeDlarr(
  nza: number,
  pathwayNzy: number,
  mostRecentYear: number,
  companyNetZeroYear?: number | null,
): number {
  const nzy =
    companyNetZeroYear != null && companyNetZeroYear < pathwayNzy
      ? companyNetZeroYear
      : pathwayNzy;
  const years = nzy - mostRecentYear;
  if (years <= 0) {
    throw new Error(`Horizon net-zero invalide (NZY=${nzy}, MRY=${mostRecentYear})`);
  }
  return nza / years;
}

/**
 * Pondération Combined S1+2 (INFÉRÉE) :
 * dLARR_blend = (E1/(E1+E2)) × dLARR1 + (E2/(E1+E2)) × dLARR2
 */
export function blendScopeDlarr(
  scope1EmissionsT: number,
  scope2EmissionsT: number,
  scope1Dlarr: number,
  scope2Dlarr: number,
): { scope1Share: number; scope2Share: number; blended: number } {
  const total = scope1EmissionsT + scope2EmissionsT;
  if (!(total > 0)) {
    throw new Error("Les émissions Scope 1 + Scope 2 doivent être > 0");
  }
  const scope1Share = scope1EmissionsT / total;
  const scope2Share = scope2EmissionsT / total;
  return {
    scope1Share,
    scope2Share,
    blended: scope1Share * scope1Dlarr + scope2Share * scope2Dlarr,
  };
}

/**
 * Eq. 8 : E(y) = E_BY − [E_BY × dLARR × (y − BY)]
 * = E_BY × (1 − dLARR × (y − BY))
 */
export function emissionsAtYear(
  baselineEmissionsT: number,
  baselineYear: number,
  year: number,
  dlarr: number,
): number {
  return baselineEmissionsT * (1 - dlarr * (year - baselineYear));
}

/**
 * Calcule la trajectoire Near-Term Combined Scope 1+2 ACA CNZS v1.3.1.
 *
 * Cas nominal (BY = MRY) :
 * 1. dLARR_S1, dLARR_S2 (Eq. 1 par scope)
 * 2. blend pondéré (inféré)
 * 3. TA_i = dLARR × (TY − MRY)  (Eq. 2)
 * 4. TE_i = E × (1 − TA_i)      (Eq. 3)
 * 5. TA_c = (E_BY − TE_i) / E_BY  (Eq. 4) — égal à TA_i si BY=MRY
 * 6. dLARR_BY→TY = max(LARR_min, TA_c / (TY − BY))  (Eq. 5)
 * 7. TA_adj = dLARR_BY→TY × (TY − BY)  (Eq. 6)
 * 8. Points annuels via Eq. 8
 */
export function computeCnzsV131CombinedScope12AbsoluteContraction(
  input: CnzsV131Input,
): CnzsV131Result {
  const {
    baselineYear,
    targetYear,
    scope1EmissionsT,
    scope2EmissionsT,
    companyNetZeroYear = null,
  } = input;
  const mostRecentYear = input.mostRecentYear ?? baselineYear;

  assertFinitePositive("scope1EmissionsT", scope1EmissionsT);
  assertFinitePositive("scope2EmissionsT", scope2EmissionsT);
  if (!Number.isInteger(baselineYear) || !Number.isInteger(targetYear)) {
    throw new Error("Les années doivent être entières");
  }
  if (targetYear <= baselineYear) {
    throw new Error("L'année cible doit être postérieure à l'année de référence");
  }
  if (mostRecentYear < baselineYear) {
    throw new Error("mostRecentYear ne peut pas être antérieur à baselineYear");
  }

  const baselineEmissionsT = scope1EmissionsT + scope2EmissionsT;
  const p1 = CNZS_V131_SCOPE_PARAMS.scope1;
  const p2 = CNZS_V131_SCOPE_PARAMS.scope2;

  const scope1InitialDlarr = initialScopeDlarr(
    p1.nza,
    p1.nzy,
    mostRecentYear,
    companyNetZeroYear,
  );
  const scope2InitialDlarr = initialScopeDlarr(
    p2.nza,
    p2.nzy,
    mostRecentYear,
    companyNetZeroYear,
  );

  const { scope1Share, scope2Share, blended } = blendScopeDlarr(
    scope1EmissionsT,
    scope2EmissionsT,
    scope1InitialDlarr,
    scope2InitialDlarr,
  );

  // Eq. 2–4 with BY = MRY (Atlas / cas nominal) — FLA non appliqué ici
  // Si MRY > BY, on applique le même enchaînement en partant de E_mry = E_by
  // (pas d'inventaire MRY distinct fourni) : limitation documentée.
  const yearsMryToTy = targetYear - mostRecentYear;
  if (yearsMryToTy <= 0) {
    throw new Error("L'année cible doit être postérieure à l'année la plus récente");
  }

  const taInitial = blended * yearsMryToTy;
  const teInitial = baselineEmissionsT * (1 - taInitial);
  const taConverted = (baselineEmissionsT - teInitial) / baselineEmissionsT;

  const yearsByToTy = targetYear - baselineYear;
  const larrMin = Math.max(p1.larrMin, p2.larrMin); // Combined S1+2 floor 4.2 %
  const dlarr = Math.max(larrMin, taConverted / yearsByToTy);

  const reductionFraction = dlarr * yearsByToTy;
  const targetEmissionsT = emissionsAtYear(
    baselineEmissionsT,
    baselineYear,
    targetYear,
    dlarr,
  );

  const annualPoints: CnzsV131AnnualPoint[] = [];
  for (let y = baselineYear; y <= targetYear; y++) {
    annualPoints.push({
      year: y,
      emissionsT: emissionsAtYear(baselineEmissionsT, baselineYear, y, dlarr),
    });
  }

  return {
    framework: CNZS_V131_META.framework,
    versionLabel: CNZS_V131_META.versionLabel,
    methodKey: CNZS_V131_META.methodKey,
    methodology: CNZS_V131_META.methodology,
    ambition: CNZS_V131_META.ambition,
    targetType: CNZS_V131_META.targetType,
    baselineYear,
    targetYear,
    mostRecentYear,
    scope1EmissionsT,
    scope2EmissionsT,
    baselineEmissionsT,
    scope1Share,
    scope2Share,
    scope1InitialDlarr,
    scope2InitialDlarr,
    blendedDlarrBeforeFloor: blended,
    dlarr,
    dlarrPercent: dlarr * 100,
    reductionFraction,
    reductionPercent: reductionFraction * 100,
    targetEmissionsT,
    annualPoints,
    parameters: {
      ...CNZS_V131_META,
      scopeParams: CNZS_V131_SCOPE_PARAMS,
      companyNetZeroYear,
      formula: "E(y) = E_BY - [E_BY × dLARR × (y - BY)]",
      equations: ["Eq.1 per scope", "blend inferred", "Eq.2-6", "Eq.8"],
    },
    weightingStatus: CNZS_V131_META.weightingStatus,
    assumptions: [
      CNZS_V131_META.weightingNote,
      "Near-Term Absolute Contraction Approach, ambition 1.5 °C.",
      "Plancher Combined Scope 1+2 : LARR_min = 4,2 %/an.",
      "Scope 2 : ambition net-zero 100 % d'ici 2040 (hypothèse pathway).",
      "Scope 1 : ambition net-zero 90 % d'ici 2050.",
      "Calcul CarboScan = trajectoire de référence, pas une validation SBTi.",
      mostRecentYear !== baselineYear
        ? "MRY ≠ BY : inventaire MRY distinct non fourni ; E_mry approximé par E_by (limitation)."
        : "BY = MRY : pas d'ajustement FLA distinct.",
    ],
  };
}

/** Helper pour tests Table 1 : dLARR % arrondi à 2 décimales (ex. 5.13). */
export function table1DlarrPercent(
  scope1Share: number,
  baselineYear: number,
  targetYear = baselineYear + 5,
): number {
  const total = 1000;
  const s1 = total * scope1Share;
  const s2 = total * (1 - scope1Share);
  const r = computeCnzsV131CombinedScope12AbsoluteContraction({
    baselineYear,
    targetYear,
    scope1EmissionsT: s1,
    scope2EmissionsT: s2,
  });
  return Math.round(r.dlarrPercent * 100) / 100;
}
