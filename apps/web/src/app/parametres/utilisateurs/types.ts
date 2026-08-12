import { OrgMemberRole, ORG_ROLE_LABELS } from '@/hooks/useOrgMemberPermissions';

export interface OrganizationMember {
  id: string;
  user_id: string;
  role: OrgMemberRole;
  status: 'active' | 'invited' | 'disabled';
  created_at: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  projects?: string[];
}

export const roleConfig: Record<OrgMemberRole, { label: string; className: string }> = {
  admin: { 
    label: ORG_ROLE_LABELS.admin, 
    className: 'bg-slate-800 text-white hover:bg-slate-700' 
  },
  contributor: { 
    label: ORG_ROLE_LABELS.contributor, 
    className: 'bg-blue-500 text-white hover:bg-blue-600' 
  },
  viewer: { 
    label: ORG_ROLE_LABELS.viewer, 
    className: 'bg-gray-400 text-white hover:bg-gray-500' 
  },
};

export const statusConfig = {
  active: { 
    label: 'Actif', 
    className: 'bg-emerald-100 text-emerald-700' 
  },
  invited: { 
    label: 'Invité', 
    className: 'bg-amber-100 text-amber-700' 
  },
  disabled: { 
    label: 'Désactivé', 
    className: 'bg-gray-100 text-gray-500' 
  },
} as const;
