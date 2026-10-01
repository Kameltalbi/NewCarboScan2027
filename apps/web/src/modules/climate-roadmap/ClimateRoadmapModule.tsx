// Module principal — Plan d'actions (tableau de pilotage décarbonation)

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ListChecks, ShieldAlert, Users, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  useClimateRoadmaps,
  useClimateActions,
} from "./hooks/useClimateRoadmap";
import { useAvailableDataSources } from "./hooks/useAvailableBaselineData";
import { useClimateObjectives } from "@/modules/transition/hooks/useClimateObjectives";
import { RoadmapEntryPage, type RoadmapInitConfig } from "./components/RoadmapEntryPage";
import { ActionPlanPilotDashboard } from "./components/ActionPlanPilotDashboard";
import { RisksSection } from "./sections/RisksSection";
import { MobilizationSection } from "./sections/MobilizationSection";
import type { ClimateAction } from "./types";
import { api } from "@/integrations/api/client";

export const ClimateRoadmapModule: React.FC = () => {
  const { roadmaps, loading: roadmapsLoading, createRoadmap } = useClimateRoadmaps();
  const dataSources = useAvailableDataSources();
  const { primary, loading: objectivesLoading } = useClimateObjectives();
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
  const activeRoadmapIdRef = useRef<string | null>(null);
  const ensureInFlight = useRef<Promise<string | null> | null>(null);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "risks" || tabParam === "mobilization" ? tabParam : "plan";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    activeRoadmapIdRef.current = activeRoadmapId;
  }, [activeRoadmapId]);

  useEffect(() => {
    if (roadmaps.length > 0 && !activeRoadmapId) {
      const active = roadmaps.find((r) => r.status === "active") || roadmaps[0];
      setActiveRoadmapId(active.id);
    }
  }, [roadmaps, activeRoadmapId]);

  const activeRoadmap = roadmaps.find((r) => r.id === activeRoadmapId) || null;
  const { actions, updateAction, refetch: refetchActions } =
    useClimateActions(activeRoadmapId);

  const handleStart = async (config: RoadmapInitConfig) => {
    const targetEmissions =
      config.baseline_emissions_tco2e * (1 - config.reduction_target_percent / 100);
    const result = await createRoadmap({
      name: config.name,
      description: config.description,
      baseline_year: config.baseline_year,
      target_year: config.target_year,
      reduction_target_percent: config.reduction_target_percent,
      baseline_emissions_tco2e: config.baseline_emissions_tco2e,
      target_emissions_tco2e: targetEmissions,
      status: "active",
    });
    if (result) {
      setActiveRoadmapId(result.id);
      setShowCreateForm(false);
      toast.success("Plan d'actions créé avec succès");
    }
  };

  /** Crée un plan minimal à partir de l'objectif Transition ou du bilan, sans inventer d'actions. */
  const ensureRoadmap = async (): Promise<string | null> => {
    if (activeRoadmapIdRef.current) return activeRoadmapIdRef.current;
    if (ensureInFlight.current) return ensureInFlight.current;

    ensureInFlight.current = (async () => {
      if (activeRoadmapIdRef.current) return activeRoadmapIdRef.current;

      // Relecture API pour éviter une double création en course
      try {
        const { items } = await api.listClimateRoadmaps();
        const existing = (items || []) as Array<{ id: string; status?: string }>;
        if (existing.length > 0) {
          const id =
            existing.find((r) => r.status === "active")?.id || existing[0].id;
          activeRoadmapIdRef.current = id;
          setActiveRoadmapId(id);
          return id;
        }
      } catch {
        // continue with create
      }

      const bilan = dataSources.bilans[0];
      const baselineYear =
        primary?.baseline_year ?? bilan?.year ?? new Date().getFullYear() - 1;
      const targetYear = primary?.target_year ?? 2030;
      const baselineT =
        primary?.baseline_value != null
          ? Number(primary.baseline_value)
          : bilan?.totalEmissions ?? null;
      const targetT =
        primary?.target_value != null
          ? Number(primary.target_value)
          : baselineT != null && primary?.reduction_percent != null
            ? baselineT * (1 - Number(primary.reduction_percent) / 100)
            : null;
      const reductionPct =
        primary?.reduction_percent != null
          ? Number(primary.reduction_percent)
          : baselineT != null && targetT != null && baselineT > 0
            ? ((baselineT - targetT) / baselineT) * 100
            : null;

      if (baselineT == null || !(baselineT > 0)) {
        toast.error(
          "Aucun bilan ni objectif chiffré disponible pour initialiser le plan. Définissez un objectif dans Transition.",
        );
        return null;
      }

      const result = await createRoadmap({
        name: primary?.name
          ? `Plan d'actions — ${primary.name}`
          : "Plan d'actions décarbonation",
        description: primary
          ? `Plan lié à l'objectif Transition « ${primary.name} ».`
          : "Plan initialisé à partir du bilan carbone.",
        baseline_year: baselineYear,
        target_year: targetYear,
        reduction_target_percent: reductionPct,
        baseline_emissions_tco2e: baselineT,
        target_emissions_tco2e: targetT,
        status: "active",
      });
      if (!result) return null;
      activeRoadmapIdRef.current = result.id;
      setActiveRoadmapId(result.id);
      return result.id;
    })();

    try {
      return await ensureInFlight.current;
    } finally {
      ensureInFlight.current = null;
    }
  };

  const handleCreateAction = async (
    action: Partial<ClimateAction>,
  ): Promise<ClimateAction | null> => {
    const roadmapId = await ensureRoadmap();
    if (!roadmapId) return null;

    const payload: Record<string, unknown> = {
      roadmap_id: roadmapId,
      title: action.title,
      description: action.description ?? null,
      status: action.status ?? "studying",
      priority: action.priority ?? "medium",
      source_emission_targeted: action.source_emission_targeted ?? null,
      scope_concerned: action.scope_concerned ?? null,
      owner_name: action.owner_name ?? null,
      target_date: action.target_date ?? null,
    };
    if (
      action.expected_reduction_tco2e != null &&
      Number(action.expected_reduction_tco2e) > 0
    ) {
      payload.expected_reduction_tco2e = Number(action.expected_reduction_tco2e);
    }

    const { item } = await api.createClimateAction(payload);
    activeRoadmapIdRef.current = roadmapId;
    setActiveRoadmapId(roadmapId);
    await refetchActions();
    return item ? (item as unknown as ClimateAction) : null;
  };

  if (roadmapsLoading || dataSources.loading || objectivesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
            ← Retour au plan d&apos;actions
          </Button>
        </div>
        <RoadmapEntryPage dataSources={dataSources} onStart={handleStart} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Plan d’actions</h1>
          <p className="text-sm text-muted-foreground">
            Pilotage de la décarbonation, connecté à Transition &amp; trajectoires.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {roadmaps.length > 1 && (
            <select
              value={activeRoadmapId || ""}
              onChange={(e) => setActiveRoadmapId(e.target.value)}
              className="text-sm border rounded-md px-2 py-1.5 bg-background"
            >
              {roadmaps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-4 w-4" />
            Nouveau plan
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="plan" className="gap-1.5 text-xs">
            <ListChecks className="h-3.5 w-3.5" />
            Plan d’actions
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-1.5 text-xs">
            <ShieldAlert className="h-3.5 w-3.5" />
            Risques
          </TabsTrigger>
          <TabsTrigger value="mobilization" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Mobilisation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan">
          <ActionPlanPilotDashboard
            dataSources={dataSources}
            actions={actions}
            primaryObjective={primary}
            roadmapBaselineT={activeRoadmap?.baseline_emissions_tco2e ?? null}
            roadmapTargetT={activeRoadmap?.target_emissions_tco2e ?? null}
            roadmapTargetYear={activeRoadmap?.target_year ?? null}
            onEnsureRoadmap={ensureRoadmap}
            onCreateAction={handleCreateAction}
            onUpdateAction={updateAction}
          />
        </TabsContent>
        <TabsContent value="risks">
          <RisksSection
            actions={actions.map((action) => ({ id: action.id, title: action.title }))}
          />
        </TabsContent>
        <TabsContent value="mobilization">
          <MobilizationSection
            actions={actions.map((action) => ({ id: action.id, title: action.title }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
