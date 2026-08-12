import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Mail, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { OrgMemberRole, ORG_ROLE_LABELS, ORG_ROLE_DESCRIPTIONS } from '@/hooks/useOrgMemberPermissions';

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { email: string; password: string; firstName: string; lastName: string; role: string }) => void;
  isLoading?: boolean;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  open,
  onOpenChange,
  onAdd,
  isLoading = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<OrgMemberRole>('contributor');
  const [error, setError] = useState('');

  const handleAdd = () => {
    setError('');

    if (!email || !email.includes('@')) {
      setError('Veuillez saisir une adresse email valide');
      return;
    }

    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    onAdd({ email, password, firstName, lastName, role });
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setFirstName('');
    setLastName('');
    setRole('contributor');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Ajouter un utilisateur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="utilisateur@exemple.com"
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="pl-10 pr-10"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="addLastName">Nom</Label>
              <Input
                id="addLastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dupont"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addFirstName">Prénom</Label>
              <Input
                id="addFirstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jean"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="addRole">Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgMemberRole)} disabled={isLoading}>
              <SelectTrigger id="addRole">
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ORG_ROLE_LABELS) as OrgMemberRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex flex-col">
                      <span>{ORG_ROLE_LABELS[r]}</span>
                      <span className="text-xs text-muted-foreground">{ORG_ROLE_DESCRIPTIONS[r]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleAdd} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer l\'utilisateur'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
