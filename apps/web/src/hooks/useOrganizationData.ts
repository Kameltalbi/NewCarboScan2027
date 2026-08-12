// Hook pour récupérer les données complètes de l'organisation
// Inclut reference_year, country, currency, unités par défaut, etc.

import { useAuth } from './useAuth';
import { supabase } from "@/integrations/api/client";
import { useQuery } from '@tanstack/react-query';

export interface OrganizationData {
  id: string;
  name: string;
  country: string | null;
  sector: string | null;
  reference_year: number | null;
  currency: string | null;
  energy_unit: string | null;
  mass_unit: string | null;
  distance_unit: string | null;
  logo_url: string | null;
  pilot_name: string | null;
  legal_name: string | null;
  annual_revenue: number | null;
  employees: number | null;
  total_surface: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export const useOrganizationData = () => {
  const { user } = useAuth();

  const { data: organization, isLoading: loading, error } = useQuery({
    queryKey: ['organization-data', user?.id],
    queryFn: async (): Promise<OrganizationData | null> => {
      if (!user?.id) return null;

      // 1. D'abord chercher si l'utilisateur est propriétaire d'une organisation
      const { data: ownedOrg, error: ownedOrgError } = await supabase
        .from('organizations')
        .select('id, name, country, sector, reference_year, currency, energy_unit, mass_unit, distance_unit, logo_url, pilot_name, legal_name, annual_revenue, employees, total_surface')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ownedOrgError) {
        throw ownedOrgError;
      }

      if (ownedOrg) {
        return ownedOrg as OrganizationData;
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

      if (orgMember?.organization_id) {
        const { data: org, error: fetchError } = await supabase
          .from('organizations')
          .select('id, name, country, sector, reference_year, currency, energy_unit, mass_unit, distance_unit, logo_url, pilot_name, legal_name, annual_revenue, employees, total_surface')
          .eq('id', orgMember.organization_id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        return org as OrganizationData;
      }

      return null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache pendant 5 minutes
    gcTime: 10 * 60 * 1000, // Garder en cache 10 minutes
  });

  return { 
    organization: organization ?? null,
    organizationId: organization?.id ?? null,
    referenceYear: organization?.reference_year ?? new Date().getFullYear(),
    loading, 
    error: error as Error | null 
  };
};
