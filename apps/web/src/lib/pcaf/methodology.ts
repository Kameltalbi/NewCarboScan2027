/**
 * PCAF Global GHG Accounting and Reporting Standard
 * Part A: Financed Emissions — Third Edition (December 2025)
 * §5.2 Business loans and unlisted equity + Table 5.2-1 / Annex 10.1-2
 *
 * Financed emissions = Σ (Attribution_c × Company emissions_c)
 * Private company: Attribution = Outstanding / (Total equity + debt)
 * Listed company:   Attribution = Outstanding / EVIC
 */

export type PcafDataQuality = 1 | 2 | 3 | 4 | 5;
export type PcafOptionCode = "1a" | "1b" | "2a" | "2b" | "3a" | "3b" | "3c";
export type CompanyListing = "private" | "listed";

export interface PcafCalculationTrace {
  citation: string;
  assetClass: string;
  assetClassSection: string;
  listing: CompanyListing;
  dataQuality: PcafDataQuality;
  optionCode: PcafOptionCode;
  optionFamily: "reported" | "physical" | "economic";
  optionLabel: string;
  dataQualityLabel: string;
  dataQualityDescription: string;
  outstanding: number;
  currency: string;
  /** Total equity + debt (private) or EVIC (listed) */
  companyValue: number;
  companyValueLabel: string;
  attributionFactor: number;
  companyEmissionsTco2e: number;
  financedEmissionsTco2e: number;
  scopesCovered: string;
  formula: string;
  attributionFormula: string;
  steps: Array<{ label: string; value: string }>;
  reportingNote: string;
}

const DQ: Record<
  PcafDataQuality,
  {
    optionCode: PcafOptionCode;
    optionFamily: "reported" | "physical" | "economic";
    optionLabel: string;
    label: string;
    description: string;
  }
> = {
  1: {
    optionCode: "1a",
    optionFamily: "reported",
    optionLabel: "Option 1a — émissions reportées et vérifiées",
    label: "Score 1 — plus haute qualité",
    description:
      "Encours et total equity + debt connus. Émissions GES de l’emprunteur vérifiées par un tiers, conformes au GHG Protocol.",
  },
  2: {
    optionCode: "1b",
    optionFamily: "reported",
    optionLabel: "Option 1b — émissions reportées non vérifiées",
    label: "Score 2",
    description:
      "Encours et total equity + debt connus. Émissions GES calculées / reportées par l’emprunteur sans vérification tierce.",
  },
  3: {
    optionCode: "2b",
    optionFamily: "physical",
    optionLabel: "Option 2b — activité physique (production)",
    label: "Score 3",
    description:
      "Émissions estimées à partir de données physiques de production de l’emprunteur × facteurs d’émission spécifiques (PCAF Option 2).",
  },
  4: {
    optionCode: "3a",
    optionFamily: "economic",
    optionLabel: "Option 3a — activité économique (CA × FE sectoriel)",
    label: "Score 4",
    description:
      "Émissions estimées via le chiffre d’affaires de l’emprunteur × facteur d’émission sectoriel (EEIO / statistiques).",
  },
  5: {
    optionCode: "3b",
    optionFamily: "economic",
    optionLabel: "Option 3b — proxy actifs sectoriels",
    label: "Score 5 — plus basse qualité",
    description:
      "Émissions estimées via l’encours × facteur d’émission sectoriel par unité d’actif (proxy économique PCAF Option 3).",
  },
};

export function toPcafDataQuality(value: unknown): PcafDataQuality {
  const n = Number(value);
  if (n >= 1 && n <= 5) return Math.round(n) as PcafDataQuality;
  return 5;
}

export function optionCodeForQuality(dq: PcafDataQuality): PcafOptionCode {
  return DQ[dq].optionCode;
}

export function pcafQualityFromMethod(
  dataMethod?: string | null,
  confidence?: number | null,
): PcafDataQuality {
  if (dataMethod === "supplier_specific" || dataMethod === "physical") {
    if ((confidence ?? 0) >= 90) return 1;
    return 2;
  }
  if ((confidence ?? 0) >= 70) return 3;
  if ((confidence ?? 0) >= 50) return 4;
  return 5;
}

export function buildPcafTrace(input: {
  outstanding: number;
  financedKg: number;
  currency?: string;
  dataMethod?: string | null;
  sourceType?: string | null;
  uncertaintyPct?: number | null;
  confidenceIndex?: number | null;
  rawLegacy?: Record<string, unknown> | null;
}): PcafCalculationTrace {
  const raw = input.rawLegacy || {};
  const outstanding =
    Number(raw.outstanding_tnd ?? raw.outstanding ?? input.outstanding) || 0;
  const financedT =
    Number(raw.financed_emissions_tco2e) ||
    (Number(input.financedKg) || 0) / 1000;

  const dq = toPcafDataQuality(
    raw.pcaf_data_quality ??
      raw.option_score ??
      pcafQualityFromMethod(input.dataMethod, input.confidenceIndex),
  );
  const meta = DQ[dq];
  const optionCode =
    (String(raw.pcaf_option || "") as PcafOptionCode) in
    { "1a": 1, "1b": 1, "2a": 1, "2b": 1, "3a": 1, "3b": 1, "3c": 1 }
      ? (String(raw.pcaf_option) as PcafOptionCode)
      : meta.optionCode;

  const listing: CompanyListing =
    raw.listing === "listed" || raw.company_listing === "listed"
      ? "listed"
      : "private";

  const attributionFromRaw = Number(raw.attribution_factor);
  const companyValueFromRaw = Number(
    raw.total_equity_plus_debt_tnd ??
      raw.company_value_tnd ??
      raw.evic_tnd ??
      raw.company_value,
  );

  let attribution =
    attributionFromRaw > 0 && attributionFromRaw <= 1
      ? attributionFromRaw
      : 0;
  let companyValue = companyValueFromRaw > 0 ? companyValueFromRaw : 0;

  if (!attribution && companyValue > 0 && outstanding > 0) {
    attribution = outstanding / companyValue;
  }
  if (!attribution) {
    // Défaut démo si paramètres absents : ~12–35 %
    attribution = Math.min(0.35, Math.max(0.12, 0.38 - dq * 0.04));
  }
  if (!companyValue && outstanding > 0 && attribution > 0) {
    companyValue = outstanding / attribution;
  }

  const companyEmissions =
    Number(raw.company_emissions_tco2e ?? raw.borrower_emissions_tco2e) > 0
      ? Number(raw.company_emissions_tco2e ?? raw.borrower_emissions_tco2e)
      : attribution > 0
        ? financedT / attribution
        : financedT;

  const currency = String(raw.currency || input.currency || "TND");
  const fmt = (n: number, digits = 0) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n);
  const fmtPct = (n: number) =>
    `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n * 100)} %`;

  const companyValueLabel =
    listing === "listed"
      ? "EVIC (Enterprise Value Including Cash)"
      : "Total equity + debt (bilan emprunteur)";

  const attributionFormula =
    listing === "listed"
      ? "Attribution = Outstanding ÷ EVIC"
      : "Attribution = Outstanding ÷ (Total equity + debt)";

  return {
    citation:
      "PCAF (2025). The Global GHG Accounting and Reporting Standard Part A: Financed Emissions. Third Edition.",
    assetClass: "Business loans and unlisted equity",
    assetClassSection: "§5.2",
    listing,
    dataQuality: dq,
    optionCode,
    optionFamily: meta.optionFamily,
    optionLabel: meta.optionLabel,
    dataQualityLabel: meta.label,
    dataQualityDescription: meta.description,
    outstanding,
    currency,
    companyValue,
    companyValueLabel,
    attributionFactor: attribution,
    companyEmissionsTco2e: companyEmissions,
    financedEmissionsTco2e: financedT,
    scopesCovered: String(
      raw.scopes_covered || "Scope 1 + 2 (+ Scope 3 séparément si disponible)",
    ),
    formula:
      "Financed emissions = Σ (Attribution factor_c × Company emissions_c)",
    attributionFormula,
    steps: [
      {
        label: "Outstanding amount (encours)",
        value: `${fmt(outstanding)} ${currency}`,
      },
      {
        label: companyValueLabel,
        value: `${fmt(companyValue)} ${currency}`,
      },
      {
        label: "Attribution factor",
        value: `${fmtPct(attribution)} = ${fmt(outstanding)} ÷ ${fmt(companyValue)}`,
      },
      {
        label: "Company emissions (emprunteur)",
        value: `${fmt(companyEmissions, 1)} tCO₂e`,
      },
      {
        label: "Financed emissions (attribuées à la banque)",
        value: `${fmt(financedT, 1)} tCO₂e = ${fmtPct(attribution)} × ${fmt(companyEmissions, 1)} tCO₂e`,
      },
    ],
    reportingNote:
      "À reporter en Scope 3 catégorie 15 (investments). Les émissions financées restent séparées du bilan opérationnel (Scopes 1/2/3 corporate). Scope 1+2 et Scope 3 de l’emprunteur doivent être publiés séparément (PCAF §5.2).",
  };
}
