// Dialog pour importer des données du module Collecte dans un formulaire PCF
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2 } from 'lucide-react';
import { useImportableActivityData, type ImportableActivityData } from '../../hooks/useActivityDataImport';

interface Props {
  /** Catégorie activity_data à filtrer (energy, materials, transport, waste) */
  category: string;
  /** Callback avec les données sélectionnées */
  onImport: (items: ImportableActivityData[]) => void;
  disabled?: boolean;
}

const QUALITY_COLORS: Record<string, string> = {
  real: 'bg-green-100 text-green-800',
  estimated: 'bg-yellow-100 text-yellow-800',
  default: 'bg-muted text-muted-foreground',
};

const ActivityDataImportDialog: React.FC<Props> = ({ category, onImport, disabled }) => {
  const { data: items, isLoading } = useImportableActivityData(category);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    if (!items) return;
    const toImport = items.filter(i => selected.has(i.id));
    onImport(toImport);
    setSelected(new Set());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          Importer depuis Collecte
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importer des données d'activité</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !items?.length ? (
          <p className="text-sm text-muted-foreground p-4">Aucune donnée d'activité trouvée pour cette catégorie. Saisissez d'abord des données dans le module Collecte.</p>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="border-b">
                    <th className="p-2 w-10"></th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Quantité</th>
                    <th className="text-left p-2">Unité</th>
                    <th className="text-left p-2">Qualité</th>
                    <th className="text-left p-2">Période</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => toggle(item.id)}
                    >
                      <td className="p-2 text-center">
                        <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} />
                      </td>
                      <td className="p-2 font-medium">{item.subcategory || item.activity_type}</td>
                      <td className="p-2 text-right tabular-nums">{item.quantity.toLocaleString('fr-FR')}</td>
                      <td className="p-2">{item.unit}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={QUALITY_COLORS[item.data_quality] || ''}>
                          {item.data_quality}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {new Date(item.period_start).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">{selected.size} élément(s) sélectionné(s)</span>
              <Button onClick={handleImport} disabled={selected.size === 0}>
                Importer ({selected.size})
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDataImportDialog;
