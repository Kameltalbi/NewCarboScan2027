import { useMemo } from 'react';

// Rôles des membres d'organisation (distinct des rôles système user/admin/superadmin)
export type OrgMemberRole = 'admin' | 'contributor' | 'viewer';

// Actions possibles dans l'application
export type OrgAction = 
  | 'view_dashboard'
  | 'edit_data'
  | 'edit_emission_factors'
  | 'export'
  | 'lock_version';

// Matrice de permissions basée sur l'image de référence
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

// Labels pour l'affichage
export const ORG_ROLE_LABELS: Record<OrgMemberRole, string> = {
  admin: 'Admin',
  contributor: 'Contributeur',
  viewer: 'Lecteur',
};

// Descriptions des rôles
export const ORG_ROLE_DESCRIPTIONS: Record<OrgMemberRole, string> = {
  admin: 'Accès complet : modification des données, facteurs d\'émission et verrouillage',
  contributor: 'Peut modifier les données et exporter, mais pas les facteurs d\'émission',
  viewer: 'Lecture seule avec possibilité d\'exporter',
};

// Labels des actions pour l'affichage
export const ACTION_LABELS: Record<OrgAction, string> = {
  view_dashboard: 'Voir dashboard',
  edit_data: 'Modifier données',
  edit_emission_factors: 'Modifier FE',
  export: 'Exporter',
  lock_version: 'Verrouiller version',
};

export const useOrgMemberPermissions = (role: OrgMemberRole | null) => {
  const permissions = useMemo(() => {
    if (!role) {
      // Si pas de rôle, aucune permission
      return {
        view_dashboard: false,
        edit_data: false,
        edit_emission_factors: false,
        export: false,
        lock_version: false,
      };
    }
    return PERMISSIONS_MATRIX[role];
  }, [role]);

  const can = (action: OrgAction): boolean => {
    return permissions[action] ?? false;
  };

  const canAny = (...actions: OrgAction[]): boolean => {
    return actions.some(action => can(action));
  };

  const canAll = (...actions: OrgAction[]): boolean => {
    return actions.every(action => can(action));
  };

  const isAdmin = role === 'admin';
  const isContributor = role === 'contributor';
  const isViewer = role === 'viewer';

  return {
    role,
    permissions,
    can,
    canAny,
    canAll,
    isAdmin,
    isContributor,
    isViewer,
  };
};

// Utilitaire pour mapper les rôles DB vers les rôles UI
export const mapDbRoleToOrgRole = (dbRole: string): OrgMemberRole => {
  const mapping: Record<string, OrgMemberRole> = {
    owner: 'admin',
    admin: 'admin',
    member: 'contributor',
    contributor: 'contributor',
    editor: 'contributor',
    viewer: 'viewer',
  };
  return mapping[dbRole] || 'viewer';
};

// Utilitaire pour mapper les rôles UI vers les rôles DB
export const mapOrgRoleToDbRole = (orgRole: OrgMemberRole): string => {
  const mapping: Record<OrgMemberRole, string> = {
    admin: 'admin',
    contributor: 'editor',
    viewer: 'viewer',
  };
  return mapping[orgRole];
};
