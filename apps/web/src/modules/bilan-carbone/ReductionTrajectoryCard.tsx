import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { buildReductionTrajectory, latestActualByYear, type TrajectoryKind } from "@/lib/net-zero/reductionTrajectory";
import { ReductionTrajectoryChart } from "@/modules/climate-roadmap/components/ReductionTrajectoryChart";

interface RoadmapRow {
  baseline_year?: number | null;
  baseline_emissions_tco2e?: number | string | null;
  target_year?: number | null;
  reduction_target_percent?: number | string | null;
  trajectory_kind?: string | null;
  intermediate_targets?: Array<{ year: number; reduction_percent: number }> | null;
  status?: string | null;
  updated_at?: string | null;
}

export function ReductionTrajectoryCard() {
  const [view, setView] = useState<ReturnType<typeof buildReductionTrajectory> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listClimateRoadmaps(), api.listBilans()])
      .then(([roadmaps, bilans]) => {
        if (cancelled) return;
        const items = (roadmaps.items || []) as RoadmapRow[];
        const roadmap = items.find((item) => item.status === "active") || items[0];
        const actuals = latestActualByYear(((bilans.items || []) as Array<Record<string, unknown>>).map((bilan) => ({
          year: bilan.reference_year == null ? null : Number(bilan.reference_year),
          emissionsT: bilan.total_emission == null ? null : Number(bilan.total_emission),
          updatedAt: typeof bilan.updated_at === "string" ? bilan.updated_at : null,
        })));
        if (!roadmap) {
          setView(buildReductionTrajectory({
            referenceYear: null,
            referenceEmissionsT: null,
            targetYear: null,
            reductionPercent: null,
            kind: null,
            intermediates: [],
            actuals,
          }));
          return;
        }
        const kind: TrajectoryKind | null = roadmap.trajectory_kind === "personalized"
          ? "personalized"
          : roadmap.trajectory_kind === "reference"
            ? "reference"
            : null;
        setView(buildReductionTrajectory({
          referenceYear: roadmap.baseline_year ?? null,
          referenceEmissionsT: roadmap.baseline_emissions_tco2e == null ? null : Number(roadmap.baseline_emissions_tco2e),
          targetYear: roadmap.target_year ?? null,
          reductionPercent: roadmap.reduction_target_percent == null ? null : Number(roadmap.reduction_target_percent),
          kind,
          intermediates: Array.isArray(roadmap.intermediate_targets)
            ? roadmap.intermediate_targets.map((item) => ({
              year: Number(item.year),
              reductionPercent: Number(item.reduction_percent),
            }))
            : [],
          actuals,
        }));
      })
      .catch(() => {
        if (!cancelled) setView(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!view) return null;

  return (
    <div className="space-y-2 pt-3 max-w-xl" data-testid="bilan-trajectory">
      <p className="text-sm font-medium text-slate-800">Trajectoire de réduction</p>
      {view.status === "empty" ? (
        <p className="text-xs text-muted-foreground">
          Aucune trajectoire enregistrée pour ce bilan.
        </p>
      ) : (
        <ReductionTrajectoryChart points={view.points} />
      )}
      <Link to="/app/transition/trajectoires" className="text-xs text-[#4C7D7F] underline">
        Définir la trajectoire et ouvrir les actions
      </Link>
    </div>
  );
}
