import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Json } from "@/integrations/api/types";

export interface CollectSite {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country?: string;
  site_type?: string;
  surface_m2?: number;
  employees_count?: number;
  annual_revenue?: number;
  is_active: boolean;
  is_consolidated: boolean;
  contact_name?: string;
  contact_email?: string;
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

export type CreateSiteInput = Omit<CollectSite, 'id' | 'created_at' | 'updated_at'>;
export type UpdateSiteInput = Partial<CreateSiteInput>;

function asSite(row: Record<string, unknown>): CollectSite {
  return {
    id: String(row.id),
    company_id: String(row.company_id ?? ''),
    name: String(row.name ?? ''),
    code: row.code as string | undefined,
    address: row.address as string | undefined,
    city: row.city as string | undefined,
    country: row.country as string | undefined,
    site_type: row.site_type as string | undefined,
    surface_m2: row.surface_m2 != null ? Number(row.surface_m2) : undefined,
    employees_count: row.employees_count != null ? Number(row.employees_count) : undefined,
    annual_revenue: row.annual_revenue != null ? Number(row.annual_revenue) : undefined,
    is_active: row.is_active !== false,
    is_consolidated: row.is_consolidated !== false,
    contact_name: row.contact_name as string | undefined,
    contact_email: row.contact_email as string | undefined,
    metadata: row.metadata as Json | undefined,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

export const useCollectSites = (companyId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading, error } = useQuery({
    queryKey: ['collect-sites', companyId],
    queryFn: async () => {
      const { items } = await api.listSites(companyId);
      return (items || []).map((row) => asSite(row));
    },
    enabled: !!user,
  });

  const createSite = useMutation({
    mutationFn: async (input: CreateSiteInput) => {
      const { site } = await api.createSite({
        name: input.name,
        code: input.code,
        address: input.address,
        city: input.city,
        country: input.country,
        site_type: input.site_type,
        is_active: input.is_active,
        is_consolidated: input.is_consolidated,
        company_id: input.company_id || null,
        employees_count: input.employees_count,
        surface_m2: input.surface_m2,
        contact_name: input.contact_name,
        contact_email: input.contact_email,
      });
      return asSite((site as Record<string, unknown>) ?? {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collect-sites'] });
      queryClient.invalidateQueries({ queryKey: ['organization-sites'] });
      window.dispatchEvent(new CustomEvent('sitesUpdated'));
      toast.success('Site ajouté avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateSite = useMutation({
    mutationFn: async ({ id, ...input }: UpdateSiteInput & { id: string }) => {
      const { site } = await api.patchSite(id, {
        name: input.name,
        code: input.code,
        address: input.address,
        city: input.city,
        country: input.country,
        site_type: input.site_type,
        is_active: input.is_active,
        is_consolidated: input.is_consolidated,
        company_id: input.company_id,
        employees_count: input.employees_count,
        surface_m2: input.surface_m2,
        contact_name: input.contact_name,
        contact_email: input.contact_email,
      });
      return asSite((site as Record<string, unknown>) ?? {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collect-sites'] });
      queryClient.invalidateQueries({ queryKey: ['organization-sites'] });
      window.dispatchEvent(new CustomEvent('sitesUpdated'));
      toast.success('Site mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => {
      await api.deleteSite(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collect-sites'] });
      queryClient.invalidateQueries({ queryKey: ['organization-sites'] });
      window.dispatchEvent(new CustomEvent('sitesUpdated'));
      toast.success('Site supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    sites,
    isLoading,
    error,
    createSite,
    updateSite,
    deleteSite,
  };
};
