// Section Sites: Gestion des sites de l'organisation

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MapPin, 
  Plus, 
  Building2, 
  Users, 
  Pencil, 
  Trash2, 
  MoreHorizontal,
  Factory,
  Warehouse,
  Store,
  Home
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCollectSites, type CollectSite, type CreateSiteInput } from '@/hooks/useCollectSites';
import { useAuth } from '@/hooks/useAuth';
import { api } from "@/integrations/api/client";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

const SITE_TYPES = [
  { value: 'siege', label: 'Siège social', icon: Home },
  { value: 'bureau', label: 'Bureau', icon: Building2 },
  { value: 'usine', label: 'Usine', icon: Factory },
  { value: 'entrepot', label: 'Entrepôt', icon: Warehouse },
  { value: 'magasin', label: 'Magasin', icon: Store },
  { value: 'autre', label: 'Autre', icon: MapPin },
];

export const ParametresSites: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingSite, setEditingSite] = useState<CollectSite | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<CollectSite | null>(null);

  // Écouter les mises à jour de l'organisation pour rafraîchir la company
  useEffect(() => {
    const handleOrgUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['user-company-for-sites'] });
    };
    window.addEventListener('organizationSaved', handleOrgUpdate);
    return () => window.removeEventListener('organizationSaved', handleOrgUpdate);
  }, [queryClient]);

  // Récupérer la company de l'utilisateur OU la créer depuis organization
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['user-company-for-sites', user?.id],
    queryFn: async () => {
      const { items } = await api.listEntities();
      const first = items?.[0] as { id?: string; name?: string; nom_entreprise?: string } | undefined;
      if (!first?.id) return null;
      return { id: first.id, nom_entreprise: first.name || first.nom_entreprise || '' };
    },
    enabled: !!user?.id,
  });

  const { sites, isLoading, createSite, updateSite, deleteSite } = useCollectSites();

  // Formulaire
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: '',
    country: 'Tunisie',
    address: '',
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
      address: '',
      site_type: 'bureau',
      employees_count: '',
      surface_m2: '',
    });
    setEditingSite(null);
    setIsFormOpen(false);
  };

  const handleEdit = (site: CollectSite) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      code: site.code || '',
      city: site.city || '',
      country: site.country || 'Tunisie',
      address: site.address || '',
      site_type: site.site_type || 'bureau',
      employees_count: site.employees_count?.toString() || '',
      surface_m2: site.surface_m2?.toString() || '',
    });
    setIsFormOpen(true);
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const siteData: CreateSiteInput = {
      company_id: company?.id || '',
      name: formData.name,
      code: formData.code || undefined,
      city: formData.city || undefined,
      country: formData.country,
      address: formData.address || undefined,
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
  };

  const getSiteTypeInfo = (type?: string) => {
    return SITE_TYPES.find(t => t.value === type) || SITE_TYPES[5];
  };

  if (companyLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Entreprise non configurée</h3>
            <p className="text-muted-foreground mb-4">
              Veuillez d'abord configurer les informations de votre entreprise dans la section Organisation.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/app/parametres'}>
              Configurer l'organisation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Sites de l'organisation</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les différents sites de {company.nom_entreprise}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un site
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{sites.length}</div>
            <p className="text-sm text-muted-foreground">Sites configurés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {sites.filter(s => s.is_active).length}
            </div>
            <p className="text-sm text-muted-foreground">Sites actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {sites.reduce((acc, s) => acc + (s.employees_count || 0), 0)}
            </div>
            <p className="text-sm text-muted-foreground">Employés total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {sites.reduce((acc, s) => acc + (s.surface_m2 || 0), 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">m² total</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des sites */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Liste des sites</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Aucun site configuré</p>
              <p className="text-sm mb-4">Ajoutez votre premier site pour commencer</p>
              <Button onClick={() => setIsFormOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un site
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => {
                const typeInfo = getSiteTypeInfo(site.site_type);
                const TypeIcon = typeInfo.icon;
                return (
                  <div 
                    key={site.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg ${!site.is_active ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/50'} transition-colors`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-primary/10">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {site.name}
                          {site.code && (
                            <Badge variant="outline" className="text-xs font-normal">
                              {site.code}
                            </Badge>
                          )}
                          {!site.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactif</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs font-normal">
                              {typeInfo.label}
                            </Badge>
                          </span>
                          {site.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {site.city}, {site.country}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {site.employees_count ? `${site.employees_count.toLocaleString('fr-FR')} employés` : '— employés'}
                          </span>
                          {site.surface_m2 && (
                            <span>{site.surface_m2.toLocaleString()} m²</span>
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog formulaire */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {editingSite ? 'Modifier le site' : 'Nouveau site'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  {SITE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
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

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
              <Button type="submit" disabled={createSite.isPending || updateSite.isPending}>
                {createSite.isPending || updateSite.isPending ? 'Enregistrement...' : 
                  editingSite ? 'Mettre à jour' : 'Créer le site'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le site</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le site "{siteToDelete?.name}" ?
              Cette action est irréversible et supprimera également toutes les données associées à ce site.
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
    </div>
  );
};
