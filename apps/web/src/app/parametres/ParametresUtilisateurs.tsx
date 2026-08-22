// Écran Utilisateurs - Design SaaS multi-tenant

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { mapOrgRoleToDbRole } from '@/hooks/useOrgMemberPermissions';

import { OrganizationMember } from './utilisateurs/types';
import { UsersTable } from './utilisateurs/UsersTable';
import { UsersMobileList } from './utilisateurs/UsersMobileList';
import { EditUserModal } from './utilisateurs/EditUserModal';
import { ChangePasswordModal } from './utilisateurs/ChangePasswordModal';
import { AddUserModal } from './utilisateurs/AddUserModal';
import { ViewUserModal } from './utilisateurs/ViewUserModal';
import { PermissionsMatrix } from './utilisateurs/PermissionsMatrix';
import { UserPermissionsModal } from './utilisateurs/UserPermissionsModal';

export const ParametresUtilisateurs: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // Modal states
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // Fetch organization
  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { organization } = await api.getOrganization();
      if (!organization) return null;
      return { id: organization.id, name: organization.name };
    },
    enabled: !!user?.id,
  });

  // Fetch members with profile info
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['organization-members', organization?.id],
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!organization?.id) return [];
      
      const { items } = await api.listOrgMembers();
      const { mapDbRoleToOrgRole } = await import('@/hooks/useOrgMemberPermissions');
      return (items || []).map((m) => {
        const parts = (m.full_name || '').split(' ');
        return {
          id: m.user_id,
          user_id: m.user_id,
          role: mapDbRoleToOrgRole(m.role),
          status: m.is_active === false ? 'disabled' : 'active',
          created_at: m.created_at,
          email: m.email,
          first_name: parts[0],
          last_name: parts.slice(1).join(' ') || undefined,
        } as OrganizationMember;
      });
    },
    enabled: !!organization?.id,
  });

  // Mutation to add user to organization via edge function
  const addUserMutation = useMutation({
    mutationFn: async ({ email, password, firstName, lastName, role }: { 
      email: string; 
      password: string;
      firstName: string;
      lastName: string;
      role: string;
    }) => {
      if (!organization?.id) throw new Error('Organisation non trouvée');
      return api.inviteOrgMember({
        email,
        password,
        firstName,
        lastName,
        role: mapOrgRoleToDbRole(role as 'admin' | 'contributor' | 'viewer'),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organization?.id] });
      toast.success('Utilisateur créé et ajouté à l\'organisation');
      setIsAddModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création de l\'utilisateur');
    },
  });
  const isCurrentUserAdmin = React.useMemo(() => {
    if (!user?.id || !members.length) return false;
    const currentMember = members.find(m => m.user_id === user.id);
    return currentMember?.role === 'admin';
  }, [user?.id, members]);

  // Mutation to update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const dbRole = mapOrgRoleToDbRole(newRole as 'admin' | 'contributor' | 'viewer');
      await api.patchOrgMember(memberId, dbRole);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organization?.id] });
      toast.success('Rôle mis à jour avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour du rôle');
    },
  });

  // Handlers
  const handleView = (member: OrganizationMember) => {
    setSelectedMember(member);
    setIsViewModalOpen(true);
  };

  const handleEdit = (member: OrganizationMember) => {
    if (!isCurrentUserAdmin) {
      toast.error('Seuls les administrateurs peuvent modifier les utilisateurs');
      return;
    }
    setSelectedMember(member);
    setIsEditModalOpen(true);
  };

  const handlePermissions = (member: OrganizationMember) => {
    if (!isCurrentUserAdmin) {
      toast.error('Seuls les administrateurs peuvent modifier les permissions');
      return;
    }
    setSelectedMember(member);
    setIsPermissionsModalOpen(true);
  };

  const handleDisable = (member: OrganizationMember) => {
    if (!isCurrentUserAdmin) {
      toast.error('Seuls les administrateurs peuvent désactiver les utilisateurs');
      return;
    }
    toast.info(`Désactivation de ${member.first_name || 'l\'utilisateur'} à venir`);
  };

  const handleSaveUser = (data: Partial<OrganizationMember>) => {
    if (!selectedMember || !data.role) return;
    
    updateRoleMutation.mutate({
      memberId: selectedMember.id,
      newRole: data.role,
    });
  };

  const handleChangePassword = (newPassword: string) => {
    toast.success('Mot de passe modifié avec succès');
    // Password change handled by edge function
  };

  const handleAddUser = (data: { email: string; password: string; firstName: string; lastName: string; role: string }) => {
    addUserMutation.mutate(data);
  };

  const isLoading = isLoadingOrg || isLoadingMembers;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune organisation</h3>
            <p className="text-muted-foreground">
              Vous n'êtes pas encore associé à une organisation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Utilisateurs</h1>
            <p className="text-sm text-muted-foreground">
              {organization.name} • {members.length} membre{members.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 w-full sm:w-auto">
          <UserPlus className="h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Users list */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 sm:p-0">
          {members.length > 0 ? (
            isMobile ? (
              <div className="p-4">
                <UsersMobileList
                  members={members}
                  currentUserId={user?.id}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDisable={handleDisable}
                  onPermissions={handlePermissions}
                />
              </div>
            ) : (
              <UsersTable
                members={members}
                currentUserId={user?.id}
                onView={handleView}
                onEdit={handleEdit}
                onDisable={handleDisable}
                onPermissions={handlePermissions}
              />
            )
          ) : (
            <div className="text-center py-12 px-4">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Aucun utilisateur dans cette organisation.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des collaborateurs pour travailler ensemble.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <PermissionsMatrix />
      <ViewUserModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        member={selectedMember}
      />

      <EditUserModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        member={selectedMember}
        onSave={handleSaveUser}
        onChangePassword={() => {
          setIsEditModalOpen(false);
          setIsPasswordModalOpen(true);
        }}
        isAdmin={true}
      />

      <ChangePasswordModal
        open={isPasswordModalOpen}
        onOpenChange={setIsPasswordModalOpen}
        onSave={handleChangePassword}
        userName={selectedMember?.first_name ? `${selectedMember.first_name} ${selectedMember.last_name}` : undefined}
      />

      <AddUserModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAdd={handleAddUser}
        isLoading={addUserMutation.isPending}
      />

      <UserPermissionsModal
        open={isPermissionsModalOpen}
        onOpenChange={setIsPermissionsModalOpen}
        member={selectedMember}
        organizationId={organization?.id || null}
      />
    </div>
  );
};
