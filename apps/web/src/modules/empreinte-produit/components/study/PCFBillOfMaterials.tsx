// Bill of Materials (BOM) – Composition du produit avec scrap rate, recherche FE + import Collecte + ACV multi-indicateurs
import React, { useState } from 'react';
import { usePCFMaterials } from '../../hooks/usePCFData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Search, Info, Droplets, Zap, Wind } from 'lucide-react';
import EmissionFactorSearch from './EmissionFactorSearch';
import ActivityDataImportDialog from './ActivityDataImportDialog';
import type { ImportableActivityData } from '../../hooks/useActivityDataImport';
import type { StudyMode } from '../../types';

const UNITS = ['kg', 't', 'L', 'm³', 'm²', 'unité'];

const PCFBillOfMaterials: React.FC<{ studyId: string; locked?: boolean; studyMode?: StudyMode }> = ({ studyId, locked, studyMode = 'pcf' }) => {
  const { data: materials, isLoading, insert, update, remove } = usePCFMaterials(studyId);
  const [newRow, setNewRow] = useState({ material_name: '', quantity: '', unit: 'kg', country_origin: '', supplier: '', scrap_rate: '0' });
  const [showSearch, setShowSearch] = useState(false);
  const [searchTargetId, setSearchTargetId] = useState<string | null>(null);

  const isACV = studyMode === 'acv';

  const handleAdd = () => {
    if (!newRow.material_name || !newRow.quantity) return;
    insert.mutate({
      study_id: studyId,
      material_name: newRow.material_name,
      quantity: parseFloat(newRow.quantity),
      unit: newRow.unit,
      country_origin: newRow.country_origin || null,
      supplier: newRow.supplier || null,
      scrap_rate: parseFloat(newRow.scrap_rate) || 0,
      is_estimated: false,
    });
    setNewRow({ material_name: '', quantity: '', unit: 'kg', country_origin: '', supplier: '', scrap_rate: '0' });
  };

  const handleFactorSelect = (factor: any) => {
    if (searchTargetId) {
      update.mutate({
        id: searchTargetId,
        emission_factor_id: factor.id,
        emission_factor_value: factor.emission_factor,
        is_estimated: false,
      });
    }
    setShowSearch(false);
    setSearchTargetId(null);
  };

  const getEffectiveQuantity = (quantity: number, scrapRate: number) => {
    return quantity * (1 + scrapRate / 100);
  };

  const calculateEmissions = (m: { quantity: number; scrap_rate?: number; emission_factor_value: number | null; emissions_kg: number | null }) => {
    if (m.emissions_kg !== null) return m.emissions_kg;
    if (!m.emission_factor_value) return null;
    const effectiveQty = getEffectiveQuantity(m.quantity, m.scrap_rate || 0);
    return effectiveQty * m.emission_factor_value;
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Composition du produit (BOM)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Définissez les matières premières. Le <strong>taux de perte (scrap rate)</strong> ajuste automatiquement la quantité réelle consommée.
          </p>
          {isACV && (
            <Badge variant="outline" className="mt-2 text-xs gap-1">
              <Zap className="w-3 h-3" /> Mode ACV – Indicateurs multi-critères activés
            </Badge>
          )}
        </div>
        <ActivityDataImportDialog
          category="materials"
          disabled={locked}
          onImport={(items: ImportableActivityData[]) => {
            items.forEach(item => {
              insert.mutate({
                study_id: studyId,
                material_name: item.subcategory || item.activity_type,
                quantity: item.quantity,
                unit: item.unit,
                is_estimated: item.data_quality !== 'real',
                emission_factor_id: item.emission_factor_id,
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
                <th className="text-left p-3 font-medium">Matériau</th>
                <th className="text-right p-3 font-medium">Quantité</th>
                <th className="text-left p-3 font-medium">Unité</th>
                <th className="text-right p-3 font-medium">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 ml-auto">
                        Perte % <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">Taux de perte (scrap rate) : pourcentage de matière perdue en production. 
                        Ex: 10% signifie que pour 1kg de produit fini, 1.1kg de matière est nécessaire.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </th>
                <th className="text-right p-3 font-medium text-muted-foreground">Qté effective</th>
                <th className="text-left p-3 font-medium">Fournisseur</th>
                <th className="text-left p-3 font-medium">Origine</th>
                <th className="text-right p-3 font-medium">FE</th>
                <th className="text-right p-3 font-medium">Émissions</th>
                {isACV && (
                  <>
                    <th className="text-right p-3 font-medium text-amber-600">
                      <TooltipProvider><Tooltip><TooltipTrigger className="flex items-center gap-1 ml-auto">
                        <Zap className="w-3 h-3" /> MJ/u
                      </TooltipTrigger><TooltipContent><p className="text-xs">Énergie primaire par unité de matériau (MJ)</p></TooltipContent></Tooltip></TooltipProvider>
                    </th>
                    <th className="text-right p-3 font-medium text-blue-600">
                      <TooltipProvider><Tooltip><TooltipTrigger className="flex items-center gap-1 ml-auto">
                        <Droplets className="w-3 h-3" /> m³/u
                      </TooltipTrigger><TooltipContent><p className="text-xs">Consommation d'eau par unité de matériau (m³)</p></TooltipContent></Tooltip></TooltipProvider>
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
              {materials?.map((m) => {
                const scrapRate = (m as any).scrap_rate || 0;
                const effectiveQty = getEffectiveQuantity(m.quantity, scrapRate);
                const emissions = calculateEmissions({ ...m, scrap_rate: scrapRate });
                const mAny = m as any;

                return (
                  <tr key={m.id} className="border-b border-border hover:bg-muted/20">
                    <td className="p-3 font-medium">{m.material_name}</td>
                    <td className="p-3 text-right">{m.quantity}</td>
                    <td className="p-3">{m.unit}</td>
                    <td className="p-3 text-right">
                      {!locked ? (
                        <Input
                          type="number" min="0" max="100" step="0.1"
                          className="h-7 w-16 text-xs text-right ml-auto"
                          defaultValue={scrapRate}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val !== scrapRate) update.mutate({ id: m.id, scrap_rate: val } as any);
                          }}
                        />
                      ) : (
                        <span className="text-xs">{scrapRate}%</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-muted-foreground text-xs">{effectiveQty.toFixed(2)} {m.unit}</td>
                    <td className="p-3 text-muted-foreground">{m.supplier || '–'}</td>
                    <td className="p-3 text-muted-foreground">{m.country_origin || '–'}</td>
                    <td className="p-3 text-right">
                      {m.emission_factor_value ? (
                        <span className="text-xs text-foreground">{m.emission_factor_value}</span>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1"
                          onClick={() => { setSearchTargetId(m.id); setShowSearch(true); }} disabled={locked}>
                          <Search className="w-3 h-3" /> Lier
                        </Button>
                      )}
                    </td>
                    <td className="p-3 text-right font-semibold text-[hsl(var(--carbon-impact))]">
                      {emissions !== null ? `${emissions.toFixed(2)} kg` : '–'}
                    </td>
                    {isACV && (
                      <>
                        <td className="p-3 text-right">
                          {!locked ? (
                            <Input type="number" step="0.1" className="h-7 w-16 text-xs text-right ml-auto"
                              defaultValue={mAny.energy_mj || ''}
                              placeholder="30"
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) update.mutate({ id: m.id, energy_mj: val } as any);
                              }} />
                          ) : (
                            <span className="text-xs text-amber-600">{mAny.energy_mj || '–'}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!locked ? (
                            <Input type="number" step="0.001" className="h-7 w-16 text-xs text-right ml-auto"
                              defaultValue={mAny.water_m3 || ''}
                              placeholder="0.01"
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) update.mutate({ id: m.id, water_m3: val } as any);
                              }} />
                          ) : (
                            <span className="text-xs text-blue-600">{mAny.water_m3 || '–'}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!locked ? (
                            <Input type="number" step="0.0001" className="h-7 w-16 text-xs text-right ml-auto"
                              defaultValue={mAny.acidification_kgso2e || ''}
                              placeholder="0.005"
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) update.mutate({ id: m.id, acidification_kgso2e: val } as any);
                              }} />
                          ) : (
                            <span className="text-xs text-red-600">{mAny.acidification_kgso2e || '–'}</span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="p-3">
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(m.id)} disabled={locked}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {!locked && (
                <tr className="bg-muted/10">
                  <td className="p-2">
                    <Input placeholder="Nom du matériau" className="h-8 text-sm" value={newRow.material_name}
                      onChange={(e) => setNewRow({ ...newRow, material_name: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Input placeholder="Qté" type="number" className="h-8 text-sm w-20 text-right" value={newRow.quantity}
                      onChange={(e) => setNewRow({ ...newRow, quantity: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Select value={newRow.unit} onValueChange={(v) => setNewRow({ ...newRow, unit: v })}>
                      <SelectTrigger className="h-8 text-sm w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input placeholder="0" type="number" min="0" max="100" step="0.1" className="h-8 text-sm w-16 text-right" value={newRow.scrap_rate}
                      onChange={(e) => setNewRow({ ...newRow, scrap_rate: e.target.value })} />
                  </td>
                  <td className="p-2 text-xs text-muted-foreground text-right">
                    {newRow.quantity ? `${getEffectiveQuantity(parseFloat(newRow.quantity) || 0, parseFloat(newRow.scrap_rate) || 0).toFixed(2)}` : '–'}
                  </td>
                  <td className="p-2">
                    <Input placeholder="Fournisseur" className="h-8 text-sm" value={newRow.supplier}
                      onChange={(e) => setNewRow({ ...newRow, supplier: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Input placeholder="Pays" className="h-8 text-sm" value={newRow.country_origin}
                      onChange={(e) => setNewRow({ ...newRow, country_origin: e.target.value })} />
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  {isACV && <><td className="p-2"></td><td className="p-2"></td><td className="p-2"></td></>}
                  <td className="p-2">
                    <Button size="icon" className="h-8 w-8" onClick={handleAdd} disabled={insert.isPending}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </td>
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
          initialSearch={searchTargetId ? materials?.find(m => m.id === searchTargetId)?.material_name || '' : ''}
        />
      )}

      {materials && materials.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {materials.length} matériau(x) · {materials.filter(m => m.emission_factor_value).length} avec FE lié
          </span>
          <span>
            {materials.some((m: any) => (m.scrap_rate || 0) > 0) && (
              <span className="text-amber-600">⚠ Taux de perte appliqué sur certains matériaux</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default PCFBillOfMaterials;