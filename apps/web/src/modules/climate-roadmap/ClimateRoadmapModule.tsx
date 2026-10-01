// Module principal — Plan d'actions

import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, LayoutDashboard, Layers, Zap, ListChecks, ArrowUpDown, Calendar, Activity, FileText, ClipboardList, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useClimateRoadmaps, useClimateLevers, useClimateActions, useRoadmapDashboard } from './hooks/useClimateRoadmap';
import { useAvailableDataSources } from './hooks/useAvailableBaselineData';
import { RoadmapEntryPage, RoadmapInitConfig } from './components/RoadmapEntryPage';
import { ActionsAutoDisplay } from './components/ActionsAutoDisplay';
import { ActionsLifecycleView } from './components/ActionsLifecycleView';

import { OverviewSection } from './sections/OverviewSection';
import { BaselineSection } from './sections/BaselineSection';
import { LeversSection } from './sections/LeversSection';
import { ActionsSection } from './sections/ActionsSection';
import { PrioritizationSection } from './sections/PrioritizationSection';
import { CalendarSection } from './sections/CalendarSection';
import { PerformanceSection } from './sections/PerformanceSection';
import { ReportingSection } from './sections/ReportingSection';
import { TrajectorySection } from './sections/TrajectorySection';
import { RisksSection } from './sections/RisksSection';
import { MobilizationSection } from './sections/MobilizationSection';
import { latestActualByYear } from '@/lib/net-zero/reductionTrajectory';

export const ClimateRoadmapModule: React.FC = () => {
  const { roadmaps, loading: roadmapsLoading, createRoadmap, updateRoadmap } = useClimateRoadmaps();
  const dataSources = useAvailableDataSources();
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'recommendations');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (roadmaps.length > 0 && !activeRoadmapId) {
      const active = roadmaps.find(r => r.status === 'active') || roadmaps[0];
      setActiveRoadmapId(active.id);
    }
  }, [roadmaps, activeRoadmapId]);

  const activeRoadmap = roadmaps.find(r => r.id === activeRoadmapId) || null;
  const { levers, createLever, updateLever } = useClimateLevers(activeRoadmapId);
  const { actions, createAction, updateAction } = useClimateActions(activeRoadmapId);
  const { dashboard } = useRoadmapDashboard(activeRoadmapId);
  const actuals = useMemo(
    () => latestActualByYear(dataSources.bilans.map((bilan) => ({
      year: bilan.year,
      emissionsT: bilan.totalEmissions,
      updatedAt: bilan.date,
    }))),
    [dataSources.bilans],
  );

  const handleStart = async (config: RoadmapInitConfig) => {
    const targetEmissions = config.baseline_emissions_tco2e * (1 - config.reduction_target_percent / 100);
    const result = await createRoadmap({
      name: config.name,
      description: config.description,
      baseline_year: config.baseline_year,
      target_year: config.target_year,
      reduction_target_percent: config.reduction_target_percent,
      baseline_emissions_tco2e: config.baseline_emissions_tco2e,
      target_emissions_tco2e: targetEmissions,
      status: 'active',
    });
    if (result) {
      setActiveRoadmapId(result.id);
      setShowCreateForm(false);
      toast.success('Plan d\'actions créé avec succès');
    }
  };

  if (roadmapsLoading || dataSources.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  // No roadmap: show tabs with recommendations + lifecycle
  if (roadmaps.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="recommendations" className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" />Recommandations
            </TabsTrigger>
            <TabsTrigger value="lifecycle" className="gap-1.5 text-xs">
              <ClipboardList className="h-3.5 w-3.5" />Suivi des actions
            </TabsTrigger>
            <TabsTrigger value="risks" className="gap-1.5 text-xs">
              <ShieldAlert className="h-3.5 w-3.5" />Risques
            </TabsTrigger>
            <TabsTrigger value="mobilization" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />Mobilisation
            </TabsTrigger>
          </TabsList>
          <TabsContent value="recommendations">
            <ActionsAutoDisplay
              dataSources={dataSources}
              onCreateRoadmap={() => setShowCreateForm(true)}
            />
          </TabsContent>
          <TabsContent value="lifecycle">
            <ActionsLifecycleView dataSources={dataSources} />
          </TabsContent>
          <TabsContent value="risks">
            <RisksSection actions={[]} />
          </TabsContent>
          <TabsContent value="mobilization">
            <MobilizationSection actions={[]} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {roadmaps.length > 1 && (
            <select
              value={activeRoadmapId || ''}
              onChange={e => setActiveRoadmapId(e.target.value)}
              className="text-sm border rounded-md px-2 py-1 bg-background"
            >
              {roadmaps.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />Nouveau plan d'actions
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="recommendations" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" />Recommandations</TabsTrigger>
          <TabsTrigger value="lifecycle" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" />Suivi des actions</TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><LayoutDashboard className="h-3.5 w-3.5" />Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="baseline" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" />Baseline</TabsTrigger>
          <TabsTrigger value="levers" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" />Leviers</TabsTrigger>
          <TabsTrigger value="trajectory" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" />Trajectoire</TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5 text-xs"><ListChecks className="h-3.5 w-3.5" />Actions</TabsTrigger>
          <TabsTrigger value="risks" className="gap-1.5 text-xs"><ShieldAlert className="h-3.5 w-3.5" />Risques</TabsTrigger>
          <TabsTrigger value="mobilization" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Mobilisation</TabsTrigger>
          <TabsTrigger value="prioritization" className="gap-1.5 text-xs"><ArrowUpDown className="h-3.5 w-3.5" />Priorisation</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs"><Calendar className="h-3.5 w-3.5" />Calendrier</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" />Performance</TabsTrigger>
          <TabsTrigger value="reporting" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Reporting</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          <ActionsAutoDisplay dataSources={dataSources} onCreateRoadmap={() => setShowCreateForm(true)} />
        </TabsContent>
        <TabsContent value="lifecycle">
          <ActionsLifecycleView dataSources={dataSources} />
        </TabsContent>
        <TabsContent value="overview">
          {dashboard ? <OverviewSection dashboard={dashboard} /> : (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}
        </TabsContent>
        <TabsContent value="baseline">{activeRoadmap && <BaselineSection roadmap={activeRoadmap} />}</TabsContent>
        <TabsContent value="levers"><LeversSection levers={levers} onCreateLever={createLever} onUpdateLever={updateLever} /></TabsContent>
        <TabsContent value="trajectory">
          {activeRoadmap && (
            <TrajectorySection
              roadmap={activeRoadmap}
              actuals={actuals}
              onSave={(patch) => updateRoadmap(activeRoadmap.id, patch)}
            />
          )}
        </TabsContent>
        <TabsContent value="actions"><ActionsSection actions={actions} levers={levers} onCreateAction={createAction} onUpdateAction={updateAction} /></TabsContent>
        <TabsContent value="risks"><RisksSection actions={actions.map((action) => ({ id: action.id, title: action.title }))} /></TabsContent>
        <TabsContent value="mobilization"><MobilizationSection actions={actions.map((action) => ({ id: action.id, title: action.title }))} /></TabsContent>
        <TabsContent value="prioritization"><PrioritizationSection actions={actions} levers={levers} /></TabsContent>
        <TabsContent value="calendar">{activeRoadmap && <CalendarSection actions={actions} levers={levers} baselineYear={activeRoadmap.baseline_year} targetYear={activeRoadmap.target_year} />}</TabsContent>
        <TabsContent value="performance">{activeRoadmap && <PerformanceSection roadmap={activeRoadmap} actions={actions} levers={levers} />}</TabsContent>
        <TabsContent value="reporting">{activeRoadmap && <ReportingSection roadmap={activeRoadmap} actions={actions} levers={levers} />}</TabsContent>
      </Tabs>
    </div>
  );
};
