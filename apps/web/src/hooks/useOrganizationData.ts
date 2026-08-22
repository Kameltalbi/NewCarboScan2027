import { useAuth } from './useAuth';
import { api } from "@/integrations/api/client";
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
      try {
        const { organization: org } = await api.getOrganization();
        if (!org) return null;
        return {
          id: org.id,
          name: org.name,
          country: org.country,
          sector: org.sector,
          reference_year: org.referenceYear,
          currency: org.currency,
          energy_unit: org.energyUnit,
          mass_unit: org.massUnit,
          distance_unit: org.distanceUnit,
          logo_url: org.logoUrl,
          pilot_name: org.pilotName,
          legal_name: org.legalName,
          annual_revenue: org.annualRevenue ?? null,
          employees: org.employees ?? null,
          total_surface: org.totalSurface ?? null,
          created_at: org.createdAt,
          updated_at: org.updatedAt,
        };
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    organization: organization ?? null,
    organizationId: organization?.id ?? null,
    referenceYear: organization?.reference_year ?? new Date().getFullYear(),
    loading,
    error: error as Error | null
  };
};
