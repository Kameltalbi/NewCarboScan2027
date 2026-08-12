import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Info } from 'lucide-react';
import { 
  OrgMemberRole, 
  OrgAction, 
  ORG_ROLE_LABELS, 
  ACTION_LABELS 
} from '@/hooks/useOrgMemberPermissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Matrice de permissions
const PERMISSIONS_MATRIX: Record<OrgMemberRole, Record<OrgAction, boolean>> = {
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

const ACTIONS: OrgAction[] = [
  'view_dashboard',
  'edit_data',
  'edit_emission_factors',
  'export',
  'lock_version',
];

const ROLES: OrgMemberRole[] = ['admin', 'contributor', 'viewer'];

const roleStyles: Record<OrgMemberRole, string> = {
  admin: 'bg-slate-800 text-white',
  contributor: 'bg-blue-500 text-white',
  viewer: 'bg-gray-400 text-white',
};

interface PermissionsMatrixProps {
  highlightRole?: OrgMemberRole;
  compact?: boolean;
}

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({ 
  highlightRole,
  compact = false 
}) => {
  return (
    <Card className={compact ? 'border-0 shadow-none' : ''}>
      {!compact && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Matrice des permissions
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? 'p-0' : 'pt-0'}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                  Action
                </th>
                {ROLES.map((role) => (
                  <th 
                    key={role} 
                    className={`text-center py-2 px-3 ${highlightRole === role ? 'bg-primary/5' : ''}`}
                  >
                    <Badge className={roleStyles[role]}>
                      {ORG_ROLE_LABELS[role]}
                    </Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIONS.map((action) => (
                <tr key={action} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-2 font-medium">
                    {ACTION_LABELS[action]}
                  </td>
                  {ROLES.map((role) => {
                    const hasPermission = PERMISSIONS_MATRIX[role][action];
                    return (
                      <td 
                        key={role} 
                        className={`text-center py-3 px-3 ${highlightRole === role ? 'bg-primary/5' : ''}`}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center justify-center">
                                {hasPermission ? (
                                  <Check className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <X className="h-5 w-5 text-red-500" />
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {hasPermission 
                                ? `${ORG_ROLE_LABELS[role]} peut ${ACTION_LABELS[action].toLowerCase()}`
                                : `${ORG_ROLE_LABELS[role]} ne peut pas ${ACTION_LABELS[action].toLowerCase()}`
                              }
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
