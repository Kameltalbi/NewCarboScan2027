import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Copy, Trash2, Edit2 } from 'lucide-react';
import { ClimateScenario, SCENARIO_TYPE_LABELS, SCENARIO_TYPE_COLORS, ScenarioType } from '../types';

interface Props {
  scenarios: ClimateScenario[];
  activeScenarioId: string | null;
  onSelect: (id: string) => void;
  onCreate: (s: Partial<ClimateScenario>) => Promise<ClimateScenario | null>;
  onUpdate: (id: string, u: Partial<ClimateScenario>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onDuplicate: (id: string, name: string) => Promise<ClimateScenario | null>;
}

export const ScenarioBuilderSection: React.FC<Props> = ({ scenarios, activeScenarioId, onSelect, onCreate, onUpdate, onDelete, onDuplicate }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ScenarioType>('custom');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const base = scenarios[0];
    await onCreate({
      name: newName,
      scenario_type: newType,
      baseline_source_type: base?.baseline_source_type || 'bilan',
      baseline_year: base?.baseline_year || new Date().getFullYear() - 1,
      start_year: (base?.baseline_year || new Date().getFullYear() - 1) + 1,
      target_year: base?.target_year || 2035,
      baseline_emissions_tco2e: base?.baseline_emissions_tco2e || 0,
      status: 'draft',
    });
    setNewName('');
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Construction des scénarios</h2>
          <p className="text-sm text-muted-foreground">{scenarios.length} scénario(s) créé(s). Sélectionnez-en un pour le paramétrer.</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Nouveau scénario</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un scénario</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label className="text-xs">Nom *</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Scénario ambitieux 2030" className="mt-1" /></div>
              <div><Label className="text-xs">Type</Label>
                <select value={newType} onChange={e => setNewType(e.target.value as ScenarioType)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {Object.entries(SCENARIO_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <Button onClick={handleCreate} disabled={!newName.trim()} className="w-full">Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenarios.map(s => (
          <Card key={s.id} className={`cursor-pointer transition-all border-l-4 ${activeScenarioId === s.id ? 'ring-1 ring-primary/30' : 'hover:shadow-sm'}`}
            style={{ borderLeftColor: SCENARIO_TYPE_COLORS[s.scenario_type] || 'hsl(var(--border))' }}
            onClick={() => onSelect(s.id)}>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{s.name}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">{SCENARIO_TYPE_LABELS[s.scenario_type]}</Badge>
                  <Badge variant={s.status === 'validated' ? 'default' : 'secondary'} className="text-[10px]">{s.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div><span className="block font-semibold text-foreground">{s.baseline_year}</span>Réf.</div>
                <div><span className="block font-semibold text-foreground">{s.target_year}</span>Cible</div>
                <div><span className="block font-semibold text-foreground">{s.target_reduction_percent ?? 0}%</span>Réduction</div>
                <div><span className="block font-semibold text-foreground">{s.baseline_emissions_tco2e?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) || '—'}</span>tCO₂e</div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); onDuplicate(s.id, `${s.name} (copie)`); }}>
                  <Copy className="h-3 w-3" />Dupliquer
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={e => { e.stopPropagation(); onDelete(s.id); }}>
                  <Trash2 className="h-3 w-3" />Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
