import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCBAMInstallations, useCBAMProducts, useCBAMProduction, useUpsertProduction } from '../hooks/useCBAMData';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);
const QUARTERS = [1, 2, 3, 4];

export const CBAMProductionPage: React.FC = () => {
  const { data: installations } = useCBAMInstallations();
  const { data: products } = useCBAMProducts();
  const { data: production, isLoading } = useCBAMProduction();
  const upsertMutation = useUpsertProduction();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    installation_id: '',
    product_id: '',
    year: currentYear,
    quarter: 1,
    quantity: 0,
    unit: 'tonnes',
  });

  const handleSubmit = async () => {
    if (!form.installation_id || !form.product_id || !form.quantity) return;
    await upsertMutation.mutateAsync(form);
    setDialogOpen(false);
    setForm(f => ({ ...f, quantity: 0 }));
  };

  // Resolve names
  const getInstName = (id: string) => installations?.find(i => i.id === id)?.name || id.slice(0, 8);
  const getProdName = (id: string) => products?.find(p => p.id === id)?.name || id.slice(0, 8);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Production</h1>
          <p className="text-muted-foreground">Saisie de la production trimestrielle par installation et produit.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Saisir production</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Saisie production trimestrielle</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Installation *</Label>
                <Select value={form.installation_id} onValueChange={v => setForm(f => ({ ...f, installation_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {installations?.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produit CBAM *</Label>
                <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.cn_code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Année</Label>
                  <Select value={form.year.toString()} onValueChange={v => setForm(f => ({ ...f, year: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Trimestre</Label>
                  <Select value={form.quarter.toString()} onValueChange={v => setForm(f => ({ ...f, quarter: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{QUARTERS.map(q => <SelectItem key={q} value={q.toString()}>T{q}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Quantité produite (tonnes) *</Label>
                <Input type="number" value={form.quantity || ''} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} placeholder="0" />
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle>Historique de production</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !production?.length ? (
            <p className="text-center text-muted-foreground py-8">Aucune donnée de production. Commencez par saisir votre production trimestrielle.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Installation</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Année</TableHead>
                  <TableHead>Trimestre</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Unité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {production.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{getInstName(p.installation_id)}</TableCell>
                    <TableCell className="font-medium">{getProdName(p.product_id)}</TableCell>
                    <TableCell>{p.year}</TableCell>
                    <TableCell>T{p.quarter}</TableCell>
                    <TableCell>{p.quantity.toLocaleString()}</TableCell>
                    <TableCell>{p.unit}</TableCell>
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
