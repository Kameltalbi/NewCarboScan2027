import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LayoutDashboard, Layers, Zap, Box, Sliders, TrendingDown, GitCompare, FileText } from 'lucide-react';
import { useScenarios, useScenarioDashboard } from './hooks/useScenarios';
import { useAvailableDataSources } from './hooks/useScenarioBaseline';
import { ScenarioEntryPage } from './components/ScenarioEntryPage';
import { ScenarioOverview } from './sections/ScenarioOverview';
import { ScenarioBaselineSection } from './sections/ScenarioBaselineSection';
import { ScenarioLeversSection } from './sections/ScenarioLeversSection';
import { ScenarioBuilderSection } from './sections/ScenarioBuilderSection';
import { ScenarioAssumptionsSection } from './sections/ScenarioAssumptionsSection';
import { ScenarioTrajectoriesSection } from './sections/ScenarioTrajectoriesSection';
import { ScenarioComparisonSection } from './sections/ScenarioComparisonSection';
import { ScenarioReportingSection } from './sections/ScenarioReportingSection';

export const ScenariosModule: React.FC = () => {
  const { scenarios, loading: scenariosLoading, createScenario, updateScenario, deleteScenario, duplicateScenario } = useScenarios();
  const dataSources = useAvailableDataSources();
  const dashboard = useScenarioDashboard(scenarios);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  useEffect(() => {
    if (scenarios.length > 0 && !activeScenarioId) {
      setActiveScenarioId(scenarios[0].id);
    }
  }, [scenarios, activeScenarioId]);

  if (scenariosLoading || dataSources.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement des scénarios…</p>
        </div>
      </div>
    );
  }

  if (scenarios.length === 0) {
    return <ScenarioEntryPage dataSources={dataSources} onCreateScenario={createScenario} />;
  }

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><LayoutDashboard className="h-3.5 w-3.5" />Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="baseline" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" />Baseline</TabsTrigger>
          <TabsTrigger value="levers" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" />Leviers</TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-1.5 text-xs"><Box className="h-3.5 w-3.5" />Scénarios</TabsTrigger>
          <TabsTrigger value="assumptions" className="gap-1.5 text-xs"><Sliders className="h-3.5 w-3.5" />Hypothèses</TabsTrigger>
          <TabsTrigger value="trajectories" className="gap-1.5 text-xs"><TrendingDown className="h-3.5 w-3.5" />Trajectoires</TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1.5 text-xs"><GitCompare className="h-3.5 w-3.5" />Comparaison</TabsTrigger>
          <TabsTrigger value="reporting" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Reporting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ScenarioOverview dashboard={dashboard} scenarios={scenarios} />
        </TabsContent>
        <TabsContent value="baseline">
          <ScenarioBaselineSection dataSources={dataSources} />
        </TabsContent>
        <TabsContent value="levers">
          <ScenarioLeversSection scenarioId={activeScenarioId} />
        </TabsContent>
        <TabsContent value="scenarios">
          <ScenarioBuilderSection
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelect={setActiveScenarioId}
            onCreate={createScenario}
            onUpdate={updateScenario}
            onDelete={deleteScenario}
            onDuplicate={duplicateScenario}
          />
        </TabsContent>
        <TabsContent value="assumptions">
          <ScenarioAssumptionsSection scenarioId={activeScenarioId} />
        </TabsContent>
        <TabsContent value="trajectories">
          <ScenarioTrajectoriesSection scenario={activeScenario} scenarios={scenarios} />
        </TabsContent>
        <TabsContent value="comparison">
          <ScenarioComparisonSection scenarios={scenarios} />
        </TabsContent>
        <TabsContent value="reporting">
          <ScenarioReportingSection scenarios={scenarios} activeScenario={activeScenario} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
