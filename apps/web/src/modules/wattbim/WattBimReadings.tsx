import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useBuildings, useMeters, useReadings, useCreateReading, useCreateAlert, detectAnomalies } from './hooks';
import { useOrgCurrency } from './useOrgCurrency';
import { WattBimImportDialog } from './WattBimImportDialog';
import { toast } from 'sonner';

export const WattBimReadings: React.FC = () => {
  const currency = useOrgCurrency();
  const { data: buildings = [] } = useBuildings();
  const { data: meters = [] } = useMeters();
  const { data: readings = [], isLoading } = useReadings();
  const createReading = useCreateReading();
  const createAlert = useCreateAlert();

  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ meter_id: '', period_start: monthAgo, period_end: today, value: '', cost_amount: '' });

  const submit = async () => {
    const meter = meters.find(m => m.id === form.meter_id);
    if (!meter) return;
    try {
      const reading = await createReading.mutateAsync({
        meter_id: form.meter_id,
        period_start: form.period_start,
        period_end: form.period_end,
        value: Number(form.value),
        unit: meter.unit,
        cost_amount: form.cost_amount ? Number(form.cost_amount) : null,
        currency,
      } as any);
      toast.success('Relevé ajouté · synchronisé avec votre bilan carbone');

      // Détection d'anomalies
      const anomalies = detectAnomalies(readings, reading);
      for (const a of anomalies) {
        await createAlert.mutateAsync({
          alert_type: a.type,
          severity: a.severity,
          message: a.message,
          meter_id: meter.id,
          building_id: meter.building_id,
          value_observed: reading.value,
          value_expected: a.expected ?? null,
        } as any);
      }
      if (anomalies.length > 0) toast.warning(`${anomalies.length} alerte(s) détectée(s)`);

      setForm({ meter_id: '', period_start: monthAgo, period_end: today, value: '', cost_amount: '' });
      setOpen(false);
    } catch (e: any) { toast.error(e.message || 'Erreur'); }
  };

  const meterName = (id: string) => {
    const m = meters.find(x => x.id === id);
    if (!m) return '—';
    const b = buildings.find(x => x.id === m.building_id);
    return `${b?.name ?? '?'} · ${m.name}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Relevés</CardTitle>
        <div className="flex gap-2">
          <WattBimImportDialog />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" disabled={meters.length === 0}><Plus className="h-4 w-4 mr-2" />Saisir un relevé</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau relevé</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Compteur *</Label>
                <Select value={form.meter_id} onValueChange={v => setForm({ ...form, meter_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    {meters.map(m => <SelectItem key={m.id} value={m.id}>{meterName(m.id)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Du</Label><Input type="date" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} /></div>
                <div><Label>Au</Label><Input type="date" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Consommation *</Label><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
                <div><Label>Coût ({currency})</Label><Input type="number" value={form.cost_amount} onChange={e => setForm({ ...form, cost_amount: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={!form.meter_id || !form.value || createReading.isPending}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : readings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{meters.length === 0 ? 'Ajoutez d\'abord un compteur.' : 'Aucun relevé.'}</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Période</TableHead><TableHead>Compteur</TableHead><TableHead>Valeur</TableHead><TableHead>Coût</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
            <TableBody>
              {readings.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.period_start} → {r.period_end}</TableCell>
                  <TableCell>{meterName(r.meter_id)}</TableCell>
                  <TableCell>{Number(r.value).toLocaleString('fr-FR')} {r.unit}</TableCell>
                  <TableCell>{r.cost_amount ? `${Number(r.cost_amount).toLocaleString('fr-FR')} ${r.currency ?? currency}` : '—'}</TableCell>
                  <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
