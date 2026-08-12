import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Factory, Loader2 } from 'lucide-react';
import { useCBAMInstallations, useCreateInstallation, useUpdateInstallation, useDeleteInstallation, type CBAMInstallation } from '../hooks/useCBAMData';

const SECTORS = ['Fer & Acier', 'Aluminium', 'Ciment', 'Engrais', 'Hydrogène', 'Électricité'];
const COUNTRIES = ['Tunisie', 'Algérie', 'Maroc', 'Turquie', 'Chine', 'Inde', 'Égypte', 'Russie', 'Ukraine', 'Autre'];

const emptyForm = { name: '', country: '', address: '', sector: '', annual_capacity: 0, reference_year: new Date().getFullYear() };

export const CBAMInstallationsPage: React.FC = () => {
  const { data: installations, isLoading } = useCBAMInstallations();
  const createMutation = useCreateInstallation();
  const updateMutation = useUpdateInstallation();
  const deleteMutation = useDeleteInstallation();

  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.country || !formData.sector) return;
    if (editId) {
      await updateMutation.mutateAsync({ id: editId, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setFormData(emptyForm);
    setEditId(null);
    setDialogOpen(false);
  };

  const handleEdit = (inst: CBAMInstallation) => {
    setFormData({
      name: inst.name,
      country: inst.country,
      address: inst.address || '',
      sector: inst.sector,
      annual_capacity: inst.annual_capacity || 0,
      reference_year: inst.reference_year,
    });
    setEditId(inst.id);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Installations</h1>
          <p className="text-muted-foreground">Gérez vos installations industrielles soumises au CBAM.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setFormData(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouvelle installation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? 'Modifier' : 'Nouvelle'} installation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom de l'installation *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Usine Sfax" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pays *</Label>
                  <Select value={formData.country} onValueChange={v => setFormData(p => ({ ...p, country: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Secteur *</Label>
                  <Select value={formData.sector} onValueChange={v => setFormData(p => ({ ...p, sector: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Adresse</Label>
                <Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Adresse complète" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Capacité annuelle (tonnes)</Label>
                  <Input type="number" value={formData.annual_capacity || ''} onChange={e => setFormData(p => ({ ...p, annual_capacity: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Année de référence</Label>
                  <Input type="number" value={formData.reference_year} onChange={e => setFormData(p => ({ ...p, reference_year: Number(e.target.value) }))} />
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editId ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            <CardTitle>Liste des installations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !installations?.length ? (
            <p className="text-center text-muted-foreground py-8">Aucune installation. Créez votre première installation pour commencer.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>Secteur</TableHead>
                  <TableHead>Capacité</TableHead>
                  <TableHead>Année réf.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installations.map(inst => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell><Badge variant="outline">{inst.country}</Badge></TableCell>
                    <TableCell>{inst.sector}</TableCell>
                    <TableCell>{inst.annual_capacity ? `${inst.annual_capacity.toLocaleString()} t` : '—'}</TableCell>
                    <TableCell>{inst.reference_year}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(inst)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette installation ?</AlertDialogTitle>
                              <AlertDialogDescription>Cette action est irréversible. Toutes les données liées seront supprimées.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(inst.id)} className="bg-destructive text-destructive-foreground">
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
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
