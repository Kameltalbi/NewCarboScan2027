import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  buildReductionTrajectory,
  type IntermediateTarget,
  type TrajectoryKind,
} from "@/lib/net-zero/reductionTrajectory";
import type { ClimateRoadmap } from "../types";
import { ReductionTrajectoryChart } from "../components/ReductionTrajectoryChart";
import { MethodNoteLink } from "@/components/method/MethodNoteLink";

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readIntermediates(roadmap: ClimateRoadmap): IntermediateTarget[] {
  const raw = roadmap.intermediate_targets;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    year: Number(item.year),
    reductionPercent: Number(item.reduction_percent),
  }));
}

export function TrajectorySection({
  roadmap,
  actuals,
  onSave,
}: {
  roadmap: ClimateRoadmap;
  actuals: Array<{ year: number; emissionsT: number }>;
  onSave: (patch: Partial<ClimateRoadmap>) => Promise<unknown>;
}) {
  const [referenceYear, setReferenceYear] = useState(String(roadmap.baseline_year ?? ""));
  const [referenceEmissions, setReferenceEmissions] = useState(
    roadmap.baseline_emissions_tco2e == null ? "" : String(roadmap.baseline_emissions_tco2e),
  );
  const [targetYear, setTargetYear] = useState(String(roadmap.target_year ?? ""));
  const [reductionPercent, setReductionPercent] = useState(
    roadmap.reduction_target_percent == null ? "" : String(roadmap.reduction_target_percent),
  );
  const [kind, setKind] = useState<TrajectoryKind>(roadmap.trajectory_kind === "personalized" ? "personalized" : "reference");
  const [intermediates, setIntermediates] = useState<IntermediateTarget[]>(() => readIntermediates(roadmap));
  const [saving, setSaving] = useState(false);

  const view = useMemo(() => buildReductionTrajectory({
    referenceYear: asNumber(referenceYear),
    referenceEmissionsT: asNumber(referenceEmissions),
    targetYear: asNumber(targetYear),
    reductionPercent: asNumber(reductionPercent),
    kind,
    intermediates,
    actuals,
  }), [referenceYear, referenceEmissions, targetYear, reductionPercent, kind, intermediates, actuals]);

  const save = async () => {
    if (view.status !== "ready") {
      toast.error("Renseignez l'année de référence, les émissions, l'année cible et le pourcentage.");
      return;
    }
    const last = view.points[view.points.length - 1];
    setSaving(true);
    try {
      await onSave({
        baseline_year: Math.trunc(Number(referenceYear)),
        baseline_emissions_tco2e: Number(referenceEmissions),
        target_year: Math.trunc(Number(targetYear)),
        reduction_target_percent: Number(reductionPercent),
        target_emissions_tco2e: last?.targetT ?? null,
        trajectory_kind: kind,
        intermediate_targets: kind === "personalized"
          ? intermediates.map((item) => ({ year: item.year, reduction_percent: item.reductionPercent }))
          : [],
      });
      toast.success("Trajectoire enregistrée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="trajectory-section">
      <div>
        <h2 className="text-lg font-semibold">Trajectoire de réduction</h2>
        <p className="text-sm text-muted-foreground">
          La droite de référence relie l&apos;année de référence à l&apos;année cible. La trajectoire personnalisée passe par les jalons saisis. Une trajectoire nommée, SBTi ou autre, reste à valider.{" "}
          <MethodNoteLink noteId="trajectoire" label="Note de méthode" />
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="traj-ref-year">Année de référence</Label>
          <Input id="traj-ref-year" inputMode="numeric" value={referenceYear} onChange={(e) => setReferenceYear(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="traj-ref-emissions">Émissions de référence (tCO₂e)</Label>
          <Input id="traj-ref-emissions" inputMode="decimal" value={referenceEmissions} onChange={(e) => setReferenceEmissions(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="traj-target-year">Année cible</Label>
          <Input id="traj-target-year" inputMode="numeric" value={targetYear} onChange={(e) => setTargetYear(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="traj-percent">Objectif de réduction (%)</Label>
          <Input id="traj-percent" inputMode="decimal" value={reductionPercent} onChange={(e) => setReductionPercent(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={kind === "reference" ? "default" : "outline"} onClick={() => setKind("reference")}>
          Trajectoire de référence
        </Button>
        <Button type="button" variant={kind === "personalized" ? "default" : "outline"} onClick={() => setKind("personalized")}>
          Trajectoire personnalisée
        </Button>
      </div>
      {kind === "personalized" && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Objectifs intermédiaires</p>
          {intermediates.map((item, index) => (
            <div key={`${item.year}-${index}`} className="flex gap-2">
              <Input
                aria-label={`Année du jalon ${index + 1}`}
                inputMode="numeric"
                value={Number.isFinite(item.year) ? String(item.year) : ""}
                onChange={(e) => {
                  const year = e.target.value.trim() === "" ? Number.NaN : Number(e.target.value);
                  setIntermediates((prev) => prev.map((row, i) => i === index ? { ...row, year } : row));
                }}
              />
              <Input
                aria-label={`Réduction du jalon ${index + 1}`}
                inputMode="decimal"
                value={Number.isFinite(item.reductionPercent) ? String(item.reductionPercent) : ""}
                onChange={(e) => {
                  const reductionPercentValue = e.target.value.trim() === "" ? Number.NaN : Number(e.target.value);
                  setIntermediates((prev) => prev.map((row, i) => i === index ? { ...row, reductionPercent: reductionPercentValue } : row));
                }}
              />
              <Button type="button" variant="outline" onClick={() => setIntermediates((prev) => prev.filter((_, i) => i !== index))}>
                Retirer
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIntermediates((prev) => [...prev, { year: NaN, reductionPercent: NaN }])}
          >
            Ajouter un jalon
          </Button>
        </div>
      )}
      {view.status === "empty" ? (
        <p className="text-sm text-muted-foreground" data-testid="trajectory-empty">
          La courbe s&apos;affiche lorsque l&apos;année de référence, les émissions de référence, l&apos;année cible et l&apos;objectif de réduction sont renseignés.
        </p>
      ) : (
        <ReductionTrajectoryChart points={view.points} />
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={saving}>Enregistrer la trajectoire</Button>
        <Button type="button" variant="outline" asChild>
          <Link to="/app/transition/actions">Ouvrir les actions de réduction</Link>
        </Button>
      </div>
    </div>
  );
}
