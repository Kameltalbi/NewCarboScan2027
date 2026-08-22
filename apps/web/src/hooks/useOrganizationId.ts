import { useAuth } from './useAuth';
import { api, getStoredOrgId } from "@/integrations/api/client";
import { useQuery } from '@tanstack/react-query';

export const useOrganizationId = () => {
  const { user } = useAuth();

  const { data: organizationId, isLoading: loading, error } = useQuery({
    queryKey: ['organization-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const stored = getStoredOrgId() || user.organizationId || null;
      if (stored) return stored;
      try {
        const { organizations } = await api.me();
        return organizations[0]?.organization_id ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    organizationId: organizationId ?? null,
    loading,
    error: error as Error | null
  };
};
