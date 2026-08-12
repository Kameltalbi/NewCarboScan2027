import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { useBuildings, useMeters, useUpsertMeter, useDeleteMeter } from './hooks';
import { toast } from 'sonner';

const TYPE_UNITS: Record<string, string> = { elec: 'kWh', gas: 'kWh', heat: 'kWh' };

export const WattBimMeters: React.FC = () => {
  const { data: buildings = [] } = useBuildings();
  const { data: meters = [], isLoading } = useMeters();
  const upsert = useUpsertMeter();
  const del = useDeleteMeter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', building_id: '', meter_type: 'elec', unit: 'kWh', provider: '', contract_ref: '', external_id: '' });

  const submit = async () => {
    try {
      await upsert.mutateAsync({
        name: form.name,
        building_id: form.building_id,
        meter_type: form.meter_type,
        unit: form.unit,
        provider: form.provider || null,
        contract_ref: form.contract_ref || null,
        external_id: form.external_id || null,
      } as any);
      toast.success('Compteur ajouté');
      setForm({ name: '', building_id: '', meter_type: 'elec', unit: 'kWh', provider: '', contract_ref: '', external_id: '' });
      setOpen(false);
    } catch (e: any) { toast.error(e.message || 'Erreur'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Compteurs</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" disabled={buildings.length === 0}><Plus className="h-4 w-4 mr-2" />Ajouter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau compteur</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Compteur principal" /></div>
              <div><Label>Bâtiment *</Label>
                <Select value={form.building_id} onValueChange={v => setForm({ ...form, building_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>{buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.meter_type} onValueChange={v => setForm({ ...form, meter_type: v, unit: TYPE_UNITS[v] || 'kWh' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elec">Électricité</SelectItem>
                      <SelectItem value="gas">Gaz</SelectItem>
                      
                      <SelectItem value="heat">Chauffage urbain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Unité</Label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
              </div>
              <div><Label>Fournisseur</Label><Input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="STEG, ONAS…" /></div>
              <div><Label>N° contrat</Label><Input value={form.contract_ref} onChange={e => setForm({ ...form, contract_ref: e.target.value })} /></div>
              <div><Label>ID externe (IoT / API)</Label><Input value={form.external_id} onChange={e => setForm({ ...form, external_id: e.target.value })} placeholder="STEG-12345" /><p className="text-xs text-muted-foreground mt-1">Identifiant du capteur physique, utilisé pour l'ingestion automatique.</p></div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={!form.name || !form.building_id || upsert.isPending}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : meters.length === 0 ? (
          <p className="text-sm text-muted-foreground">{buildings.length === 0 ? 'Ajoutez d\'abord un bâtiment.' : 'Aucun compteur.'}</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Bâtiment</TableHead><TableHead>Type</TableHead><TableHead>Unité</TableHead><TableHead>Fournisseur</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {meters.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{buildings.find(b => b.id === m.building_id)?.name ?? '—'}</TableCell>
                  <TableCell>{m.meter_type}</TableCell>
                  <TableCell>{m.unit}</TableCell>
                  <TableCell>{m.provider ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Supprimer ${m.name} ?`)) del.mutate(m.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
