import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit2, UserX, MoreVertical, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrganizationMember, roleConfig, statusConfig } from './types';

interface UsersMobileListProps {
  members: OrganizationMember[];
  currentUserId?: string;
  onView: (member: OrganizationMember) => void;
  onEdit: (member: OrganizationMember) => void;
  onDisable: (member: OrganizationMember) => void;
  onPermissions: (member: OrganizationMember) => void;
}

export const UsersMobileList: React.FC<UsersMobileListProps> = ({
  members,
  currentUserId,
  onView,
  onEdit,
  onDisable,
  onPermissions,
}) => {
  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isCurrentUser = member.user_id === currentUserId;
        const role = roleConfig[member.role] || roleConfig.viewer;
        const status = statusConfig[member.status] || statusConfig.active;

        return (
          <Card key={member.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Name and status */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-foreground truncate">
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

                  {/* Email */}
                  <p className="text-sm text-muted-foreground truncate mb-3">
                    {member.email || `${member.user_id.slice(0, 8)}...`}
                  </p>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={role.className}>
                      {role.label}
                    </Badge>
                    <Badge className={status.className}>
                      {status.label}
                    </Badge>
                  </div>

                  {/* Projects */}
                  {member.projects && member.projects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.projects.slice(0, 2).map((project, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {project}
                        </Badge>
                      ))}
                      {member.projects.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.projects.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(member)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(member)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Modifier le rôle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPermissions(member)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Permissions
                    </DropdownMenuItem>
                    {!isCurrentUser && member.status !== 'disabled' && (
                      <DropdownMenuItem 
                        onClick={() => onDisable(member)}
                        className="text-destructive focus:text-destructive"
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Désactiver
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
