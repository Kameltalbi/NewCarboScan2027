// Sous-traitance – Procédés délégués (galvanisation, thermolaquage, etc.)
import React, { useState } from 'react';
import { usePCFSubcontracting } from '../../hooks/usePCFData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Search, Building2 } from 'lucide-react';
import EmissionFactorSearch from './EmissionFactorSearch';

const PROCESS_PRESETS = [
  'Galvanisation à chaud',
  'Thermolaquage',
  'Traitement de surface',
  'Zingage électrolytique',
  'Anodisation',
  'Soudage spécialisé',
  'Usinage CNC',
  'Découpe laser',
  'Traitement thermique',
  'Autre',
];

const PCFSubcontracting: React.FC<{ studyId: string; locked?: boolean }> = ({ studyId, locked }) => {
  const { data: rows, isLoading, insert, update, remove } = usePCFSubcontracting(studyId);
  const [newRow, setNewRow] = useState({ process_name: '', supplier_name: '', country: '', quantity: '', unit: 'kg' });
  const [showSearch, setShowSearch] = useState(false);
  const [searchTargetId, setSearchTargetId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newRow.process_name || !newRow.quantity) return;
    insert.mutate({
      study_id: studyId,
      process_name: newRow.process_name,
      supplier_name: newRow.supplier_name || null,
      country: newRow.country || null,
      quantity: parseFloat(newRow.quantity),
      unit: newRow.unit,
      is_estimated: true,
    });
    setNewRow({ process_name: '', supplier_name: '', country: '', quantity: '', unit: 'kg' });
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

  const totalEmissions = rows?.reduce((sum, r) => sum + (r.emissions_kg || 0), 0) || 0;

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Sous-traitance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Procédés délégués à des sous-traitants (galvanisation, thermolaquage, traitements de surface…).
          Ces émissions sont intégrées au périmètre du produit conformément à l'ISO 14067 §6.3.
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Procédé</th>
                <th className="text-left p-3 font-medium">Fournisseur</th>
                <th className="text-left p-3 font-medium">Pays</th>
                <th className="text-right p-3 font-medium">Quantité</th>
                <th className="text-left p-3 font-medium">Unité</th>
                <th className="text-right p-3 font-medium">FE</th>
                <th className="text-right p-3 font-medium">Émissions</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {r.process_name}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.supplier_name || '–'}</td>
                  <td className="p-3 text-muted-foreground">{r.country || '–'}</td>
                  <td className="p-3 text-right">{r.quantity}</td>
                  <td className="p-3">{r.unit}</td>
                  <td className="p-3 text-right">
                    {r.emission_factor_value ? (
                      <span className="text-xs text-foreground">{r.emission_factor_value}</span>
                    ) : (
                      <Button
                        variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1"
                        onClick={() => { setSearchTargetId(r.id); setShowSearch(true); }}
                        disabled={locked}
                      >
                        <Search className="w-3 h-3" /> Lier
                      </Button>
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold text-[hsl(var(--carbon-impact))]">
                    {r.emissions_kg !== null ? `${r.emissions_kg.toFixed(2)} kg` : '–'}
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
                    <Select value={newRow.process_name} onValueChange={(v) => setNewRow({ ...newRow, process_name: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Procédé…" /></SelectTrigger>
                      <SelectContent>
                        {PROCESS_PRESETS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input placeholder="Fournisseur" className="h-8 text-sm" value={newRow.supplier_name} onChange={(e) => setNewRow({ ...newRow, supplier_name: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Input placeholder="Pays" className="h-8 text-sm w-24" value={newRow.country} onChange={(e) => setNewRow({ ...newRow, country: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Input type="number" placeholder="Qté" className="h-8 text-sm w-20 text-right" value={newRow.quantity} onChange={(e) => setNewRow({ ...newRow, quantity: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Select value={newRow.unit} onValueChange={(v) => setNewRow({ ...newRow, unit: v })}>
                      <SelectTrigger className="h-8 text-sm w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['kg', 't', 'm²', 'pièce', 'lot'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  <td className="p-2">
                    <Button size="icon" className="h-8 w-8" onClick={handleAdd}><Plus className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              )}
            </tbody>
            {rows && rows.length > 0 && (
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td colSpan={6} className="p-3 text-right">Total sous-traitance</td>
                  <td className="p-3 text-right text-[hsl(var(--carbon-impact))]">{totalEmissions.toFixed(2)} kg CO₂e</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {showSearch && (
        <EmissionFactorSearch
          onSelect={handleFactorSelect}
          onClose={() => { setShowSearch(false); setSearchTargetId(null); }}
          initialSearch={searchTargetId ? rows?.find(r => r.id === searchTargetId)?.process_name || '' : ''}
        />
      )}
    </div>
  );
};

export default PCFSubcontracting;
