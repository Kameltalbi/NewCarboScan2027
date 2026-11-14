import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { useOrganizationData } from "@/hooks/useOrganizationData";
import { useOrganizationSites } from "@/hooks/useOrganizationSites";
import { api } from "@/integrations/api/client";
import { ActivityDataService } from "@/lib/activity-data/ActivityDataService";
import { ademeFactorNote, emissionFactorSourceLabel, selectionToFactor, tunisiaGridFactor, type AdemeFactorRef } from "@/lib/factors/ademeFactor";
import { previewLine, sourceLabel, type PreviewFactor } from "@/lib/collect/linePreview";
import { parseOptionalUncertainty, type SourceType } from "@/lib/activity-data/uncertaintySummary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmissionFactorSelector } from "@/components/scope3/EmissionFactorSelector";
import { useToast } from "@/hooks/use-toast";
import { ProcessEmissionForm } from "./ProcessEmissionForm";
import { SaisieLibre } from "./SaisieLibre";
import { SourceUncertaintyFields } from "./SourceUncertaintyFields";
import { CollectCategoryPanel } from "./CollectCategoryPanel";
import { proposeTunisiaElectricity } from "@/lib/collect/linePreview";
import { foldText } from "@/lib/collect/importReview";
import {
  categorySecondary,
  categorySuggestions,
  collectCatalog,
  enableCategory,
  readRecentCategoryIds,
  rememberCategory,
  sanitizeCollectCategoryIds,
  writeRecentCategoryIds,
  type CollectCategory,
} from "@/lib/collect/collectCategories";

const EMPTY_CATEGORY_IDS: string[] = [];

function toPreviewFactor(factor: AdemeFactorRef): PreviewFactor {
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

const SCOPE_TITLES = {
  1: "Émissions directes",
  2: "Énergie achetée",
  3: "Autres émissions indirectes",
} as const;

export const NouvelleSaisie: React.FC<{ scope: 1 | 2 | 3 }> = ({ scope }) => {
  const navigate = useNavigate();
  const { organizationId, organization, referenceYear } = useOrganizationData();
  const { sites } = useOrganizationSites(organizationId || undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [year, setYear] = useState(referenceYear || new Date().getFullYear());
  const [siteId, setSiteId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [typeQuery, setTypeQuery] = useState("");
  const [choiceValue, setChoiceValue] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kWh");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [description, setDescription] = useState("");
  const [dataQuality, setDataQuality] = useState("");
  const [sourceType, setSourceType] = useState("unspecified");
  const [uncertainty, setUncertainty] = useState("");
  const [notes, setNotes] = useState("");
  const [factor, setFactor] = useState<AdemeFactorRef | null>(null);
  const [factorTouched, setFactorTouched] = useState(false);
  const [factorOpen, setFactorOpen] = useState(false);
  const [draftFactor, setDraftFactor] = useState<AdemeFactorRef | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [freeMode, setFreeMode] = useState(false);

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
    if (referenceYear) setYear(referenceYear);
  }, [referenceYear]);

  useEffect(() => {
    setPeriodStart(`${year}-01-01`);
    setPeriodEnd(`${year}-12-31`);
  }, [year]);

  useEffect(() => {
    if (siteId && sites.some((site) => site.id === siteId)) return;
    const savedSite = sessionStorage.getItem("collect-site");
    const known = sites.find((site) => site.id === savedSite) || sites[0];
    if (known) setSiteId(known.id);
  }, [siteId, sites]);

  useEffect(() => {
    if (!organizationId) return;
    setRecentIds(readRecentCategoryIds(organizationId));
  }, [organizationId]);

  const catalog = useMemo(() => collectCatalog().filter((item) => item.scope === scope), [scope]);
  const categoriesQuery = useQuery({
    queryKey: ["collect-categories", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => sanitizeCollectCategoryIds((await api.getCollectCategories()).ids),
  });
  const enabledIds = categoriesQuery.data ?? EMPTY_CATEGORY_IDS;
  const categoryChoice = scope === 3;
  const listedIds = categoryChoice ? enabledIds : catalog.map((item) => item.id);
  const scopeHasCategory = categoryChoice
    ? enabledIds.some((id) => catalog.some((item) => item.id === id))
    : catalog.length > 0;
  const selected = catalog.find((item) => item.id === categoryId) ?? null;
  const choice = selected?.choices.find((item) => item.value === choiceValue) ?? selected?.choices[0] ?? null;
  const suggestions = categorySuggestions(catalog, listedIds, categoryQuery);
  const recent = recentIds
    .map((id) => catalog.find((item) => item.id === id))
    .filter((item): item is CollectCategory => Boolean(item && listedIds.includes(item.id)));
  const organizationCountry = organization?.country || "";
  const proposed = !factorTouched && choice && proposeTunisiaElectricity(organizationCountry, choice.subcategory)
    ? tunisiaGridFactor()
    : null;
  const activeFactor = factor || proposed;

  useEffect(() => {
    if (!choice) return;
    setUnit(choice.defaultUnit);
    setFactor(null);
    setFactorTouched(false);
  }, [choiceValue]);

  const preview = useMemo(() => previewLine({
    quantity: Number(quantity),
    unit,
    factor: activeFactor ? toPreviewFactor(activeFactor) : null,
  }), [quantity, unit, activeFactor]);
  const typeOptions = (selected?.choices ?? []).filter((item) => {
    const tokens = foldText(typeQuery).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    const haystack = foldText(item.label);
    return tokens.every((token) => haystack.includes(token)) || item.value === choice?.value;
  });

  const selectCategory = (id: string) => {
    const category = catalog.find((item) => item.id === id);
    if (!category) return;
    setCategoryId(id);
    setChoiceValue(category.choices[0]?.value ?? "");
    setTypeQuery("");
    setCategoryQuery("");
    setFreeMode(false);
    setSaved(null);
    if (!organizationId) return;
    const next = rememberCategory(recentIds, id);
    setRecentIds(next);
    writeRecentCategoryIds(organizationId, next);
  };

  const persistCategories = async (ids: string[]) => {
    const clean = sanitizeCollectCategoryIds(ids);
    setSavingCategories(true);
    try {
      const savedIds = sanitizeCollectCategoryIds((await api.saveCollectCategories(clean)).ids);
      queryClient.setQueryData(["collect-categories", organizationId], savedIds);
      return savedIds;
    } finally {
      setSavingCategories(false);
    }
  };

  const saveCategorySelection = async (ids: string[]) => {
    try {
      await persistCategories(ids);
      setPanelOpen(false);
      toast({ title: "Catégories enregistrées" });
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const activateHidden = async (id: string) => {
    try {
      await persistCategories(enableCategory(enabledIds, id));
      selectCategory(id);
    } catch (error) {
      toast({
        title: "Activation impossible",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const resetForAnother = () => {
    setQuantity("");
    setDescription("");
    setNotes("");
    setSaved(null);
    setFactor(null);
    setFactorTouched(false);
  };

  const save = async (mode: "factor" | "incomplete") => {
    if (!organizationId || !choice || choice.kind === "process") return;
    const parsed = Number(quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({ title: "Saisissez une quantité", variant: "destructive" });
      return;
    }
    if (preview.status === "incompatible") {
      toast({ title: "Unité incompatible", description: preview.warning || undefined, variant: "destructive" });
      return;
    }
    const uncertaintyResult = parseOptionalUncertainty(uncertainty);
    if (!uncertaintyResult.ok) {
      toast({ title: "Incertitude", description: uncertaintyResult.message, variant: "destructive" });
      return;
    }
    const kept = mode === "factor" ? activeFactor : null;
    if (mode === "factor" && !kept) return;
    setSaving(true);
    try {
      await ActivityDataService.create({
        organization_id: organizationId,
        site_id: siteId || null,
        activity_type: choice.activityType,
        category: choice.category,
        subcategory: choice.subcategory,
        quantity: parsed,
        unit,
        period_start: periodStart,
        period_end: periodEnd,
        ...(dataQuality === "real" || dataQuality === "estimated" || dataQuality === "default"
          ? { data_quality: dataQuality }
          : {}),
        notes: kept
          ? ademeFactorNote(kept, [description, notes].filter(Boolean).join("\n"))
          : ["A_COMPLETER:", description, notes].filter(Boolean).join("\n"),
        emission_factor_source: kept ? emissionFactorSourceLabel(kept) : undefined,
        scope_hint: choice.scope,
        data_method: /tnd|eur|usd|€/i.test(unit) ? "monetary" : "physical",
        source_type: sourceType === "unspecified" ? null : (sourceType as SourceType),
        uncertainty_pct: uncertaintyResult.value,
      });
      if (siteId) sessionStorage.setItem("collect-site", siteId);
      queryClient.invalidateQueries({ queryKey: ["activity-data"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      window.dispatchEvent(new Event("activityDataUpdated"));
      const result = kept ? preview.resultLabel : "À compléter";
      setSaved(`${choice.label} · ${parsed} ${unit} · ${result}${preview.provisional && kept ? " · facteur provisoire" : ""}`);
      toast({ title: "Ligne enregistrée", description: result });
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const context = [organization?.name, organizationCountry].filter(Boolean).join(" · ") || "Compte";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Scope {scope}</h1>
          <p className="text-sm text-muted-foreground">{SCOPE_TITLES[scope]}. Renseignez votre activité et vérifiez le calcul avant d’enregistrer.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate("/app/collecte/nouvelle")}>
          Scopes
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <div className="font-medium">{context}</div>
          <div className="text-xs text-muted-foreground">
            {organizationCountry ? "Pays repris du compte" : (
              <a className="underline" href="/app/parametres/organisation">Compléter le pays du compte</a>
            )}
          </div>
        </div>
        <div className="min-w-[220px] space-y-1">
          <Label>Site</Label>
          <Select value={siteId || undefined} onValueChange={setSiteId}>
            <SelectTrigger><SelectValue placeholder="Choisir un site" /></SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="categorie-activite">Catégorie d’activité</Label>
          {categoryChoice && (
            <Button type="button" variant="link" className="h-auto px-0" onClick={() => setPanelOpen(true)}>
              Gérer mes catégories
            </Button>
          )}
        </div>
        {categoryChoice && !scopeHasCategory && !categoryQuery.trim() && !selected && !categoriesQuery.isLoading && (
          <div className="rounded-md border bg-muted/40 p-4">
            <p className="text-sm">Choisissez les catégories à afficher dans votre collecte. Vous pourrez ensuite ajouter une ligne dans l’une d’elles.</p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => setPanelOpen(true)}>
              Choisir mes catégories
            </Button>
          </div>
        )}
        <Input
          id="categorie-activite"
          value={categoryQuery}
          onChange={(event) => setCategoryQuery(event.target.value)}
          placeholder="Rechercher une catégorie"
        />
        {recent.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recent.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectCategory(item.id)}
                className={`rounded-full border px-2.5 py-1 text-xs ${item.id === selected?.id ? "border-primary bg-primary/10 font-medium" : "bg-background"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        {(categoryQuery.trim() || !selected) && (suggestions.visible.length > 0 || suggestions.hidden.length > 0) && (
          <div className="max-h-60 overflow-auto rounded-md border">
            {suggestions.visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectCategory(item.id)}
                className="flex w-full items-baseline justify-between gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
              >
                <span className="text-sm">{item.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{categorySecondary(item)}</span>
              </button>
            ))}
            {categoryChoice && suggestions.hidden.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0">
                <div className="min-w-0">
                  <div className="text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground">Masquée dans la collecte · {categorySecondary(item)}</div>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={savingCategories} onClick={() => activateHidden(item.id)}>
                  Activer
                </Button>
              </div>
            ))}
          </div>
        )}
        {selected && !categoryQuery.trim() && (
          <p className="text-sm">
            <span className="font-medium">{selected.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">{categorySecondary(selected)}</span>
          </p>
        )}
        {categoryChoice && selected && !enabledIds.includes(selected.id) && (
          <p className="text-xs text-muted-foreground">Cette catégorie est masquée pour les prochaines saisies. La ligne en cours est conservée.</p>
        )}
      </div>

      {freeMode && organizationId ? (
        <SaisieLibre
          organizationId={organizationId}
          siteId={siteId}
          organizationCountry={organizationCountry}
          year={year}
          periodStart={periodStart}
          periodEnd={periodEnd}
          onPeriodStart={setPeriodStart}
          onPeriodEnd={setPeriodEnd}
          onClose={() => setFreeMode(false)}
        />
      ) : selected?.mode === "process" ? (
        <ProcessEmissionForm
          organizationId={organizationId}
          sites={sites.map((site) => ({ id: site.id, name: site.name }))}
          referenceYear={year}
        />
      ) : selected?.mode === "automatic" ? (
        <p className="rounded-md border bg-muted/40 p-4 text-sm">
          Les émissions de cette catégorie sont calculées à partir des énergies déjà saisies. Aucune quantité supplémentaire n’est demandée ici.
        </p>
      ) : choice && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Données d’activité</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Activité ou produit</Label>
                {(selected?.choices.length ?? 0) > 6 && (
                  <Input
                    value={typeQuery}
                    onChange={(event) => setTypeQuery(event.target.value)}
                    placeholder="Rechercher un type"
                    className="mb-2"
                  />
                )}
                <Select value={choice.value} onValueChange={(value) => { setChoiceValue(value); setFreeMode(false); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="link" className="h-auto px-0" onClick={() => setFreeMode(true)}>
                  Je ne trouve pas mon activité
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Quantité</Label>
                  <Input type="number" step="any" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Unité</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[choice.defaultUnit, ...choice.alternativeUnits].filter((item, index, list) => list.indexOf(item) === index).map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Début de période</Label>
                  <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Fin de période</Label>
                  <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Désignation</Label>
                <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Nom utilisé dans vos documents" />
              </div>
              <Collapsible>
                <CollapsibleTrigger className="text-sm font-medium">Justificatif et qualité des données</CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="space-y-1">
                    <Label>Qualité</Label>
                    <Select value={dataQuality || "unset"} onValueChange={(value) => setDataQuality(value === "unset" ? "" : value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Non renseignée</SelectItem>
                        <SelectItem value="real">Mesurée</SelectItem>
                        <SelectItem value="estimated">Estimée</SelectItem>
                        <SelectItem value="default">Par défaut</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <SourceUncertaintyFields
                    sourceType={sourceType}
                    uncertainty={uncertainty}
                    onSourceType={setSourceType}
                    onUncertainty={setUncertainty}
                  />
                </CollapsibleContent>
              </Collapsible>
              <Collapsible>
                <CollapsibleTrigger className="text-sm font-medium">Détails méthodologiques</CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes internes" />
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-3"><CardTitle className="text-base">Facteur et calcul</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activeFactor ? (
                <>
                  <div>
                    <div className="text-sm font-medium">{activeFactor.name}</div>
                    <div className="text-2xl font-semibold">{activeFactor.value.toLocaleString("fr-FR")} <span className="text-base font-normal">{activeFactor.unit.replace("CO2", "CO₂")}</span></div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Source : {sourceLabel(activeFactor.sourceName ?? null)}</span>
                      {activeFactor.factorYear ? <span>Année {activeFactor.factorYear}</span> : null}
                      {activeFactor.countryCode ? <span>{activeFactor.countryCode}</span> : null}
                    </div>
                  </div>
                  {preview.provisional && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>Facteur provisoire à confirmer. {preview.warning}</AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <p className="text-sm">Aucun facteur choisi. Les émissions ne sont pas calculées.</p>
              )}
              <Button type="button" variant="outline" onClick={() => setFactorOpen(true)}>Changer le facteur</Button>
              {preview.status === "incompatible" && (
                <Alert variant="destructive"><AlertDescription>{preview.warning}</AlertDescription></Alert>
              )}
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">{preview.formula}</p>
                <p className="text-3xl font-semibold">{preview.resultLabel}</p>
                {preview.provisional && preview.status === "counted" && (
                  <p className="text-xs text-muted-foreground">Estimation avec un facteur provisoire</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Le facteur est conservé sur la ligne. Il ne change pas la catégorie ni le scope.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!freeMode && selected?.mode === "fields" && choice && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {saved && <Button type="button" variant="ghost" onClick={resetForAnother}>Nouvelle saisie</Button>}
          <Button type="button" variant="outline" disabled={saving || preview.status === "incompatible"} onClick={() => save("incomplete")}>
            Enregistrer à compléter
          </Button>
          <Button
            type="button"
            disabled={saving || !activeFactor || preview.status !== "counted"}
            onClick={() => save("factor")}
          >
            {preview.provisional ? "Enregistrer avec ce facteur" : "Enregistrer"}
          </Button>
        </div>
      )}

      {saved && (
        <Alert>
          <AlertDescription>
            {saved}. La ligne est dans la liste des données. {preview.provisional ? "Le facteur provisoire reste visible." : ""}
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={factorOpen} onOpenChange={setFactorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Changer le facteur</DialogTitle></DialogHeader>
          <EmissionFactorSelector
            subcategorySlug={choice?.subcategory || ""}
            unit={unit}
            siteCountry={organizationCountry}
            reportingYear={year}
            onChange={(_slug, next) => {
              const selected = selectionToFactor(next);
              if (selected) setDraftFactor(selected);
            }}
          />
          <Button
            type="button"
            disabled={!draftFactor}
            onClick={() => {
              if (!draftFactor) return;
              setFactor(draftFactor);
              setFactorTouched(true);
              setFactorOpen(false);
            }}
          >
            Utiliser ce facteur
          </Button>
        </DialogContent>
      </Dialog>

      {categoryChoice && (
        <CollectCategoryPanel
          open={panelOpen}
          onOpenChange={setPanelOpen}
          selectedIds={enabledIds}
          saving={savingCategories}
          onSave={saveCategorySelection}
        />
      )}
    </div>
  );
};
