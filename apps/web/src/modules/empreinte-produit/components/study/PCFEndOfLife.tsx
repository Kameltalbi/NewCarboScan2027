// Fin de vie du produit
import React, { useState } from 'react';
import { usePCFEndOfLife } from '../../hooks/usePCFData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Zap } from 'lucide-react';

const SCENARIOS = [
  { value: 'recycling', label: 'Recyclage' },
  { value: 'incineration', label: 'Incinération' },
  { value: 'landfill', label: 'Mise en décharge' },
  { value: 'reuse', label: 'Réemploi' },
];

const PCFEndOfLife: React.FC<{ studyId: string; locked?: boolean; studyMode?: string }> = ({ studyId, locked = false, studyMode }) => {
  const { data: rows, isLoading, insert, remove } = usePCFEndOfLife(studyId);
  const [newRow, setNewRow] = useState({ scenario: 'recycling' as string, percentage: '100' });

  const isACV = studyMode === 'acv';

  const handleAdd = () => {
    if (!newRow.percentage) return;
    insert.mutate({
      study_id: studyId,
      scenario: newRow.scenario as any,
      percentage: parseFloat(newRow.percentage),
      is_estimated: false,
    });
    setNewRow({ scenario: 'recycling', percentage: '100' });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Fin de vie</h2>
        <p className="text-sm text-muted-foreground mt-1">Scénarios de traitement en fin de vie du produit.</p>
        {isACV && (
          <Badge variant="outline" className="mt-2 text-xs gap-1">
            <Zap className="w-3 h-3" /> Mode ACV – Indicateurs multi-critères activés
          </Badge>
        )}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium">Scénario</th>
              <th className="text-right p-3 font-medium">Pourcentage (%)</th>
              <th className="text-right p-3 font-medium">Émissions</th>
              {isACV && (
                <>
                  <th className="text-right p-3 font-medium text-amber-600">MJ/u</th>
                  <th className="text-right p-3 font-medium text-blue-600">m³ eau</th>
                  <th className="text-right p-3 font-medium text-purple-600">SO₂e</th>
                </>
              )}
              <th className="p-3 w-10"></th>
            </tr></thead>
            <tbody>
              {rows?.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                  <td className="p-3">{SCENARIOS.find(s => s.value === r.scenario)?.label}</td>
                  <td className="p-3 text-right">{r.percentage}%</td>
                  <td className="p-3 text-right font-semibold text-[hsl(var(--carbon-impact))]">{r.emissions_kg !== null ? `${r.emissions_kg.toFixed(2)} kg` : '–'}</td>
                  {isACV && (
                    <>
                      <td className="p-3 text-right">{(r as any).energy_mj?.toFixed(2) ?? '–'}</td>
                      <td className="p-3 text-right">{(r as any).water_m3?.toFixed(4) ?? '–'}</td>
                      <td className="p-3 text-right">{(r as any).acidification_kgso2e?.toFixed(4) ?? '–'}</td>
                    </>
                  )}
                  <td className="p-3"><Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)} disabled={locked}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></td>
                </tr>
              ))}
              {!locked && <tr className="bg-muted/10">
                <td className="p-2">
                  <Select value={newRow.scenario} onValueChange={v => setNewRow({ ...newRow, scenario: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{SCENARIOS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-2"><Input type="number" placeholder="%" className="h-8 text-sm w-24 text-right" value={newRow.percentage} onChange={e => setNewRow({ ...newRow, percentage: e.target.value })} /></td>
                <td className="p-2"></td>
                {isACV && <><td className="p-2"></td><td className="p-2"></td><td className="p-2"></td></>}
                <td className="p-2"><Button size="icon" className="h-8 w-8" onClick={handleAdd}><Plus className="w-3.5 h-3.5" /></Button></td>
              </tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default PCFEndOfLife;
