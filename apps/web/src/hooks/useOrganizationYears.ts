import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useOrganizationId } from './useOrganizationId';
import { useAuth } from './useAuth';

const CURRENT_YEAR = new Date().getFullYear();

const normalizeYear = (value: unknown): number | null => {
  const year = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > CURRENT_YEAR + 10) return null;
  return year;
};

const yearFromDate = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const year = new Date(value).getFullYear();
  return normalizeYear(year);
};

export const useOrganizationYears = (organizationIdOverride?: string | null) => {
  const { user } = useAuth();
  const { organizationId: fallbackOrganizationId } = useOrganizationId();
  const organizationId = organizationIdOverride ?? fallbackOrganizationId;

  const { data, isLoading } = useQuery({
    queryKey: ['organization-years', organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId && !user?.id) {
        return {
          allowedYears: [],
          latestBilanYear: null,
          latestActivityYear: null,
          referenceYear: null,
          defaultYear: CURRENT_YEAR,
        };
      }

      const yearsQuery = organizationId
        ? supabase
            .from('organization_years')
            .select('year, is_included')
            .eq('organization_id', organizationId)
            .order('year', { ascending: true })
        : Promise.resolve({ data: [], error: null });

      const orgQuery = organizationId
        ? supabase
            .from('organizations')
            .select('reference_year')
            .eq('id', organizationId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const activityQuery = organizationId
        ? supabase
            .from('activity_data')
            .select('period_start')
            .eq('organization_id', organizationId)
            .order('period_start', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const fetchLatestBilan = async () => {
        if (organizationId) {
          const byOrg = await supabase
            .from('bilans_carbone')
            .select('reference_year, date_bilan, date_creation, created_at')
            .eq('organization_id', organizationId)
            .order('reference_year', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (byOrg.data) return byOrg;
        }

        if (!user?.id) return { data: null, error: null };
        return supabase
          .from('bilans_carbone')
          .select('reference_year, date_bilan, date_creation, created_at')
          .eq('user_id', user.id)
          .order('reference_year', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      };

      const [yearsResult, orgResult, activityResult, bilanResult] = await Promise.all([
        yearsQuery,
        orgQuery,
        activityQuery,
        fetchLatestBilan(),
      ]);

      if (yearsResult.error) {
        console.error('Error fetching organization years:', yearsResult.error);
      }

      const allowedYears = (yearsResult.data || [])
        .map((d: any) => normalizeYear(d.year))
        .filter((year): year is number => year !== null);

      const latestBilanYear =
        normalizeYear(bilanResult.data?.reference_year) ||
        yearFromDate(bilanResult.data?.date_bilan) ||
        yearFromDate(bilanResult.data?.date_creation) ||
        yearFromDate(bilanResult.data?.created_at);

      const latestActivityYear = yearFromDate(activityResult.data?.period_start);
      const referenceYear = normalizeYear((orgResult.data as any)?.reference_year);

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
