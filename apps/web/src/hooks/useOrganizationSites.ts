// Hook pour récupérer les sites liés à l'utilisateur via sa company
// collect_sites utilise company_id, donc on récupère d'abord la company de l'utilisateur

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
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

export const useOrganizationSites = (organizationId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Quand l'organisation vient d'être créée/sauvegardée ou quand un site est modifié,
  // on invalide le cache pour que la liste se mette à jour sans refresh.
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
    queryKey: ['organization-sites', user?.id, organizationId],
    queryFn: async () => {
      if (!user?.id) return [];

      let companyId: string | null = null;

      if (organizationId) {
        // Résoudre la company via l'organisation (multi-tenant safe)
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('user_id')
          .eq('id', organizationId)
          .maybeSingle();

        if (orgError) throw orgError;
        if (!org) return [];

        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', org.user_id)
          .maybeSingle();

        if (companyError) throw companyError;
        companyId = company?.id || null;
      } else {
        // Fallback: company de l'utilisateur connecté
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyError) throw companyError;
        companyId = company?.id || null;
      }

      if (!companyId) return [];

      // Récupérer les sites de cette company
      const { data, error } = await supabase
        .from('collect_sites')
        .select('id, name, code, address, city, country, site_type, is_active, company_id, employees_count, surface_m2')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as OrganizationSite[];
    },
    enabled: !!user,
  });

  return { sites, isLoading, error, refetch };
};
