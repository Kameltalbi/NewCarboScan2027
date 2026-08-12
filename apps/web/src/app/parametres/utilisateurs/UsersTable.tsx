import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit2, UserX, Shield } from 'lucide-react';
import { OrganizationMember, roleConfig, statusConfig } from './types';

interface UsersTableProps {
  members: OrganizationMember[];
  currentUserId?: string;
  onView: (member: OrganizationMember) => void;
  onEdit: (member: OrganizationMember) => void;
  onDisable: (member: OrganizationMember) => void;
  onPermissions: (member: OrganizationMember) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  members,
  currentUserId,
  onView,
  onEdit,
  onDisable,
  onPermissions,
}) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-semibold text-foreground">Nom & Prénom</TableHead>
            <TableHead className="font-semibold text-foreground">Email</TableHead>
            <TableHead className="font-semibold text-foreground">Rôle</TableHead>
            <TableHead className="font-semibold text-foreground hidden md:table-cell">Projet(s)</TableHead>
            <TableHead className="font-semibold text-foreground">Statut</TableHead>
            <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const role = roleConfig[member.role] || roleConfig.viewer;
            const status = statusConfig[member.status] || statusConfig.active;
            
            return (
              <TableRow key={member.id} className="hover:bg-muted/20">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {member.first_name && member.last_name 
                        ? `${member.last_name} ${member.first_name}`
                        : isCurrentUser 
                          ? 'Vous'
                          : 'Utilisateur'
                      }
                    </span>
                    {isCurrentUser && (
                      <span className="text-xs text-primary">(Vous)</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {member.email || `${member.user_id.slice(0, 8)}...`}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={role.className}>
                    {role.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {member.projects && member.projects.length > 0 ? (
                      member.projects.slice(0, 2).map((project, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {project}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Tous</span>
                    )}
                    {member.projects && member.projects.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{member.projects.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onView(member)}
                      title="Voir"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(member)}
                      title="Modifier le rôle"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => onPermissions(member)}
                      title="Permissions personnalisées"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                    {!isCurrentUser && member.status !== 'disabled' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDisable(member)}
                        title="Désactiver"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
