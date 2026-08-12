import React, { useState } from 'react';
import { Plus, MapPin, Building2, Users, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useCollectSites, type CollectSite, type CreateSiteInput } from '@/hooks/useCollectSites';
import { SiteFormModal } from './SiteFormModal';
import { Skeleton } from '@/components/ui/skeleton';

interface SitesManagementProps {
  companyId: string;
}

export const SitesManagement: React.FC<SitesManagementProps> = ({ companyId }) => {
  const { sites, isLoading, createSite, updateSite, deleteSite } = useCollectSites(companyId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<CollectSite | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<CollectSite | null>(null);

  const handleCreate = () => {
    setEditingSite(undefined);
    setModalOpen(true);
  };

  const handleEdit = (site: CollectSite) => {
    setEditingSite(site);
    setModalOpen(true);
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

  const handleSubmit = async (data: CreateSiteInput) => {
    if (editingSite) {
      await updateSite.mutateAsync({ id: editingSite.id, ...data });
    } else {
      await createSite.mutateAsync(data);
    }
    setModalOpen(false);
    setEditingSite(undefined);
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion des sites</h2>
          <p className="text-muted-foreground">
            Gérez les sites de votre entreprise pour la collecte de données
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un site
        </Button>
      </div>

      {sites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun site configuré</h3>
            <p className="text-muted-foreground text-center mb-4">
              Ajoutez des sites pour collecter des données par emplacement
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter le premier site
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Card key={site.id} className={!site.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{site.name}</CardTitle>
                      {site.code && (
                        <span className="text-xs text-muted-foreground">{site.code}</span>
                      )}
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
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{getSiteTypeLabel(site.site_type)}</Badge>
                  {!site.is_active && <Badge variant="secondary">Inactif</Badge>}
                  {site.is_consolidated && (
                    <Badge variant="default" className="bg-primary/20 text-primary">
                      Consolidé
                    </Badge>
                  )}
                </div>

                {(site.city || site.country) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {[site.city, site.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                {site.employees_count && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{site.employees_count} employés</span>
                  </div>
                )}

                {site.surface_m2 && (
                  <div className="text-sm text-muted-foreground">
                    Surface: {site.surface_m2.toLocaleString()} m²
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SiteFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        site={editingSite}
        companyId={companyId}
        onSubmit={handleSubmit}
        isLoading={createSite.isPending || updateSite.isPending}
      />

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
    </div>
  );
};
