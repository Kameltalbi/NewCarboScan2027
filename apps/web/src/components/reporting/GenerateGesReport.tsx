import React, { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Presentation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
import { downloadGesReport, renderGesReport, reportObjectUrl } from "@/lib/reporting/renderGesReport";

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

interface ReportPreview {
  url: string;
  filename: string;
  mime: string;
  format: ReportFormat;
}

interface ReportProgress {
  percent: number;
  label: string;
  format: ReportFormat;
}

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
  const [progress, setProgress] = useState<ReportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const previewUrl = useRef<string | null>(null);

  const financialInstitution = Boolean(organization?.financed_emissions_enabled);

  useEffect(() => {
    if (!year && years.defaultYear) setYear(years.defaultYear);
  }, [year, years.defaultYear]);

  useEffect(() => {
    setIncludeFinanced(financialInstitution);
  }, [financialInstitution, organizationId]);

  useEffect(() => {
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  const openPreview = (next: ReportPreview) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next.url;
    setPreview(next);
  };

  const closePreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
  };

  const generate = async () => {
    if (!organizationId || !year) {
      setError("Choisissez un exercice.");
      toast({ title: "Choisissez un exercice", variant: "destructive" });
      return;
    }
    const selected = format;
    const advance = (percent: number, label: string) => {
      setProgress({ percent: Math.max(0, Math.min(100, Math.round(percent))), label, format: selected });
    };
    setBusy(true);
    setError(null);
    advance(2, "Préparation…");
    try {
      if (selected === "pdf") {
        const file = await api.downloadStandardReport(year, (event) => advance(event.percent, event.label));
        if (file.bytes.byteLength < 8) throw new Error("Le fichier généré est vide.");
        advance(100, "Rapport prêt");
        await pause(350);
        setProgress(null);
        const url = reportObjectUrl(file.bytes, file.mime);
        openPreview({ url, filename: file.filename, mime: file.mime, format: selected });
        toast({ title: "Rapport ouvert", description: file.filename });
        return;
      }
      advance(12, "Calcul du bilan…");
      const current = await BilanCarboneCalculator.calculate(organizationId, `${year}-01-01`, `${year}-12-31`);
      const site = sites.find((item) => item.id === perimeter);
      const bilan = applySite(current, perimeter === "all" ? null : perimeter);
      const siteId = perimeter === "all" ? null : perimeter;
      advance(40, "Lecture de l'historique…");
      const history = await loadHistory(
        organizationId,
        year,
        years.allowedYears,
        siteId,
        Boolean(organization?.financed_emissions_enabled),
        (done, total) => {
          advance(40 + (total === 0 ? 32 : (done / total) * 32), total === 0 ? "Lecture de l'historique…" : `Historique ${done} / ${total}`);
        },
      );
      const withFinanced = financialInstitution && includeFinanced;
      advance(76, withFinanced ? "Lecture des émissions financées…" : "Préparation de la mise en page…");
      const financedLines = withFinanced ? await loadFinancedLines() : [];
      const dataset = buildGesReportDataset({
        organizationName: organization?.name || "Organisation",
        year,
        perimeterLabel: site ? site.name : "Périmètre consolidé",
        financialInstitution,
        includeFinancedEmissions: withFinanced,
        currency: organization?.currency,
        sector: organization?.sector,
        employees: organization?.employees,
        revenue: organization?.annual_revenue,
        bilan,
        history,
        financedLines,
      });
      advance(88, "Mise en page du rapport…");
      const file = await renderGesReport(dataset, selected);
      if (file.bytes.byteLength < 8) {
        throw new Error("Le fichier généré est vide.");
      }
      advance(100, "Rapport prêt");
      await pause(350);
      setProgress(null);
      const url = reportObjectUrl(file.bytes, file.mime);
      openPreview({ url, filename: file.filename, mime: file.mime, format: selected });
      if (selected !== "pdf") downloadGesReport(file.bytes, file.filename, file.mime);
      toast({ title: "Rapport prêt", description: file.filename });
    } catch (failure: unknown) {
      const message = failure instanceof Error ? failure.message : "Échec de génération";
      setProgress(null);
      setError(message);
      toast({ title: "Le rapport n'a pas pu être généré", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Générer un rapport</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Le PDF est rédigé côté serveur à partir de l'inventaire publié. Excel et PowerPoint restent des exports des résultats affichés.
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
          {busy ? "Génération…" : "Générer"}
        </Button>
      </div>

      {progress && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-progress-title"
            aria-describedby="report-progress-step"
            className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {FORMATS.find((item) => item.id === progress.format)?.title}
            </p>
            <h3 id="report-progress-title" className="mt-1 text-lg font-semibold">Génération en cours</h3>
            <p id="report-progress-step" className="mt-4 text-sm text-slate-700">{progress.label}</p>
            <Progress value={progress.percent} className="mt-3 h-2" aria-label="Avancement de la génération" />
            <p className="mt-2 text-right text-sm font-semibold tabular-nums">{progress.percent} %</p>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {preview && preview.format !== "pdf" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
          <p className="text-sm">
            <span className="font-medium">{preview.filename}</span>
            <span className="block text-muted-foreground">Si le téléchargement ne démarre pas, utilisez le bouton.</span>
          </p>
          <a
            href={preview.url}
            download={preview.filename}
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger
          </a>
        </div>
      )}

      {preview?.format === "pdf" && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-white">
          <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={closePreview}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                aria-label="Fermer le rapport"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="truncate text-sm font-medium">{preview.filename}</p>
            </div>
            <a
              href={preview.url}
              download={preview.filename}
              className="inline-flex h-8 items-center rounded-md bg-[#5F9E6B] px-3 text-sm font-medium text-white hover:bg-[#4A7D56]"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Télécharger
            </a>
          </header>
          <object data={preview.url} type={preview.mime} className="min-h-0 w-full flex-1">
            <iframe title={preview.filename} src={preview.url} className="h-full w-full" />
          </object>
        </div>
      )}

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
  onStep?: (done: number, total: number) => void,
): Promise<ReportHistoryPoint[]> {
  const historyYears = [...new Set(allowedYears.filter((item) => item <= year))].sort((a, b) => a - b).slice(-4);
  const pending = historyYears.filter((item) => item !== year);
  const points: ReportHistoryPoint[] = [];
  onStep?.(0, pending.length);
  for (const [index, item] of pending.entries()) {
    try {
      const bilan = applySite(
        await BilanCarboneCalculator.calculate(organizationId, `${item}-01-01`, `${item}-12-31`),
        siteId,
      );
      if (financialInstitution && !scope3VentilationSufficient(bilan)) {
        // Un scope 3 trop agrégé ne fournit pas de point de comparaison.
      } else {
        const dataset = buildGesReportDataset({
          organizationName: "",
          year: item,
          perimeterLabel: "",
          financialInstitution,
          includeFinancedEmissions: false,
          currency: "EUR",
          bilan,
        });
        if (dataset.operational.totalT != null) {
          points.push({ year: item, operationalT: dataset.operational.totalT });
        }
      }
    } catch {
      // Un exercice sans bilan ne bloque pas l'export.
    }
    onStep?.(index + 1, pending.length);
  }
  return points;
}

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
