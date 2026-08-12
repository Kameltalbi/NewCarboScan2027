// Composant pour gérer les collectes périodiques

import React, { useState, useEffect } from 'react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';
import {
  PeriodicCollectionService,
  PeriodicCollection,
  CollectionFrequency,
} from '@/lib/activity-data/PeriodicCollectionService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Edit, Trash2, Play, Pause, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const PeriodicCollections: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { sites } = useOrganizationSites(organizationId);
  const { toast } = useToast();
  const [collections, setCollections] = useState<PeriodicCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PeriodicCollection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<PeriodicCollection | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'monthly' as CollectionFrequency,
    site_id: '',
    target_period_start: '',
    target_period_end: '',
    notify_before_days: 7,
    notify_on_due: true,
  });

  useEffect(() => {
    if (organizationId) {
      loadCollections();
    }
  }, [organizationId]);

  const loadCollections = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const data = await PeriodicCollectionService.list(organizationId);
      setCollections(data);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du chargement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!organizationId || !formData.name || !formData.target_period_start || !formData.target_period_end) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    try {
      await PeriodicCollectionService.create({
        organization_id: organizationId,
        site_id: formData.site_id || null,
        name: formData.name,
        description: formData.description || undefined,
        frequency: formData.frequency,
        target_period_start: formData.target_period_start,
        target_period_end: formData.target_period_end,
        notify_before_days: formData.notify_before_days,
        notify_on_due: formData.notify_on_due,
      });

      toast({
        title: 'Collecte créée',
        description: 'La collecte périodique a été créée avec succès.',
      });

      setShowCreateDialog(false);
      resetForm();
      loadCollections();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la création',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingCollection) return;

    try {
      await PeriodicCollectionService.update(editingCollection.id, {
        name: formData.name,
        description: formData.description || undefined,
        frequency: formData.frequency,
        site_id: formData.site_id || null,
        target_period_start: formData.target_period_start,
        target_period_end: formData.target_period_end,
        notify_before_days: formData.notify_before_days,
        notify_on_due: formData.notify_on_due,
      });

      toast({
        title: 'Collecte mise à jour',
        description: 'La collecte périodique a été mise à jour avec succès.',
      });

      setEditingCollection(null);
      resetForm();
      loadCollections();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingCollection) return;

    try {
      await PeriodicCollectionService.delete(deletingCollection.id);
      toast({
        title: 'Collecte supprimée',
        description: 'La collecte périodique a été supprimée.',
      });
      setDeletingCollection(null);
      loadCollections();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (collection: PeriodicCollection) => {
    try {
      await PeriodicCollectionService.update(collection.id, {
        status: collection.status === 'active' ? 'paused' : 'active',
      });
      loadCollections();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la modification',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'monthly',
      site_id: '',
      target_period_start: '',
      target_period_end: '',
      notify_before_days: 7,
      notify_on_due: true,
    });
  };

  const openEditDialog = (collection: PeriodicCollection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      frequency: collection.frequency,
      site_id: collection.site_id || '',
      target_period_start: collection.target_period_start,
      target_period_end: collection.target_period_end,
      notify_before_days: collection.notify_before_days,
      notify_on_due: collection.notify_on_due,
    });
  };

  const getFrequencyLabel = (frequency: CollectionFrequency) => {
    const labels: Record<CollectionFrequency, string> = {
      monthly: 'Mensuelle',
      quarterly: 'Trimestrielle',
      yearly: 'Annuelle',
      custom: 'Personnalisée',
    };
    return labels[frequency];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collectes périodiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Collectes périodiques
              </CardTitle>
              <CardDescription>
                Planifiez et automatisez vos collectes de données récurrentes
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle collecte
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune collecte périodique configurée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Fréquence</TableHead>
                  <TableHead>Prochaine collecte</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{collection.name}</div>
                        {collection.description && (
                          <div className="text-sm text-muted-foreground">{collection.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getFrequencyLabel(collection.frequency)}</TableCell>
                    <TableCell>
                      {format(new Date(collection.next_collection_date), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={collection.status === 'active' ? 'default' : 'secondary'}>
                        {collection.status === 'active' ? 'Active' : 'En pause'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(collection)}
                          title={collection.status === 'active' ? 'Mettre en pause' : 'Activer'}
                        >
                          {collection.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(collection)}
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCollection(collection)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création/édition */}
      <Dialog open={showCreateDialog || !!editingCollection} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingCollection(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCollection ? 'Modifier la collecte' : 'Nouvelle collecte périodique'}</DialogTitle>
            <DialogDescription>
              Configurez une collecte de données récurrente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Collecte mensuelle énergie"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la collecte..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Fréquence *</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value as CollectionFrequency })}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                    <SelectItem value="quarterly">Trimestrielle</SelectItem>
                    <SelectItem value="yearly">Annuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_id">Site (optionnel)</Label>
                <Select value={formData.site_id || 'all'} onValueChange={(value) => setFormData({ ...formData, site_id: value === 'all' ? null : value })}>
                  <SelectTrigger id="site_id">
                    <SelectValue placeholder="Tous les sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les sites</SelectItem>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_period_start">Période début *</Label>
                <Input
                  id="target_period_start"
                  type="date"
                  value={formData.target_period_start}
                  onChange={(e) => setFormData({ ...formData, target_period_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_period_end">Période fin *</Label>
                <Input
                  id="target_period_end"
                  type="date"
                  value={formData.target_period_end}
                  onChange={(e) => setFormData({ ...formData, target_period_end: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notify_before_days">Rappel (jours avant)</Label>
                <Input
                  id="notify_before_days"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.notify_before_days}
                  onChange={(e) => setFormData({ ...formData, notify_before_days: parseInt(e.target.value) || 7 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingCollection(null);
              resetForm();
            }}>
              Annuler
            </Button>
            <Button onClick={editingCollection ? handleUpdate : handleCreate}>
              {editingCollection ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deletingCollection} onOpenChange={(open) => !open && setDeletingCollection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la collecte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La collecte périodique sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
