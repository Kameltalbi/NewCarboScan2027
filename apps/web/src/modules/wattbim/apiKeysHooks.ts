import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppData } from '@/contexts/AppDataContext';

export interface WattBimApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
}

const unavailable = () =>
  Promise.reject(new Error('Les clés API WattBim ne sont pas encore disponibles sur l’API Newcarboscan.'));

export const useApiKeys = () => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'api-keys', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimApiKey[]> => [],
  });
};

export const useCreateApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_name: string) => unavailable() as Promise<{ apiKey: string; prefix: string }>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'api-keys'] }),
  });
};

export const useRevokeApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_id: string) => unavailable(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'api-keys'] }),
  });
};
