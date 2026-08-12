// Vue Lifecycle — wrapper autonome qui charge les actions et affiche ActionsLifecycleTable

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { getRecommendedActions, RecommendedAction } from '@/lib/recommendedActions';
import { DataSourceSummary } from '../hooks/useAvailableBaselineData';
import { ActionsLifecycleTable } from './ActionsLifecycleTable';
import { ActionDetailPopup } from './ActionDetailPopup';

type LifecycleStage = 'select' | 'prioritize' | 'in_progress' | 'done';

interface ActionsLifecycleViewProps {
  dataSources: DataSourceSummary;
}

export const ActionsLifecycleView: React.FC<ActionsLifecycleViewProps> = ({ dataSources }) => {
  const [actions, setActions] = useState<RecommendedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<LifecycleStage>('select');
  const [actionStatuses, setActionStatuses] = useState<Record<string, string>>({});
  const [selectedAction, setSelectedAction] = useState<RecommendedAction | null>(null);

  const latestBilan = dataSources.bilans[0] || null;

  const fetchActions = useCallback(async () => {
    if (!latestBilan) { setLoading(false); return; }
    const result = await getRecommendedActions({
      totalEmissions: latestBilan.totalEmissions,
      scope1: latestBilan.scope1,
      scope2: latestBilan.scope2,
      scope3: latestBilan.scope3,
      categoryBreakdown: [],
      majorityScope: latestBilan.scope3 >= latestBilan.scope1 && latestBilan.scope3 >= latestBilan.scope2 ? 3
        : latestBilan.scope1 >= latestBilan.scope2 ? 1 : 2,
    });
    setActions(result);
    setLoading(false);
  }, [latestBilan]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const getPertinence = useCallback((action: RecommendedAction): number => {
    const priorityBase = action.priorite === 'haute' ? 85 : action.priorite === 'moyenne' ? 65 : 45;
    const impactMatch = action.impact_estime_pourcent.match(/(\d+)/);
    const impactMod = impactMatch ? Math.min(15, parseInt(impactMatch[1]) / 3) : 5;
    const idHash = action.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 20 - 10;
    let scopeBonus = 0;
    if (latestBilan) {
      const scopeValue = action.scope_cible === '1' ? latestBilan.scope1
        : action.scope_cible === '2' ? latestBilan.scope2
        : action.scope_cible === '3' ? latestBilan.scope3
        : latestBilan.totalEmissions;
      if (action.seuil_emission_kgco2e > 0) {
        scopeBonus = Math.min(10, Math.round((scopeValue / action.seuil_emission_kgco2e) * 3));
      }
    }
    return Math.round(Math.max(20, Math.min(100, priorityBase + impactMod + idHash + scopeBonus)));
  }, [latestBilan]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!latestBilan) {
    return (
      <div className="text-center py-16 space-y-4">
        <Target className="h-12 w-12 text-muted-foreground/40 mx-auto" />
        <h3 className="text-lg font-semibold text-foreground">Aucun bilan carbone disponible</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Réalisez d'abord un bilan carbone pour obtenir des actions de réduction personnalisées.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/app/collecte?mode=bilan-carbone'}>
          Démarrer un bilan carbone
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ActionsLifecycleTable
        actions={actions}
        actionStatuses={actionStatuses}
        getPertinence={getPertinence}
        onActionClick={setSelectedAction}
        activeStage={activeStage}
        onStageChange={setActiveStage}
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedAction} onOpenChange={open => { if (!open) setSelectedAction(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6" aria-describedby={undefined}>
          <VisuallyHidden><DialogTitle>Détail de l'action</DialogTitle></VisuallyHidden>
          {selectedAction && (
            <ActionDetailPopup
              action={selectedAction}
              pertinence={getPertinence(selectedAction)}
              bilan={latestBilan ? { totalEmissions: latestBilan.totalEmissions, scope1: latestBilan.scope1, scope2: latestBilan.scope2, scope3: latestBilan.scope3 } : null}
              onClose={() => setSelectedAction(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
