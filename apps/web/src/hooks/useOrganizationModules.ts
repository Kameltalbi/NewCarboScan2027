import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

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

export const useOrganizationModules = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<OrganizationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchModules = async () => {
      if (!user) {
        setModules([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let organizationId: string | null = null;

        // 1. D'abord chercher si l'utilisateur est propriétaire d'une organisation
        const { data: ownedOrg, error: ownedOrgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (ownedOrg) {
          organizationId = ownedOrg.id;
          logger.debug('🏢 User is organization owner:', organizationId);
        } else {
          // 2. Sinon chercher si l'utilisateur est membre d'une organisation
          const { data: orgMember, error: orgError } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (orgMember) {
            organizationId = orgMember.organization_id;
            logger.debug('👥 User is organization member:', organizationId);
          }
        }

        if (!organizationId) {
          logger.warn('No organization found for user');
          setModules([]);
          setLoading(false);
          return;
        }

        // Appeler la fonction RPC pour récupérer les modules actifs
        const { data, error: rpcError } = await supabase
          .rpc('get_organization_modules', { p_org_id: organizationId });

        if (rpcError) {
          throw rpcError;
        }

        setModules(data || []);
      } catch (err) {
        console.error('Error fetching organization modules:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setModules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [user]);

  // Fonction pour vérifier si un module est actif
  const hasModule = (slug: string): boolean => {
    return modules.some(m => m.slug === slug);
  };

  // Fonction pour obtenir un module par son slug
  const getModule = (slug: string): OrganizationModule | undefined => {
    return modules.find(m => m.slug === slug);
  };

  return {
    modules,
    loading,
    error,
    hasModule,
    getModule,
  };
};

