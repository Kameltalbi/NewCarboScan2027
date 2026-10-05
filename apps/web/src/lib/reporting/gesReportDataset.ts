/**
 * Jeu de reporting commun aux exports PDF, PowerPoint et Excel.
 * Les émissions opérationnelles viennent du bilan déjà calculé.
 * Les émissions financées viennent du moteur PCAF, jamais recalculées ici.
 */
import type { BusinessLoanResult } from "@/lib/pcaf/businessLoans.ts";
import {
  contributionFromBusinessLoan,
  isScope3Category15,
  stripCategory15,
  summarizeFinancedPortfolio,
  type BilanLike,
  type EmissionLineLike,
} from "@/lib/dashboard/institutionFootprint.ts";

export type ReportFormat = "pdf" | "pptx" | "xlsx";

export interface ReportActivityLine {
  category: string;
  subcategory: string;
  scope: 1 | 2 | 3;
  quantity: number | null;
  unit: string | null;
  factor: number | null;
  factorUnit: string | null;
  factorSource: string | null;
  emissionsT: number;
  dataQuality: string | null;
  method: string | null;
  siteId: string | null;
}

export interface ReportPost {
  name: string;
  scope: 1 | 2 | 3;
  emissionsT: number;
  sharePct: number;
}

export interface ReportHistoryPoint {
  year: number;
  operationalT: number;
}

export interface ReportAction {
  title: string;
  lever: string;
  status: string;
}

export interface PcafExposureRow {
  counterparty: string;
  assetClass: string;
  sector: string | null;
  exposure: number | null;
  currency: string | null;
  year: number | null;
  methodScope12: string | null;
  scoreScope12: number | null;
  methodScope3: string | null;
  scoreScope3: number | null;
  denominator: number | null;
  denominatorLabel: string | null;
  attributionFactor: number | null;
  borrowerScope12T: number | null;
  financedScope12T: number | null;
  borrowerScope3T: number | null;
  financedScope3T: number | null;
  dataSource: string | null;
  emissionFactor: string | null;
  status: string;
  missing: string;
  implemented: boolean;
}

export interface PcafSectorShare {
  sector: string;
  exposure: number;
  scope12T: number;
  scope3T: number;
  lines: number;
}

export interface FinancedReportBlock {
  exposure: number | null;
  currency: string | null;
  mixedCurrencies: boolean;
  scope12T: number;
  scope3T: number;
  scope12Score: number | null;
  scope3Score: number | null;
  implementedLines: number;
  scope12Lines: number;
  scope3Lines: number;
  notImplementedLines: number;
  notImplementedClasses: string[];
  exposures: PcafExposureRow[];
  sectors: PcafSectorShare[];
  missingData: string[];
  improvements: string[];
}

export interface GesReportDataset {
  organizationName: string;
  year: number;
  perimeterLabel: string;
  financialInstitution: boolean;
  includeFinancedEmissions: boolean;
  currency: string;
  sector: string | null;
  employees: number | null;
  revenue: number | null;
  /** Empreinte de l'organisation, hors Scope 3 catégorie 15. */
  operational: {
    /**
     * Faux pour une institution financière quand la catégorie 15
     * ne peut pas être isolée. Le total n'est alors pas un nombre.
     */
    determinable: boolean;
    /** Présent uniquement quand determinable est faux. */
    status: string | null;
    totalT: number | null;
    scope1T: number;
    scope2T: number;
    /** Null si le Scope 3 hors catégorie 15 ne peut pas être établi. */
    scope3T: number | null;
    category15Separated: boolean;
    excludedCategory15T: number | null;
    missingData: string[];
    posts: ReportPost[];
    lines: ReportActivityLine[];
    intensityPerEmployeeT: number | null;
    /** kgCO2e pour 1 000 unités de devise de chiffre d'affaires. */
    intensityKgPerThousandRevenue: number | null;
    quality: { realPct: number; estimatedPct: number; defaultPct: number };
  };
  history: ReportHistoryPoint[];
  actions: ReportAction[];
  /** Null quand l'option n'est pas demandée ou qu'il n'y a pas d'institution financière. */
  financed: FinancedReportBlock | null;
}

export interface FinancedSourceLine {
  name: string;
  sector: string | null;
  result: BusinessLoanResult;
}

export interface BuildGesReportInput {
  organizationName: string;
  year: number;
  perimeterLabel: string;
  financialInstitution: boolean;
  includeFinancedEmissions: boolean;
  currency?: string | null;
  sector?: string | null;
  employees?: number | null;
  revenue?: number | null;
  bilan: BilanLike;
  history?: ReportHistoryPoint[];
  actions?: ReportAction[];
  financedLines?: FinancedSourceLine[];
}

const EMPTY_SCOPE = {
  optionLabel: null as string | null,
  score: null as number | null,
  denominator: null as number | null,
  denominatorLabel: null as string | null,
  attributionFactor: null as number | null,
  borrowerEmissionsTco2e: null as number | null,
  financedEmissionsTco2e: null as number | null,
  traces: [] as string[],
  improvements: [] as string[],
  why: "",
  status: "not_calculable" as const,
};

export function roundT(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export const OPERATIONAL_TOTAL_UNDETERMINED =
  "Total opérationnel non déterminable — ventilation Scope 3 insuffisante";

/**
 * Une institution financière ne peut publier un total opérationnel
 * que si chaque ligne de Scope 3 est un poste identifiable,
 * y compris la catégorie 15 lorsqu'elle est présente.
 */
export function scope3VentilationSufficient(bilan: BilanLike): boolean {
  const lines = bilan.detailedBreakdown || [];
  const scope3Lines = lines.filter((line) => line.scope === 3 && (Number(line.emissions) || 0) > 0);
  if (lines.length === 0 || ((bilan.scope3 || 0) > 0 && scope3Lines.length === 0)) return false;
  return scope3Lines.every((line) => scope3LineIsIdentified(line));
}

function scope3LineIsIdentified(line: EmissionLineLike): boolean {
  if (isScope3Category15(line.category, line.subcategory)) return true;
  const category = (line.category || "").trim();
  const subcategory = (line.subcategory || "").trim();
  if (!category && !subcategory) return false;
  if (/^scope\s*3$/i.test(category) && (!subcategory || /^scope\s*3$/i.test(subcategory))) return false;
  return true;
}

export function gesReportFilename(
  organizationName: string,
  year: number,
  format: ReportFormat,
): string {
  const slug = organizationName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "Organisation";
  const kind =
    format === "pdf" ? "Rapport-GES" : format === "pptx" ? "Presentation-GES" : "Donnees-GES";
  return `CarboScan_${slug}_${year}_${kind}.${format}`;
}

export function buildGesReportDataset(input: BuildGesReportInput): GesReportDataset {
  const operationalView = stripCategory15(input.bilan);
  const determinable = !input.financialInstitution || scope3VentilationSufficient(input.bilan);
  const lines = toActivityLines(
    determinable
      ? operationalView.detailedBreakdown
      : (input.bilan.detailedBreakdown || []).filter((line) => line.scope !== 3),
  );
  const totalT = determinable ? roundT(operationalView.totalEmissions / 1000) : null;
  const scope1T = roundT((determinable ? operationalView.scope1 : input.bilan.scope1) / 1000);
  const scope2T = roundT((determinable ? operationalView.scope2 : input.bilan.scope2) / 1000);
  const scope3T = determinable ? roundT(operationalView.scope3 / 1000) : null;
  const posts = determinable
    ? operationalView.breakdown.slice(0, 12).map((row) => ({
        name: row.category,
        scope: scopeOfPost(row.category, lines),
        emissionsT: roundT(row.emissions / 1000),
        sharePct: roundT(row.percentage),
      }))
    : [];
  const missingData = determinable
    ? []
    : ["Ventilation Scope 3 insuffisante pour isoler la catégorie 15 du total opérationnel"];

  const financed =
    input.financialInstitution && input.includeFinancedEmissions
      ? buildFinanced(input.financedLines ?? [], input.year)
      : null;

  const revenue = input.revenue ?? null;
  const employees = input.employees ?? null;

  return {
    organizationName: input.organizationName,
    year: input.year,
    perimeterLabel: input.perimeterLabel,
    financialInstitution: input.financialInstitution,
    includeFinancedEmissions: Boolean(financed),
    currency: input.currency || "EUR",
    sector: input.sector ?? null,
    employees,
    revenue,
    operational: {
      determinable,
      status: determinable ? null : OPERATIONAL_TOTAL_UNDETERMINED,
      totalT,
      scope1T,
      scope2T,
      scope3T,
      category15Separated: determinable && operationalView.separated,
      excludedCategory15T: determinable ? roundT(operationalView.excludedCategory15Kg / 1000) : null,
      missingData,
      posts,
      lines,
      intensityPerEmployeeT:
        determinable && totalT != null && employees && employees > 0 ? roundT(totalT / employees) : null,
      intensityKgPerThousandRevenue:
        determinable && revenue && revenue > 0
          ? roundT((operationalView.totalEmissions / revenue) * 1000)
          : null,
      quality: qualityShares(lines),
    },
    history: (input.history ?? [])
      .filter((point) => Number.isFinite(point.operationalT))
      .map((point) => ({ year: point.year, operationalT: roundT(point.operationalT) }))
      .sort((a, b) => a.year - b.year),
    actions: input.actions ?? [],
    financed,
  };
}

function toActivityLines(lines: EmissionLineLike[]): ReportActivityLine[] {
  return lines
    .filter((line) => !isScope3Category15(line.category, line.subcategory))
    .map((line) => {
      const extra = line as EmissionLineLike & {
        quantity?: number;
        unit?: string;
        emissionFactor?: number;
        emissionFactorUnit?: string;
        dataMethod?: string | null;
      };
      return {
        category: line.category,
        subcategory: line.subcategory,
        scope: line.scope,
        quantity: numberOrNull(extra.quantity),
        unit: extra.unit ?? null,
        factor: numberOrNull(extra.emissionFactor),
        factorUnit: extra.emissionFactorUnit ?? null,
        factorSource: line.emissionFactorSource ?? null,
        emissionsT: roundT((Number(line.emissions) || 0) / 1000),
        dataQuality: line.dataQuality ?? null,
        method: extra.dataMethod ?? null,
        siteId: line.siteId ?? null,
      };
    });
}

function qualityShares(lines: ReportActivityLine[]): {
  realPct: number;
  estimatedPct: number;
  defaultPct: number;
} {
  const weights = { real: 0, estimated: 0, default: 0 };
  for (const line of lines) {
    const key = line.dataQuality === "real" || line.dataQuality === "estimated" || line.dataQuality === "default"
      ? line.dataQuality
      : "default";
    weights[key] += line.emissionsT;
  }
  const total = weights.real + weights.estimated + weights.default;
  if (total <= 0) return { realPct: 0, estimatedPct: 0, defaultPct: 0 };
  return {
    realPct: Math.round((weights.real / total) * 1000) / 10,
    estimatedPct: Math.round((weights.estimated / total) * 1000) / 10,
    defaultPct: Math.round((weights.default / total) * 1000) / 10,
  };
}

function scopeOfPost(name: string, lines: ReportActivityLine[]): 1 | 2 | 3 {
  const match = lines.find((line) => line.subcategory === name || line.category === name);
  return match?.scope ?? 3;
}

function buildFinanced(sources: FinancedSourceLine[], year: number): FinancedReportBlock {
  const exposures = sources.map(toExposureRow);
  const summary = summarizeFinancedPortfolio(
    sources.map((source) => contributionFromBusinessLoan(source.result)),
    year,
  );
  const sectors = new Map<string, PcafSectorShare>();
  for (const row of exposures) {
    if (!row.implemented) continue;
    const key = row.sector || "Secteur non renseigné";
    const current = sectors.get(key) ?? { sector: key, exposure: 0, scope12T: 0, scope3T: 0, lines: 0 };
    current.exposure += row.exposure ?? 0;
    current.scope12T += row.financedScope12T ?? 0;
    current.scope3T += row.financedScope3T ?? 0;
    current.lines += 1;
    sectors.set(key, current);
  }
  const missingData = unique(
    exposures
      .filter((row) => row.implemented && row.missing)
      .map((row) => `${row.counterparty} — ${row.missing}`),
  );
  const improvements = unique(
    sources.flatMap((source) => [
      ...(source.result.scope12.improvements ?? []),
      ...(source.result.scope3.improvements ?? []),
    ]),
  ).slice(0, 8);

  return {
    exposure: summary.exposure,
    currency: summary.currency,
    mixedCurrencies: summary.mixedCurrencies,
    scope12T: roundT(summary.scope12Tco2e),
    scope3T: roundT(summary.scope3Tco2e),
    scope12Score: summary.scope12Score == null ? null : roundT(summary.scope12Score),
    scope3Score: summary.scope3Score == null ? null : roundT(summary.scope3Score),
    implementedLines: summary.implementedLines,
    scope12Lines: summary.scope12Lines,
    scope3Lines: summary.scope3Lines,
    notImplementedLines: summary.notImplementedLines,
    notImplementedClasses: summary.notImplementedClasses,
    exposures,
    sectors: [...sectors.values()]
      .map((row) => ({
        ...row,
        exposure: roundT(row.exposure),
        scope12T: roundT(row.scope12T),
        scope3T: roundT(row.scope3T),
      }))
      .sort((a, b) => b.scope12T + b.scope3T - (a.scope12T + a.scope3T)),
    missingData,
    improvements,
  };
}

function toExposureRow(source: FinancedSourceLine): PcafExposureRow {
  const result = source.result;
  const implemented = result.status !== "not_implemented";
  const scope12 = result.scope12 ?? EMPTY_SCOPE;
  const scope3 = result.scope3 ?? EMPTY_SCOPE;
  const calculated12 = scope12.status === "calculated";
  const calculated3 = scope3.status === "calculated";
  const missing = unique(
    [
      ...(calculated12 ? [] : [scope12.why]),
      ...(calculated3 ? [] : [scope3.why]),
      ...result.notes,
    ].filter(Boolean),
  ).join(" · ");
  return {
    counterparty: source.name,
    assetClass: result.assetClass,
    sector: source.sector,
    exposure: implemented ? result.outstandingAmount : null,
    currency: result.currency || null,
    year: result.reportingYear,
    methodScope12: calculated12 ? scope12.optionLabel : null,
    scoreScope12: calculated12 ? scope12.score : null,
    methodScope3: calculated3 ? scope3.optionLabel : null,
    scoreScope3: calculated3 ? scope3.score : null,
    denominator: calculated12 ? scope12.denominator : calculated3 ? scope3.denominator : null,
    denominatorLabel: calculated12 ? scope12.denominatorLabel : calculated3 ? scope3.denominatorLabel : null,
    attributionFactor: calculated12 ? scope12.attributionFactor : calculated3 ? scope3.attributionFactor : null,
    borrowerScope12T: calculated12 ? scope12.borrowerEmissionsTco2e : null,
    financedScope12T: calculated12 ? scope12.financedEmissionsTco2e : null,
    borrowerScope3T: calculated3 ? scope3.borrowerEmissionsTco2e : null,
    financedScope3T: calculated3 ? scope3.financedEmissionsTco2e : null,
    dataSource: firstTrace(scope12.traces) || firstTrace(scope3.traces),
    emissionFactor: factorTrace(scope12.traces) || factorTrace(scope3.traces),
    status: result.status,
    missing,
    implemented,
  };
}

function firstTrace(traces: string[]): string | null {
  return traces.find((line) => line.trim().length > 0) ?? null;
}

function factorTrace(traces: string[]): string | null {
  return traces.find((line) => /facteur/i.test(line)) ?? null;
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
