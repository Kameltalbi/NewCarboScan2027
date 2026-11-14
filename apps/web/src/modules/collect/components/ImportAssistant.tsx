import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Info } from "lucide-react";
import { EmissionFactorSelector } from "@/components/scope3/EmissionFactorSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationData } from "@/hooks/useOrganizationData";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { useOrganizationSites } from "@/hooks/useOrganizationSites";
import { useOrganizationYears } from "@/hooks/useOrganizationYears";
import { ActivityDataService } from "@/lib/activity-data/ActivityDataService";
import { emissionFactorSourceLabel, selectionToFactor } from "@/lib/factors/ademeFactor";
import { previewLine, sourceLabel, type PreviewFactor } from "@/lib/collect/linePreview";
import {
  IMPORT_GUIDES,
  buildImportDraft,
  choiceNeedsState,
  confirmAssociation,
  emissionCell,
  factorCell,
  importAnnouncement,
  lineNotes,
  matchingLines,
  type ImportLine,
  type ImportStatus,
  type ProductState,
} from "@/lib/collect/importReview";
import { downloadActivityTemplate, readSpreadsheet } from "@/lib/collect/importWorkbook";
import { validateSpreadsheetFile } from "@/lib/spreadsheetValidate";
import { ACTIVITY_GROUPS, findChoice } from "@/modules/collect/activityGroups";

const DRAFT_KEY = "carboscan-import-draft";

function hasSavedDraft(): boolean {
  try {
    return Boolean(sessionStorage.getItem(DRAFT_KEY));
  } catch {
    return false;
  }
}

function statusLabel(status: ImportStatus): string {
  if (status === "ready") return "Prêt";
  if (status === "confirm") return "À confirmer";
  return "À compléter";
}

function toPreview(factor: ReturnType<typeof selectionToFactor>): PreviewFactor | null {
  if (!factor) return null;
  return {
    id: factor.id,
    name: factor.name,
    value: factor.value,
    unit: factor.unit,
    sourceName: factor.sourceName ?? null,
    factorYear: factor.factorYear ?? null,
    countryCode: factor.countryCode ?? null,
    stableFactorId: factor.stableFactorId ?? null,
  };
}

export const ImportAssistant: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { organization } = useOrganizationData();
  const { sites } = useOrganizationSites(organizationId || undefined);
  const { defaultYear } = useOrganizationYears(organizationId);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [year, setYear] = useState(defaultYear || new Date().getFullYear());
  const [siteId, setSiteId] = useState("");
  const [activityGroupId, setActivityGroupId] = useState("purchases");
  const [step, setStep] = useState<"prepare" | "review" | "done">("prepare");
  const [fileName, setFileName] = useState("");
  const [lines, setLines] = useState<ImportLine[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [ignoredSheets, setIgnoredSheets] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [choiceValue, setChoiceValue] = useState<string | null>(null);
  const [state, setState] = useState<ProductState>(null);
  const [draftFactor, setDraftFactor] = useState<PreviewFactor | null>(null);
  const [applyIdentical, setApplyIdentical] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    const onYear = (event: Event) => {
      const next = Number((event as CustomEvent).detail);
      if (Number.isInteger(next)) setYear(next);
    };
    window.addEventListener("collectYearChange", onYear);
    window.addEventListener("dashboardYearChange", onYear);
    return () => {
      window.removeEventListener("collectYearChange", onYear);
      window.removeEventListener("dashboardYearChange", onYear);
    };
  }, []);

  useEffect(() => {
    if (!siteId && sites[0]) {
      const saved = sessionStorage.getItem("collect-site");
      setSiteId(sites.find((site) => site.id === saved)?.id || sites[0].id);
    }
  }, [siteId, sites]);

  const group = ACTIVITY_GROUPS.find((item) => item.id === activityGroupId) || ACTIVITY_GROUPS[0];
  const guide = IMPORT_GUIDES[activityGroupId] || IMPORT_GUIDES.other;
  const selected = lines.find((line) => line.id === selectedId) || null;
  const country = organization?.country || "";
  const siteName = sites.find((site) => site.id === siteId)?.name || "Site";
  const context = [organization?.name, country].filter(Boolean).join(" · ");
  const readyCount = lines.filter((line) => line.status === "ready").length;
  const confirmCount = lines.filter((line) => line.status === "confirm").length;
  const incompleteCount = lines.filter((line) => line.status === "incomplete").length;
  const duplicates = lines.filter((line) => line.duplicate).length;
  const outside = lines.filter((line) => line.outOfYear).length;
  const unreadable = lines.filter((line) => line.unreadable).length;

  const identical = useMemo(() => {
    if (!selected) return [];
    const preview = lines.map((line) => line.id === selected.id ? {
      ...line,
      choiceValue,
      productQuery,
      state,
    } : line);
    return matchingLines(preview, selected.id);
  }, [choiceValue, lines, productQuery, selected, state]);

  const openLine = (line: ImportLine) => {
    setSelectedId(line.id);
    setProductQuery(line.productQuery);
    setChoiceValue(line.choiceValue);
    setState(line.state);
    setDraftFactor(line.factor);
    setApplyIdentical(false);
  };

  const readFile = async (file: File) => {
    if (!siteId) {
      toast({ title: "Choisissez un site", variant: "destructive" });
      return;
    }
    const guard = await validateSpreadsheetFile(file);
    if (!guard.ok) {
      toast({ title: "Fichier refusé", description: guard.error, variant: "destructive" });
      return;
    }
    setParsing(true);
    try {
      const sheets = await readSpreadsheet(file);
      const draft = buildImportDraft({
        sheets,
        activityGroupId,
        year,
        organizationCountry: country,
      });
      setFileName(file.name);
      setLines(draft.lines);
      setNotice(draft.notice);
      setIgnoredSheets(draft.ignoredSheets);
      setStep("review");
      const first = draft.lines.find((line) => line.status !== "ready") || draft.lines[0];
      if (first) openLine(first);
      toast({
        title: "Fichier lu",
        description: `${draft.lines.length} ligne${draft.lines.length > 1 ? "s" : ""} conservée${draft.lines.length > 1 ? "s" : ""}. Aucune n’a été écartée en silence.`,
      });
    } catch (error) {
      toast({
        title: "Lecture impossible",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const confirmLine = () => {
    if (!selected) return;
    const result = confirmAssociation(lines, {
      lineId: selected.id,
      factor: draftFactor,
      productQuery,
      choiceValue,
      state,
      applyToIdentical: applyIdentical,
      year,
    });
    setLines(result.lines);
    if (result.blocked) {
      toast({ title: "Association non comptée", description: result.blocked, variant: "destructive" });
      return;
    }
    toast({
      title: "Facteur associé",
      description: result.appliedIds.length > 1
        ? `${result.appliedIds.length} lignes confirmées.`
        : "La ligne sera comptée à l’import.",
    });
  };

  const saveDraft = () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ fileName, activityGroupId, siteId, year, lines }));
    toast({ title: "Brouillon conservé sur cet appareil" });
  };

  const importLines = async () => {
    if (!organizationId || !siteId) return;
    setImporting(true);
    try {
      await ActivityDataService.bulkCreate(lines.map((line) => {
        const choice = findChoice(line.choiceValue || "");
        return {
          organization_id: organizationId,
          site_id: siteId,
          activity_type: choice?.activityType || "purchase",
          category: choice?.category || "scope3_upstream",
          subcategory: choice?.subcategory || "non_identifie",
          quantity: line.quantity && line.quantity > 0 ? line.quantity : 0,
          unit: line.unit || "unité",
          period_start: line.periodStart || `${year}-01-01`,
          period_end: line.periodEnd || `${year}-12-31`,
          scope_hint: choice?.scope,
          data_method: "physical" as const,
          notes: lineNotes(line, fileName),
          emission_factor_source: line.status === "ready" && line.factor ? emissionFactorSourceLabel({
            id: line.factor.id,
            name: line.factor.name,
            value: line.factor.value,
            unit: line.factor.unit,
            sourceKey: null,
            sourceName: line.factor.sourceName,
            datasetVersion: null,
            countryCode: line.factor.countryCode,
            region: null,
            factorYear: line.factor.factorYear,
            stableFactorId: line.factor.stableFactorId,
            replacementReason: null,
          }) : undefined,
        };
      }));
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.setItem("collect-site", siteId);
      queryClient.invalidateQueries({ queryKey: ["activity-data"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      window.dispatchEvent(new Event("activityDataUpdated"));
      setStep("done");
    } catch (error) {
      toast({
        title: "Import impossible",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">Lignes importées</h1>
        <p className="text-sm text-muted-foreground">{importAnnouncement(lines)} Les facteurs confirmés sont ceux qui seront utilisés dans le bilan.</p>
        <LineTable lines={lines} selectedId={null} onSelect={() => undefined} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/app/collecte/donnees?statut=a-completer")}>
            Reprendre les lignes à compléter
          </Button>
          <Button onClick={() => { setStep("prepare"); setLines([]); setFileName(""); }}>Nouvel import</Button>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Vérifier les lignes importées</h1>
          <p className="text-sm text-muted-foreground">La désignation de votre fichier est conservée. Associez un facteur adapté à chaque produit avant de le compter.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{context || "Compte"}</span>
          <span>{siteName} · {year}</span>
          <span>{fileName}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{lines.length} lignes lues</Badge>
          <Badge variant="outline">{readyCount} prête{readyCount > 1 ? "s" : ""} à calculer</Badge>
          <Badge variant="outline">{confirmCount} à confirmer</Badge>
          <Badge variant="outline">{incompleteCount} à compléter</Badge>
        </div>
        {ignoredSheets.length > 0 && (
          <Alert><Info className="h-4 w-4" /><AlertDescription>Onglet exclu de l’import : {ignoredSheets.join(", ")}.</AlertDescription></Alert>
        )}
        {(duplicates > 0 || outside > 0 || unreadable > 0 || notice) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {[
                notice,
                duplicates > 0 ? `${duplicates} doublon${duplicates > 1 ? "s" : ""} potentiel${duplicates > 1 ? "s" : ""}` : "",
                outside > 0 ? `${outside} date${outside > 1 ? "s" : ""} hors exercice` : "",
                unreadable > 0 ? `${unreadable} ligne${unreadable > 1 ? "s" : ""} illisible${unreadable > 1 ? "s" : ""}` : "",
              ].filter(Boolean).join(" · ")}. Aucune ligne n’a été supprimée.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <h2 className="text-base font-semibold">{group.label}</h2>
            <LineTable lines={lines} selectedId={selectedId} onSelect={openLine} />
            <p className="text-xs text-muted-foreground">Les lignes sans facteur confirmé restent hors du total calculé. La désignation n’est pas un facteur d’émission.</p>
          </div>
          {selected && (
            <Card className="lg:sticky lg:top-4">
              <CardContent className="space-y-3 pt-4">
                <div>
                  <p className="text-sm font-semibold">Associer un facteur</p>
                  <p className="text-xs text-muted-foreground">Ligne {selected.sourceRow} · {selected.designation || "Sans désignation"}</p>
                </div>
                <div className="space-y-1">
                  <Label>Désignation d’origine</Label>
                  <Input value={selected.designation} readOnly />
                </div>
                <div className="space-y-1">
                  <Label>Produit à rechercher</Label>
                  <Input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Produit identifié</Label>
                  <Select value={choiceValue || "unset"} onValueChange={(value) => setChoiceValue(value === "unset" ? null : value)}>
                    <SelectTrigger><SelectValue placeholder="À préciser" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">À préciser</SelectItem>
                      {group.choices.filter((item) => item.kind === "standard").map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {choiceNeedsState(choiceValue) && (
                  <div className="space-y-1">
                    <Label>État du produit</Label>
                    <Select value={state || "unset"} onValueChange={(value) => setState(value === "unset" ? null : value as ProductState)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Non précisé</SelectItem>
                        <SelectItem value="cru">Cru</SelectItem>
                        <SelectItem value="cuit">Cuit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-sm">{selected.quantity ?? "—"} {selected.unit || "unité manquante"} · unité à vérifier avec le facteur</p>
                <EmissionFactorSelector
                  subcategorySlug={findChoice(choiceValue || "")?.subcategory || ""}
                  unit={selected.unit}
                  siteCountry={country}
                  reportingYear={year}
                  onChange={(_slug, next) => setDraftFactor(toPreview(selectionToFactor(next)))}
                />
                {draftFactor && selected && (
                  <FactorPreview factor={draftFactor} quantity={selected.quantity} unit={selected.unit} />
                )}
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={applyIdentical} onCheckedChange={(value) => setApplyIdentical(value === true)} disabled={identical.length === 0} />
                  <span>
                    Appliquer aux lignes identiques
                    <span className="block text-xs text-muted-foreground">Même produit, état, unité et périmètre. {identical.length} ligne{identical.length > 1 ? "s" : ""} concernée{identical.length > 1 ? "s" : ""}.</span>
                  </span>
                </label>
                {applyIdentical && identical.length > 0 && (
                  <ul className="max-h-28 overflow-auto text-xs text-muted-foreground">
                    {identical.map((line) => (
                      <li key={line.id}>Ligne {line.sourceRow} · {line.designation} · {line.quantity} {line.unit}</li>
                    ))}
                  </ul>
                )}
                <Button type="button" className="w-full" onClick={confirmLine}>
                  {applyIdentical && identical.length > 0 ? `Confirmer pour ${identical.length + 1} lignes` : "Confirmer l’association"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Les lignes ambiguës ne seront pas associées automatiquement. {importAnnouncement(lines)}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
          <Button variant="outline" onClick={() => setStep("prepare")}>Retour au fichier</Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => { const next = lines.find((line) => line.status !== "ready"); if (next) openLine(next); }}>Corriger une ligne</Button>
            <Button variant="outline" onClick={saveDraft}>Enregistrer le brouillon</Button>
            <Button disabled={importing || lines.length === 0} onClick={importLines}>
              {importing ? "Import…" : `Importer les ${lines.length} lignes`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Préparer le fichier</h1>
        <p className="text-sm text-muted-foreground">Choisissez l’activité, puis déposez un fichier où chaque ligne est une opération ou une consommation.</p>
      </div>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <div className="font-medium">{context || "Compte"}</div>
        <div className="text-xs text-muted-foreground">{country ? "Pays repris du compte" : <a className="underline" href="/app/parametres/organisation">Compléter le pays du compte</a>}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Site</Label>
          <Select value={siteId || undefined} onValueChange={setSiteId}>
            <SelectTrigger><SelectValue placeholder="Choisir un site" /></SelectTrigger>
            <SelectContent>
              {sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Année</Label>
          <p className="rounded-md border px-3 py-2 text-sm">{year} <span className="text-xs text-muted-foreground">reprise du sélecteur en haut de page</span></p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {ACTIVITY_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActivityGroupId(item.id)}
            className={`rounded-md border px-3 py-2 text-sm ${item.id === activityGroupId ? "border-primary bg-primary/10 font-medium" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-2 pt-4 text-sm">
          <p>{guide.expected}</p>
          <p>{guide.units}</p>
          <p>Exemple : {guide.example}</p>
          <p><span className="font-medium">Obligatoires :</span> désignation, quantité, unité.</p>
          <p><span className="font-medium">Facultatives :</span> début et fin de période, produit ou type, référence du justificatif.</p>
          <p className="text-muted-foreground">Les exemples sont dans un onglet séparé, qui n’est pas importé.</p>
          <Button type="button" variant="outline" onClick={() => downloadActivityTemplate(activityGroupId)}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger le modèle
          </Button>
        </CardContent>
      </Card>
      <label className={`block rounded-lg border-2 border-dashed p-8 text-center ${siteId ? "cursor-pointer" : "opacity-50"}`}>
        <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <span className="text-sm">{parsing ? "Lecture…" : "Déposer le fichier Excel ou CSV"}</span>
        <input
          className="hidden"
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={!siteId || parsing}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
      </label>
      {hasSavedDraft() && (
        <Button variant="outline" onClick={() => {
          try {
            const saved = sessionStorage.getItem(DRAFT_KEY);
            if (!saved) return;
            const draft = JSON.parse(saved) as { fileName: string; activityGroupId: string; siteId: string; lines: ImportLine[] };
            setFileName(draft.fileName);
            setActivityGroupId(draft.activityGroupId);
            setSiteId(draft.siteId);
            setLines(draft.lines);
            setStep("review");
            if (draft.lines[0]) openLine(draft.lines[0]);
          } catch {
            toast({ title: "Brouillon illisible", variant: "destructive" });
          }
        }}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Reprendre le brouillon
        </Button>
      )}
    </div>
  );
};

function FactorPreview({ factor, quantity, unit }: { factor: PreviewFactor; quantity: number | null; unit: string }) {
  const preview = previewLine({ quantity: quantity ?? Number.NaN, unit, factor });
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm">
      <p className="font-medium">{factor.name}</p>
      <p>{factor.value.toLocaleString("fr-FR")} {factor.unit.replace("CO2", "CO₂")}</p>
      <p className="text-xs text-muted-foreground">
        Source : {sourceLabel(factor.sourceName)}
        {factor.factorYear ? ` · ${factor.factorYear}` : ""}
        {factor.countryCode ? ` · ${factor.countryCode}` : ""}
      </p>
      <p className="mt-2">{preview.status === "counted" ? `${preview.formula} = ${preview.resultLabel}` : preview.warning || "Facteur incompatible avec cette unité."}</p>
    </div>
  );
}

function LineTable({ lines, selectedId, onSelect }: { lines: ImportLine[]; selectedId: string | null; onSelect: (line: ImportLine) => void }) {
  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ligne</TableHead>
            <TableHead>Désignation d’origine</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead>Produit identifié</TableHead>
            <TableHead>Facteur</TableHead>
            <TableHead>Émissions</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id} className={line.id === selectedId ? "bg-primary/10" : ""} onClick={() => onSelect(line)}>
              <TableCell>{line.sourceRow}</TableCell>
              <TableCell>{line.designation || "—"}</TableCell>
              <TableCell>{line.quantity ?? "—"} {line.unit}</TableCell>
              <TableCell>{line.productLabel}</TableCell>
              <TableCell>{factorCell(line)}</TableCell>
              <TableCell>{emissionCell(line)}</TableCell>
              <TableCell>
                <span className="block text-sm">{statusLabel(line.status)}</span>
                {line.status === "ready" && <span className="text-xs text-muted-foreground">Facteur confirmé</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
