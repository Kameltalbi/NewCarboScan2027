import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTransitionDashboard } from "../hooks/useTransitionDashboard";
import { TransitionTrajectoryChart } from "../components/TransitionTrajectoryChart";
import { ReferenceMethodDrawer } from "../components/ReferenceMethodDrawer";
import { alignmentLabel, resolveTargetEmissions } from "../lib/trajectoryComparison";
import { VALIDATION_STATUS_LABEL } from "../types";

const fmt = (n: number, digits = 1) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);

export const TransitionOverviewPage: React.FC = () => {
  const d = useTransitionDashboard();
  const [showActual, setShowActual] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const [showScenario, setShowScenario] = useState(true);
  const [showReference, setShowReference] = useState(true);
  const [methodOpen, setMethodOpen] = useState(false);

  if (d.loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const companyTarget = d.primary ? resolveTargetEmissions(d.primary) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Transition &amp; trajectoires
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Synthèse de votre transition : émissions de référence, trajectoire 1,5&nbsp;°C,
            objectif principal, scénarios et contribution du plan d&apos;actions.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/app/transition/objectifs">
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter un objectif
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          Exercice : <span className="font-medium text-foreground">{d.defaultYear}</span>
        </span>
        <span>·</span>
        <span>
          Périmètre :{" "}
          <span className="font-medium text-foreground">
            Tous les sites{d.sites.length > 0 ? ` (${d.sites.length})` : ""}
          </span>
        </span>
        {d.actuals.length > 0 && (
          <>
            <span>·</span>
            <span>
              Bilans :{" "}
              <span className="font-medium text-foreground">
                {d.actuals.map((a) => a.year).sort((a, b) => a - b).join(", ")}
              </span>
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Émissions de référence"
          value={d.referenceEmissions != null ? `${fmt(d.referenceEmissions)} tCO₂e` : "—"}
          hint={
            d.primary
              ? `Année ${d.primary.baseline_year}`
              : d.actuals.length
                ? "Dernier bilan disponible"
                : "Aucun bilan enregistré"
          }
        />
        <Kpi
          label="Objectif principal"
          value={
            d.primary?.reduction_percent != null
              ? `−${fmt(Number(d.primary.reduction_percent))} % en ${d.primary.target_year}`
              : d.primary
                ? d.primary.name
                : "Non défini"
          }
          hint={
            d.primary
              ? VALIDATION_STATUS_LABEL[d.primary.validation_status]
              : "Objectif entreprise — pas SBTi"
          }
        />
        <Kpi
          label="Émissions cibles"
          value={d.targetEmissions != null ? `${fmt(d.targetEmissions)} tCO₂e` : "—"}
          hint={d.primary ? `Horizon ${d.primary.target_year}` : "Selon l'objectif principal"}
        />
        <Kpi
          label="Écart à la trajectoire"
          value={
            d.referenceTrajectory
              ? d.referenceAlignment.needsNextExercise
                ? "Suivi à venir"
                : d.referenceAlignment.status === "unknown"
                  ? "—"
                  : alignmentLabel(d.referenceAlignment.status)
              : d.alignment.status === "unknown"
                ? "—"
                : alignmentLabel(d.alignment.status)
          }
          hint={
            d.referenceAlignment.needsNextExercise
              ? "Suivi disponible à partir du prochain exercice"
              : d.referenceAlignment.gapT != null && d.referenceAlignment.year != null
                ? `${d.referenceAlignment.gapT > 0 ? "+" : ""}${fmt(d.referenceAlignment.gapT)} tCO₂e (${d.referenceAlignment.year})`
                : d.alignment.gapT != null && d.alignment.year != null
                  ? `${d.alignment.gapT > 0 ? "+" : ""}${fmt(d.alignment.gapT)} tCO₂e (${d.alignment.year})`
                  : "Calculable avec une trajectoire / un objectif et un bilan"
          }
        />
      </div>

      {/* Graphique dominant */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Trajectoire de réduction</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Réalisé · Trajectoire 1,5 °C · Objectif entreprise · Scénario
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Toggle id="ov-actual" checked={showActual} onChange={setShowActual} label="Réalisé" />
            <Toggle
              id="ov-ref"
              checked={showReference}
              onChange={setShowReference}
              label="Trajectoire 1,5 °C"
            />
            <Toggle
              id="ov-obj"
              checked={showCompany}
              onChange={setShowCompany}
              label="Objectif entreprise"
            />
            <Toggle
              id="ov-scen"
              checked={showScenario}
              onChange={setShowScenario}
              label="Scénario What-If"
            />
          </div>
        </div>

        {showReference && !d.referenceTrajectoryReady && (
          <div className="mb-4 flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Trajectoire de référence — à configurer
              </p>
              <p className="text-xs text-muted-foreground">
                Aucune courbe 1,5 °C n&apos;est générée tant qu&apos;une trajectoire n&apos;est
                pas configurée. Ce n&apos;est pas un objectif SBTi validé.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to="/app/transition/trajectoires">Configurer une trajectoire</Link>
            </Button>
          </div>
        )}

        {d.actuals.length === 0 && !d.primary && (
          <p className="mb-3 text-sm text-muted-foreground">
            Aucun bilan ni objectif : le graphique se remplira dès qu&apos;un exercice ou un
            objectif entreprise sera disponible.
          </p>
        )}

        <TransitionTrajectoryChart
          points={d.chartPoints}
          showActual={showActual}
          showCompany={showCompany && !!d.primary}
          showScenario={showScenario && d.scenarioSeries.length > 0}
          showReference15={showReference && d.referenceTrajectoryReady}
          meta={{
            baselineYear:
              d.referenceTrajectory?.base_year ?? d.primary?.baseline_year ?? null,
            baselineEmissionsT:
              d.referenceTrajectory != null
                ? Number(d.referenceTrajectory.baseline_emissions)
                : d.primary?.baseline_value != null
                  ? Number(d.primary.baseline_value)
                  : d.actuals[0]?.emissionsT ?? null,
            targetYear:
              d.referenceTrajectory?.target_year ?? d.primary?.target_year ?? null,
            targetEmissionsT:
              d.referenceTrajectory != null
                ? Number(d.referenceTrajectory.target_emissions)
                : companyTarget,
            dlarrPercent:
              d.referenceTrajectory != null
                ? Number(d.referenceTrajectory.dlarr_percent)
                : null,
            onOpenMethod: () => setMethodOpen(true),
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {d.scenarios.length > 0 ? (
            <>
              <span className="text-muted-foreground">Scénario :</span>
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                value={d.selectedScenarioId ?? ""}
                onChange={(e) => d.setSelectedScenarioId(e.target.value || null)}
              >
                {d.scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {!d.scenarioSimulationPersisted && d.scenarioSeries.length > 0 && (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
                  Simulation non enregistrée
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Aucun scénario — créez-en un pour comparer une simulation.
            </span>
          )}
        </div>
      </div>

      {/* Trajectoire de référence 1,5 °C — explication simple */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Trajectoire de référence 1,5 °C
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Cette trajectoire indique le rythme de réduction des émissions nécessaire pour
          suivre l&apos;objectif climatique sélectionné. CarboScan part de votre année de
          référence et compare ensuite vos émissions réelles à cette trajectoire pour
          mesurer votre avance ou votre écart.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Méthodologie : SBTi · Corporate Net-Zero Standard v1.3.1 · Near-Term
        </p>
        {d.referenceTrajectory ? (
          <button
            type="button"
            className="mt-3 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            onClick={() => setMethodOpen(true)}
          >
            Voir la méthode de calcul →
          </button>
        ) : (
          <Button asChild variant="link" className="mt-2 h-auto px-0 text-emerald-700">
            <Link to="/app/transition/trajectoires">Configurer une trajectoire →</Link>
          </Button>
        )}
      </div>

      {/* Objectif entreprise */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Objectif entreprise</h2>
        {d.primary ? (
          <div className="mt-3 space-y-2">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {d.primary.reduction_percent != null
                ? `−${fmt(Number(d.primary.reduction_percent))} %`
                : d.primary.name}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                d&apos;ici {d.primary.target_year}
              </span>
            </p>
            {d.primary.baseline_value != null && companyTarget != null && (
              <p className="text-sm tabular-nums text-muted-foreground">
                {fmt(Number(d.primary.baseline_value))} → {fmt(companyTarget)} tCO₂e
              </p>
            )}
            <p className="max-w-2xl text-sm text-muted-foreground">
              Définissez votre propre objectif de réduction. CarboScan calcule la cible
              correspondante et suit chaque année votre progression par rapport à cet
              objectif.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun objectif principal. Ajoutez un objectif entreprise distinct de la
            trajectoire de référence.
          </p>
        )}
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/app/transition/objectifs">Gérer les objectifs</Link>
        </Button>
      </div>

      {/* Cartes synthèse */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SummaryCard
          title="Objectifs"
          lines={[
            d.primary ? `Principal : ${d.primary.name}` : "Aucun objectif principal",
            d.primary ? `Cible ${d.primary.target_year}` : null,
            d.objectiveProgress != null
              ? `Progression : ${fmt(d.objectiveProgress)} %`
              : d.primary
                ? "Progression : — (bilan manquant sur la période)"
                : null,
          ].filter(Boolean) as string[]}
          cta="Voir les objectifs →"
          to="/app/transition/objectifs"
        />
        <SummaryCard
          title="Scénarios"
          lines={[
            `${d.scenarios.length} scénario${d.scenarios.length > 1 ? "s" : ""}`,
            d.selectedScenario
              ? `Sélectionné : ${d.selectedScenario.name}`
              : "Aucun scénario sélectionné",
          ]}
          cta="Explorer les scénarios →"
          to="/app/transition/scenarios"
        />
        <SummaryCard
          title="Plan d'actions"
          lines={
            d.actionStats.loading
              ? ["Chargement…"]
              : [
                  `${d.actionStats.total} action${d.actionStats.total > 1 ? "s" : ""}`,
                  `${d.actionStats.inProgress} en cours`,
                  `${d.actionStats.completed} terminée${d.actionStats.completed > 1 ? "s" : ""}`,
                ]
          }
          cta="Voir le plan d'actions →"
          to="/app/transition/actions"
        />
      </div>

      <ReferenceMethodDrawer
        open={methodOpen}
        onOpenChange={setMethodOpen}
        trajectory={d.referenceTrajectory}
      />
    </div>
  );
};

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
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

function SummaryCard({
  title,
  lines,
  cta,
  to,
}: {
  title: string;
  lines: string[];
  cta: string;
  to: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Link
        to={to}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
