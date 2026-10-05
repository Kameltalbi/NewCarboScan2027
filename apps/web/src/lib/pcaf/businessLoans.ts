/**
 * PCAF Part A — Financed Emissions, Third Edition (December 2025)
 * §5.2 Business loans and unlisted equity
 * Table 5.2-1 and Annex Table 10.1-2
 *
 * Other asset classes are refused. No attribution ratio is invented.
 */

export type PcafOptionCode = "1a" | "1b" | "2a" | "2b" | "3a" | "3b" | "3c";
export type PcafDataQuality = 1 | 2 | 3 | 4 | 5;
export type BorrowerListing = "listed" | "unlisted";
export type LoanInstrument = "business_loan" | "unlisted_equity";

export interface FactorRef {
  /** Tonnes CO2e per `perUnit`. */
  tco2ePerUnit: number;
  perUnit: string;
  source: string;
  year: number;
  geography?: string | null;
  /** Required when the activity unit is monetary. Must match the exposure currency. */
  currency?: string | null;
}

export interface QuantityActivity {
  quantity: number;
  unit: string;
  factor: FactorRef;
  /**
   * Process emissions in tCO2e. Option 2a is eligible only when this is a
   * number (0 if there are none). PCAF Annex Table 10.1-2 note: process
   * emissions must be added before attribution.
   */
  processEmissionsTco2e?: number | null;
}

export interface ReportedInventory {
  verified: boolean;
  emissionsTco2e: number;
  source?: string | null;
  year?: number | null;
}

export interface ScopeInputs {
  reported?: ReportedInventory | null;
  energy?: QuantityActivity | null;
  production?: QuantityActivity | null;
}

export interface SectorIntensity {
  scope12?: FactorRef | null;
  scope3?: FactorRef | null;
}

export interface AssetTurnover {
  ratio: number;
  source: string;
  year: number;
  geography?: string | null;
}

export interface BusinessLoanInput {
  assetClass?: string | null;
  instrument?: LoanInstrument | null;
  listing: BorrowerListing;
  outstandingAmount?: number | null;
  currency: string;
  reportingYear?: number | null;
  totalEquity?: number | null;
  totalDebt?: number | null;
  evic?: number | null;
  /** Note 77: total assets, used only when equity or debt cannot be obtained. */
  totalBalanceSheet?: number | null;
  /** Unlisted equity: shares held / shares outstanding. */
  equityShare?: number | null;
  sector?: string | null;
  revenue?: number | null;
  revenueCurrency?: string | null;
  scope12?: ScopeInputs | null;
  scope3?: ScopeInputs | null;
  sectorEmissionsPerRevenue?: SectorIntensity | null;
  sectorEmissionsPerAsset?: SectorIntensity | null;
  sectorAssetTurnover?: AssetTurnover | null;
}

export interface CalcStep {
  label: string;
  value: string;
}

export interface ScopeCalculation {
  scope: "scope12" | "scope3";
  status: "calculated" | "not_calculable";
  optionCode: PcafOptionCode | null;
  score: PcafDataQuality | null;
  optionLabel: string | null;
  why: string;
  reference: string | null;
  equation: string | null;
  attributionFactor: number | null;
  denominator: number | null;
  denominatorLabel: string | null;
  borrowerEmissionsTco2e: number | null;
  financedEmissionsTco2e: number | null;
  steps: CalcStep[];
  traces: string[];
  improvements: string[];
}

export interface BusinessLoanResult {
  status: "calculated" | "partial" | "not_calculable" | "not_implemented";
  assetClass: string;
  instrument: LoanInstrument | null;
  listing: BorrowerListing | null;
  currency: string;
  reportingYear: number | null;
  outstandingAmount: number | null;
  scope12: ScopeCalculation;
  scope3: ScopeCalculation;
  /** Sum of both scopes only when each one was calculated. */
  complementaryTotalTco2e: number | null;
  notes: string[];
}

const IMPLEMENTED_CLASS = "business_loans";

const OPTION_META: Record<
  PcafOptionCode,
  { score: PcafDataQuality; label: string; reference: string; equation: string }
> = {
  "1a": {
    score: 1,
    label: "Option 1a — émissions vérifiées",
    reference:
      "PCAF (2025) Part A §5.2, Table 5.2-1 et Annexe Table 10.1-2, option 1a.",
    equation:
      "Financed emissions = (Outstanding / dénominateur) × émissions vérifiées",
  },
  "1b": {
    score: 2,
    label: "Option 1b — émissions déclarées non vérifiées",
    reference:
      "PCAF (2025) Part A §5.2, Table 5.2-1 et Annexe Table 10.1-2, option 1b.",
    equation:
      "Financed emissions = (Outstanding / dénominateur) × émissions non vérifiées",
  },
  "2a": {
    score: 2,
    label: "Option 2a — estimation par consommation d'énergie",
    reference:
      "PCAF (2025) Part A §5.2, Table 5.2-1 et Annexe Table 10.1-2, option 2a. Le score 2a ne s'applique pas au scope 3 (note 208).",
    equation:
      "Financed emissions = (Outstanding / dénominateur) × (énergie × facteur + émissions de procédé)",
  },
  "2b": {
    score: 3,
    label: "Option 2b — estimation par production physique",
    reference:
      "PCAF (2025) Part A §5.2, Table 5.2-1 et Annexe Table 10.1-2, option 2b. Score 3.",
    equation:
      "Financed emissions = (Outstanding / dénominateur) × (production × facteur)",
  },
  "3a": {
    score: 4,
    label: "Option 3a — facteur économique par chiffre d'affaires",
    reference:
      "PCAF (2025) Part A §5.2, Table 5.2-1 et Annexe Table 10.1-2, option 3a. Score 4.",
    equation:
      "Financed emissions = (Outstanding / dénominateur) × chiffre d'affaires × (GES secteur / revenu secteur)",
  },
  "3b": {
    score: 5,
    label: "Option 3b — intensité sectorielle par actif",
    reference:
      "PCAF (2025) Part A §5.2, Table 5.2-1 et Annexe Table 10.1-2, option 3b. Score 5. Pas de division par equity + dette.",
    equation:
      "Financed emissions = Outstanding × (GES secteur / actifs secteur)",
  },
  "3c": {
    score: 5,
    label: "Option 3c — intensité sectorielle par revenu et rotation d'actifs",
    reference:
      "PCAF (2025) Part A §5.2, Table 5.2-1 et Annexe Table 10.1-2, option 3c. Score 5. Pas de division par equity + dette.",
    equation:
      "Financed emissions = Outstanding × rotation d'actifs secteur × (GES secteur / revenu secteur)",
  },
};

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function positive(value: number | null | undefined): value is number {
  return finite(value) && value > 0;
}

function nonNegative(value: number | null | undefined): value is number {
  return finite(value) && value >= 0;
}

function factorReady(factor: FactorRef | null | undefined, currency: string): factor is FactorRef {
  if (!factor) return false;
  if (!nonNegative(factor.tco2ePerUnit)) return false;
  if (!factor.source || !factor.perUnit || !positive(factor.year)) return false;
  if (factor.currency && factor.currency.toUpperCase() !== currency.toUpperCase()) return false;
  return true;
}

interface Denominator {
  value: number;
  label: string;
  traces: string[];
}

interface Exposure {
  outstanding: number;
  denominator: Denominator | null;
  traces: string[];
  blocked: string | null;
}

function resolveExposure(input: BusinessLoanInput): Exposure {
  const traces: string[] = [];
  const instrument = input.instrument ?? "business_loan";

  if (input.listing === "listed" && instrument === "unlisted_equity") {
    return {
      outstanding: 0,
      denominator: null,
      traces,
      blocked:
        "L'equity cotée relève de Listed equity and corporate bonds, classe non implémentée.",
    };
  }

  let equity = input.totalEquity;
  if (finite(equity) && equity < 0) {
    traces.push(
      "PCAF §5.2 : total equity négatif ramené à 0. Les émissions sont alors attribuées à la dette.",
    );
    equity = 0;
  }

  let outstanding = input.outstandingAmount ?? null;
  if (instrument === "unlisted_equity") {
    if (!positive(input.equityShare) || input.equityShare > 1 || !finite(equity)) {
      return {
        outstanding: 0,
        denominator: null,
        traces,
        blocked:
          "Equity non cotée : ajoutez la part de capital (actions détenues / actions totales) et le total equity du bilan.",
      };
    }
    const computed = input.equityShare * equity;
    if (positive(outstanding) && Math.abs(outstanding - computed) > 0.5) {
      traces.push(
        "Encours saisi ignoré : PCAF §5.2 définit l'encours d'equity non cotée comme part × total equity.",
      );
    }
    outstanding = computed;
    traces.push(
      "Encours equity non cotée = (actions détenues / actions totales) × total equity.",
    );
  }

  if (!positive(outstanding)) {
    return {
      outstanding: 0,
      denominator: null,
      traces,
      blocked: "Ajoutez l'encours du prêt (outstanding amount).",
    };
  }

  let denominator: Denominator | null = null;
  if (input.listing === "listed") {
    if (positive(input.evic)) {
      denominator = {
        value: input.evic,
        label: "EVIC (Enterprise Value Including Cash)",
        traces: [],
      };
    }
  } else if (finite(equity) && finite(input.totalDebt) && equity + input.totalDebt > 0) {
    denominator = {
      value: equity + input.totalDebt,
      label: "Total equity + debt",
      traces: [],
    };
  } else if (positive(input.totalBalanceSheet)) {
    denominator = {
      value: input.totalBalanceSheet,
      label: "Total du bilan (total assets)",
      traces: [
        "Note 77 PCAF 2025 : total equity ou total debt introuvable. Dénominateur de repli = total du bilan (equity + passif = total assets).",
      ],
    };
  }

  return { outstanding, denominator, traces, blocked: null };
}

function reportedReady(scope: ScopeInputs | null | undefined): ReportedInventory | null {
  const reported = scope?.reported;
  if (!reported || typeof reported.verified !== "boolean") return null;
  if (!nonNegative(reported.emissionsTco2e)) return null;
  return reported;
}

function energyReady(scope: ScopeInputs | null | undefined): QuantityActivity | null {
  const energy = scope?.energy;
  if (!energy || !positive(energy.quantity) || !energy.unit) return null;
  if (!nonNegative(energy.processEmissionsTco2e)) return null;
  return energy;
}

function productionReady(scope: ScopeInputs | null | undefined): QuantityActivity | null {
  const production = scope?.production;
  if (!production || !positive(production.quantity) || !production.unit) return null;
  return production;
}

function fmt(n: number, digits = 2): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n);
}

function emptyScope(scope: "scope12" | "scope3", why: string, improvements: string[]): ScopeCalculation {
  return {
    scope,
    status: "not_calculable",
    optionCode: null,
    score: null,
    optionLabel: null,
    why,
    reference: null,
    equation: null,
    attributionFactor: null,
    denominator: null,
    denominatorLabel: null,
    borrowerEmissionsTco2e: null,
    financedEmissionsTco2e: null,
    steps: [],
    traces: [],
    improvements,
  };
}

function withAttribution(
  option: PcafOptionCode,
  scope: "scope12" | "scope3",
  exposure: Exposure,
  borrowerEmissions: number,
  why: string,
  extraSteps: CalcStep[],
  traces: string[],
): ScopeCalculation {
  const meta = OPTION_META[option];
  const denom = exposure.denominator;
  if (!denom) {
    return emptyScope(scope, "Données insuffisantes pour calculer les émissions financées", [
      exposure.blocked ??
        "Ajoutez le dénominateur : total equity + debt (non cotée) ou EVIC (cotée).",
    ]);
  }
  const attribution = exposure.outstanding / denom.value;
  const financed = attribution * borrowerEmissions;
  return {
    scope,
    status: "calculated",
    optionCode: option,
    score: meta.score,
    optionLabel: meta.label,
    why,
    reference: meta.reference,
    equation: meta.equation,
    attributionFactor: attribution,
    denominator: denom.value,
    denominatorLabel: denom.label,
    borrowerEmissionsTco2e: borrowerEmissions,
    financedEmissionsTco2e: financed,
    steps: [
      { label: "Encours", value: `${fmt(exposure.outstanding, 0)}` },
      { label: denom.label, value: fmt(denom.value, 0) },
      {
        label: "Facteur d'attribution",
        value: `${fmt(attribution * 100, 4)} % = ${fmt(exposure.outstanding, 0)} / ${fmt(denom.value, 0)}`,
      },
      ...extraSteps,
      {
        label: "Émissions de l'emprunteur",
        value: `${fmt(borrowerEmissions, 3)} tCO₂e`,
      },
      {
        label: "Émissions financées",
        value: `${fmt(financed, 3)} tCO₂e = ${fmt(attribution * 100, 4)} % × ${fmt(borrowerEmissions, 3)} tCO₂e`,
      },
    ],
    traces: [...exposure.traces, ...denom.traces, ...traces],
  };
}

function resolveScope(
  scope: "scope12" | "scope3",
  input: BusinessLoanInput,
  exposure: Exposure,
): ScopeCalculation {
  if (exposure.blocked) {
    return emptyScope(scope, "Données insuffisantes pour calculer les émissions financées", [
      exposure.blocked,
    ]);
  }

  const bucket = scope === "scope12" ? input.scope12 : input.scope3;
  const currency = input.currency.toUpperCase();
  const reported = reportedReady(bucket);
  const improvements: string[] = [];

  if (reported?.verified === true && exposure.denominator) {
    return withAttribution(
      "1a",
      scope,
      exposure,
      reported.emissionsTco2e,
      "Les émissions vérifiées de l'emprunteur et le dénominateur financier PCAF sont disponibles.",
      [
        {
          label: "Source des émissions",
          value: reported.source || "Non précisée",
        },
      ],
      reported.year ? [`Année des émissions : ${reported.year}.`] : [],
    );
  }
  if (reported?.verified === true && !exposure.denominator) {
    improvements.push(
      input.listing === "listed"
        ? "Ajoutez l'EVIC pour utiliser les émissions vérifiées (option 1a)."
        : "Ajoutez total equity et total debt, ou le total du bilan, pour utiliser les émissions vérifiées (option 1a).",
    );
  }

  if (reported && reported.verified === false && exposure.denominator) {
    return withAttribution(
      "1b",
      scope,
      exposure,
      reported.emissionsTco2e,
      "Les émissions vérifiées ne sont pas disponibles. Les émissions déclarées par l'emprunteur, non vérifiées, sont utilisées.",
      [
        {
          label: "Source des émissions",
          value: reported.source || "Non précisée",
        },
      ],
      reported.year ? [`Année des émissions : ${reported.year}.`] : [],
    );
  }

  if (scope === "scope12") {
    const energy = energyReady(bucket);
    if (energy && factorReady(energy.factor, currency) && exposure.denominator) {
      const fromEnergy = energy.quantity * energy.factor.tco2ePerUnit;
      const process = energy.processEmissionsTco2e ?? 0;
      const borrower = fromEnergy + process;
      return withAttribution(
        "2a",
        scope,
        exposure,
        borrower,
        "Les émissions déclarées ne sont pas disponibles. Le calcul utilise la consommation d'énergie et un facteur d'émission.",
        [
          {
            label: "Consommation",
            value: `${fmt(energy.quantity, 3)} ${energy.unit}`,
          },
          {
            label: "Facteur d'émission",
            value: `${energy.factor.tco2ePerUnit} tCO₂e/${energy.factor.perUnit} — ${energy.factor.source}, ${energy.factor.year}${energy.factor.geography ? `, ${energy.factor.geography}` : ""}`,
          },
          {
            label: "Émissions liées à l'énergie",
            value: `${fmt(fromEnergy, 3)} tCO₂e`,
          },
          {
            label: "Émissions de procédé",
            value: `${fmt(process, 3)} tCO₂e`,
          },
        ],
        [],
      );
    }
    if (bucket?.energy && !nonNegative(bucket.energy.processEmissionsTco2e)) {
      improvements.push(
        "Option 2a : indiquez les émissions de procédé (0 s'il n'y en a pas). PCAF exige de les ajouter avant l'attribution.",
      );
    }
  } else if (bucket?.energy) {
    improvements.push(
      "L'option 2a (énergie) ne s'applique pas au scope 3 (PCAF 2025, note 208).",
    );
  }

  const production = productionReady(bucket);
  if (production && factorReady(production.factor, currency) && exposure.denominator) {
    const borrower = production.quantity * production.factor.tco2ePerUnit;
    return withAttribution(
      "2b",
      scope,
      exposure,
      borrower,
      "Les émissions déclarées et les données énergétiques ne sont pas disponibles. Le calcul utilise les données de production physique disponibles.",
      [
        {
          label: "Production",
          value: `${fmt(production.quantity, 3)} ${production.unit}`,
        },
        {
          label: "Facteur d'émission",
          value: `${production.factor.tco2ePerUnit} tCO₂e/${production.factor.perUnit} — ${production.factor.source}, ${production.factor.year}${production.factor.geography ? `, ${production.factor.geography}` : ""}`,
        },
      ],
      input.sector ? [`Secteur : ${input.sector}.`] : [],
    );
  }

  const revenueCurrency = (input.revenueCurrency || input.currency).toUpperCase();
  const revenueFactor =
    scope === "scope12"
      ? input.sectorEmissionsPerRevenue?.scope12
      : input.sectorEmissionsPerRevenue?.scope3;
  if (
    positive(input.revenue) &&
    revenueCurrency === currency &&
    factorReady(revenueFactor, currency) &&
    exposure.denominator
  ) {
    const borrower = input.revenue * revenueFactor.tco2ePerUnit;
    return withAttribution(
      "3a",
      scope,
      exposure,
      borrower,
      "Ni inventaire, ni données d'énergie, ni production physique ne sont disponibles. Le calcul utilise le chiffre d'affaires et un facteur sectoriel par revenu.",
      [
        {
          label: "Chiffre d'affaires",
          value: `${fmt(input.revenue, 0)} ${revenueCurrency}`,
        },
        {
          label: "Facteur sectoriel",
          value: `${revenueFactor.tco2ePerUnit} tCO₂e/${revenueFactor.perUnit} — ${revenueFactor.source}, ${revenueFactor.year}${revenueFactor.geography ? `, ${revenueFactor.geography}` : ""}${input.sector ? `, ${input.sector}` : ""}`,
        },
      ],
      [],
    );
  }
  if (positive(input.revenue) && revenueCurrency !== currency) {
    improvements.push(
      `Le chiffre d'affaires est en ${revenueCurrency} et l'encours en ${currency}. Aucune conversion n'est appliquée.`,
    );
  }

  const assetFactor =
    scope === "scope12"
      ? input.sectorEmissionsPerAsset?.scope12
      : input.sectorEmissionsPerAsset?.scope3;
  if (factorReady(assetFactor, currency)) {
    const meta = OPTION_META["3b"];
    const financed = exposure.outstanding * assetFactor.tco2ePerUnit;
    return {
      scope,
      status: "calculated",
      optionCode: "3b",
      score: meta.score,
      optionLabel: meta.label,
      why: "Les données plus spécifiques ne sont pas disponibles. Le calcul utilise l'encours et l'intensité sectorielle par actif, sans diviser par equity + dette.",
      reference: meta.reference,
      equation: meta.equation,
      attributionFactor: null,
      denominator: null,
      denominatorLabel: null,
      borrowerEmissionsTco2e: null,
      financedEmissionsTco2e: financed,
      steps: [
        { label: "Encours", value: `${fmt(exposure.outstanding, 0)} ${currency}` },
        {
          label: "Intensité sectorielle (GES / actifs)",
          value: `${assetFactor.tco2ePerUnit} tCO₂e/${assetFactor.perUnit} — ${assetFactor.source}, ${assetFactor.year}${assetFactor.geography ? `, ${assetFactor.geography}` : ""}${input.sector ? `, ${input.sector}` : ""}`,
        },
        {
          label: "Émissions financées",
          value: `${fmt(financed, 3)} tCO₂e = ${fmt(exposure.outstanding, 0)} × ${assetFactor.tco2ePerUnit}`,
        },
      ],
      traces: [
        ...exposure.traces,
        "Option 3b : le facteur d'attribution Outstanding / (equity + debt) n'est pas utilisé.",
      ],
      improvements: [],
    };
  }

  const turnover = input.sectorAssetTurnover;
  const revenueIntensity = revenueFactor;
  if (
    turnover &&
    positive(turnover.ratio) &&
    turnover.source &&
    positive(turnover.year) &&
    factorReady(revenueIntensity, currency)
  ) {
    const meta = OPTION_META["3c"];
    const financed = exposure.outstanding * turnover.ratio * revenueIntensity.tco2ePerUnit;
    return {
      scope,
      status: "calculated",
      optionCode: "3c",
      score: meta.score,
      optionLabel: meta.label,
      why: "Les données plus spécifiques, y compris l'intensité par actif, ne sont pas disponibles. Le calcul utilise l'encours, la rotation d'actifs sectorielle et l'intensité par revenu.",
      reference: meta.reference,
      equation: meta.equation,
      attributionFactor: null,
      denominator: null,
      denominatorLabel: null,
      borrowerEmissionsTco2e: null,
      financedEmissionsTco2e: financed,
      steps: [
        { label: "Encours", value: `${fmt(exposure.outstanding, 0)} ${currency}` },
        {
          label: "Rotation d'actifs sectorielle",
          value: `${turnover.ratio} — ${turnover.source}, ${turnover.year}${turnover.geography ? `, ${turnover.geography}` : ""}`,
        },
        {
          label: "Intensité sectorielle (GES / revenu)",
          value: `${revenueIntensity.tco2ePerUnit} tCO₂e/${revenueIntensity.perUnit} — ${revenueIntensity.source}, ${revenueIntensity.year}`,
        },
        {
          label: "Émissions financées",
          value: `${fmt(financed, 3)} tCO₂e = ${fmt(exposure.outstanding, 0)} × ${turnover.ratio} × ${revenueIntensity.tco2ePerUnit}`,
        },
      ],
      traces: [
        ...exposure.traces,
        "Option 3c : le facteur d'attribution Outstanding / (equity + debt) n'est pas utilisé.",
      ],
      improvements: [],
    };
  }

  if (!reported) {
    improvements.push(
      scope === "scope3"
        ? "Ajoutez les émissions scope 3 de l'emprunteur (vérifiées ou non)."
        : "Ajoutez les émissions scope 1 et 2 de l'emprunteur (vérifiées ou non).",
    );
  }
  if (scope === "scope12" && !energyReady(bucket)) {
    improvements.push("Ou ajoutez la consommation d'énergie, son facteur, et les émissions de procédé.");
  }
  if (!productionReady(bucket)) {
    improvements.push("Ou ajoutez une production physique et son facteur d'émission.");
  }
  if (!positive(input.revenue)) {
    improvements.push("Ou ajoutez le chiffre d'affaires et un facteur sectoriel par revenu.");
  }
  if (!factorReady(assetFactor, currency)) {
    improvements.push("Ou ajoutez une intensité sectorielle par actif (option 3b).");
  }

  return emptyScope(
    scope,
    "Données insuffisantes pour calculer les émissions financées",
    improvements,
  );
}

export function calculateBusinessLoan(input: BusinessLoanInput): BusinessLoanResult {
  const assetClass = input.assetClass || IMPLEMENTED_CLASS;

  if (assetClass !== IMPLEMENTED_CLASS) {
    const why = `Classe « ${assetClass} » non implémentée. Seuls Business loans and unlisted equity sont calculés.`;
    return {
      status: "not_implemented",
      assetClass,
      instrument: null,
      listing: null,
      currency: input.currency,
      reportingYear: input.reportingYear ?? null,
      outstandingAmount: null,
      scope12: emptyScope("scope12", why, ["Cette classe d'actifs viendra plus tard."]),
      scope3: emptyScope("scope3", why, ["Cette classe d'actifs viendra plus tard."]),
      complementaryTotalTco2e: null,
      notes: [why],
    };
  }

  const exposure = resolveExposure(input);
  const scope12 = resolveScope("scope12", input, exposure);
  const scope3 = resolveScope("scope3", input, exposure);
  const both =
    scope12.status === "calculated" &&
    scope3.status === "calculated" &&
    scope12.financedEmissionsTco2e != null &&
    scope3.financedEmissionsTco2e != null;

  let status: BusinessLoanResult["status"] = "not_calculable";
  if (scope12.status === "calculated" && scope3.status === "calculated") status = "calculated";
  else if (scope12.status === "calculated" || scope3.status === "calculated") status = "partial";

  return {
    status,
    assetClass: IMPLEMENTED_CLASS,
    instrument: input.instrument ?? "business_loan",
    listing: input.listing,
    currency: input.currency,
    reportingYear: input.reportingYear ?? null,
    outstandingAmount: exposure.blocked ? null : exposure.outstanding,
    scope12,
    scope3,
    complementaryTotalTco2e: both
      ? (scope12.financedEmissionsTco2e as number) + (scope3.financedEmissionsTco2e as number)
      : null,
    notes: exposure.traces,
  };
}

export function weightedDataQualityScore(
  rows: Array<{ outstanding: number | null; score: PcafDataQuality | null }>,
): number | null {
  let weighted = 0;
  let outstanding = 0;
  for (const row of rows) {
    if (!positive(row.outstanding) || row.score == null) continue;
    weighted += row.outstanding * row.score;
    outstanding += row.outstanding;
  }
  if (outstanding <= 0) return null;
  return weighted / outstanding;
}
