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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pause, Play, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface Props {
  organization: {
    id: string;
    nom_entreprise: string;
    status?: 'active' | 'suspended';
  };
  onChanged: () => void;
}

export const SuspendOrganizationDialog: React.FC<Props> = ({
  organization,
  onChanged,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const isSuspended = organization.status === 'suspended';

  const handleActivate = async () => {
    setSaving(true);
    try {
      await api.adminActivateOrganization(organization.id);
      toast({
        title: 'Organisation réactivée',
        description: `« ${organization.nom_entreprise} » peut à nouveau se connecter.`,
      });
      onChanged();
    } catch (error: unknown) {
      logger.error('Error activating organization:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Impossible de réactiver l'organisation",
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    setSaving(true);
    try {
      await api.adminSuspendOrganization(organization.id, reason.trim() || undefined);
      toast({
        title: 'Organisation suspendue',
        description: `« ${organization.nom_entreprise} » ne peut plus accéder à la plateforme.`,
      });
      setOpen(false);
      setReason('');
      onChanged();
    } catch (error: unknown) {
      logger.error('Error suspending organization:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Impossible de suspendre l'organisation",
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isSuspended) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleActivate}
        disabled={saving}
        title="Réactiver l'organisation"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Suspendre l'organisation"
      >
        <Pause className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setReason(''); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5" />
              Suspendre l'organisation
            </DialogTitle>
            <DialogDescription>
              Les utilisateurs de cette organisation ne pourront plus accéder à l'application.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              « {organization.nom_entreprise} » sera mise hors service jusqu'à réactivation.
              Les données sont conservées.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Motif (optionnel)</Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. impayé, demande client, non-conformité…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" disabled={saving} onClick={handleSuspend}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suspension…
                </>
              ) : (
                'Suspendre'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
