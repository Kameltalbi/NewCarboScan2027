import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
import { toast } from 'sonner';
import { OrganizationMember, roleConfig } from './types';
import { 
  OrgAction, 
  ACTION_LABELS, 
  OrgMemberRole 
} from '@/hooks/useOrgMemberPermissions';

interface UserPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
  organizationId: string | null;
}

// Permissions de base par rôle
const BASE_PERMISSIONS: Record<OrgMemberRole, Record<OrgAction, boolean>> = {
  admin: {
    view_dashboard: true,
    edit_data: true,
    edit_emission_factors: true,
    export: true,
    lock_version: true,
  },
  contributor: {
    view_dashboard: true,
    edit_data: true,
    edit_emission_factors: false,
    export: true,
    lock_version: false,
  },
  viewer: {
    view_dashboard: true,
    edit_data: false,
    edit_emission_factors: false,
    export: true,
    lock_version: false,
  },
};

const ALL_ACTIONS: OrgAction[] = [
  'view_dashboard',
  'edit_data',
  'edit_emission_factors',
  'export',
  'lock_version',
];

interface PermissionOverride {
  id: string;
  permission_key: string;
  granted: boolean;
}

export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  open,
  onOpenChange,
  member,
  organizationId,
}) => {
  const queryClient = useQueryClient();

  // Fetch existing overrides for this user
  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ['permission-overrides', organizationId, member?.user_id],
    queryFn: async (): Promise<PermissionOverride[]> => {
      if (!organizationId || !member?.user_id) return [];
      
      const { items } = await api.listMemberPermissions(member.user_id);
      return (items || []).map((row) => ({
        id: row.id,
        permission_key: row.permission_key,
        granted: row.granted ?? row.allowed,
      }));
    },
    enabled: open && !!organizationId && !!member?.user_id,
  });

  // Mutation to toggle a permission
  const toggleMutation = useMutation({
    mutationFn: async ({ action, newValue }: { action: OrgAction; newValue: boolean | null }) => {
      if (!organizationId || !member?.user_id) throw new Error('Missing data');

      await api.setMemberPermission(member.user_id, action, newValue);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['permission-overrides', organizationId, member?.user_id] 
      });
      toast.success('Permission mise à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  if (!member) return null;

  const basePermissions = BASE_PERMISSIONS[member.role];
  const role = roleConfig[member.role];

  const getEffectiveValue = (action: OrgAction): boolean => {
    const override = overrides.find(o => o.permission_key === action);
    if (override) return override.granted;
    return basePermissions[action];
  };

  const hasOverride = (action: OrgAction): boolean => {
    return overrides.some(o => o.permission_key === action);
  };

  const handleToggle = (action: OrgAction) => {
    const currentEffective = getEffectiveValue(action);
    toggleMutation.mutate({ action, newValue: !currentEffective });
  };

  const handleReset = (action: OrgAction) => {
    toggleMutation.mutate({ action, newValue: null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permissions personnalisées</DialogTitle>
          <DialogDescription>
            {member.first_name && member.last_name 
              ? `${member.first_name} ${member.last_name}`
              : member.email || 'Utilisateur'
            }
            <Badge className={`ml-2 ${role.className}`}>{role.label}</Badge>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Modifiez les permissions individuelles. Les changements s'appliquent en plus du rôle de base.
            </p>
            
            <div className="space-y-3">
              {ALL_ACTIONS.map((action) => {
                const baseValue = basePermissions[action];
                const effectiveValue = getEffectiveValue(action);
                const isOverridden = hasOverride(action);
                
                return (
                  <div 
                    key={action} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isOverridden ? 'border-primary/50 bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {ACTION_LABELS[action]}
                        </span>
                        {isOverridden && (
                          <Badge variant="outline" className="text-xs">
                            Personnalisé
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Par défaut ({role.label}):
                        </span>
                        {baseValue ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <X className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isOverridden && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReset(action)}
                          disabled={toggleMutation.isPending}
                          title="Réinitialiser au défaut"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Switch
                        checked={effectiveValue}
                        onCheckedChange={() => handleToggle(action)}
                        disabled={toggleMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
