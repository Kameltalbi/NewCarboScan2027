import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
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

export const useCollectSites = (companyId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading, error } = useQuery({
    queryKey: ['collect-sites', companyId],
    queryFn: async () => {
      let query = supabase
        .from('collect_sites')
        .select('*')
        .order('name', { ascending: true });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CollectSite[];
    },
    enabled: !!user,
  });

  const createSite = useMutation({
    mutationFn: async (input: CreateSiteInput) => {
      const { data, error } = await supabase
        .from('collect_sites')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data as CollectSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collect-sites'] });
      // Important: la saisie rapide utilise un autre hook (useOrganizationSites)
      // avec un autre queryKey -> on invalide aussi ce cache pour rafraîchir la liste des sites.
      queryClient.invalidateQueries({ queryKey: ['organization-sites'] });
      // Notifier les écrans actuellement montés (ex: /app/collecte/nouvelle)
      window.dispatchEvent(new CustomEvent('sitesUpdated'));
      toast.success('Site ajouté avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateSite = useMutation({
    mutationFn: async ({ id, ...input }: UpdateSiteInput & { id: string }) => {
      const updateData = { ...input } as Record<string, unknown>;
      delete updateData.metadata; // Remove metadata to avoid type issues
      
      const { data, error } = await supabase
        .from('collect_sites')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CollectSite;
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
      const { error } = await supabase
        .from('collect_sites')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
