// Section 3 — Leviers de réduction

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronRight, Zap, TrendingDown } from 'lucide-react';
import { ClimateLever, LEVER_CATEGORY_LABELS, COMPLEXITY_LABELS, MATURITY_LABELS } from '../types';

interface LeversSectionProps {
  levers: ClimateLever[];
  onCreateLever: (lever: Partial<ClimateLever>) => Promise<any>;
  onUpdateLever: (id: string, updates: Partial<ClimateLever>) => Promise<boolean>;
}

export const LeversSection: React.FC<LeversSectionProps> = ({ levers, onCreateLever, onUpdateLever }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLever, setSelectedLever] = useState<ClimateLever | null>(null);
  const [form, setForm] = useState({
    name: '', category: 'energy_efficiency', description: '',
    estimated_potential_reduction_tco2e: 0, estimated_cost: 0,
    complexity_level: 'medium' as const, implementation_duration_months: 12,
    maturity_level: 'concept' as const, owner: '',
  });

  const totalPotential = levers.reduce((s, l) => s + (l.estimated_potential_reduction_tco2e || 0), 0);
  const totalCost = levers.reduce((s, l) => s + (l.estimated_cost || 0), 0);

  const handleCreate = async () => {
    await onCreateLever(form);
    setShowCreate(false);
    setForm({ name: '', category: 'energy_efficiency', description: '', estimated_potential_reduction_tco2e: 0, estimated_cost: 0, complexity_level: 'medium', implementation_duration_months: 12, maturity_level: 'concept', owner: '' });
  };

  const statusColors: Record<string, string> = {
    identified: 'bg-muted text-muted-foreground',
    validated: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-emerald-100 text-emerald-800',
    abandoned: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Leviers de réduction</h2>
          <p className="text-sm text-muted-foreground">{levers.length} leviers identifiés — Potentiel total : {Math.round(totalPotential).toLocaleString('fr-FR')} tCO₂e</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Ajouter un levier</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouveau levier de réduction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom du levier</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Efficacité énergétique bâtiments" />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEVER_CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Potentiel de réduction (tCO₂e)</Label>
                  <Input type="number" value={form.estimated_potential_reduction_tco2e} onChange={e => setForm({ ...form, estimated_potential_reduction_tco2e: +e.target.value })} />
                </div>
                <div>
                  <Label>Coût estimé (€)</Label>
                  <Input type="number" value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: +e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Complexité</Label>
                  <Select value={form.complexity_level} onValueChange={(v: any) => setForm({ ...form, complexity_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMPLEXITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Maturité</Label>
                  <Select value={form.maturity_level} onValueChange={(v: any) => setForm({ ...form, maturity_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MATURITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Responsable</Label>
                <Input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="Nom du responsable" />
              </div>
              <Button onClick={handleCreate} disabled={!form.name} className="w-full">Créer le levier</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {levers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun levier identifié. Commencez par ajouter vos premiers leviers de réduction.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {levers.map(lever => {
            const pct = totalPotential > 0 ? (lever.estimated_potential_reduction_tco2e / totalPotential) * 100 : 0;
            return (
              <Card key={lever.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedLever(lever)}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate">{lever.name}</h3>
                      <p className="text-xs text-muted-foreground">{LEVER_CATEGORY_LABELS[lever.category] || lever.category}</p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ml-2 ${statusColors[lever.status] || ''}`}>
                      {lever.status === 'identified' ? 'Identifié' : lever.status === 'validated' ? 'Validé' : lever.status === 'in_progress' ? 'En cours' : lever.status === 'completed' ? 'Terminé' : 'Abandonné'}
                    </Badge>
                  </div>
                  {lever.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{lever.description}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                      <div className="text-xs font-bold text-primary">{Math.round(lever.estimated_potential_reduction_tco2e)}</div>
                      <div className="text-[10px] text-muted-foreground">tCO₂e</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold">{lever.estimated_cost > 0 ? `${(lever.estimated_cost / 1000).toFixed(0)}k€` : '—'}</div>
                      <div className="text-[10px] text-muted-foreground">Coût</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold">{COMPLEXITY_LABELS[lever.complexity_level]}</div>
                      <div className="text-[10px] text-muted-foreground">Complexité</div>
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">{Math.round(pct)}% du potentiel total</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
