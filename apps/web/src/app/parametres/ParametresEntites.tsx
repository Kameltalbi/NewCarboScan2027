// Gestion des entités (organisations) - Paramètres

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Building2, Plus, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { supabase } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { useQueryClient } from '@tanstack/react-query';

export const ParametresEntites: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { allOrganizations, currentOrganization, switchOrganization, organizationLoading } = useAppData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async () => {
    if (!newOrgName.trim() || !user?.id) return;

    setCreating(true);
    try {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: newOrgName.trim(), user_id: user.id })
        .select('id')
        .single();

      if (orgError) throw orgError;

      // Auto-create linked company
      await supabase
        .from('companies')
        .insert({ nom_entreprise: newOrgName.trim(), user_id: user.id });

      await queryClient.invalidateQueries({ queryKey: ['allOrganizations'] });
      switchOrganization(newOrg.id);
      toast.success(`Entité "${newOrgName.trim()}" créée`);
      setNewOrgName('');
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['allOrganizations'] });
      if (currentOrganization?.id === deleteTarget.id) {
        const remaining = allOrganizations.filter(o => o.id !== deleteTarget.id);
        if (remaining.length > 0) switchOrganization(remaining[0].id);
      }
      toast.success(`Entité "${deleteTarget.name}" supprimée`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (organizationLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Entités</h1>
            <p className="text-sm text-muted-foreground">
              Gérez vos organisations et filiales • {allOrganizations.length} entité{allOrganizations.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nouvelle entité
        </Button>
      </div>

      {/* Info card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Chaque entité possède ses propres données, bilans et utilisateurs. 
              Utilisez le sélecteur dans le header pour naviguer entre vos entités.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Orgs list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vos entités</CardTitle>
          <CardDescription>Cliquez sur une entité pour y basculer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {allOrganizations.map((org) => (
            <div
              key={org.id}
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                org.id === currentOrganization?.id ? 'border-primary/50 bg-primary/5' : ''
              }`}
              onClick={() => switchOrganization(org.id)}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {org.name}
                    {org.id === currentOrganization?.id && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                    {org.isOwner && (
                      <Badge variant="outline" className="text-xs">Propriétaire</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex gap-3">
                    {org.sector && <span>{org.sector}</span>}
                    {org.country && <span>{org.country}</span>}
                  </div>
                </div>
              </div>
              {org.isOwner && allOrganizations.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: org.id, name: org.name });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle entité</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nom de l'organisation</Label>
              <Input
                id="org-name"
                placeholder="Ex : Filiale Paris, BU Logistique…"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Vous pourrez compléter les détails (secteur, pays, etc.) dans l'onglet Organisation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!newOrgName.trim() || creating}>
              {creating ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'entité</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer « {deleteTarget?.name} » ? Cette action est irréversible et supprimera toutes les données associées.
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
