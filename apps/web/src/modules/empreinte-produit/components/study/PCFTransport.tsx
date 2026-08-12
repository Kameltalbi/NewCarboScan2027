// Transport des matières premières et distribution
import React, { useState } from 'react';
import { usePCFTransport } from '../../hooks/usePCFData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Zap } from 'lucide-react';
import type { TransportType } from '../../types';

const MODES = [
  { value: 'road', label: 'Routier (camion)' },
  { value: 'sea', label: 'Maritime (bateau)' },
  { value: 'rail', label: 'Ferroviaire (train)' },
  { value: 'air', label: 'Aérien (avion)' },
  { value: 'mixed', label: 'Multimodal' },
];

const PCFTransport: React.FC<{ studyId: string; transportType?: TransportType; locked?: boolean; studyMode?: string }> = ({ studyId, transportType = 'inbound', locked = false, studyMode }) => {
  const { data: rows, isLoading, insert, remove } = usePCFTransport(studyId);
  const filtered = rows?.filter(r => r.transport_type === transportType) || [];
  const [newRow, setNewRow] = useState({ material_ref: '', mode: 'road' as string, distance_km: '', weight_kg: '' });

  const isACV = studyMode === 'acv';
  const title = transportType === 'inbound' ? 'Transport des matières premières' : 'Distribution du produit fini';

  const handleAdd = () => {
    if (!newRow.distance_km || !newRow.weight_kg) return;
    insert.mutate({
      study_id: studyId,
      transport_type: transportType,
      material_ref: newRow.material_ref || null,
      mode: newRow.mode as any,
      distance_km: parseFloat(newRow.distance_km),
      weight_kg: parseFloat(newRow.weight_kg),
      is_estimated: false,
    });
    setNewRow({ material_ref: '', mode: 'road', distance_km: '', weight_kg: '' });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Renseignez les trajets de transport. L'unité recommandée est la tonne-kilomètre (t·km).
        </p>
        {isACV && (
          <Badge variant="outline" className="mt-2 text-xs gap-1">
            <Zap className="w-3 h-3" /> Mode ACV – Indicateurs multi-critères activés
          </Badge>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Matière / Réf.</th>
                <th className="text-left p-3 font-medium">Mode</th>
                <th className="text-right p-3 font-medium">Distance (km)</th>
                <th className="text-right p-3 font-medium">Masse (kg)</th>
                <th className="text-right p-3 font-medium">Émissions</th>
                {isACV && (
                  <>
                    <th className="text-right p-3 font-medium text-amber-600">MJ/u</th>
                    <th className="text-right p-3 font-medium text-blue-600">m³ eau</th>
                    <th className="text-right p-3 font-medium text-purple-600">SO₂e</th>
                  </>
                )}
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                  <td className="p-3">{r.material_ref || '–'}</td>
                  <td className="p-3">{MODES.find(m => m.value === r.mode)?.label || r.mode}</td>
                  <td className="p-3 text-right">{r.distance_km}</td>
                  <td className="p-3 text-right">{r.weight_kg}</td>
                  <td className="p-3 text-right font-semibold text-[hsl(var(--carbon-impact))]">
                    {r.emissions_kg !== null ? `${r.emissions_kg.toFixed(2)} kg` : '–'}
                  </td>
                  {isACV && (
                    <>
                      <td className="p-3 text-right">{(r as any).energy_mj?.toFixed(2) ?? '–'}</td>
                      <td className="p-3 text-right">{(r as any).water_m3?.toFixed(4) ?? '–'}</td>
                      <td className="p-3 text-right">{(r as any).acidification_kgso2e?.toFixed(4) ?? '–'}</td>
                    </>
                  )}
                  <td className="p-3">
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)} disabled={locked}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!locked && <tr className="bg-muted/10">
                <td className="p-2"><Input placeholder="Réf." className="h-8 text-sm" value={newRow.material_ref} onChange={(e) => setNewRow({ ...newRow, material_ref: e.target.value })} /></td>
                <td className="p-2">
                  <Select value={newRow.mode} onValueChange={(v) => setNewRow({ ...newRow, mode: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-2"><Input type="number" placeholder="km" className="h-8 text-sm w-24 text-right" value={newRow.distance_km} onChange={(e) => setNewRow({ ...newRow, distance_km: e.target.value })} /></td>
                <td className="p-2"><Input type="number" placeholder="kg" className="h-8 text-sm w-24 text-right" value={newRow.weight_kg} onChange={(e) => setNewRow({ ...newRow, weight_kg: e.target.value })} /></td>
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

export default PCFTransport;
