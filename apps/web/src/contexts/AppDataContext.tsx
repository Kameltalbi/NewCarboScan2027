// Centralized App Data Context
// Uses React Query for caching to prevent duplicate API calls across components

import React, { createContext, useContext, ReactNode, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';

// Types
export type UserRole = 'user' | 'admin' | 'superadmin' | 'financeur';

export interface OrganizationModule {
  module_id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  route: string;
  category: string | null;
  started_at: string | null;
  expires_at: string | null;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  sector: string | null;
  country: string | null;
  isOwner: boolean;
}

interface AppDataContextValue {
  // Organization
  organizationId: string | null;
  organizationLoading: boolean;
  
  // Multi-org
  allOrganizations: OrganizationInfo[];
  currentOrganization: OrganizationInfo | null;
  switchOrganization: (orgId: string) => void;
  
  // User Role
  userRole: UserRole | null;
  roleLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isFinanceur: boolean;

  // Modules
  modules: OrganizationModule[];
  modulesLoading: boolean;
  hasModule: (slug: string) => boolean;
  getModule: (slug: string) => OrganizationModule | undefined;
  
  // Subscription
  hasActiveSubscription: boolean;
  subscriptionLoading: boolean;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const SELECTED_ORG_KEY = 'carboscan_selected_org';

const mapApiRole = (role?: string | null): UserRole => {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'financeur') return 'financeur';
  if (role === 'admin' || role === 'owner') return 'admin';
  return 'user';
};

const fetchAllOrganizations = async (): Promise<OrganizationInfo[]> => {
  const { organizations } = await api.me();
  return organizations.map((m) => ({
    id: m.organization_id,
    name: m.name || 'Organisation',
    sector: m.sector ?? null,
    country: m.country ?? null,
    isOwner: m.role === 'owner',
  }));
};

const fetchUserRole = async (): Promise<UserRole> => {
  const { user } = await api.me();
  return mapApiRole(user.role ?? user.platformRole);
};

const fetchOrganizationModules = async (_orgId: string): Promise<OrganizationModule[]> => {
  const { items } = await api.listOrgModules();
  return (items || []).map((m) => ({
    module_id: m.module_id,
    slug: m.slug,
    name: m.name,
    description: m.description,
    icon: m.icon,
    route: m.route || `/${m.slug}`,
    category: m.category,
    started_at: m.started_at,
    expires_at: m.expires_at,
  }));
};

const fetchSubscriptionStatus = async (): Promise<boolean> => {
  const { user } = await api.me();
  if (user.role === 'superadmin' || user.platformRole === 'superadmin') return true;
  try {
    const sub = await api.getSubscription();
    return sub.hasActiveSubscription;
  } catch {
    return false;
  }
};

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Selected org from localStorage
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
    try { return localStorage.getItem(SELECTED_ORG_KEY); } catch { return null; }
  });

  // Query: All organizations
  const { data: allOrganizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['allOrganizations', userId],
    queryFn: () => fetchAllOrganizations(),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Determine active org ID
  const organizationId = useMemo(() => {
    if (allOrganizations.length === 0) return null;
    // If selected org is valid, use it
    if (selectedOrgId && allOrganizations.some(o => o.id === selectedOrgId)) {
      return selectedOrgId;
    }
    // Default to first org
    return allOrganizations[0]?.id || null;
  }, [allOrganizations, selectedOrgId]);

  const currentOrganization = useMemo(() => {
    return allOrganizations.find(o => o.id === organizationId) || null;
  }, [allOrganizations, organizationId]);

  // Switch organization
  const switchOrganization = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    try { localStorage.setItem(SELECTED_ORG_KEY, orgId); localStorage.setItem('ncs_org_id', orgId); } catch {}
    // Invalidate org-dependent queries
    queryClient.invalidateQueries({ queryKey: ['organizationModules'] });
    queryClient.invalidateQueries({ queryKey: ['organization-data'] });
  }, [queryClient]);

  // Query: User Role
  const { data: userRole, isLoading: roleQueryLoading } = useQuery({
    queryKey: ['userRole', userId],
    queryFn: () => fetchUserRole(),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Query: Organization Modules (depends on organizationId)
  const { data: modules = [], isLoading: modulesQueryLoading } = useQuery({
    queryKey: ['organizationModules', organizationId],
    queryFn: () => fetchOrganizationModules(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Query: Subscription Status
  const { data: hasActiveSubscription = false, isLoading: subscriptionQueryLoading } = useQuery({
    queryKey: ['subscriptionStatus', userId],
    queryFn: () => fetchSubscriptionStatus(),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Helper functions
  const hasModule = useMemo(() => {
    return (slug: string): boolean => modules.some(m => m.slug === slug);
  }, [modules]);

  const getModule = useMemo(() => {
    return (slug: string): OrganizationModule | undefined => modules.find(m => m.slug === slug);
  }, [modules]);

  // Computed values
  const isSuperAdmin = userRole === 'superadmin';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isFinanceur = userRole === 'financeur';

  // Loading states
  const organizationLoading = authLoading || (!!userId && orgsLoading);
  const roleLoading = authLoading || (!!userId && roleQueryLoading);
  const modulesLoading = organizationLoading || (!!organizationId && modulesQueryLoading);
  const subscriptionLoading = authLoading || (!!userId && subscriptionQueryLoading);

  const value: AppDataContextValue = {
    organizationId: organizationId ?? null,
    organizationLoading,
    allOrganizations,
    currentOrganization,
    switchOrganization,
    userRole: userRole ?? null,
    roleLoading,
    isSuperAdmin,
    isAdmin,
    isFinanceur,
    modules,
    modulesLoading,
    hasModule,
    getModule,
    hasActiveSubscription,
    subscriptionLoading,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

// Custom hooks that use the context
export const useAppData = (): AppDataContextValue => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

// Convenience hooks for backward compatibility
export const useOrganizationIdCached = () => {
  const { organizationId, organizationLoading } = useAppData();
  return { organizationId, loading: organizationLoading };
};

export const useUserRoleCached = () => {
  const { userRole, roleLoading, isSuperAdmin, isAdmin } = useAppData();
  return { 
    userRole, 
    isLoading: roleLoading, 
    isSuperAdmin: () => isSuperAdmin,
    isAdmin: () => isAdmin,
    hasRole: (role: UserRole) => {
      if (role === 'user') return true;
      if (role === 'admin') return isAdmin;
      if (role === 'superadmin') return isSuperAdmin;
      return false;
    }
  };
};

export const useOrganizationModulesCached = () => {
  const { modules, modulesLoading, hasModule, getModule } = useAppData();
  return { modules, loading: modulesLoading, hasModule, getModule, error: null };
};

export const useSubscriptionStatusCached = () => {
  const { hasActiveSubscription, subscriptionLoading } = useAppData();
  return { hasActiveSubscription, loading: subscriptionLoading };
};
