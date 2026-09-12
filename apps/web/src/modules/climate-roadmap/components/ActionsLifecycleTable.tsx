// Vue lifecycle des actions — 4 onglets (Sélectionner, Prioriser, En cours, Terminé)
// Inspiré du design Greenly avec tableau filtrable par catégorie et recherche

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Pin, ArrowUpCircle, Rocket, CheckCircle2 } from 'lucide-react';
import { RecommendedAction } from '@/lib/recommendedActions';
import { CircleGauge } from './CircleGauge';

type LifecycleStage = 'select' | 'prioritize' | 'in_progress' | 'done';

interface StageConfig {
  key: LifecycleStage;
  label: string;
  emoji: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const STAGES: StageConfig[] = [
  { key: 'select', label: 'Sélectionner', emoji: '📌', icon: <Pin className="h-4 w-4" />, title: 'Sélectionner vos actions', subtitle: 'Choisissez les actions les plus pertinentes pour votre organisation :' },
  { key: 'prioritize', label: 'Prioriser', emoji: '⬆️', icon: <ArrowUpCircle className="h-4 w-4" />, title: 'Prioriser vos actions', subtitle: 'Planifiez, assignez et priorisez les actions de votre plan avec vos parties prenantes et vos collaborateurs :' },
  { key: 'in_progress', label: 'En cours', emoji: '🌱', icon: <Rocket className="h-4 w-4" />, title: 'Actions en cours', subtitle: 'Assurez un suivi régulier de vos actions en cours en impliquant les employés et les parties prenantes concernés :' },
  { key: 'done', label: 'Terminé', emoji: '✅', icon: <CheckCircle2 className="h-4 w-4" />, title: 'Actions terminées', subtitle: 'Consultez les actions terminées et mesurez les résultats obtenus :' },
];

// Map local statuses to lifecycle stages
const STATUS_TO_STAGE: Record<string, LifecycleStage> = {
  'a_selectionner': 'select',
  'a_prioriser': 'prioritize',
  'en_cours': 'in_progress',
  'complete': 'done',
};

interface ActionsLifecycleTableProps {
  actions: RecommendedAction[];
  /** Map action.id -> local status. Actions without a status are in 'select' */
  actionStatuses: Record<string, string>;
  getPertinence: (action: RecommendedAction) => number;
  onActionClick: (action: RecommendedAction) => void;
  activeStage: LifecycleStage;
  onStageChange: (stage: LifecycleStage) => void;
}

export const ActionsLifecycleTable: React.FC<ActionsLifecycleTableProps> = ({
  actions, actionStatuses, getPertinence, onActionClick, activeStage, onStageChange,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const allCategories = useMemo(() => [...new Set(actions.map(a => a.categorie))], [actions]);

  const getStageForAction = (action: RecommendedAction): LifecycleStage => {
    const status = actionStatuses[action.id];
    return status ? (STATUS_TO_STAGE[status] || 'select') : 'select';
  };

  const stageCounts = useMemo(() => {
    const counts: Record<LifecycleStage, number> = { select: 0, prioritize: 0, in_progress: 0, done: 0 };
    actions.forEach(a => { counts[getStageForAction(a)]++; });
    return counts;
  }, [actions, actionStatuses]);

  const stageActions = useMemo(() => {
    return actions.filter(a => {
      if (getStageForAction(a) !== activeStage) return false;
      if (categoryFilter !== 'all' && a.categorie !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.titre.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [actions, activeStage, categoryFilter, search, actionStatuses]);

  const activeConfig = STAGES.find(s => s.key === activeStage)!;

  // Category color map
  const getCategoryColor = (cat: string): string => {
    const map: Record<string, string> = {
      'Énergie': 'bg-amber-400',
      'Mobilité': 'bg-blue-400',
      'Achats': 'bg-red-400',
      'Déchets': 'bg-green-400',
      'Bâtiment': 'bg-purple-400',
      'Sensibilisation': 'bg-cyan-400',
    };
    return map[cat] || 'bg-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Stage tabs */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {STAGES.map(stage => {
          const isActive = stage.key === activeStage;
          return (
            <button
              key={stage.key}
              onClick={() => onStageChange(stage.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary border-2 border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {stage.label} <span>{stage.emoji}</span>
              {stageCounts[stage.key] > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 text-[10px] px-1.5">
                  {stageCounts[stage.key]}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Stage header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          {activeConfig.emoji} {activeConfig.title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          {activeConfig.subtitle}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {allCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cherchez le titre d'une action"
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-36">Catégorie</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Titre de l'action</th>
              {activeStage === 'prioritize' && (
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 w-28">Score</th>
              )}
              {activeStage === 'in_progress' && (
                <>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-36">Responsable</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Deadline</th>
                </>
              )}
              {activeStage === 'done' && (
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Impact</th>
              )}
              <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3 w-24">Pertinence</th>
            </tr>
          </thead>
          <tbody>
            {stageActions.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-sm text-muted-foreground">
                  Aucune action dans cette étape
                </td>
              </tr>
            ) : (
              stageActions.map((action, idx) => {
                const pertinence = getPertinence(action);
                return (
                  <tr
                    key={action.id}
                    className={`border-b last:border-b-0 cursor-pointer hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                    onClick={() => onActionClick(action)}
                  >
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs gap-1.5 font-normal">
                        <span className={`w-2 h-2 rounded-full ${getCategoryColor(action.categorie)} inline-block`} />
                        {action.categorie}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground leading-relaxed line-clamp-2">{action.titre}</p>
                    </td>
                    {activeStage === 'prioritize' && (
                      <td className="px-4 py-3 text-center">
                        <CircleGauge value={pertinence} size={36} />
                      </td>
                    )}
                    {activeStage === 'in_progress' && (
                      <>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">–</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">–</span>
                        </td>
                      </>
                    )}
                    {activeStage === 'done' && (
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {action.impact_estime_pourcent === 'Non quantifié' || action.impact_estime_pourcent === 'Variable'
                            ? action.impact_estime_pourcent : `${action.impact_estime_pourcent}%`}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <CircleGauge value={pertinence} size={36} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {stageActions.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {stageActions.length} action(s) affichée(s)
        </p>
      )}
    </div>
  );
};
