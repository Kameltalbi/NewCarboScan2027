/**
 * Hook pour les co-produits (Multi-product allocation)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import type { ACVCoProduct } from '../types';

export const useACVCoProducts = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['acv-co-products', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('acv_co_products')
        .select('*')
        .eq('project_id', projectId)
        .order('is_main_product', { ascending: false })
        .order('created_at');

      if (error) throw error;
      return data as ACVCoProduct[];
    },
    enabled: !!projectId,
  });

  const addCoProduct = useMutation({
    mutationFn: async (product: Partial<ACVCoProduct> & { project_id: string; product_name: string }) => {
      const { data, error } = await supabase
        .from('acv_co_products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-co-products', projectId] });
      toast({ title: 'Co-produit ajouté' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'ajouter le co-produit", variant: 'destructive' });
    },
  });

  const updateCoProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ACVCoProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from('acv_co_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-co-products', projectId] });
    },
  });

  const deleteCoProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('acv_co_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-co-products', projectId] });
      toast({ title: 'Co-produit supprimé' });
    },
  });

  return {
    coProducts: query.data ?? [],
    isLoading: query.isLoading,
    addCoProduct,
    updateCoProduct,
    deleteCoProduct,
  };
};
