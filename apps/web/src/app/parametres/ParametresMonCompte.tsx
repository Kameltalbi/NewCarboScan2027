import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { Loader2, KeyRound, Mail } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  current: z.string().min(1, 'Mot de passe actuel requis'),
  next: z.string().min(8, 'Au moins 8 caractères').max(72, 'Max 72 caractères'),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, { message: 'Les mots de passe ne correspondent pas', path: ['confirm'] });

export const ParametresMonCompte: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse({ current, next, confirm });
    if (!parsed.success) {
      toast({ title: 'Erreur', description: parsed.error.errors[0].message, variant: 'destructive' });
      return;
    }
    if (!user?.email) {
      toast({ title: 'Erreur', description: 'Session invalide', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Re-vérifier le mot de passe actuel
      await api.changePassword(current, next);
      toast({ title: 'Mot de passe modifié', description: 'Votre nouveau mot de passe est actif.' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Mon compte</CardTitle>
          <CardDescription>Informations de connexion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <span className="text-muted-foreground">Email :</span>{' '}
            <span className="font-medium">{user?.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Changer mon mot de passe</CardTitle>
          <CardDescription>Choisissez un mot de passe d'au moins 8 caractères.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Mot de passe actuel</Label>
              <Input id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next">Nouveau mot de passe</Label>
              <Input id="next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
              <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mettre à jour
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParametresMonCompte;
