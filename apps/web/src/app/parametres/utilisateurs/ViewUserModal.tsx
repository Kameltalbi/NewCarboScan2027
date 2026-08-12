import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Shield, Calendar, FolderOpen } from 'lucide-react';
import { OrganizationMember, roleConfig, statusConfig } from './types';

interface ViewUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
}

export const ViewUserModal: React.FC<ViewUserModalProps> = ({
  open,
  onOpenChange,
  member,
}) => {
  if (!member) return null;

  const role = roleConfig[member.role] || roleConfig.viewer;
  const status = statusConfig[member.status] || statusConfig.active;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Détails utilisateur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Nom complet</p>
              <p className="font-medium">
                {member.first_name && member.last_name 
                  ? `${member.last_name} ${member.first_name}`
                  : 'Non renseigné'
                }
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">
                {member.email || `${member.user_id.slice(0, 8)}...`}
              </p>
            </div>
          </div>

          <Separator />

          {/* Role & Status */}
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Rôle & Statut</p>
              <div className="flex gap-2">
                <Badge className={role.className}>{role.label}</Badge>
                <Badge className={status.className}>{status.label}</Badge>
              </div>
            </div>
          </div>

          {/* Projects */}
          <div className="flex items-start gap-3">
            <FolderOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Projets</p>
              <div className="flex flex-wrap gap-1">
                {member.projects && member.projects.length > 0 ? (
                  member.projects.map((project, idx) => (
                    <Badge key={idx} variant="outline">
                      {project}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm">Accès à tous les projets</span>
                )}
              </div>
            </div>
          </div>

          {/* Join date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Membre depuis</p>
              <p className="font-medium">
                {new Date(member.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
