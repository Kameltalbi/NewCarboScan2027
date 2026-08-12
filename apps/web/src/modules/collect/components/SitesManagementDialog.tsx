// Dialog pour gérer les sites directement depuis le module de collecte

import React, { useState } from 'react';
import { Plus, MapPin, Building2, Users, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollectSites, type CollectSite, type CreateSiteInput } from '@/hooks/useCollectSites';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from "@/integrations/api/client";
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SitesManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSiteCreated?: () => void;
}

export const SitesManagementDialog: React.FC<SitesManagementDialogProps> = ({
  open,
  onOpenChange,
  onSiteCreated,
}) => {
  const { user } = useAuth();
  const [editingSite, setEditingSite] = useState<CollectSite | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<CollectSite | null>(null);

  // Récupérer la company de l'utilisateur
  const { data: company } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('id, nom_entreprise')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { sites, isLoading, createSite, updateSite, deleteSite } = useCollectSites(company?.id);

  // Formulaire de création/édition
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: '',
    country: 'Tunisie',
    site_type: 'bureau',
    employees_count: '',
    surface_m2: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      city: '',
      country: 'Tunisie',
      site_type: 'bureau',
      employees_count: '',
      surface_m2: '',
    });
    setEditingSite(null);
    setIsCreating(false);
  };

  const handleEdit = (site: CollectSite) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      code: site.code || '',
      city: site.city || '',
      country: site.country || 'Tunisie',
      site_type: site.site_type || 'bureau',
      employees_count: site.employees_count?.toString() || '',
      surface_m2: site.surface_m2?.toString() || '',
    });
    setIsCreating(true);
  };

  const handleDelete = (site: CollectSite) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (siteToDelete) {
      await deleteSite.mutateAsync(siteToDelete.id);
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
      onSiteCreated?.();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    const siteData: CreateSiteInput = {
      company_id: company.id,
      name: formData.name,
      code: formData.code || undefined,
      city: formData.city || undefined,
      country: formData.country,
      site_type: formData.site_type,
      employees_count: formData.employees_count ? parseInt(formData.employees_count) : undefined,
      surface_m2: formData.surface_m2 ? parseFloat(formData.surface_m2) : undefined,
      is_active: true,
      is_consolidated: true,
    };

    if (editingSite) {
      await updateSite.mutateAsync({ id: editingSite.id, ...siteData });
    } else {
      await createSite.mutateAsync(siteData);
    }

    resetForm();
    onSiteCreated?.();
  };

  const getSiteTypeLabel = (type?: string) => {
    const types: Record<string, string> = {
      usine: 'Usine',
      bureau: 'Bureau',
      entrepot: 'Entrepôt',
      magasin: 'Magasin',
      siege: 'Siège social',
      autre: 'Autre',
    };
    return types[type || ''] || type || 'Non défini';
  };

  if (!company) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Gestion des sites
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Entreprise non configurée</h3>
            <p className="text-muted-foreground">
              Veuillez d'abord configurer les informations de votre entreprise dans les paramètres.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Gestion des sites - {company.nom_entreprise}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            {/* Formulaire de création */}
            {isCreating ? (
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h4 className="font-medium mb-3">
                      {editingSite ? 'Modifier le site' : 'Nouveau site'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom du site *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Usine Tunis Nord"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="code">Code</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          placeholder="Ex: TUN-01"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Ville</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Ex: Tunis"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Pays</Label>
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          placeholder="Ex: Tunisie"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="site_type">Type de site</Label>
                        <Select
                          value={formData.site_type}
                          onValueChange={(value) => setFormData({ ...formData, site_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="siege">Siège social</SelectItem>
                            <SelectItem value="bureau">Bureau</SelectItem>
                            <SelectItem value="usine">Usine</SelectItem>
                            <SelectItem value="entrepot">Entrepôt</SelectItem>
                            <SelectItem value="magasin">Magasin</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employees_count">Nombre d'employés</Label>
                        <Input
                          id="employees_count"
                          type="number"
                          value={formData.employees_count}
                          onChange={(e) => setFormData({ ...formData, employees_count: e.target.value })}
                          placeholder="Ex: 50"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="surface_m2">Surface (m²)</Label>
                        <Input
                          id="surface_m2"
                          type="number"
                          value={formData.surface_m2}
                          onChange={(e) => setFormData({ ...formData, surface_m2: e.target.value })}
                          placeholder="Ex: 2500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={createSite.isPending || updateSite.isPending}>
                        {createSite.isPending || updateSite.isPending ? 'Enregistrement...' : 
                          editingSite ? 'Mettre à jour' : 'Créer le site'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Button onClick={() => setIsCreating(true)} className="mb-4 w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un site
              </Button>
            )}

            {/* Liste des sites */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Aucun site configuré</p>
                <p className="text-sm">Créez votre premier site pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sites.map((site) => (
                  <Card key={site.id} className={`${!site.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {site.name}
                              {site.code && (
                                <span className="text-xs text-muted-foreground">({site.code})</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {getSiteTypeLabel(site.site_type)}
                              </Badge>
                              {site.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {site.city}
                                </span>
                              )}
                              {site.employees_count && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {site.employees_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(site)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(site)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le site</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le site "{siteToDelete?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};