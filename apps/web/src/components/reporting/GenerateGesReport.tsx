import React, { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Loader2, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationData } from "@/hooks/useOrganizationData";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { useOrganizationSites } from "@/hooks/useOrganizationSites";
import { useOrganizationYears } from "@/hooks/useOrganizationYears";
import { api } from "@/integrations/api/client";
import { BilanCarboneCalculator, type BilanCarboneResult } from "@/lib/calculators/BilanCarboneCalculator";
import { type BilanLike } from "@/lib/dashboard/institutionFootprint";
import { scope3VentilationSufficient } from "@/lib/reporting/gesReportDataset";
import { assessCounterpartyRaw } from "@/lib/pcaf/methodology";
import {
  buildGesReportDataset,
  type ReportFormat,
  type ReportHistoryPoint,
} from "@/lib/reporting/gesReportDataset";
import { downloadGesReport, renderGesReport } from "@/lib/reporting/renderGesReport";

const FORMATS: Array<{ id: ReportFormat; title: string; subtitle: string; detail: string; icon: typeof FileText }> = [
  {
    id: "pdf",
    title: "PDF",
    subtitle: "Rapport GES complet",
    detail: "Document officiel détaillé",
    icon: FileText,
  },
  {
    id: "pptx",
    title: "PowerPoint",
    subtitle: "Présentation exécutive",
    detail: "Direction, CODIR, conseil ou client",
    icon: Presentation,
  },
  {
    id: "xlsx",
    title: "Excel",
    subtitle: "Données & analyses",
    detail: "Données détaillées, calculs et traçabilité",
    icon: FileSpreadsheet,
  },
];

export const GenerateGesReport: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { organization } = useOrganizationData();
  const years = useOrganizationYears(organizationId);
  const { sites } = useOrganizationSites(organizationId);
  const { toast } = useToast();
  const [year, setYear] = useState<number | null>(null);
  const [perimeter, setPerimeter] = useState("all");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [includeFinanced, setIncludeFinanced] = useState(false);
  const [busy, setBusy] = useState(false);

  const financialInstitution = Boolean(organization?.financed_emissions_enabled);

  useEffect(() => {
    if (!year && years.defaultYear) setYear(years.defaultYear);
  }, [year, years.defaultYear]);

  useEffect(() => {
    setIncludeFinanced(financialInstitution);
  }, [financialInstitution, organizationId]);

  const generate = async () => {
    if (!organizationId || !year) {
      toast({ title: "Choisissez un exercice", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const current = await BilanCarboneCalculator.calculate(organizationId, `${year}-01-01`, `${year}-12-31`);
      const site = sites.find((item) => item.id === perimeter);
      const bilan = applySite(current, perimeter === "all" ? null : perimeter);
      const history = await loadHistory(
        organizationId,
        year,
        years.allowedYears,
        perimeter === "all" ? null : perimeter,
        Boolean(organization?.financed_emissions_enabled),
      );
      const financedLines = financialInstitution && includeFinanced ? await loadFinancedLines() : [];
      const dataset = buildGesReportDataset({
        organizationName: organization?.name || "Organisation",
        year,
        perimeterLabel: site ? site.name : "Périmètre consolidé",
        financialInstitution,
        includeFinancedEmissions: financialInstitution && includeFinanced,
        currency: organization?.currency,
        sector: organization?.sector,
        employees: organization?.employees,
        revenue: organization?.annual_revenue,
        bilan,
        history,
        financedLines,
      });
      const file = await renderGesReport(dataset, format);
      downloadGesReport(file.bytes, file.filename, file.mime);
      toast({ title: "Rapport prêt", description: file.filename });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Échec de génération";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Générer un rapport</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Les trois formats lisent les mêmes résultats. L'empreinte de l'organisation et les émissions financées restent séparées.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {FORMATS.map((item) => {
          const Icon = item.icon;
          const selected = format === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFormat(item.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground">{item.title}</p>
              <p className="mt-1 font-medium">{item.subtitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Exercice</span>
          <Select value={year ? String(year) : ""} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Année" /></SelectTrigger>
            <SelectContent>
              {(years.allowedYears.length ? years.allowedYears : year ? [year] : []).map((item) => (
                <SelectItem key={item} value={String(item)}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Périmètre</span>
          <Select value={perimeter} onValueChange={setPerimeter}>
            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Périmètre consolidé</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button onClick={() => void generate()} disabled={busy || !year || !organizationId}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Générer
        </Button>
      </div>

      {financialInstitution && (
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={includeFinanced}
            onCheckedChange={(checked) => setIncludeFinanced(checked === true)}
          />
          <span>
            <span className="font-medium">Inclure les émissions financées — PCAF</span>
            <span className="block text-muted-foreground">
              Présentées à part de l'empreinte de l'institution. Activé lorsqu'un portefeuille est disponible.
            </span>
          </span>
        </label>
      )}
    </section>
  );
};

async function loadFinancedLines() {
  const { items } = await api.listSuppliers();
  return (items || []).flatMap((row) => {
    const result = assessCounterpartyRaw(row.raw_legacy);
    if (!result) return [];
    const sector = row.raw_legacy && typeof row.raw_legacy.sector === "string" ? row.raw_legacy.sector : null;
    return [{ name: String(row.name || "Contrepartie"), sector, result }];
  });
}

async function loadHistory(
  organizationId: string,
  year: number,
  allowedYears: number[],
  siteId: string | null,
  financialInstitution: boolean,
): Promise<ReportHistoryPoint[]> {
  const years = [...new Set(allowedYears.filter((item) => item <= year))].sort((a, b) => a - b).slice(-4);
  const points: ReportHistoryPoint[] = [];
  for (const item of years) {
    if (item === year) continue;
    try {
      const bilan = applySite(
        await BilanCarboneCalculator.calculate(organizationId, `${item}-01-01`, `${item}-12-31`),
        siteId,
      );
      if (financialInstitution && !scope3VentilationSufficient(bilan)) continue;
      const dataset = buildGesReportDataset({
        organizationName: "",
        year: item,
        perimeterLabel: "",
        financialInstitution,
        includeFinancedEmissions: false,
        currency: "EUR",
        bilan,
      });
      if (dataset.operational.totalT == null) continue;
      points.push({ year: item, operationalT: dataset.operational.totalT });
    } catch {
      // Un exercice sans bilan ne bloque pas l'export.
    }
  }
  return points;
}

function applySite(bilan: BilanCarboneResult, siteId: string | null): BilanLike {
  if (!siteId) return bilan;
  const lines = (bilan.detailedBreakdown || []).filter((line) => line.siteId === siteId);
  const scope1 = sum(lines, 1);
  const scope2 = sum(lines, 2);
  const scope3 = sum(lines, 3);
  return {
    totalEmissions: scope1 + scope2 + scope3,
    scope1,
    scope2,
    scope3,
    breakdown: [],
    detailedBreakdown: lines,
  };
}

function sum(lines: BilanCarboneResult["detailedBreakdown"], scope: 1 | 2 | 3) {
  return lines.filter((line) => line.scope === scope).reduce((total, line) => total + (Number(line.emissions) || 0), 0);
}
