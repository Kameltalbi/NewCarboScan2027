import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { useBuildings, useUpsertBuilding, useDeleteBuilding } from './hooks';
import { toast } from 'sonner';

export const WattBimBuildings: React.FC = () => {
  const { data: buildings = [], isLoading } = useBuildings();
  const upsert = useUpsertBuilding();
  const del = useDeleteBuilding();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', building_type: 'office', surface_m2: '', employees_count: '', address: '' });

  const submit = async () => {
    try {
      await upsert.mutateAsync({
        name: form.name,
        building_type: form.building_type,
        address: form.address || null,
        surface_m2: form.surface_m2 ? Number(form.surface_m2) : null,
        employees_count: form.employees_count ? Number(form.employees_count) : null,
      } as any);
      toast.success('Bâtiment ajouté');
      setForm({ name: '', building_type: 'office', surface_m2: '', employees_count: '', address: '' });
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bâtiments</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau bâtiment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.building_type} onValueChange={v => setForm({ ...form, building_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Bureaux</SelectItem>
                    <SelectItem value="industrial">Industriel</SelectItem>
                    <SelectItem value="retail">Commerce</SelectItem>
                    <SelectItem value="warehouse">Entrepôt</SelectItem>
                    <SelectItem value="mixed">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Surface (m²)</Label><Input type="number" value={form.surface_m2} onChange={e => setForm({ ...form, surface_m2: e.target.value })} /></div>
                <div><Label>Effectif</Label><Input type="number" value={form.employees_count} onChange={e => setForm({ ...form, employees_count: e.target.value })} /></div>
              </div>
              <div><Label>Adresse</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={!form.name || upsert.isPending}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : buildings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun bâtiment. Ajoutez votre premier site.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead>Surface</TableHead><TableHead>Effectif</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {buildings.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.building_type}</TableCell>
                  <TableCell>{b.surface_m2 ?? '—'} m²</TableCell>
                  <TableCell>{b.employees_count ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Supprimer ${b.name} ?`)) del.mutate(b.id); }}>
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
