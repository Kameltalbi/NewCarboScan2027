import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  UserPlus, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Crown, 
  Shield, 
  User,
  Clock,
  UserCheck,
  Copy,
  CheckCircle2
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase, sessionAuth} from "@/integrations/api/client";
import { toast } from "sonner";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'collaborateur';
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  invitedAt: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [createData, setCreateData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "collaborateur" as const
  });
  const [generatedCredentials, setGeneratedCredentials] = useState({
    email: "",
    password: "",
    copied: false
  });
  const [isCreating, setIsCreating] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Charger l'organization_id au mount
  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await sessionAuth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Try: organization owned by the user
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (orgData?.id) {
        setOrganizationId(orgData.id);
        return;
      }

      // Fallback: organization where the user is a member
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1);

      if (memberships && memberships.length > 0) {
        setOrganizationId(memberships[0].organization_id);
      } else {
        // No organization found, stop the spinner
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Erreur chargement organisation:', error);
      setIsLoading(false);
    }
  };

  // Charger les utilisateurs depuis Supabase
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      // Utiliser la fonction Edge sécurisée pour récupérer les utilisateurs
      const { data, error } = await supabase.functions.invoke('get-users', {
        body: { organizationId }
      });
      if (error) throw error;
      const apiUsers = (data as any)?.users as any[] | undefined;

      if (!apiUsers) {
        setUsers([]);
        return;
      }

      const usersData: UserData[] = apiUsers.map((user: any) => {
        const dbRole = user.role as 'user' | 'admin' | 'superadmin' | undefined;
        const firstName = user.user_metadata?.first_name || '';
        const lastName = user.user_metadata?.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'Utilisateur';

        let role: 'admin' | 'manager' | 'collaborateur' = 'collaborateur';
        if (dbRole === 'admin' || dbRole === 'superadmin') role = 'admin';

        const status: 'active' | 'inactive' | 'pending' = user.status === 'blocked' ? 'inactive' : 'active';

        return {
          id: user.id,
          name,
          email: user.email || '',
          role,
          status,
          lastLogin: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR') : 'Jamais',
          invitedAt: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : ''
        };
      });

      setUsers(usersData);
    } catch (error: any) {
      console.error('Erreur chargement utilisateurs:', error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'manager': return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCreateUser = async () => {
    if (!createData.firstName || !createData.lastName || !createData.email) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (!organizationId) {
      toast.error("Vous n'êtes pas associé à une organisation");
      return;
    }

    setIsCreating(true);
    const generatedPassword = generatePassword();

    try {
      // Créer l'utilisateur via l'edge function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: createData.email,
          password: generatedPassword,
          firstName: createData.firstName,
          lastName: createData.lastName,
          organizationId: organizationId
        }
      });

      if (error) throw error;

      // Recharger la liste complète depuis Supabase
      await loadUsers();

      // Afficher les identifiants
      setGeneratedCredentials({
        email: createData.email,
        password: generatedPassword,
        copied: false
      });

      setCreateData({ firstName: "", lastName: "", email: "", role: "collaborateur" });
      setShowCreateDialog(false);
      setShowCredentialsDialog(true);
      
      toast.success("Utilisateur créé avec succès");
    } catch (error: any) {
      console.error('Erreur création utilisateur:', error);
      toast.error(error.message || "Erreur lors de la création de l'utilisateur");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setGeneratedCredentials(prev => ({ ...prev, copied: true }));
    toast.success("Copié dans le presse-papier");
    setTimeout(() => {
      setGeneratedCredentials(prev => ({ ...prev, copied: false }));
    }, 2000);
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  const handleChangeRole = (userId: string, newRole: 'admin' | 'manager' | 'collaborateur') => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl text-blue-800">
              <Users className="h-6 w-6" />
              Gestion des Utilisateurs
            </CardTitle>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Créer un utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={createData.firstName}
                        onChange={(e) => setCreateData(prev => ({...prev, firstName: e.target.value}))}
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={createData.lastName}
                        onChange={(e) => setCreateData(prev => ({...prev, lastName: e.target.value}))}
                        placeholder="Dupont"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email (identifiant de connexion)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createData.email}
                      onChange={(e) => setCreateData(prev => ({...prev, email: e.target.value}))}
                      placeholder="jean.dupont@exemple.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="role">Rôle</Label>
                    <Select value={createData.role} onValueChange={(value: any) => setCreateData(prev => ({...prev, role: value}))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="collaborateur">Collaborateur</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Administrateur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                    <p className="font-medium">ℹ️ Un mot de passe sera généré automatiquement</p>
                    <p className="text-xs mt-1">Vous pourrez le communiquer à l'utilisateur après création</p>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleCreateUser} disabled={isCreating}>
                      {isCreating ? "Création..." : "Créer l'utilisateur"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Dialog pour afficher les identifiants générés */}
            <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    Utilisateur créé avec succès
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="font-semibold text-yellow-900 mb-3">
                      ⚠️ Notez ces identifiants - ils ne seront plus affichés
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-600">Identifiant (email)</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            value={generatedCredentials.email} 
                            readOnly 
                            className="font-mono text-sm bg-white"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generatedCredentials.email)}
                          >
                            {generatedCredentials.copied ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Mot de passe généré</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            value={generatedCredentials.password} 
                            readOnly 
                            className="font-mono text-sm bg-white"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generatedCredentials.password)}
                          >
                            {generatedCredentials.copied ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <p className="text-blue-800">
                      💡 Communiquez ces identifiants à l'utilisateur en personne ou par un canal sécurisé.
                    </p>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setShowCredentialsDialog(false)}>
                      J'ai noté les identifiants
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">
            Utilisateurs de l'organisation ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Invité le</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={user.name} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className={`${getRoleColor(user.role)} border`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1 capitalize">{user.role}</span>
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className={`${getStatusColor(user.status)} border`}>
                      {user.status === 'active' && <UserCheck className="h-3 w-3 mr-1" />}
                      {user.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      <span className="capitalize">
                        {user.status === 'active' ? 'Actif' : 
                         user.status === 'pending' ? 'En attente' : 'Inactif'}
                      </span>
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-sm text-gray-600">
                    {user.lastLogin}
                  </TableCell>
                  
                  <TableCell className="text-sm text-gray-600">
                    {new Date(user.invitedAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'admin')}>
                          <Crown className="h-4 w-4 mr-2" />
                          Promouvoir Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'manager')}>
                          <Shield className="h-4 w-4 mr-2" />
                          Nommer Manager
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'collaborateur')}>
                          <User className="h-4 w-4 mr-2" />
                          Rétrograder Collaborateur
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleRemoveUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200">
          <CardTitle className="flex items-center gap-3 text-xl text-yellow-800">
            <Shield className="h-6 w-6" />
            Permissions par Rôle
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Administrateur</h3>
              </div>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Accès complet à tous les modules</li>
                <li>• Gestion des utilisateurs et rôles</li>
                <li>• Configuration de l'organisation</li>
                <li>• Gestion de l'abonnement</li>
                <li>• Suppression de données</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Manager</h3>
              </div>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Création et gestion des bilans</li>
                <li>• Consultation des rapports</li>
                <li>• Invitation d'utilisateurs</li>
                <li>• Export des données</li>
                <li>• Paramètres de l'équipe</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-800">Collaborateur</h3>
              </div>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Participation aux questionnaires</li>
                <li>• Consultation des bilans assignés</li>
                <li>• Saisie de données</li>
                <li>• Accès en lecture aux rapports</li>
                <li>• Modification de son profil</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};