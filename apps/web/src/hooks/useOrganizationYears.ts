import { useQuery } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
import { useOrganizationId } from './useOrganizationId';
import { useAuth } from './useAuth';

const CURRENT_YEAR = new Date().getFullYear();

const normalizeYear = (value: unknown): number | null => {
  const year = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > CURRENT_YEAR + 10) return null;
  return year;
};

export const useOrganizationYears = (organizationIdOverride?: string | null) => {
  const { user } = useAuth();
  const { organizationId: fallbackOrganizationId } = useOrganizationId();
  const organizationId = organizationIdOverride ?? fallbackOrganizationId;

  const { data, isLoading } = useQuery({
    queryKey: ['organization-years', organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId) {
        return {
          allowedYears: [] as number[],
          latestBilanYear: null as number | null,
          latestActivityYear: null as number | null,
          referenceYear: null as number | null,
          defaultYear: CURRENT_YEAR,
        };
      }

      const result = await api.listOrgYears();
      const allowedYears = (result.items || [])
        .filter((d) => d.is_included)
        .map((d) => normalizeYear(d.year))
        .filter((year): year is number => year !== null);

      const latestBilanYear = normalizeYear(result.latestBilanYear);
      const latestActivityYear = normalizeYear(result.latestActivityYear);
      const referenceYear = normalizeYear(result.referenceYear);

      return {
        allowedYears,
        latestBilanYear,
        latestActivityYear,
        referenceYear,
        defaultYear: latestBilanYear || latestActivityYear || referenceYear || CURRENT_YEAR,
      };
    },
    enabled: !!organizationId || !!user?.id,
  });

  return {
    allowedYears: data?.allowedYears ?? [],
    latestBilanYear: data?.latestBilanYear ?? null,
    latestActivityYear: data?.latestActivityYear ?? null,
    referenceYear: data?.referenceYear ?? null,
    defaultYear: data?.defaultYear ?? CURRENT_YEAR,
    isLoading,
  };
};
