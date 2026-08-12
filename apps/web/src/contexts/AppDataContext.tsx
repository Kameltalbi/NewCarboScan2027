// Centralized App Data Context
// Uses React Query for caching to prevent duplicate API calls across components

import React, { createContext, useContext, ReactNode, useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
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

// Fetch ALL organizations for the user (owned + member)
const fetchAllOrganizations = async (userId: string): Promise<OrganizationInfo[]> => {
  const orgs: OrganizationInfo[] = [];

  // 1. Owned organizations
  const { data: ownedOrgs } = await supabase
    .from('organizations')
    .select('id, name, sector, country')
    .eq('user_id', userId);

  if (ownedOrgs) {
    for (const o of ownedOrgs) {
      orgs.push({ id: o.id, name: o.name, sector: o.sector, country: o.country, isOwner: true });
    }
  }

  // 2. Member organizations
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name, sector, country)')
    .eq('user_id', userId);

  if (memberships) {
    for (const m of memberships) {
      const org = m.organizations as any;
      if (org && !orgs.some(o => o.id === org.id)) {
        orgs.push({ id: org.id, name: org.name, sector: org.sector, country: org.country, isOwner: false });
      }
    }
  }

  return orgs;
};

// Fetch user role
const fetchUserRole = async (userId: string): Promise<UserRole> => {
  const { data, error } = await supabase
    .rpc('get_user_role', { _user_id: userId });

  if (!error && data) {
    return data as UserRole;
  }
  return 'user';
};

// Fetch organization modules
const fetchOrganizationModules = async (orgId: string): Promise<OrganizationModule[]> => {
  const { data, error } = await supabase
    .rpc('get_organization_modules', { p_org_id: orgId });

  if (error) {
    console.error('Error fetching modules:', error);
    return [];
  }
  return data || [];
};

// Fetch subscription status
const fetchSubscriptionStatus = async (userId: string): Promise<boolean> => {
  const { data: validatedOrders, error: ordersError } = await supabase
    .from('orders')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'validated')
    .limit(1);

  if (ordersError) {
    console.error('Error fetching validated orders:', ordersError);
  }

  if ((validatedOrders?.length || 0) > 0) {
    return true;
  }

  const now = new Date().toISOString();
  const { data: activeSubscriptions, error: subsError } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', now)
    .limit(1);

  if (subsError) {
    console.error('Error fetching active subscriptions:', subsError);
  }

  return (activeSubscriptions?.length || 0) > 0;
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
    queryFn: () => fetchAllOrganizations(userId!),
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
    try { localStorage.setItem(SELECTED_ORG_KEY, orgId); } catch {}
    // Invalidate org-dependent queries
    queryClient.invalidateQueries({ queryKey: ['organizationModules'] });
    queryClient.invalidateQueries({ queryKey: ['organization-data'] });
  }, [queryClient]);

  // Query: User Role
  const { data: userRole, isLoading: roleQueryLoading } = useQuery({
    queryKey: ['userRole', userId],
    queryFn: () => fetchUserRole(userId!),
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
    queryFn: () => fetchSubscriptionStatus(userId!),
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
