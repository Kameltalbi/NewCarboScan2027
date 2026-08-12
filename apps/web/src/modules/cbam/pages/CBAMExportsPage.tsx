import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Ship } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCBAMInstallations, useCBAMProducts, useCBAMExports, useCreateExport } from '../hooks/useCBAMData';

const EU_COUNTRIES = [
  'Allemagne', 'France', 'Italie', 'Espagne', 'Pays-Bas', 'Belgique', 'Autriche',
  'Pologne', 'Suède', 'Danemark', 'Finlande', 'Portugal', 'Grèce', 'Irlande',
  'République Tchèque', 'Roumanie', 'Bulgarie', 'Croatie', 'Hongrie', 'Slovaquie',
  'Slovénie', 'Lituanie', 'Lettonie', 'Estonie', 'Luxembourg', 'Malte', 'Chypre',
];

export const CBAMExportsPage: React.FC = () => {
  const { data: installations } = useCBAMInstallations();
  const { data: products } = useCBAMProducts();
  const { data: exports, isLoading } = useCBAMExports();
  const createMutation = useCreateExport();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    installation_id: '',
    product_id: '',
    client_name: '',
    destination_country: '',
    quantity_exported: 0,
    export_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async () => {
    if (!form.installation_id || !form.product_id || !form.client_name || !form.destination_country || !form.quantity_exported) return;
    await createMutation.mutateAsync(form);
    setDialogOpen(false);
    setForm(f => ({ ...f, client_name: '', quantity_exported: 0 }));
  };

  const getInstName = (id: string) => installations?.find(i => i.id === id)?.name || id.slice(0, 8);
  const getProdName = (id: string) => products?.find(p => p.id === id)?.name || id.slice(0, 8);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Exportations</h1>
          <p className="text-muted-foreground">Suivi des exportations vers l'Union européenne.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouvelle exportation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Enregistrer une exportation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Installation *</Label>
                <Select value={form.installation_id} onValueChange={v => setForm(f => ({ ...f, installation_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{installations?.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produit CBAM *</Label>
                <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client européen *</Label>
                <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Nom du client" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pays destination UE *</Label>
                  <Select value={form.destination_country} onValueChange={v => setForm(f => ({ ...f, destination_country: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{EU_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date d'export</Label>
                  <Input type="date" value={form.export_date} onChange={e => setForm(f => ({ ...f, export_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Quantité exportée (tonnes) *</Label>
                <Input type="number" value={form.quantity_exported || ''} onChange={e => setForm(f => ({ ...f, quantity_exported: Number(e.target.value) }))} />
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer l'exportation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            <CardTitle>Liste des exportations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !exports?.length ? (
            <p className="text-center text-muted-foreground py-8">Aucune exportation enregistrée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Installation</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell>{getInstName(exp.installation_id)}</TableCell>
                    <TableCell className="font-medium">{getProdName(exp.product_id)}</TableCell>
                    <TableCell>{exp.client_name}</TableCell>
                    <TableCell><Badge variant="outline">{exp.destination_country}</Badge></TableCell>
                    <TableCell>{exp.quantity_exported.toLocaleString()} t</TableCell>
                    <TableCell>{new Date(exp.export_date).toLocaleDateString('fr-FR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
