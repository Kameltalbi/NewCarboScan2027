import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
import { useAuth } from './useAuth';
import { useEffect } from 'react';

export interface OrganizationSite {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country?: string;
  site_type?: string;
  is_active: boolean;
  company_id: string;
  employees_count?: number;
  surface_m2?: number;
}

export const useOrganizationSites = (_organizationId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['organization-sites'] });
    };
    window.addEventListener('organizationSaved', handleRefresh);
    window.addEventListener('sitesUpdated', handleRefresh);
    return () => {
      window.removeEventListener('organizationSaved', handleRefresh);
      window.removeEventListener('sitesUpdated', handleRefresh);
    };
  }, [queryClient]);

  const { data: sites = [], isLoading, error, refetch } = useQuery({
    queryKey: ['organization-sites', user?.id, _organizationId],
    queryFn: async () => {
      if (!user?.id) return [];
      const { items } = await api.listSites();
      return (items || [])
        .filter((s: any) => s.is_active !== false)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          address: s.address,
          city: s.city,
          country: s.country,
          site_type: s.site_type,
          is_active: s.is_active,
          company_id: s.company_id,
          employees_count: s.employees_count,
          surface_m2: s.surface_m2,
        })) as OrganizationSite[];
    },
    enabled: !!user,
  });

  return { sites, isLoading, error, refetch };
};
