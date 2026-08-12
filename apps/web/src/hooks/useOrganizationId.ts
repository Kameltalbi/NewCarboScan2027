// Hook pour récupérer l'organization_id de l'utilisateur connecté
// Utilise React Query pour le caching et éviter les requêtes redondantes

import { useAuth } from './useAuth';
import { supabase } from "@/integrations/api/client";
import { useQuery } from '@tanstack/react-query';

export const useOrganizationId = () => {
  const { user } = useAuth();

  const { data: organizationId, isLoading: loading, error } = useQuery({
    queryKey: ['organization-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // 1. D'abord chercher si l'utilisateur est propriétaire d'une organisation
      const { data: ownedOrg, error: ownedOrgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ownedOrgError) {
        throw ownedOrgError;
      }

      if (ownedOrg?.id) {
        return ownedOrg.id;
      }

      // 2. Sinon chercher si l'utilisateur est membre d'une organisation
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (orgError) {
        throw orgError;
      }

      return orgMember?.organization_id || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache pendant 5 minutes
    gcTime: 10 * 60 * 1000, // Garder en cache 10 minutes
  });

  return { 
    organizationId: organizationId ?? null, 
    loading, 
    error: error as Error | null 
  };
};
