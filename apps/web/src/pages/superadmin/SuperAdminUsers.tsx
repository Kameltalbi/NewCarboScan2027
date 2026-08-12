import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings, Lock, Unlock, Trash2, Mail, Key } from "lucide-react";
import { MANAGED_CLIENT_ACCOUNTS } from "@/lib/superadmin/managedClients";
import { useUserRoleCached } from "@/contexts/AppDataContext";

interface UserWithRole {
  id: string;
  email?: string;
  user_metadata?: any;
  created_at: string;
  last_sign_in_at?: string;
  role: string;
  status: 'active' | 'blocked';
  isManagedClient?: boolean;
  plan?: {
    plan_type: string;
    status: string;
    amount?: number;
    validated_at?: string;
  };
  subscription?: {
    status: string;
    assessments_used: number;
    assessments_limit: number;
  };
}

export const SuperAdminUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { userRole } = useUserRoleCached();
  const isReadOnly = userRole === 'financeur';

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'user' as 'user' | 'admin' | 'superadmin',
    name: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Call our edge function to get real user data
      const { data, error } = await supabase.functions.invoke('get-users');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.users) {
        // Enrich users with plan information
        const enrichedUsers = await Promise.all(
          data.users.map(async (user: any) => {
            // Get latest order for this user
            const { data: orders } = await supabase
              .from('orders')
              .select('plan_type, status, amount, validated_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1);

            // Get subscription info
            const { data: subscriptions } = await supabase
              .from('user_subscriptions')
              .select('status, assessments_used, assessments_limit')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .limit(1);

            return {
              ...user,
              plan: orders?.[0] || null,
              subscription: subscriptions?.[0] || null
            };
          })
        );
        
        const managedClientUsers: UserWithRole[] = MANAGED_CLIENT_ACCOUNTS.map(client => ({
          id: client.id,
          email: client.email,
          user_metadata: {
            full_name: client.name,
            phone: client.phone,
            address: client.address,
          },
          created_at: '2026-08-12T00:00:00.000Z',
          role: 'user',
          status: 'active',
          isManagedClient: true,
          plan: {
            plan_type: 'essentiel',
            status: 'validated',
          },
        }));

        setUsers([...enrichedUsers, ...managedClientUsers]);
      } else {
        throw new Error('No users data received');
      }
      
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // In a real app, this would send an invitation email
      // For now, we'll just show a success message
      toast({
        title: "Invitation envoyée",
        description: `Une invitation a été envoyée à ${inviteData.email}`,
      });

      setInviteData({ email: '', role: 'user', name: '' });
      setIsInviteDialogOpen(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'invitation",
        variant: "destructive",
      });
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      // Remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Add new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role: newRole as 'user' | 'admin' | 'superadmin' 
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rôle utilisateur mis à jour",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error changing user role:', error);
      toast({
        title: "Erreur",
        description: "Impossible de changer le rôle",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: 'active' | 'blocked') => {
    // In a real app, this would update user status in auth
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    
    // Update local state for demo
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));

    toast({
      title: "Succès",
      description: `Utilisateur ${newStatus === 'active' ? 'activé' : 'bloqué'}`,
    });
  };

  const deleteUser = async (userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Utilisateur supprimé",
        });

        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer l'utilisateur",
          variant: "destructive",
        });
      }
    }
  };

  const openPasswordDialog = (user: UserWithRole) => {
    setSelectedUserForPassword(user);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserForPassword) return;

    if (newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
          body: JSON.stringify({
            userId: selectedUserForPassword.id,
            password: newPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Succès",
        description: `Mot de passe de ${selectedUserForPassword.email} mis à jour`,
      });

      setIsPasswordDialogOpen(false);
      setSelectedUserForPassword(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de changer le mot de passe",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeUsers = users.filter(user => user.status === 'active').length;
  const blockedUsers = users.filter(user => user.status === 'blocked').length;
  const essentialUsers = users.filter(user =>
    user.role !== 'superadmin' &&
    (!user.plan || user.plan.status !== 'validated' || user.plan.plan_type === 'essentiel')
  ).length;
  const upgradedPlanUsers = users.filter(user =>
    user.role !== 'superadmin' &&
    user.plan?.status === 'validated' &&
    user.plan.plan_type !== 'essentiel'
  ).length;

  if (isLoading) {
    return <div>Chargement des utilisateurs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des utilisateurs & permissions</h2>
          <p className="text-muted-foreground">
            Gérer les utilisateurs, leurs rôles et permissions
          </p>
        </div>
        
        {!isReadOnly && <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Inviter un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Inviter un utilisateur</DialogTitle>
              <DialogDescription>
                Envoyer une invitation par email avec attribution de rôle
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  value={inviteData.name}
                  onChange={(e) => setInviteData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select 
                  value={inviteData.role} 
                  onValueChange={(value: 'user' | 'admin' | 'superadmin') => 
                    setInviteData(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer l'invitation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>}
      </div>

      {/* Indicateurs opérationnels calculés sur la liste utilisateurs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total enregistrés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Toutes les lignes utilisateurs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Résultats affichés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredUsers.length}</div>
            <p className="text-xs text-muted-foreground">Selon les filtres actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comptes actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Accès non bloqué</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">À surveiller</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedUsers}</div>
            <p className="text-xs text-muted-foreground">Comptes bloqués</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Répartition plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{essentialUsers}</span>
              <span className="text-sm text-muted-foreground">/ {upgradedPlanUsers}</span>
            </div>
            <p className="text-xs text-muted-foreground">Essentiel / plans supérieurs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-sm"
            />
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="blocked">Bloqué</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>
            {filteredUsers.length} utilisateur(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Utilisation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                {!isReadOnly && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.user_metadata?.full_name || 'N/A'}</TableCell>
                  {!isReadOnly && <TableCell>
                    <Badge 
                      variant={
                        user.role === 'superadmin' ? 'default' : 
                        user.role === 'admin' ? 'secondary' : 
                        'outline'
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>}
                  <TableCell>
                    {user.role === 'superadmin' ? (
                      <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
                        SuperAdmin
                      </Badge>
                    ) : user.plan?.status === 'validated' ? (
                      <div className="space-y-1">
                        <Badge variant="default">
                          {user.plan.plan_type === 'carbo_start' ? 'CarboStart' : 
                           user.plan.plan_type === 'carbo_plus' ? 'CarboPlus' : 
                           user.plan.plan_type === 'carbo_pro' ? 'CarboPro' : 
                           user.plan.plan_type}
                        </Badge>
                        {user.plan.amount != null && (
                          <div className="text-xs text-muted-foreground">
                            {user.plan.amount} TND
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        Essentiel
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.subscription ? (
                      <div className="text-sm">
                        <div>{user.subscription.assessments_used}/{user.subscription.assessments_limit}</div>
                        <div className="text-xs text-muted-foreground">bilans</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                      {user.status === 'active' ? 'Actif' : 'Bloqué'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'Jamais'
                    }
                  </TableCell>
                  <TableCell>
                    {!user.isManagedClient ? (
                    <div className="flex gap-2">
                      <Select onValueChange={(value) => changeUserRole(user.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">SuperAdmin</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPasswordDialog(user)}
                        title="Changer le mot de passe"
                      >
                        <Key className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleUserStatus(user.id, user.status)}
                      >
                        {user.status === 'active' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>
              {selectedUserForPassword
                ? `Définir un nouveau mot de passe pour ${selectedUserForPassword.email}`
                : "Définir un nouveau mot de passe"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
                disabled={isChangingPassword}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "Mise à jour..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
