import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
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

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `wbk_${hex}`;
}

export const useApiKeys = () => {
  const { organizationId } = useAppData();
  return useQuery({
    queryKey: ['wattbim', 'api-keys', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WattBimApiKey[]> => {
      const { data, error } = await supabase
        .from('wattbim_api_keys')
        .select('id, organization_id, name, key_prefix, last_used_at, is_active, created_at, revoked_at')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WattBimApiKey[];
    },
  });
};

export const useCreateApiKey = () => {
  const qc = useQueryClient();
  const { organizationId } = useAppData();
  return useMutation({
    mutationFn: async (name: string): Promise<{ apiKey: string; prefix: string }> => {
      const apiKey = generateApiKey();
      const key_hash = await sha256Hex(apiKey);
      const key_prefix = apiKey.slice(0, 10);
      const { error } = await supabase.from('wattbim_api_keys').insert({
        organization_id: organizationId,
        name,
        key_prefix,
        key_hash,
      } as any);
      if (error) throw error;
      return { apiKey, prefix: key_prefix };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'api-keys'] }),
  });
};

export const useRevokeApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wattbim_api_keys')
        .update({ is_active: false, revoked_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wattbim', 'api-keys'] }),
  });
};
