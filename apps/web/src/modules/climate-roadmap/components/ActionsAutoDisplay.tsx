// Plan d'actions — Affichage des actions recommandées style Greenly (vue cartes)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Loader2, Target, ArrowRight, Plus, X, Check, BookOpen } from 'lucide-react';
import { getRecommendedActions, RecommendedAction } from '@/lib/recommendedActions';
import { DataSourceSummary } from '../hooks/useAvailableBaselineData';
import { CircleGauge } from './CircleGauge';
import { ActionDetailPopup } from './ActionDetailPopup';
import { ActionLibraryDialog } from './ActionLibraryDialog';
import { CreateActionDialog } from './CreateActionDialog';

interface ActionsAutoDisplayProps {
  dataSources: DataSourceSummary;
  onCreateRoadmap: () => void;
}

export const ActionsAutoDisplay: React.FC<ActionsAutoDisplayProps> = ({ dataSources, onCreateRoadmap }) => {
  const [actions, setActions] = useState<RecommendedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePosteIdx, setActivePosteIdx] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedAction, setSelectedAction] = useState<RecommendedAction | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCreateAction, setShowCreateAction] = useState(false);

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

  const postes = useMemo(() => {
    const visible = actions.filter(a => !dismissedIds.has(a.id));
    const map = new Map<string, RecommendedAction[]>();
    visible.forEach(a => {
      if (!map.has(a.categorie)) map.set(a.categorie, []);
      map.get(a.categorie)!.push(a);
    });
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [actions, dismissedIds]);

  const activePoste = postes[activePosteIdx] || null;

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

  if (postes.length === 0) {
    return (
      <div className="text-center py-16">
        <Check className="h-12 w-12 text-primary/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Aucune action recommandée.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Category stepper */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 flex items-center justify-center flex-wrap gap-y-2">
          {postes.map((poste, idx) => {
            const isActive = idx === activePosteIdx;
            const isPast = idx < activePosteIdx;
            return (
              <React.Fragment key={poste.category}>
                <button onClick={() => setActivePosteIdx(idx)} className="flex flex-col items-center gap-1.5 px-2 sm:px-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                    isActive ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : isPast ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-background text-muted-foreground border-border'
                  }`}>{idx + 1}</div>
                  <span className={`text-xs ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {poste.category}
                  </span>
                </button>
                {idx < postes.length - 1 && (
                  <div className={`h-0.5 w-6 sm:w-10 mt-[-16px] ${idx < activePosteIdx ? 'bg-primary/40' : 'bg-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        {activePosteIdx < postes.length - 1 && (
          <Button onClick={() => setActivePosteIdx(activePosteIdx + 1)} className="gap-2 shrink-0">
            Poste suivant <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 3 action cards */}
      {activePoste && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {activePoste.items.slice(0, 3).map(action => {
              const pertinence = getPertinence(action);
              return (
                <Card key={action.id} className="border cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                  onClick={() => setSelectedAction(action)}>
                  <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] gap-1.5 font-normal">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                        {action.categorie}
                      </Badge>
                      <button onClick={e => { e.stopPropagation(); setDismissedIds(prev => new Set(prev).add(action.id)); }}
                        className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed flex-1 group-hover:text-primary transition-colors">
                      {action.titre}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Impact :<br />
                        <span className="font-medium text-foreground">
                          {action.impact_estime_pourcent === 'Non quantifié' || action.impact_estime_pourcent === 'Variable'
                            ? action.impact_estime_pourcent : `${action.impact_estime_pourcent}%`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Pertinence</span>
                        <CircleGauge value={pertinence} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-9 gap-1"
                        onClick={e => { e.stopPropagation(); onCreateRoadmap(); }}>
                        <Plus className="h-3 w-3" /> Ajouter au plan
                      </Button>
                      <Button size="sm" className="flex-1 text-xs h-9 gap-1"
                        onClick={e => { e.stopPropagation(); }}>
                        <Check className="h-3 w-3" /> Complété
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            🔸 {activePoste.category} : {activePoste.items.length} action(s) recommandée(s)
          </p>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="text-center pt-4 border-t border-border space-y-3">
        <p className="text-sm text-muted-foreground">Aller plus loin…? Plus de postes d'émissions ?</p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowLibrary(true)}>
            <BookOpen className="h-3.5 w-3.5" /> Bibliothèque d'actions
          </Button>
          <Button size="sm" onClick={() => setShowCreateAction(true)} className="gap-2">
            Créer une action <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

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

      {/* Library Dialog */}
      <ActionLibraryDialog
        open={showLibrary}
        onOpenChange={setShowLibrary}
        actions={actions}
        dismissedIds={dismissedIds}
        getPertinence={getPertinence}
        onSelectAction={setSelectedAction}
        onAddToPlan={onCreateRoadmap}
      />

      {/* Create Action Dialog */}
      <CreateActionDialog
        open={showCreateAction}
        onOpenChange={setShowCreateAction}
        onCreated={fetchActions}
      />
    </div>
  );
};
