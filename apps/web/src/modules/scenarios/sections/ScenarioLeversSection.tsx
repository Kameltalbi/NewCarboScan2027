import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Zap, Filter } from 'lucide-react';
import { useScenarioLevers } from '../hooks/useScenarios';
import { LEVER_CATEGORIES } from '../types';

interface Props { scenarioId: string | null; }

export const ScenarioLeversSection: React.FC<Props> = ({ scenarioId }) => {
  const { levers, addLever, updateLever, deleteLever } = useScenarioLevers(scenarioId);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLever, setNewLever] = useState({ custom_lever_name: '', category: 'other', max_reduction_tco2e: 0, estimated_cost: 0, scope_concerned: [1, 2, 3], confidence_level: 'medium' as const });

  const filtered = filterCategory ? levers.filter(l => l.category === filterCategory) : levers;

  const handleAdd = async () => {
    await addLever(newLever as any);
    setShowAddDialog(false);
    setNewLever({ custom_lever_name: '', category: 'other', max_reduction_tco2e: 0, estimated_cost: 0, scope_concerned: [1, 2, 3], confidence_level: 'medium' });
  };

  if (!scenarioId) return <p className="text-sm text-muted-foreground p-6">Sélectionnez un scénario dans l'onglet Scénarios.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Bibliothèque de leviers</h2>
          <p className="text-sm text-muted-foreground">{levers.length} levier(s) associé(s) à ce scénario.</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Ajouter un levier</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau levier</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label className="text-xs">Nom *</Label><Input value={newLever.custom_lever_name} onChange={e => setNewLever(p => ({ ...p, custom_lever_name: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs">Catégorie</Label>
                <select value={newLever.category} onChange={e => setNewLever(p => ({ ...p, category: e.target.value }))} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {LEVER_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Réduction max (tCO₂e)</Label><Input type="number" value={newLever.max_reduction_tco2e} onChange={e => setNewLever(p => ({ ...p, max_reduction_tco2e: parseFloat(e.target.value) || 0 }))} className="mt-1" /></div>
                <div><Label className="text-xs">Coût estimé (€)</Label><Input type="number" value={newLever.estimated_cost} onChange={e => setNewLever(p => ({ ...p, estimated_cost: parseFloat(e.target.value) || 0 }))} className="mt-1" /></div>
              </div>
              <Button onClick={handleAdd} disabled={!newLever.custom_lever_name.trim()} className="w-full">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <button onClick={() => setFilterCategory(null)} className={`text-xs px-2 py-1 rounded ${!filterCategory ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Tous</button>
        {LEVER_CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilterCategory(c.value)} className={`text-xs px-2 py-1 rounded ${filterCategory === c.value ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>{c.label}</button>
        ))}
      </div>

      {/* Levers list */}
      <div className="space-y-2">
        {filtered.map(lever => (
          <Card key={lever.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={lever.enabled} onCheckedChange={v => updateLever(lever.id, { enabled: v })} />
                <div>
                  <p className="text-sm font-medium">{lever.custom_lever_name || lever.category}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{LEVER_CATEGORIES.find(c => c.value === lever.category)?.label || lever.category}</Badge>
                    <span className="text-[10px] text-muted-foreground">Scopes {lever.scope_concerned?.join(', ')}</span>
                    <Badge variant={lever.confidence_level === 'high' ? 'default' : 'secondary'} className="text-[10px]">{lever.confidence_level}</Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{lever.max_reduction_tco2e.toLocaleString('fr-FR')} tCO₂e</p>
                <p className="text-[10px] text-muted-foreground">{lever.estimated_cost.toLocaleString('fr-FR')} €</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun levier. Ajoutez-en via le bouton ci-dessus.</p>}
      </div>
    </div>
  );
};
