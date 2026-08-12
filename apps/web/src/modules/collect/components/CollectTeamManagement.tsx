// Composant pour gérer l'équipe de collecte de données (multi-utilisateurs)

import React, { useState, useEffect } from 'react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, UserPlus, UserMinus, Shield, Mail, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  profile?: {
    email: string;
    full_name: string | null;
  };
}

export const CollectTeamManagement: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadMembers();
      loadCurrentUserRole();
    }
  }, [organizationId]);

  const loadCurrentUserRole = async () => {
    if (!organizationId || !user) return;

    try {
      // Vérifier si l'utilisateur est owner
      const { data: org } = await supabase
        .from('organizations')
        .select('user_id')
        .eq('id', organizationId)
        .eq('user_id', user.id)
        .single();

      if (org) {
        setCurrentUserRole('owner');
        return;
      }

      // Vérifier le rôle dans organization_members
      const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();

      if (member) {
        setCurrentUserRole(member.role as 'admin' | 'member');
      }
    } catch (error) {
      console.error('Erreur chargement rôle:', error);
    }
  };

  const loadMembers = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      // Récupérer le owner
      const { data: org } = await supabase
        .from('organizations')
        .select('user_id, id')
        .eq('id', organizationId)
        .single();

      // Récupérer les membres
      const { data: membersData, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Construire la liste complète avec owner + membres
      const allMembers: TeamMember[] = [];

      // Ajouter le owner
      if (org) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', org.user_id)
          .single();

        allMembers.push({
          id: `owner-${org.user_id}`,
          user_id: org.user_id,
          organization_id: organizationId,
          role: 'owner',
          created_at: new Date().toISOString(),
          profile: ownerProfile ? {
            email: ownerProfile.email || '',
            full_name: ownerProfile.full_name,
          } : undefined,
        });
      }

      // Ajouter les membres avec leurs profils
      if (membersData) {
        for (const member of membersData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', member.user_id)
            .single();

          allMembers.push({
            ...member,
            profile: profile ? {
              email: profile.email || '',
              full_name: profile.full_name,
            } : undefined,
          });
        }
      }

      setMembers(allMembers);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du chargement des membres',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!organizationId || !inviteEmail) return;

    setIsInviting(true);
    try {
      // Vérifier si l'utilisateur existe
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail)
        .single();

      if (!existingUser) {
        toast({
          title: 'Utilisateur introuvable',
          description: 'Cet email n\'est pas enregistré dans CarboScan. L\'utilisateur doit d\'abord créer un compte.',
          variant: 'destructive',
        });
        setIsInviting(false);
        return;
      }

      // Vérifier si déjà membre
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        toast({
          title: 'Déjà membre',
          description: 'Cet utilisateur est déjà membre de l\'organisation.',
          variant: 'destructive',
        });
        setIsInviting(false);
        return;
      }

      // Ajouter le membre
      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: existingUser.id,
          role: inviteRole,
        });

      if (error) throw error;

      toast({
        title: 'Membre ajouté',
        description: `${inviteEmail} a été ajouté à l'équipe avec le rôle ${inviteRole}.`,
      });

      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('member');
      loadMembers();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'ajout du membre',
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!showRemoveDialog || !organizationId) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', showRemoveDialog.id);

      if (error) throw error;

      toast({
        title: 'Membre retiré',
        description: 'Le membre a été retiré de l\'équipe.',
      });

      setShowRemoveDialog(null);
      loadMembers();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: 'admin' | 'member') => {
    if (member.role === 'owner') {
      toast({
        title: 'Action impossible',
        description: 'Le rôle du propriétaire ne peut pas être modifié.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: 'Rôle modifié',
        description: `Le rôle a été modifié en ${newRole}.`,
      });

      loadMembers();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la modification du rôle',
        variant: 'destructive',
      });
    }
  };

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion de l'équipe
          </CardTitle>
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
                <Users className="h-5 w-5" />
                Gestion de l'équipe de collecte
              </CardTitle>
              <CardDescription>
                Gérez les membres qui peuvent collecter des données pour votre organisation
              </CardDescription>
            </div>
            {canManage && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Ajouter un membre
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Date d'ajout</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {member.profile?.full_name || member.profile?.email || 'Utilisateur'}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {member.profile?.email || 'Email non disponible'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {member.role === 'owner' && <Shield className="w-4 h-4 text-primary" />}
                      <Badge variant={member.role === 'owner' ? 'default' : member.role === 'admin' ? 'secondary' : 'outline'}>
                        {member.role === 'owner' ? 'Propriétaire' : member.role === 'admin' ? 'Administrateur' : 'Membre'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(member.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {member.role !== 'owner' && (
                          <>
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleRoleChange(member, value as 'admin' | 'member')}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrateur</SelectItem>
                                <SelectItem value="member">Membre</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowRemoveDialog(member)}
                            >
                              <UserMinus className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog d'invitation */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription>
              Ajoutez un utilisateur existant à votre équipe de collecte de données.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email de l'utilisateur</Label>
              <Input
                id="email"
                type="email"
                placeholder="utilisateur@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as 'admin' | 'member')}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur (peut gérer l'équipe)</SelectItem>
                  <SelectItem value="member">Membre (peut collecter des données)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail}>
              {isInviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ajout...
                </>
              ) : (
                'Ajouter'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!showRemoveDialog} onOpenChange={(open) => !open && setShowRemoveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer le membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {showRemoveDialog && (
                <>
                  Êtes-vous sûr de vouloir retirer <strong>{showRemoveDialog.profile?.email}</strong> de l'équipe ?
                  Cette action est réversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
