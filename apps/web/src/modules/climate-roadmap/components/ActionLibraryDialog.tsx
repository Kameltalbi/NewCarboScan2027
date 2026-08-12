import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, BookOpen, Filter } from 'lucide-react';
import { RecommendedAction } from '@/lib/recommendedActions';
import { CircleGauge } from './CircleGauge';

interface ActionLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: RecommendedAction[];
  dismissedIds: Set<string>;
  getPertinence: (action: RecommendedAction) => number;
  onSelectAction: (action: RecommendedAction) => void;
  onAddToPlan: () => void;
}

export const ActionLibraryDialog: React.FC<ActionLibraryDialogProps> = ({
  open, onOpenChange, actions, dismissedIds, getPertinence, onSelectAction, onAddToPlan,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');

  const allCategories = useMemo(() => [...new Set(actions.map(a => a.categorie))], [actions]);

  const filtered = useMemo(() => {
    return actions.filter(a => {
      if (category !== 'all' && a.categorie !== category) return false;
      if (priority !== 'all' && a.priorite !== priority) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.titre.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [actions, search, category, priority]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0" aria-describedby={undefined}>
        <div className="p-4 sm:p-6 border-b border-border space-y-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            Bibliothèque d'actions
            <Badge variant="secondary" className="ml-2 text-xs">{filtered.length} action(s)</Badge>
          </DialogTitle>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher une action…" className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                <Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Toutes les catégories</SelectItem>
                {allCategories.map(cat => <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs"><SelectValue placeholder="Priorité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Toutes priorités</SelectItem>
                <SelectItem value="haute" className="text-xs">🔴 Haute</SelectItem>
                <SelectItem value="moyenne" className="text-xs">🟡 Moyenne</SelectItem>
                <SelectItem value="basse" className="text-xs">🟢 Basse</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune action ne correspond à vos filtres</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(action => {
                const pertinence = getPertinence(action);
                const isDismissed = dismissedIds.has(action.id);
                return (
                  <Card key={action.id}
                    className={`border cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group ${isDismissed ? 'opacity-50' : ''}`}
                    onClick={() => onSelectAction(action)}>
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] gap-1 font-normal shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                          {action.categorie}
                        </Badge>
                        <Badge variant={action.priorite === 'haute' ? 'destructive' : action.priorite === 'moyenne' ? 'default' : 'secondary'} className="text-[10px]">
                          {action.priorite}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed flex-1 group-hover:text-primary transition-colors line-clamp-3">
                        {action.titre}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Scope {action.scope_cible} · {action.impact_estime_pourcent === 'Non quantifié' || action.impact_estime_pourcent === 'Variable' ? action.impact_estime_pourcent : `${action.impact_estime_pourcent}%`}
                        </span>
                        <CircleGauge value={pertinence} size={40} />
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-1"
                        onClick={e => { e.stopPropagation(); onAddToPlan(); }}>
                        <Plus className="h-3 w-3" /> Ajouter au plan
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
