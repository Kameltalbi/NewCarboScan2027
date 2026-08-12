// Déchets de production
import React, { useState } from 'react';
import { usePCFWastes } from '../../hooks/usePCFData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Zap } from 'lucide-react';

const TREATMENTS = [
  { value: 'recycling', label: 'Recyclage' },
  { value: 'incineration', label: 'Incinération' },
  { value: 'landfill', label: 'Mise en décharge' },
];

const PCFWastes: React.FC<{ studyId: string; locked?: boolean; studyMode?: string }> = ({ studyId, locked = false, studyMode }) => {
  const { data: rows, isLoading, insert, remove } = usePCFWastes(studyId);
  const [newRow, setNewRow] = useState({ waste_type: '', quantity_kg: '', treatment: 'landfill' as string });

  const isACV = studyMode === 'acv';

  const handleAdd = () => {
    if (!newRow.waste_type || !newRow.quantity_kg) return;
    insert.mutate({
      study_id: studyId,
      waste_type: newRow.waste_type,
      quantity_kg: parseFloat(newRow.quantity_kg),
      treatment: newRow.treatment as any,
      is_estimated: false,
    });
    setNewRow({ waste_type: '', quantity_kg: '', treatment: 'landfill' });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Déchets de production</h2>
        <p className="text-sm text-muted-foreground mt-1">Déchets générés pendant la fabrication du produit.</p>
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
              <th className="text-left p-3 font-medium">Type de déchet</th>
              <th className="text-right p-3 font-medium">Quantité (kg)</th>
              <th className="text-left p-3 font-medium">Traitement</th>
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
                  <td className="p-3">{r.waste_type}</td>
                  <td className="p-3 text-right">{r.quantity_kg}</td>
                  <td className="p-3">{TREATMENTS.find(t => t.value === r.treatment)?.label}</td>
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
                <td className="p-2"><Input placeholder="Type" className="h-8 text-sm" value={newRow.waste_type} onChange={e => setNewRow({ ...newRow, waste_type: e.target.value })} /></td>
                <td className="p-2"><Input type="number" placeholder="kg" className="h-8 text-sm w-24 text-right" value={newRow.quantity_kg} onChange={e => setNewRow({ ...newRow, quantity_kg: e.target.value })} /></td>
                <td className="p-2">
                  <Select value={newRow.treatment} onValueChange={v => setNewRow({ ...newRow, treatment: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{TREATMENTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
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

export default PCFWastes;
