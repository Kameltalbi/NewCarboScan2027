import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface DeleteOrganizationDialogProps {
  organization: {
    id: string;
    nom_entreprise: string;
    user_id: string;
    source?: string;
  };
  onDeleted: () => void;
}

export const DeleteOrganizationDialog: React.FC<DeleteOrganizationDialogProps> = ({
  organization,
  onDeleted,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const expected = organization.nom_entreprise || 'Organisation';

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.adminDeleteOrganization(organization.id, expected);
      toast({
        title: 'Organisation supprimée',
        description: `« ${expected} » a été supprimée définitivement.`,
      });
      setOpen(false);
      setConfirmText('');
      onDeleted();
    } catch (error: unknown) {
      logger.error('Error deleting organization:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Impossible de supprimer l'organisation",
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
        title="Supprimer l'organisation"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(''); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer l'organisation
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Toutes les données de l'organisation (membres, bilans, collectes, preuves) seront
              supprimées. Les comptes utilisateurs ne sont pas supprimés.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm-org-name">
              Saisissez <span className="font-semibold">{expected}</span> pour confirmer
            </Label>
            <Input
              id="confirm-org-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expected}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText.trim() !== expected.trim() || deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression…
                </>
              ) : (
                'Supprimer définitivement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
