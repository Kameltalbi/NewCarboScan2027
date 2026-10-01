/**
 * Affichage des bases de facteurs du bilan (ABC-06).
 * Une ligne n'apparaît que si le registre a fourni une source_key.
 * Agribalyse n'est pas ajoutée ici. PCAF reste hors de cette liste.
 */

export interface FactorSourceVersion {
  sourceKey: string | null;
  name: string;
  license: string | null;
  publisher: string | null;
  homepage: string | null;
  versionLabel: string | null;
  datasetVersion: string | null;
  publishedYear: number | null;
  validFrom: string | null;
  gwpSet: string | null;
  status: string | null;
  catalogStatus: string | null;
  calculationStatus: string | null;
  resolverStatus: string | null;
  notes: string | null;
  factorCount: number;
  calculableCount: number;
}

export type SourceUsage = "calculable" | "imported" | "hidden";

const EXCLUDED_FROM_CORPORATE_BILAN = new Set(["pcaf"]);

export function listCorporateFactorSources(rows: FactorSourceVersion[]): FactorSourceVersion[] {
  return rows.filter((row): row is FactorSourceVersion & { sourceKey: string } => {
    if (!row.sourceKey) return false;
    return !EXCLUDED_FROM_CORPORATE_BILAN.has(row.sourceKey);
  });
}

export function sourceUsage(row: FactorSourceVersion): SourceUsage {
  if (row.calculableCount > 0 && row.calculationStatus === "enabled") return "calculable";
  if ((row.factorCount ?? 0) > 0 || row.catalogStatus === "visible") return "imported";
  return "hidden";
}

export function sourceUsageLabel(usage: SourceUsage): string {
  if (usage === "calculable") return "Utilisable au calcul";
  if (usage === "imported") return "Importé, hors calcul";
  return "Hors catalogue";
}

export interface PublicSourceCard {
  name: string;
  subtitle?: string;
}

export interface PublicSourceGroup {
  status: "available" | "imported" | "soon" | "upcoming" | "study";
  items: PublicSourceCard[];
}

/** Page publique : EPA et IPCC sont importés. Agribalyse n'est pas listée. */
export function publicFactorSourceGroups(
  localFactorsLabel: string,
  iniesLabel = "Données environnementales construction",
): PublicSourceGroup[] {
  return [
    {
      status: "available",
      items: [
        { name: "ADEME", subtitle: "Base Carbone" },
        { name: "UK Government", subtitle: "GHG Conversion Factors" },
        { name: "CarboScan", subtitle: localFactorsLabel },
      ],
    },
    {
      status: "imported",
      items: [
        { name: "EPA", subtitle: "US GHG Emission Factors Hub" },
        { name: "IPCC", subtitle: "EFDB" },
      ],
    },
    {
      status: "soon",
      items: [
        { name: "INIES", subtitle: iniesLabel },
        { name: "PEP ecopassport" },
      ],
    },
    {
      status: "upcoming",
      items: [{ name: "HBEFA" }, { name: "Worldsteel" }, { name: "Plastics Europe" }],
    },
    {
      status: "study",
      items: [{ name: "ecoinvent" }],
    },
  ];
}
