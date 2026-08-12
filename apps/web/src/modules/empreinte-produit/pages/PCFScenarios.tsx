// Scénarios de comparaison PCF
import React, { useState, useMemo } from 'react';
import { usePCFStudies } from '../hooks/usePCFStudy';
import { usePCFScenarios } from '../hooks/usePCFData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GitCompare, Plus, Trash2, Loader2, TrendingDown, TrendingUp, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ScenarioForm {
  name: string;
  description: string;
  changeType: string;
  reductionPct: string;
}

const CHANGE_TYPES = [
  { value: 'material_recycled', label: 'Matière recyclée', phase: 'materials', desc: 'Remplacer une matière vierge par du recyclé' },
  { value: 'renewable_energy', label: 'Énergie renouvelable', phase: 'manufacturing', desc: 'Passer à une source d\'énergie renouvelable' },
  { value: 'transport_modal', label: 'Report modal transport', phase: 'transport', desc: 'Changer le mode de transport (ex: route → rail)' },
  { value: 'packaging_reduction', label: 'Réduction emballage', phase: 'packaging', desc: 'Réduire le poids ou changer le matériau d\'emballage' },
  { value: 'process_optimization', label: 'Optimisation process', phase: 'manufacturing', desc: 'Améliorer l\'efficacité du procédé' },
  { value: 'local_sourcing', label: 'Approvisionnement local', phase: 'transport', desc: 'Réduire les distances d\'approvisionnement' },
  { value: 'custom', label: 'Personnalisé', phase: 'materials', desc: 'Scénario personnalisé' },
];

const COLORS = ['#0E7C66', '#1ABC9C', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

const PCFScenarios: React.FC = () => {
  const { data: studies, isLoading: studiesLoading } = usePCFStudies();
  const [selectedStudyId, setSelectedStudyId] = useState<string>('');
  const { data: scenarios, isLoading: scenariosLoading, insert, remove } = usePCFScenarios(selectedStudyId || undefined);

  const [form, setForm] = useState<ScenarioForm>({ name: '', description: '', changeType: 'material_recycled', reductionPct: '20' });
  const [showForm, setShowForm] = useState(false);

  const calculatedStudies = studies?.filter(s => s.status === 'calculated' && s.total_emissions) || [];
  const selectedStudy = calculatedStudies.find(s => s.id === selectedStudyId);
  const baseEmissions = selectedStudy?.total_emissions || 0;

  const handleAdd = () => {
    if (!form.name || !selectedStudyId || !form.reductionPct) return;
    const reductionPct = parseFloat(form.reductionPct);
    const resultEmissions = baseEmissions * (1 - reductionPct / 100);
    const changeInfo = CHANGE_TYPES.find(c => c.value === form.changeType);

    insert.mutate({
      study_id: selectedStudyId,
      name: form.name,
      description: form.description || null,
      changes: {
        type: form.changeType,
        phase: changeInfo?.phase || 'materials',
        reduction_pct: reductionPct,
      },
      result_emissions: resultEmissions,
      reduction_pct: reductionPct,
    });
    setForm({ name: '', description: '', changeType: 'material_recycled', reductionPct: '20' });
    setShowForm(false);
  };

  const chartData = useMemo(() => {
    if (!baseEmissions) return [];
    const items = [
      { name: 'Base (actuel)', value: Number(baseEmissions.toFixed(2)), fill: '#64748B' },
    ];
    scenarios?.forEach((s, i) => {
      items.push({
        name: s.name,
        value: Number((s.result_emissions || 0).toFixed(2)),
        fill: COLORS[i % COLORS.length],
      });
    });
    return items;
  }, [baseEmissions, scenarios]);

  if (studiesLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Scénarios de réduction</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comparez l'impact de différentes hypothèses sur l'empreinte carbone de vos produits.
        </p>
      </div>

      {/* Study selector */}
      <Card className="p-4">
        <label className="text-sm font-medium text-foreground mb-2 block">Étude de référence</label>
        {calculatedStudies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune étude calculée. Calculez d'abord l'empreinte d'un produit.</p>
        ) : (
          <Select value={selectedStudyId} onValueChange={setSelectedStudyId}>
            <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="Sélectionner une étude calculée" /></SelectTrigger>
            <SelectContent>
              {calculatedStudies.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} — {(s.total_emissions || 0).toFixed(2)} kg CO₂e
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Card>

      {selectedStudyId && (
        <>
          {/* Base info */}
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Empreinte actuelle</p>
              <p className="text-2xl font-bold text-foreground">{baseEmissions.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">kg CO₂e / {selectedStudy?.functional_unit}</span></p>
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2" size="sm">
              <Plus className="w-4 h-4" /> Ajouter un scénario
            </Button>
          </Card>

          {/* Add scenario form */}
          {showForm && (
            <Card className="p-5 space-y-4 border-primary/30">
              <h3 className="font-semibold text-foreground">Nouveau scénario</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Nom du scénario</label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Acier recyclé 50%" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Type de changement</label>
                  <Select value={form.changeType} onValueChange={v => setForm({ ...form, changeType: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CHANGE_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Réduction estimée (%)</label>
                  <Input type="number" min="0" max="100" value={form.reductionPct} onChange={e => setForm({ ...form, reductionPct: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Description (optionnel)</label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 h-[38px]" placeholder="Détails du scénario..." />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button size="sm" onClick={handleAdd} disabled={!form.name || insert.isPending}>
                  {insert.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Créer le scénario
                </Button>
              </div>
            </Card>
          )}

          {/* Scenarios list */}
          {scenariosLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : scenarios && scenarios.length > 0 ? (
            <>
              <div className="space-y-3">
                {scenarios.map((s, i) => {
                  const reduction = s.reduction_pct || 0;
                  const resultEmissions = s.result_emissions || 0;
                  return (
                    <Card key={s.id} className="p-4 flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{s.name}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {(s.changes as any)?.type ? CHANGE_TYPES.find(c => c.value === (s.changes as any).type)?.label : 'Personnalisé'}
                          </Badge>
                        </div>
                        {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{resultEmissions.toFixed(2)} kg CO₂e</p>
                        <div className="flex items-center gap-1 text-xs">
                          {reduction > 0 ? (
                            <><TrendingDown className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600 font-semibold">-{reduction.toFixed(1)}%</span></>
                          ) : (
                            <><TrendingUp className="w-3 h-3 text-red-500" /><span className="text-red-600 font-semibold">+{Math.abs(reduction).toFixed(1)}%</span></>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </Card>
                  );
                })}
              </div>

              {/* Chart */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Comparaison des scénarios</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `${v} kg CO₂e`} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <GitCompare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun scénario créé.</p>
              <p className="text-xs text-muted-foreground mt-2">Ajoutez des scénarios pour comparer l'impact de différentes hypothèses.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default PCFScenarios;
