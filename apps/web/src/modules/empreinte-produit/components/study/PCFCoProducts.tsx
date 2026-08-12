// Coproduits & Allocation – Règles d'allocation massique ou économique
import React, { useState, useMemo } from 'react';
import { usePCFCoProductAllocations } from '../../hooks/usePCFData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Scale, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AllocationMethod } from '../../types';

const PCFCoProducts: React.FC<{ studyId: string; locked?: boolean }> = ({ studyId, locked }) => {
  const { data: rows, isLoading, insert, update, remove } = usePCFCoProductAllocations(studyId);
  const [newRow, setNewRow] = useState({ product_name: '', allocation_method: 'mass' as AllocationMethod, allocation_value: '', is_main_product: false });

  const totalValue = useMemo(() => rows?.reduce((s, r) => s + r.allocation_value, 0) || 0, [rows]);

  const handleAdd = () => {
    if (!newRow.product_name || !newRow.allocation_value) return;
    const value = parseFloat(newRow.allocation_value);
    const newTotal = totalValue + value;
    insert.mutate({
      study_id: studyId,
      product_name: newRow.product_name,
      allocation_method: newRow.allocation_method,
      allocation_value: value,
      allocation_percentage: newTotal > 0 ? (value / newTotal) * 100 : 100,
      is_main_product: newRow.is_main_product,
    });
    setNewRow({ product_name: '', allocation_method: 'mass', allocation_value: '', is_main_product: false });
  };

  // Recalculate percentages
  const rowsWithPct = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const total = rows.reduce((s, r) => s + r.allocation_value, 0);
    return rows.map(r => ({
      ...r,
      computed_pct: total > 0 ? (r.allocation_value / total) * 100 : 0,
    }));
  }, [rows]);

  const methodLabel = (m: string) => m === 'mass' ? 'Massique (kg)' : 'Économique (€)';

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Coproduits & Allocation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Quand la ligne de production fabrique plusieurs produits simultanément, les émissions doivent être allouées
          selon une règle massique ou économique (ISO 14067 §6.5).
        </p>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Allocation massique</strong> : répartition proportionnelle au poids de chaque coproduit.
          <br />
          <strong>Allocation économique</strong> : répartition proportionnelle à la valeur économique de chaque coproduit.
        </AlertDescription>
      </Alert>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Produit</th>
                <th className="text-left p-3 font-medium">Méthode</th>
                <th className="text-right p-3 font-medium">Valeur</th>
                <th className="text-right p-3 font-medium">% Allocation</th>
                <th className="text-center p-3 font-medium">Principal</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rowsWithPct.map((r) => (
                <tr key={r.id} className={`border-b border-border hover:bg-muted/20 ${r.is_main_product ? 'bg-primary/5' : ''}`}>
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                      {r.product_name}
                    </div>
                  </td>
                  <td className="p-3">
                    {!locked ? (
                      <Select value={r.allocation_method} onValueChange={(v) => update.mutate({ id: r.id, allocation_method: v as AllocationMethod })}>
                        <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mass">Massique (kg)</SelectItem>
                          <SelectItem value="economic">Économique (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground">{methodLabel(r.allocation_method)}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">{r.allocation_value}</td>
                  <td className="p-3 text-right font-semibold text-[hsl(var(--carbon-impact))]">
                    {r.computed_pct.toFixed(1)}%
                  </td>
                  <td className="p-3 text-center">
                    <Switch
                      checked={r.is_main_product}
                      onCheckedChange={(v) => update.mutate({ id: r.id, is_main_product: v })}
                      disabled={locked}
                    />
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)} disabled={locked}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!locked && (
                <tr className="bg-muted/10">
                  <td className="p-2">
                    <Input placeholder="Nom du coproduit" className="h-8 text-sm" value={newRow.product_name} onChange={(e) => setNewRow({ ...newRow, product_name: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Select value={newRow.allocation_method} onValueChange={(v) => setNewRow({ ...newRow, allocation_method: v as AllocationMethod })}>
                      <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mass">Massique (kg)</SelectItem>
                        <SelectItem value="economic">Économique (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input type="number" placeholder="Valeur" className="h-8 text-sm w-24 text-right" value={newRow.allocation_value} onChange={(e) => setNewRow({ ...newRow, allocation_value: e.target.value })} />
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2 text-center">
                    <Switch checked={newRow.is_main_product} onCheckedChange={(v) => setNewRow({ ...newRow, is_main_product: v })} />
                  </td>
                  <td className="p-2">
                    <Button size="icon" className="h-8 w-8" onClick={handleAdd}><Plus className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {rowsWithPct.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Répartition de l'allocation</h3>
          <div className="space-y-2">
            {rowsWithPct.map(r => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="text-sm w-40 truncate">{r.product_name}</span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${r.is_main_product ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    style={{ width: `${r.computed_pct}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-16 text-right">{r.computed_pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PCFCoProducts;
