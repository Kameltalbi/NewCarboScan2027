import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTransitionDashboard } from "../hooks/useTransitionDashboard";
import { TransitionTrajectoryChart } from "../components/TransitionTrajectoryChart";
import { ReferenceMethodDrawer } from "../components/ReferenceMethodDrawer";
import {
  buildCompanyTargetSeries,
  buildReferenceSeries,
  mergeTransitionSeries,
  resolveTargetEmissions,
} from "../lib/trajectoryComparison";
import {
  OBJECTIVE_TYPE_LABEL,
  VALIDATION_STATUS_LABEL,
  type ClimateObjective,
} from "../types";
import { CNZS_V131_META } from "../lib/sbti/cnzsV131AbsoluteContraction";

const fmt = (n: number, digits = 1) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);

/**
 * Page Trajectoires — Phase 2 : configuration référentielle + comparaison multi-courbes.
 */
export const TransitionTrajectoriesPage: React.FC = () => {
  const d = useTransitionDashboard();
  const [showActual, setShowActual] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const [showScenario, setShowScenario] = useState(false);
  const [showReference, setShowReference] = useState(true);
  const [compareObjectiveId, setCompareObjectiveId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultYear = d.defaultYear;
  const split = d.suggestScopeSplit(defaultYear);
  const [baselineYear, setBaselineYear] = useState(String(defaultYear));
  const [targetYear, setTargetYear] = useState("2030");
  const [scope1, setScope1] = useState("");
  const [scope2, setScope2] = useState("");

  const openConfig = () => {
    const y = d.defaultYear;
    const s = d.suggestScopeSplit(y);
    setBaselineYear(String(y));
    setTargetYear("2030");
    setScope1(s ? String(Math.round(s.scope1 * 10) / 10) : "");
    setScope2(s ? String(Math.round(s.scope2 * 10) / 10) : "");
    setError(null);
    setConfigOpen(true);
  };

  const fillFromBilan = () => {
    const y = Number(baselineYear);
    const s = d.suggestScopeSplit(y);
    if (!s) {
      setError(`Aucun bilan trouvé pour ${y}.`);
      return;
    }
    setScope1(String(Math.round(s.scope1 * 10) / 10));
    setScope2(String(Math.round(s.scope2 * 10) / 10));
    setError(null);
  };

  const submitConfig = async () => {
    setSaving(true);
    setError(null);
    try {
      await d.createReferenceTrajectory({
        name: "Trajectoire de référence 1,5 °C",
        baseline_year: Number(baselineYear),
        target_year: Number(targetYear),
        scope1_emissions: Number(scope1),
        scope2_emissions: Number(scope2),
        framework_version_id: d.referenceFrameworkVersion?.id ?? null,
      });
      setConfigOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  };

  const compareObjective =
    d.objectives.find((o) => o.id === compareObjectiveId) || d.primary;

  const chartPoints = useMemo(
    () =>
      mergeTransitionSeries({
        actuals: d.actuals,
        companyObjective: compareObjective,
        scenarioByYear: d.scenarioSeries,
        reference15Enabled: !!d.referenceTrajectory && showReference,
        reference15ByYear: buildReferenceSeries(d.referenceTrajectory),
      }),
    [
      d.actuals,
      compareObjective,
      d.scenarioSeries,
      d.referenceTrajectory,
      showReference,
    ],
  );

  if (d.loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const ref = d.referenceTrajectory;
  const refS12 =
    ref != null
      ? Number(ref.scope1_emissions ?? 0) + Number(ref.scope2_emissions ?? 0)
      : split
        ? split.scope1 + split.scope2
        : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trajectoires</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comparez le réalisé, la trajectoire de référence 1,5&nbsp;°C, vos objectifs
          entreprise et vos scénarios.
        </p>
      </div>

      {/* Référence 1,5 °C */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trajectoire de référence
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Trajectoire de référence 1,5 °C
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cette trajectoire indique le rythme de réduction des émissions nécessaire pour
              suivre l&apos;objectif climatique sélectionné. CarboScan part de votre année de
              référence et compare vos émissions réelles à cette trajectoire pour mesurer
              votre progression.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Méthodologie : SBTi · Corporate Net-Zero Standard v1.3.1 · Near-Term
            </p>
            {ref ? (
              <div className="mt-3 space-y-1 text-sm">
                <p className="tabular-nums text-foreground">
                  {ref.base_year} → {ref.target_year} · dLARR{" "}
                  <span className="font-semibold">{fmt(Number(ref.dlarr_percent), 2)} %/an</span>{" "}
                  · cible {fmt(Number(ref.target_emissions))} tCO₂e
                </p>
                {d.referenceAlignment.needsNextExercise ? (
                  <p className="text-xs text-muted-foreground">
                    Suivi disponible à partir du prochain exercice
                  </p>
                ) : d.referenceAlignment.status !== "unknown" ? (
                  <p className="text-xs text-muted-foreground">
                    {d.referenceAlignment.status === "on_track"
                      ? "Sur la trajectoire"
                      : d.referenceAlignment.status === "ahead"
                        ? "En avance"
                        : "Écart à réduire"}
                    {d.referenceAlignment.gapT != null &&
                      ` · ${d.referenceAlignment.gapT > 0 ? "+" : ""}${fmt(d.referenceAlignment.gapT)} tCO₂e`}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  onClick={() => setMethodOpen(true)}
                >
                  Voir la méthode de calcul →
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Aucune trajectoire configurée. Ce n&apos;est pas une validation SBTi.
              </p>
            )}
          </div>
          <Button variant="outline" className="shrink-0 gap-2" onClick={openConfig}>
            <Settings2 className="h-4 w-4" />
            {ref ? "Reconfigurer" : "Configurer une trajectoire"}
          </Button>
        </div>
      </div>

      {/* Objectifs entreprise */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Objectifs entreprise</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Définissez votre propre objectif de réduction. CarboScan calcule la cible
              correspondante et suit chaque année votre progression par rapport à cet
              objectif.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/transition/objectifs">Gérer les objectifs</Link>
          </Button>
        </div>

        {d.objectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun objectif. Créez une réduction absolue (ex. −30 % Scope 1+2 d&apos;ici 2030)
            pour afficher une courbe « Objectif entreprise ».
          </p>
        ) : (
          <div className="space-y-2">
            {d.objectives.map((o) => (
              <ObjectiveTrajectoryRow
                key={o.id}
                objective={o}
                selected={compareObjective?.id === o.id}
                onSelect={() => setCompareObjectiveId(o.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Graphique */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <Toggle id="tr-a" checked={showActual} onChange={setShowActual} label="Réalisé" />
          <Toggle
            id="tr-r"
            checked={showReference}
            onChange={setShowReference}
            label="Trajectoire 1,5 °C"
          />
          <Toggle
            id="tr-o"
            checked={showCompany}
            onChange={setShowCompany}
            label="Objectif entreprise"
          />
          <Toggle id="tr-s" checked={showScenario} onChange={setShowScenario} label="Scénario What-If" />
        </div>
        <TransitionTrajectoryChart
          points={chartPoints}
          showActual={showActual}
          showCompany={showCompany && !!compareObjective}
          showScenario={showScenario && d.scenarioSeries.length > 0}
          showReference15={showReference && !!ref}
          meta={{
            baselineYear: ref?.base_year ?? compareObjective?.baseline_year ?? null,
            baselineEmissionsT:
              ref != null
                ? Number(ref.baseline_emissions)
                : compareObjective?.baseline_value != null
                  ? Number(compareObjective.baseline_value)
                  : d.actuals.find((a) => a.year === (compareObjective?.baseline_year ?? d.defaultYear))
                      ?.emissionsT ?? null,
            targetYear: ref?.target_year ?? compareObjective?.target_year ?? null,
            targetEmissionsT:
              ref != null
                ? Number(ref.target_emissions)
                : resolveTargetEmissions(compareObjective) ?? null,
            dlarrPercent: ref != null ? Number(ref.dlarr_percent) : null,
            onOpenMethod: () => setMethodOpen(true),
          }}
        />
        <ul className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li>
            <span className="font-medium text-foreground">Réalisé</span> = émissions
            réellement mesurées (bilans).
          </li>
          <li>
            <span className="font-medium text-foreground">Trajectoire 1,5 °C</span> =
            référence climatique selon la méthodologie sélectionnée.
          </li>
          <li>
            <span className="font-medium text-foreground">Objectif entreprise</span> =
            objectif choisi par l&apos;organisation.
          </li>
          <li>
            <span className="font-medium text-foreground">Scénario What-If</span> = résultat
            estimé des leviers envisagés (projection).
          </li>
        </ul>
      </div>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurer une trajectoire</DialogTitle>
            <DialogDescription>
              Trajectoire de référence 1,5 °C — calcul CarboScan, distinct de toute validation
              SBTi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <InfoRow label="Référentiel" value="SBTi" />
            <InfoRow
              label="Version"
              value="Corporate Net-Zero Standard v1.3.1"
            />
            <InfoRow label="Type" value="Near-Term" />
            <InfoRow label="Ambition" value="1,5 °C" />
            <InfoRow label="Méthode" value="Absolute Contraction Approach" />
            <InfoRow label="Périmètre" value="Scope 1 + Scope 2" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="by">Année de référence</Label>
              <Input
                id="by"
                type="number"
                value={baselineYear}
                onChange={(e) => setBaselineYear(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ty">Année cible</Label>
              <Input
                id="ty"
                type="number"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="s1">Scope 1 (tCO₂e)</Label>
              <Input
                id="s1"
                type="number"
                step="0.1"
                value={scope1}
                onChange={(e) => setScope1(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="s2">Scope 2 (tCO₂e)</Label>
              <Input
                id="s2"
                type="number"
                step="0.1"
                value={scope2}
                onChange={(e) => setScope2(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Valeur de référence :{" "}
              {scope1 !== "" && scope2 !== ""
                ? `${fmt(Number(scope1) + Number(scope2))} tCO₂e Scope 1+2`
                : "—"}
              {refS12 != null && scope1 === "" ? ` (bilan ≈ ${fmt(refS12)})` : ""}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={fillFromBilan}>
              Depuis le bilan
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => void submitConfig()}
              disabled={saving || !scope1 || !scope2}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Calculer et enregistrer
            </Button>
          </DialogFooter>
          <p className="text-[11px] text-muted-foreground">
            method_key : {CNZS_V131_META.methodKey} · pondération S1/S2 documentée comme
            reconstruite
          </p>
        </DialogContent>
      </Dialog>

      <ReferenceMethodDrawer
        open={methodOpen}
        onOpenChange={setMethodOpen}
        trajectory={ref}
      />
    </div>
  );
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function ObjectiveTrajectoryRow({
  objective,
  selected,
  onSelect,
}: {
  objective: ClimateObjective;
  selected: boolean;
  onSelect: () => void;
}) {
  const target = resolveTargetEmissions(objective);
  const series = buildCompanyTargetSeries(objective);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
        selected ? "border-emerald-300 bg-emerald-50/50" : "border-border hover:bg-muted/30"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {objective.is_primary && (
              <span className="mr-2 text-[10px] font-semibold uppercase text-emerald-700">
                Principal
              </span>
            )}
            {objective.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {OBJECTIVE_TYPE_LABEL[objective.objective_type]} ·{" "}
            {VALIDATION_STATUS_LABEL[objective.validation_status]} · {objective.baseline_year} →{" "}
            {objective.target_year}
            {series.length > 0 ? ` · ${series.length} points` : ""}
          </p>
          {objective.baseline_value != null && target != null && (
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              {fmt(Number(objective.baseline_value))} → {fmt(target)} tCO₂e
            </p>
          )}
        </div>
        <div className="text-right text-sm tabular-nums">
          {objective.reduction_percent != null && (
            <p className="font-semibold">−{fmt(Number(objective.reduction_percent))} %</p>
          )}
          {target != null && (
            <p className="text-xs text-muted-foreground">{fmt(target)} tCO₂e cible</p>
          )}
        </div>
      </div>
    </button>
  );
}

function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}
