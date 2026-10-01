import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Factory, Loader2, MapPin, Save } from "lucide-react";
import { ActivityDataService } from "@/lib/activity-data/ActivityDataService";
import {
  GHG_OPTIONS,
  validateProcessEmission,
  type FactorScale,
  type ProcessMode,
} from "@/lib/activity-data/processEmission";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SourceUncertaintyFields } from "./SourceUncertaintyFields";
import type { SourceType } from "@/lib/activity-data/uncertaintySummary";

interface SiteOption {
  id: string;
  name: string;
}

interface ProcessEmissionFormProps {
  organizationId: string | null;
  sites: SiteOption[];
  referenceYear: string | number;
  onSuccess?: () => void;
}

const emptyDraft = {
  processName: "",
  ghg: "",
  description: "",
  comment: "",
  justification: "",
  mode: "activity_factor" as ProcessMode,
  activityQuantity: "",
  activityUnit: "",
  factorValue: "",
  factorScale: "kg" as FactorScale,
  factorSource: "",
  directValue: "",
  directScale: "kg" as FactorScale,
  uncertaintyPct: "",
  dataQuality: "estimated" as "real" | "estimated" | "default",
};

export const ProcessEmissionForm: React.FC<ProcessEmissionFormProps> = ({
  organizationId,
  sites,
  referenceYear,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedSite, setSelectedSite] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodStart, setPeriodStart] = useState(`${referenceYear}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${referenceYear}-12-31`);
  const [form, setForm] = useState(emptyDraft);
  const [sourceType, setSourceType] = useState("unspecified");

  const preview = useMemo(() => validateProcessEmission(form), [form]);

  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast({
        title: "Erreur",
        description: "Organisation introuvable.",
        variant: "destructive",
      });
      return;
    }
    const prepared = validateProcessEmission(form);
    if (!prepared.ok) {
      toast({ title: "Fiche incomplète", description: prepared.message, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await ActivityDataService.create({
        organization_id: organizationId,
        activity_type: "process",
        category: "scope1",
        subcategory: prepared.subcategory,
        quantity: prepared.quantity,
        unit: prepared.unit,
        period_start: periodStart,
        period_end: periodEnd,
        data_quality: form.dataQuality,
        notes: prepared.notes,
        source_document: form.justification.trim() || null,
        emission_factor_source: prepared.factorSource,
        site_id: selectedSite === "all" ? null : selectedSite,
        scope_hint: 1,
        scope: 1,
        data_method: prepared.record.mode === "direct_emission" ? "direct_emission" : "physical",
        source_type: sourceType === "unspecified" ? null : (sourceType as SourceType),
        uncertainty_pct: prepared.record.uncertaintyPct,
      });

      toast({
        title: "Donnée enregistrée",
        description: `${prepared.record.processName} : ${prepared.kgCO2e.toLocaleString("fr-FR")} kgCO2e`,
      });
      setForm(emptyDraft);
      setSourceType("unspecified");
      queryClient.invalidateQueries({ queryKey: ["activity-data"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      window.dispatchEvent(new Event("activityDataUpdated"));
      onSuccess?.();
    } catch (error) {
      console.error("Error saving process emission:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le procédé.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card data-testid="scope1-process-form">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Procédé / autre émission directe
        </CardTitle>
        <CardDescription>
          Un procédé nommé, une réaction ou toute autre émission directe. Le facteur ou l'émission
          saisie est déjà en CO2e.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="process-name">Nom du procédé *</Label>
              <Input
                id="process-name"
                value={form.processName}
                onChange={(e) => set({ processName: e.target.value })}
                placeholder="Ex. : four de calcination, réaction, fuite de procédé"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="process-ghg">Gaz à effet de serre *</Label>
              <Select value={form.ghg || undefined} onValueChange={(value) => set({ ghg: value })}>
                <SelectTrigger id="process-ghg">
                  <SelectValue placeholder="Choisir un GES" />
                </SelectTrigger>
                <SelectContent>
                  {GHG_OPTIONS.map((gas) => (
                    <SelectItem key={gas} value={gas}>
                      {gas === "CO2e" ? "CO2e (mélange déjà agrégé)" : gas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="process-description">Description</Label>
            <Textarea
              id="process-description"
              rows={2}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Où et comment l'émission est produite"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="process-mode">Mode de saisie *</Label>
            <Select value={form.mode} onValueChange={(value: ProcessMode) => set({ mode: value })}>
              <SelectTrigger id="process-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activity_factor">Donnée d'activité × facteur</SelectItem>
                <SelectItem value="direct_emission">Émission déjà connue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.mode === "activity_factor" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="process-qty">Donnée d'activité *</Label>
                <Input
                  id="process-qty"
                  inputMode="decimal"
                  value={form.activityQuantity}
                  onChange={(e) => set({ activityQuantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="process-unit">Unité d'activité *</Label>
                <Input
                  id="process-unit"
                  value={form.activityUnit}
                  onChange={(e) => set({ activityUnit: e.target.value })}
                  placeholder="t, kg, m³, Nm³, unité"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="process-factor">Facteur d'émission *</Label>
                <Input
                  id="process-factor"
                  inputMode="decimal"
                  value={form.factorValue}
                  onChange={(e) => set({ factorValue: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="process-factor-unit">Unité du facteur *</Label>
                <Select
                  value={form.factorScale}
                  onValueChange={(value: FactorScale) => set({ factorScale: value })}
                >
                  <SelectTrigger id="process-factor-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kgCO2e / unité d'activité</SelectItem>
                    <SelectItem value="t">tCO2e / unité d'activité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="process-source">Source du facteur *</Label>
                <Input
                  id="process-source"
                  value={form.factorSource}
                  onChange={(e) => set({ factorSource: e.target.value })}
                  placeholder="Base, étude, mesure, année"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="process-direct">Émission déjà connue *</Label>
                <Input
                  id="process-direct"
                  inputMode="decimal"
                  value={form.directValue}
                  onChange={(e) => set({ directValue: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="process-direct-unit">Unité</Label>
                <Select
                  value={form.directScale}
                  onValueChange={(value: FactorScale) => set({ directScale: value })}
                >
                  <SelectTrigger id="process-direct-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kgCO2e</SelectItem>
                    <SelectItem value="t">tCO2e</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {preview.ok && (
            <Alert>
              <AlertDescription>
                Résultat : <strong>{preview.kgCO2e.toLocaleString("fr-FR")} kgCO2e</strong>
                {" "}({(preview.kgCO2e / 1000).toLocaleString("fr-FR")} tCO2e)
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="process-site" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Site
            </Label>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger id="process-site">
                <SelectValue placeholder="Sélectionner un site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Non spécifié (consolidé)</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="process-quality">Qualité des données</Label>
              <Select
                value={form.dataQuality}
                onValueChange={(value: "real" | "estimated" | "default") => set({ dataQuality: value })}
              >
                <SelectTrigger id="process-quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">Mesurée</Badge>
                      <span className="text-xs text-muted-foreground">Facture, compteur, analyse</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="estimated">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Estimée</Badge>
                      <span className="text-xs text-muted-foreground">Calcul, extrapolation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="default">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Par défaut</Badge>
                      <span className="text-xs text-muted-foreground">Donnée manquante</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SourceUncertaintyFields
              idPrefix="process"
              sourceType={sourceType}
              uncertainty={form.uncertaintyPct}
              onSourceType={setSourceType}
              onUncertainty={(value) => set({ uncertaintyPct: value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="process-justification">Justificatif</Label>
            <Textarea
              id="process-justification"
              rows={2}
              maxLength={500}
              value={form.justification}
              onChange={(e) => set({ justification: e.target.value })}
              placeholder="Référence du calcul, de la mesure ou du document"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="process-comment">Commentaire</Label>
            <Textarea
              id="process-comment"
              rows={2}
              value={form.comment}
              onChange={(e) => set({ comment: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="process-start">Début de période</Label>
              <Input
                id="process-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="process-end">Fin de période</Label>
              <Input
                id="process-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
