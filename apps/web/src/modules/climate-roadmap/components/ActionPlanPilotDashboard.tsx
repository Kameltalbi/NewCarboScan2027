/**
 * Tableau de pilotage décarbonation — Plan d'actions.
 * Connecté à Transition & trajectoires ; aucune réduction / responsable / échéance inventés.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Target, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRecommendedActions, type RecommendedAction } from "@/lib/recommendedActions";
import type { ClimateObjective } from "@/modules/transition/types";
import type { DataSourceSummary } from "../hooks/useAvailableBaselineData";
import type { ClimateAction, ActionStatus } from "../types";
import {
  PILOT_STATUS_LABELS,
  PILOT_STATUSES,
  type PilotStatus,
  toPilotStatus,
  formatReductionT,
  isQuantifiedReduction,
  isActivePlanAction,
  sumQuantifiedReductions,
  computeObjectiveCoverage,
} from "../lib/actionPlanPilot";

const DISMISS_KEY = "carboscan.plan-actions.dismissed-recs";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
}

function dateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDateFr(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
}

function pilotStatusBadgeClass(status: PilotStatus): string {
  switch (status) {
    case "studying":
      return "bg-slate-100 text-slate-800";
    case "validated":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-amber-100 text-amber-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

interface ActionPlanPilotDashboardProps {
  dataSources: DataSourceSummary;
  actions: ClimateAction[];
  primaryObjective: ClimateObjective | null;
  roadmapBaselineT: number | null;
  roadmapTargetT: number | null;
  roadmapTargetYear: number | null;
  onEnsureRoadmap: () => Promise<string | null>;
  onCreateAction: (action: Partial<ClimateAction>) => Promise<ClimateAction | null>;
  onUpdateAction: (id: string, updates: Partial<ClimateAction>) => Promise<boolean>;
  onCreateManual?: () => void;
}

export const ActionPlanPilotDashboard: React.FC<ActionPlanPilotDashboardProps> = ({
  dataSources,
  actions,
  primaryObjective,
  roadmapBaselineT,
  roadmapTargetT,
  roadmapTargetYear,
  onEnsureRoadmap,
  onCreateAction,
  onUpdateAction,
}) => {
  const [recs, setRecs] = useState<RecommendedAction[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [selected, setSelected] = useState<ClimateAction | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const latestBilan = dataSources.bilans[0] || null;

  const fetchRecs = useCallback(async () => {
    if (!latestBilan) {
      setRecs([]);
      setRecsLoading(false);
      return;
    }
    setRecsLoading(true);
    const toKg = (t: number) => t * 1000;
    const result = await getRecommendedActions({
      totalEmissions: toKg(latestBilan.totalEmissions),
      scope1: toKg(latestBilan.scope1),
      scope2: toKg(latestBilan.scope2),
      scope3: toKg(latestBilan.scope3),
      categoryBreakdown: [],
      majorityScope:
        latestBilan.scope3 >= latestBilan.scope1 && latestBilan.scope3 >= latestBilan.scope2
          ? 3
          : latestBilan.scope1 >= latestBilan.scope2
            ? 1
            : 2,
    });
    setRecs(result);
    setRecsLoading(false);
  }, [latestBilan]);

  useEffect(() => {
    void fetchRecs();
  }, [fetchRecs]);

  const planActions = useMemo(
    () => actions.filter(isActivePlanAction),
    [actions],
  );

  const inProgressCount = planActions.filter((a) => a.status === "in_progress").length;

  const potentialReduction = useMemo(() => {
    const { totalT, quantifiedCount } = sumQuantifiedReductions(planActions);
    return { totalT, quantifiedCount };
  }, [planActions]);

  const baselineT = useMemo(() => {
    if (primaryObjective?.baseline_value != null && Number.isFinite(Number(primaryObjective.baseline_value))) {
      return Number(primaryObjective.baseline_value);
    }
    return roadmapBaselineT;
  }, [primaryObjective, roadmapBaselineT]);

  const targetT = useMemo(() => {
    if (primaryObjective?.target_value != null && Number.isFinite(Number(primaryObjective.target_value))) {
      return Number(primaryObjective.target_value);
    }
    if (
      primaryObjective?.baseline_value != null &&
      primaryObjective?.reduction_percent != null &&
      Number.isFinite(Number(primaryObjective.baseline_value)) &&
      Number.isFinite(Number(primaryObjective.reduction_percent))
    ) {
      return (
        Number(primaryObjective.baseline_value) *
        (1 - Number(primaryObjective.reduction_percent) / 100)
      );
    }
    return roadmapTargetT;
  }, [primaryObjective, roadmapTargetT]);

  const targetYear =
    primaryObjective?.target_year ?? roadmapTargetYear ?? null;

  const objectiveLabel = useMemo(() => {
    if (primaryObjective) {
      const pct =
        primaryObjective.reduction_percent != null
          ? `−${fmtNum(Number(primaryObjective.reduction_percent))} %`
          : baselineT != null && targetT != null && baselineT > 0
            ? `−${fmtNum(((baselineT - targetT) / baselineT) * 100)} %`
            : null;
      const year = primaryObjective.target_year;
      if (pct && year) return `${pct} d’ici ${year}`;
      if (pct) return pct;
      return primaryObjective.name;
    }
    if (roadmapTargetT != null && roadmapBaselineT != null && roadmapBaselineT > 0) {
      const pct = ((roadmapBaselineT - roadmapTargetT) / roadmapBaselineT) * 100;
      return `−${fmtNum(pct)} %${roadmapTargetYear ? ` d’ici ${roadmapTargetYear}` : ""}`;
    }
    return null;
  }, [primaryObjective, baselineT, targetT, roadmapBaselineT, roadmapTargetT, roadmapTargetYear]);

  const coverage = useMemo(
    () =>
      computeObjectiveCoverage({
        baselineT: baselineT != null && Number.isFinite(baselineT) ? baselineT : null,
        targetT: targetT != null && Number.isFinite(targetT) ? targetT : null,
        plannedReductionT: potentialReduction.totalT,
        quantifiedActionCount: potentialReduction.quantifiedCount,
      }),
    [baselineT, targetT, potentialReduction],
  );

  const existingTitles = useMemo(
    () => new Set(planActions.map((a) => a.title.trim().toLowerCase())),
    [planActions],
  );

  const visibleRecs = useMemo(
    () =>
      recs.filter(
        (r) =>
          !dismissed.has(r.id) &&
          !existingTitles.has(r.titre.trim().toLowerCase()),
      ),
    [recs, dismissed, existingTitles],
  );

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const handleAddToPlan = async (rec: RecommendedAction) => {
    setAddingId(rec.id);
    try {
      const created = await onCreateAction({
        title: rec.titre,
        description: rec.description,
        status: "studying",
        priority: rec.priorite === "haute" ? "high" : rec.priorite === "basse" ? "low" : "medium",
        source_emission_targeted: rec.categorie,
        scope_concerned:
          rec.scope_cible === "tous"
            ? [1, 2, 3]
            : [Number(rec.scope_cible)],
        owner_name: null,
        target_date: null,
      });
      if (created) {
        toast.success("Action ajoutée au plan");
        handleDismiss(rec.id);
      } else {
        toast.error("Échec de l’ajout");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l’ajout");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Actions au total" value={String(planActions.length)} />
        <KpiCard label="Actions en cours" value={String(inProgressCount)} />
        <KpiCard
          label="Potentiel de réduction"
          value={
            potentialReduction.quantifiedCount > 0
              ? `${fmtNum(potentialReduction.totalT)} tCO₂e/an`
              : "À évaluer"
          }
          hint={
            potentialReduction.quantifiedCount > 0
              ? `${potentialReduction.quantifiedCount} action(s) quantifiée(s)`
              : "Quantifiez vos actions pour afficher le potentiel"
          }
        />
        <KpiCard
          label="Objectif principal"
          value={objectiveLabel || "Non défini"}
          hint={
            primaryObjective ? (
              <Link
                to="/app/transition/objectifs"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Voir dans Transition <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <Link
                to="/app/transition/objectifs"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Définir un objectif <ExternalLink className="h-3 w-3" />
              </Link>
            )
          }
        />
      </div>

      {/* Couverture objectif */}
      <section className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Couverture de l’objectif</h3>
        {coverage && targetYear ? (
          <p className="text-sm text-muted-foreground">
            Vos actions planifiées couvrent{" "}
            <span className="font-semibold text-foreground">{fmtNum(coverage.percent)} %</span>{" "}
            de la réduction nécessaire pour atteindre votre objectif {targetYear}.
            <span className="block text-xs mt-1">
              {fmtNum(coverage.plannedT)} tCO₂e/an quantifiés sur {fmtNum(coverage.neededT)}{" "}
              tCO₂e nécessaires.
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Quantifiez vos actions pour mesurer leur contribution à votre objectif.
          </p>
        )}
      </section>

      {/* Tableau Plan d'actions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Plan d’actions</h2>
        </div>
        {planActions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center space-y-2">
            <Target className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Aucune action dans le plan. Ajoutez une recommandation ci-dessous.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Action</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Poste d’émissions</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Réduction estimée</th>
                  <th className="px-3 py-2.5 font-medium">Échéance</th>
                  <th className="px-3 py-2.5 font-medium">Responsable</th>
                  <th className="px-3 py-2.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {planActions.map((action) => {
                  const pilot = toPilotStatus(action.status);
                  return (
                    <tr
                      key={action.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelected(action)}
                    >
                      <td className="px-3 py-3 font-medium text-foreground max-w-[280px]">
                        {action.title}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        {action.source_emission_targeted || "—"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {formatReductionT(action.expected_reduction_tco2e)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDateFr(action.target_date)}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {action.owner_name?.trim() || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-medium ${pilotStatusBadgeClass(pilot)}`}
                        >
                          {PILOT_STATUS_LABELS[pilot]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Actions recommandées */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Actions recommandées</h2>
          <p className="text-sm text-muted-foreground mt-1">
            CarboScan vous propose des actions à partir de vos principaux postes d’émissions.
          </p>
        </div>

        {!latestBilan ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Réalisez d’abord un bilan carbone pour obtenir des recommandations.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = "/app/collecte?mode=bilan-carbone";
              }}
            >
              Démarrer un bilan carbone
            </Button>
          </div>
        ) : recsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visibleRecs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucune recommandation disponible pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleRecs.map((rec) => (
              <li
                key={rec.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border px-4 py-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{rec.titre}</p>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {rec.categorie}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Réduction estimée : <span className="text-foreground">À évaluer</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={addingId === rec.id}
                    onClick={() => void handleAddToPlan(rec)}
                  >
                    {addingId === rec.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Ajouter au plan
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(rec.id)}
                  >
                    Ignorer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <ActionEditDialog
          action={selected}
          onClose={() => setSelected(null)}
          onUpdate={async (id, updates) => {
            const ok = await onUpdateAction(id, updates);
            if (ok) {
              toast.success("Action mise à jour");
              setSelected(null);
            }
            return ok;
          }}
        />
      )}
    </div>
  );
};

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground leading-tight">{value}</p>
      {hint ? <div className="text-[11px] text-muted-foreground pt-0.5">{hint}</div> : null}
    </div>
  );
}

function ActionEditDialog({
  action,
  onClose,
  onUpdate,
}: {
  action: ClimateAction;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ClimateAction>) => Promise<boolean>;
}) {
  const [status, setStatus] = useState<PilotStatus>(toPilotStatus(action.status));
  const [ownerName, setOwnerName] = useState(action.owner_name || "");
  const [targetDate, setTargetDate] = useState(dateInputValue(action.target_date));
  const [poste, setPoste] = useState(action.source_emission_targeted || "");
  const [reduction, setReduction] = useState(
    isQuantifiedReduction(action.expected_reduction_tco2e)
      ? String(action.expected_reduction_tco2e)
      : "",
  );
  const [notes, setNotes] = useState(action.comments || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const reductionNum =
      reduction.trim() === "" ? null : Number(reduction.replace(",", "."));
    const ok = await onUpdate(action.id, {
      status: status as ActionStatus,
      owner_name: ownerName.trim() || null,
      target_date: targetDate || null,
      source_emission_targeted: poste.trim() || null,
      expected_reduction_tco2e:
        reductionNum != null && Number.isFinite(reductionNum) && reductionNum > 0
          ? reductionNum
          : (null as unknown as number),
      comments: notes.trim() || null,
      progress_percent: status === "completed" ? 100 : action.progress_percent,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogTitle className="text-base font-semibold pr-6">{action.title}</DialogTitle>
        {action.description && (
          <p className="text-sm text-muted-foreground -mt-1">{action.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label className="text-xs">Statut</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PilotStatus)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PILOT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PILOT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label className="text-xs">Poste d’émissions</Label>
            <Input
              className="h-9 text-sm"
              value={poste}
              onChange={(e) => setPoste(e.target.value)}
              placeholder="Ex. Énergie"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Réduction estimée (tCO₂e/an)</Label>
            <Input
              className="h-9 text-sm"
              type="number"
              min={0}
              step="0.1"
              placeholder="À évaluer"
              value={reduction}
              onChange={(e) => setReduction(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Échéance</Label>
            <Input
              className="h-9 text-sm"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Responsable</Label>
            <Input
              className="h-9 text-sm"
              placeholder="Non assigné"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, hypothèses de calcul…"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
