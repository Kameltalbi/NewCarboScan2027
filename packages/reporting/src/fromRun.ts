import { d } from "@newcarboscan/carbon-engine";
import { exact } from "./format.js";
import {
  SCHEMA_VERSION,
  type ActivityLine,
  type DataQuality,
  type LineMethod,
  type ReportData,
  type Scope,
} from "./types.js";

export interface LedgerLineInput {
  lineKey: string;
  scope: number | null;
  activityQuantity: string;
  activityUnit: string;
  factorValue: string;
  factorUnit: string;
  allocationFactor: string;
  resultKgCo2e: string;
  uncertaintyPct: string | null;
  factorId: string | null;
  factorVersion: string | null;
  factorSource: string | null;
  label: string | null;
  category: string | null;
  site: string | null;
  dataQuality: string | null;
  accountingClass: "scope" | "biogenic_co2";
}

export interface RunReportContext {
  companyName: string;
  country: string;
  sector: string;
  sites: string[];
  year: number;
  periodLabel: string;
  methodology: string;
  methodologyVersion: string;
  consolidation: string;
  electricityAccounting: string;
  employees: string | null;
  revenue: string | null;
  revenueUnit: string;
  production: string | null;
  productionUnit: string;
  priorYear: number | null;
  priorTotalKgCo2e: string | null;
  lines: LedgerLineInput[];
}

/** Traduit un run publié en ReportData. Le résultat reste celui du ledger. */
export function reportDataFromRun(input: RunReportContext): ReportData {
  const biogenic = input.lines.filter((line) => line.accountingClass === "biogenic_co2");
  const operational = input.lines.filter((line) => line.accountingClass !== "biogenic_co2" && isScope(line.scope));
  const biogenicKg = biogenic.reduce((sum, line) => sum.plus(d(line.resultKgCo2e)), d(0));
  return {
    schemaVersion: SCHEMA_VERSION,
    company: {
      name: input.companyName,
      country: input.country || "Pays non renseigné",
      sector: input.sector,
      sites: input.sites,
    },
    inventory: {
      year: input.year,
      periodLabel: input.periodLabel,
      methodology: input.methodology,
      methodologyVersion: input.methodologyVersion,
      consolidation: input.consolidation,
      electricityAccounting: input.electricityAccounting,
    },
    lines: operational.map(toActivityLine),
    boundary: [
      {
        id: "investments",
        label: "Investissements",
        status: "not_reported",
        reason:
          "Catégorie 15 du GHG Protocol. Ne pas être une institution financière ne suffit pas à la déclarer non applicable. Aucune participation n'est lue dans cet inventaire : la catégorie reste non évaluée.",
      },
    ],
    denominators: [
      {
        id: "employees",
        label: "Effectif",
        proseLabel: "par personne",
        value: blankToNull(input.employees),
        unit: "personnes",
        numerator: "0.001",
        displayUnit: "tCO₂e par personne",
        displayScale: 3,
      },
      {
        id: "revenue",
        label: "Chiffre d'affaires",
        proseLabel: `pour 1 000 ${input.revenueUnit}`,
        value: blankToNull(input.revenue),
        unit: input.revenueUnit,
        numerator: "1000",
        displayUnit: `kgCO₂e pour 1 000 ${input.revenueUnit}`,
        displayScale: 3,
      },
      {
        id: "production",
        label: "Production",
        proseLabel: `par ${input.productionUnit}`,
        value: blankToNull(input.production),
        unit: input.productionUnit,
        numerator: "1",
        displayUnit: `kgCO₂e par ${input.productionUnit}`,
        displayScale: 3,
      },
    ],
    comparison:
      input.priorYear != null && input.priorTotalKgCo2e != null
        ? {
            status: "available",
            priorYear: input.priorYear,
            priorTotalKgCo2e: input.priorTotalKgCo2e,
            categories: "not_available",
            basis: "La comparaison porte sur le total publié de l'exercice précédent. Le détail par poste n'est pas repris.",
          }
        : {
            status: "not_available",
            priorYear: input.priorYear,
            priorTotalKgCo2e: null,
            categories: "not_available",
            basis: null,
          },
    assumptions: [
      "Les résultats sont ceux du ledger publié. Ce rapport ne les recalcule pas.",
      "L'électricité est présentée en location-based. Aucun instrument market-based n'est fourni avec cet inventaire.",
      "Une catégorie absente n'est pas convertie en émission nulle.",
      "Les investissements ne sont pas classés non applicables au seul motif que l'entreprise n'est pas une institution financière.",
    ],
    actions: [],
    biogenic: biogenic.length
      ? { status: "reported", kgCo2e: exact(biogenicKg) }
      : { status: "not_reported", kgCo2e: null },
  };
}

function toActivityLine(line: LedgerLineInput): ActivityLine {
  const quantity = exact(d(line.activityQuantity).mul(d(line.allocationFactor || "1")));
  const result = exact(d(line.resultKgCo2e));
  const method = methodOf(line, quantity, result);
  return {
    id: slug(line.lineKey),
    factId: line.lineKey,
    label: line.label?.trim() || line.lineKey,
    scope: line.scope as Scope,
    category: line.category?.trim() || "Non classé",
    site: line.site,
    inclusion: "included",
    quantity,
    quantityUnit: line.activityUnit,
    factorValue: exact(d(line.factorValue)),
    factorUnit: line.factorUnit,
    factorSource: line.factorSource?.trim() || "Ledger",
    factorVersion: line.factorVersion?.trim() || "non versionné",
    factorId: line.factorId?.trim() || line.lineKey,
    resultKgCo2e: result,
    dataQuality: qualityOf(line.dataQuality),
    uncertaintyPct: line.uncertaintyPct,
    method,
  };
}

function methodOf(line: LedgerLineInput, quantity: string, result: string): LineMethod {
  if (d(quantity).isZero() && d(result).isZero()) return "measured_zero";
  const unit = line.activityUnit.toUpperCase();
  if (["TND", "EUR", "USD", "MAD", "DZD"].includes(unit)) return "proxy_monetary";
  if (line.dataQuality === "estimated" || line.dataQuality === "sector_proxy") return "extrapolated";
  return "invoice";
}

function qualityOf(value: string | null): DataQuality {
  if (value === "estimated" || value === "extrapolated") return "estimated";
  if (value === "default" || value === "sector_proxy" || value === "missing") return "default";
  if (value === "measured" || value === "calculated" || value === "primary") return "primary";
  return "default";
}

function isScope(scope: number | null): scope is Scope {
  return scope === 1 || scope === 2 || scope === 3;
}

function blankToNull(value: string | null): string | null {
  if (value == null || value.trim() === "") return null;
  return value;
}

function slug(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "ligne";
}
