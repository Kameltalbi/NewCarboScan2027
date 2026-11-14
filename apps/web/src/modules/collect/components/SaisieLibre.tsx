import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { EmissionFactorSelector } from "@/components/scope3/EmissionFactorSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ActivityDataService } from "@/lib/activity-data/ActivityDataService";
import { parseOptionalUncertainty, type SourceType } from "@/lib/activity-data/uncertaintySummary";
import { selectionToFactor, type AdemeFactorRef } from "@/lib/factors/ademeFactor";
import { buildFreeEntry, FREE_CLASSES, FREE_UNITS, isDocumentedFactor, type FreeClass } from "@/lib/collect/freeEntry";
import { sourceLabel } from "@/lib/collect/linePreview";
import { SourceUncertaintyFields } from "./SourceUncertaintyFields";

interface SaisieLibreProps {
  organizationId: string;
  siteId: string;
  organizationCountry: string;
  year: number;
  periodStart: string;
  periodEnd: string;
  onPeriodStart: (value: string) => void;
  onPeriodEnd: (value: string) => void;
  onClose: () => void;
}

export const SaisieLibre: React.FC<SaisieLibreProps> = ({
  organizationId,
  siteId,
  organizationCountry,
  year,
  periodStart,
  periodEnd,
  onPeriodStart,
  onPeriodEnd,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [designation, setDesignation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [customUnit, setCustomUnit] = useState("");
  const [classification, setClassification] = useState<FreeClass>("unknown");
  const [factor, setFactor] = useState<AdemeFactorRef | null>(null);
  const [draftFactor, setDraftFactor] = useState<AdemeFactorRef | null>(null);
  const [factorOpen, setFactorOpen] = useState(false);
  const [dataQuality, setDataQuality] = useState("");
  const [sourceType, setSourceType] = useState("unspecified");
  const [uncertainty, setUncertainty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const usedUnit = unit === "autre" ? customUnit.trim() : unit;
  const entry = useMemo(() => buildFreeEntry({
    organizationId,
    siteId: siteId || null,
    designation,
    quantity: Number(quantity),
    unit: usedUnit,
    periodStart,
    periodEnd,
    classification,
    factor: isDocumentedFactor(factor) ? factor : null,
    notes,
    dataQuality: dataQuality === "real" || dataQuality === "estimated" || dataQuality === "default" ? dataQuality : undefined,
    sourceType: sourceType === "unspecified" ? null : (sourceType as SourceType),
    uncertaintyPct: null,
  }), [organizationId, siteId, designation, quantity, usedUnit, periodStart, periodEnd, classification, factor, notes, dataQuality, sourceType]);

  const save = async (complete: boolean) => {
    const parsed = Number(quantity);
    if (!designation.trim()) {
      toast({ title: "Indiquez la désignation", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0 || !usedUnit) {
      toast({ title: "Saisissez une quantité et une unité", variant: "destructive" });
      return;
    }
    const uncertaintyResult = parseOptionalUncertainty(uncertainty);
    if (!uncertaintyResult.ok) {
      toast({ title: "Incertitude", description: uncertaintyResult.message, variant: "destructive" });
      return;
    }
    const built = buildFreeEntry({
      organizationId,
      siteId: siteId || null,
      designation,
      quantity: parsed,
      unit: usedUnit,
      periodStart,
      periodEnd,
      classification,
      factor: isDocumentedFactor(factor) ? factor : null,
      notes,
      dataQuality: dataQuality === "real" || dataQuality === "estimated" || dataQuality === "default" ? dataQuality : undefined,
      sourceType: sourceType === "unspecified" ? null : (sourceType as SourceType),
      uncertaintyPct: uncertaintyResult.value,
    });
    if (complete && !built.counted) return;
    setSaving(true);
    try {
      await ActivityDataService.create(built.payload);
      if (siteId) sessionStorage.setItem("collect-site", siteId);
      await queryClient.invalidateQueries({ queryKey: ["activity-data"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      window.dispatchEvent(new Event("activityDataUpdated"));
      setSaved(`${designation.trim()} · ${built.resultLabel}`);
      toast({ title: "Ligne enregistrée", description: built.counted ? built.resultLabel : "À compléter" });
    } catch (error) {
      toast({ title: "Enregistrement impossible", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">Saisie libre. Le type de la liste n’est pas utilisé, et aucun scope n’est déduit de « Autres activités ».</p>
        <Button type="button" variant="ghost" onClick={onClose}>Utiliser un type de la liste</Button>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Données d’activité</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Désignation</Label>
              <Input value={designation} onChange={(event) => setDesignation(event.target.value)} placeholder="Ex. tôle d’acier, soudure, solvant" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Quantité</Label>
                <Input type="number" step="any" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Unité</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREE_UNITS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    <SelectItem value="autre">Autre unité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {unit === "autre" && (
                <div className="col-span-2 space-y-1">
                  <Label>Unité saisie</Label>
                  <Input value={customUnit} onChange={(event) => setCustomUnit(event.target.value)} placeholder="Ex. pièce, palette" />
                </div>
              )}
              <div className="space-y-1">
                <Label>Début de période</Label>
                <Input type="date" value={periodStart} onChange={(event) => onPeriodStart(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fin de période</Label>
                <Input type="date" value={periodEnd} onChange={(event) => onPeriodEnd(event.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Classement</Label>
              <Select value={classification} onValueChange={(value) => setClassification(value as FreeClass)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREE_CLASSES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Cette précision sert seulement à la catégorie et au scope. Elle ne remplace pas votre désignation.</p>
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
                <SourceUncertaintyFields sourceType={sourceType} uncertainty={uncertainty} onSourceType={setSourceType} onUncertainty={setUncertainty} />
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
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Facteur et calcul</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {factor && isDocumentedFactor(factor) ? (
              <div>
                <div className="text-sm font-medium">{factor.name}</div>
                <div className="text-2xl font-semibold">{factor.value.toLocaleString("fr-FR")} <span className="text-base font-normal">{factor.unit.replace("CO2", "CO₂")}</span></div>
                <p className="text-xs text-muted-foreground">Source : {sourceLabel(factor.sourceName ?? null)}</p>
              </div>
            ) : (
              <p className="text-sm">Aucun facteur choisi. Les émissions ne sont pas calculées.</p>
            )}
            <Button type="button" variant="outline" onClick={() => { setDraftFactor(factor); setFactorOpen(true); }}>Changer le facteur</Button>
            {entry.warning && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>{entry.warning}</AlertDescription>
              </Alert>
            )}
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-3xl font-semibold">{entry.resultLabel}</p>
            </div>
            <p className="text-xs text-muted-foreground">Le facteur est copié sur cette ligne. Il n’est pas ajouté à la base partagée.</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={saving} onClick={() => void save(false)}>Enregistrer à compléter</Button>
        <Button type="button" disabled={saving || !entry.counted} onClick={() => void save(true)}>Enregistrer</Button>
      </div>
      {saved && <Alert><AlertDescription>{saved}. La ligne est dans la liste des données.</AlertDescription></Alert>}
      <Dialog open={factorOpen} onOpenChange={setFactorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Choisir un facteur</DialogTitle></DialogHeader>
          <EmissionFactorSelector
            subcategorySlug=""
            unit={usedUnit}
            siteCountry={organizationCountry}
            reportingYear={year}
            onChange={(_slug, next) => {
              const selected = selectionToFactor(next);
              if (selected) setDraftFactor(selected);
            }}
          />
          {!isDocumentedFactor(draftFactor) && draftFactor?.sourceKey === "manual" && (
            <p className="text-sm text-destructive">Indiquez la source du facteur personnalisé.</p>
          )}
          <Button
            type="button"
            disabled={!isDocumentedFactor(draftFactor)}
            onClick={() => {
              if (!draftFactor || !isDocumentedFactor(draftFactor)) return;
              setFactor(draftFactor);
              setFactorOpen(false);
            }}
          >
            Utiliser ce facteur
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
