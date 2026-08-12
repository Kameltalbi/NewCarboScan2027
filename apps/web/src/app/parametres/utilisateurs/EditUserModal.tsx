import React, { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Shield, Key } from 'lucide-react';
import { OrganizationMember } from './types';
import { OrgMemberRole, ORG_ROLE_LABELS, ORG_ROLE_DESCRIPTIONS } from '@/hooks/useOrgMemberPermissions';

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
  onSave: (data: Partial<OrganizationMember>) => void;
  onChangePassword: () => void;
  isAdmin?: boolean;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  open,
  onOpenChange,
  member,
  onSave,
  onChangePassword,
  isAdmin = false,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<OrgMemberRole>('viewer');

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name || '');
      setLastName(member.last_name || '');
      setRole(member.role);
    }
  }, [member]);

  const handleSave = () => {
    onSave({
      first_name: firstName,
      last_name: lastName,
      role,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Modifier utilisateur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Personal info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dupont"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jean"
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgMemberRole)}>
              <SelectTrigger id="role">
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

          {/* Projects - placeholder */}
          <div className="space-y-2">
            <Label>Projets accessibles</Label>
            <div className="p-3 border rounded bg-muted/30 text-sm text-muted-foreground">
              Tous les projets de l'organisation
            </div>
          </div>

          {/* Security section */}
          {isAdmin && (
            <>
              <Separator className="my-4" />
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-primary" />
                  Sécurité
                </div>
                
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={onChangePassword}
                >
                  <Key className="h-4 w-4" />
                  Modifier le mot de passe
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
