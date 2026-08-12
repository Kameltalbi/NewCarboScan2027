import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useAppData } from '@/contexts/AppDataContext';

export const useOrgCurrency = (): string => {
  const { organizationId } = useAppData();
  const { data } = useQuery({
    queryKey: ['wattbim', 'org-currency', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('currency')
        .eq('id', organizationId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.currency as string) || 'TND';
    },
  });
  return data || 'TND';
};
