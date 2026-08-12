// Fabrication – Énergie et procédés industriels avec recherche FE + import Collecte + ACV multi-indicateurs
import React, { useState } from 'react';
import { usePCFManufacturing } from '../../hooks/usePCFData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Search, Zap, Droplets, Wind } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import EmissionFactorSearch from './EmissionFactorSearch';
import ActivityDataImportDialog from './ActivityDataImportDialog';
import type { ImportableActivityData } from '../../hooks/useActivityDataImport';
import type { StudyMode } from '../../types';

const ENERGY_TYPES = [
  { value: 'electricite', label: 'Électricité', unit: 'kWh' },
  { value: 'gaz_naturel', label: 'Gaz naturel', unit: 'm³' },
  { value: 'diesel', label: 'Diesel', unit: 'L' },
  { value: 'propane', label: 'Propane', unit: 'kg' },
  { value: 'fioul', label: 'Fioul lourd', unit: 'L' },
  { value: 'autre', label: 'Autre', unit: 'kWh' },
];

const PROCESS_TYPES = ['soudage', 'découpe', 'peinture', 'traitement thermique', 'usinage', 'assemblage', 'autre'];

const PCFManufacturing: React.FC<{ studyId: string; locked?: boolean; studyMode?: StudyMode }> = ({ studyId, locked, studyMode = 'pcf' }) => {
  const { data: rows, isLoading, insert, update, remove } = usePCFManufacturing(studyId);
  const [newRow, setNewRow] = useState({ energy_type: 'electricite', quantity: '', unit: 'kWh', process_type: '' });
  const [showSearch, setShowSearch] = useState(false);
  const [searchTargetId, setSearchTargetId] = useState<string | null>(null);

  const isACV = studyMode === 'acv';

  const handleAdd = () => {
    if (!newRow.quantity) return;
    insert.mutate({
      study_id: studyId,
      energy_type: newRow.energy_type,
      quantity: parseFloat(newRow.quantity),
      unit: newRow.unit,
      process_type: newRow.process_type || null,
      is_estimated: false,
    });
    setNewRow({ energy_type: 'electricite', quantity: '', unit: 'kWh', process_type: '' });
  };

  const handleFactorSelect = (factor: any) => {
    if (searchTargetId) {
      update.mutate({
        id: searchTargetId,
        emission_factor_value: factor.emission_factor,
        is_estimated: false,
      });
    }
    setShowSearch(false);
    setSearchTargetId(null);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Fabrication</h2>
          <p className="text-sm text-muted-foreground mt-1">Énergie consommée et procédés industriels liés à la fabrication du produit.</p>
          {isACV && (
            <Badge variant="outline" className="mt-2 text-xs gap-1">
              <Zap className="w-3 h-3" /> Mode ACV – Facteurs énergie, eau et acidification par poste
            </Badge>
          )}
        </div>
        <ActivityDataImportDialog
          category="energy"
          disabled={locked}
          onImport={(items: ImportableActivityData[]) => {
            items.forEach(item => {
              insert.mutate({
                study_id: studyId,
                energy_type: item.subcategory || item.activity_type,
                quantity: item.quantity,
                unit: item.unit,
                is_estimated: item.data_quality !== 'real',
              });
            });
          }}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Type d'énergie</th>
                <th className="text-right p-3 font-medium">Quantité</th>
                <th className="text-left p-3 font-medium">Unité</th>
                <th className="text-left p-3 font-medium">Procédé</th>
                <th className="text-right p-3 font-medium">FE</th>
                <th className="text-right p-3 font-medium">Émissions</th>
                {isACV && (
                  <>
                    <th className="text-right p-3 font-medium text-amber-600">
                      <TooltipProvider><Tooltip><TooltipTrigger className="flex items-center gap-1 ml-auto">
                        <Zap className="w-3 h-3" /> MJ/u
                      </TooltipTrigger><TooltipContent><p className="text-xs">Énergie primaire par unité consommée (MJ)</p></TooltipContent></Tooltip></TooltipProvider>
                    </th>
                    <th className="text-right p-3 font-medium text-blue-600">
                      <TooltipProvider><Tooltip><TooltipTrigger className="flex items-center gap-1 ml-auto">
                        <Droplets className="w-3 h-3" /> m³/u
                      </TooltipTrigger><TooltipContent><p className="text-xs">Consommation d'eau par unité (m³)</p></TooltipContent></Tooltip></TooltipProvider>
                    </th>
                    <th className="text-right p-3 font-medium text-red-600">
                      <TooltipProvider><Tooltip><TooltipTrigger className="flex items-center gap-1 ml-auto">
                        <Wind className="w-3 h-3" /> SO₂e/u
                      </TooltipTrigger><TooltipContent><p className="text-xs">Potentiel d'acidification par unité (kg SO₂e)</p></TooltipContent></Tooltip></TooltipProvider>
                    </th>
                  </>
                )}
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => {
                const rAny = r as any;
                return (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                    <td className="p-3">{ENERGY_TYPES.find(e => e.value === r.energy_type)?.label || r.energy_type}</td>
                    <td className="p-3 text-right">{r.quantity}</td>
                    <td className="p-3">{r.unit}</td>
                    <td className="p-3 text-muted-foreground">{r.process_type || '–'}</td>
                    <td className="p-3 text-right">
                      {r.emission_factor_value ? (
                        <span className="text-xs text-foreground">{r.emission_factor_value}</span>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1"
                          onClick={() => { setSearchTargetId(r.id); setShowSearch(true); }} disabled={locked}>
                          <Search className="w-3 h-3" /> Lier
                        </Button>
                      )}
                    </td>
                    <td className="p-3 text-right font-semibold text-[hsl(var(--carbon-impact))]">
                      {r.emissions_kg !== null ? `${r.emissions_kg.toFixed(2)} kg` : '–'}
                    </td>
                    {isACV && (
                      <>
                        <td className="p-3 text-right">
                          {!locked ? (
                            <Input type="number" step="0.1" className="h-7 w-16 text-xs text-right ml-auto"
                              defaultValue={rAny.energy_mj || ''}
                              placeholder="9.0"
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) update.mutate({ id: r.id, energy_mj: val } as any);
                              }} />
                          ) : (
                            <span className="text-xs text-amber-600">{rAny.energy_mj || '–'}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!locked ? (
                            <Input type="number" step="0.001" className="h-7 w-16 text-xs text-right ml-auto"
                              defaultValue={rAny.water_m3 || ''}
                              placeholder="0.002"
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) update.mutate({ id: r.id, water_m3: val } as any);
                              }} />
                          ) : (
                            <span className="text-xs text-blue-600">{rAny.water_m3 || '–'}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!locked ? (
                            <Input type="number" step="0.0001" className="h-7 w-16 text-xs text-right ml-auto"
                              defaultValue={rAny.acidification_kgso2e || ''}
                              placeholder="0.0003"
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) update.mutate({ id: r.id, acidification_kgso2e: val } as any);
                              }} />
                          ) : (
                            <span className="text-xs text-red-600">{rAny.acidification_kgso2e || '–'}</span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="p-3">
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)} disabled={locked}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!locked && (
                <tr className="bg-muted/10">
                  <td className="p-2">
                    <Select value={newRow.energy_type} onValueChange={(v) => {
                      const et = ENERGY_TYPES.find(e => e.value === v);
                      setNewRow({ ...newRow, energy_type: v, unit: et?.unit || 'kWh' });
                    }}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{ENERGY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-2"><Input type="number" placeholder="Qté" className="h-8 text-sm w-24 text-right" value={newRow.quantity} onChange={(e) => setNewRow({ ...newRow, quantity: e.target.value })} /></td>
                  <td className="p-2"><span className="text-sm text-muted-foreground">{newRow.unit}</span></td>
                  <td className="p-2">
                    <Select value={newRow.process_type} onValueChange={(v) => setNewRow({ ...newRow, process_type: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Procédé (opt.)" /></SelectTrigger>
                      <SelectContent>{PROCESS_TYPES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  {isACV && <><td className="p-2"></td><td className="p-2"></td><td className="p-2"></td></>}
                  <td className="p-2"><Button size="icon" className="h-8 w-8" onClick={handleAdd}><Plus className="w-3.5 h-3.5" /></Button></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showSearch && (
        <EmissionFactorSearch
          onSelect={handleFactorSelect}
          onClose={() => { setShowSearch(false); setSearchTargetId(null); }}
          initialSearch={searchTargetId ? rows?.find(r => r.id === searchTargetId)?.energy_type || '' : ''}
        />
      )}
    </div>
  );
};

export default PCFManufacturing;