import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import type { ACVProductComponent } from '../types';

export const useACVComponents = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['acv-components', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('acv_product_components')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order')
        .order('created_at');

      if (error) throw error;
      return data as ACVProductComponent[];
    },
    enabled: !!projectId,
  });

  const addComponent = useMutation({
    mutationFn: async (component: Partial<ACVProductComponent> & { project_id: string; component_name: string }) => {
      const { data, error } = await supabase
        .from('acv_product_components')
        .insert(component)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-components', projectId] });
      toast({ title: 'Composant ajouté' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'ajouter le composant", variant: 'destructive' });
    },
  });

  const updateComponent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ACVProductComponent> & { id: string }) => {
      const { data, error } = await supabase
        .from('acv_product_components')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-components', projectId] });
    },
  });

  const deleteComponent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('acv_product_components')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-components', projectId] });
      toast({ title: 'Composant supprimé' });
    },
  });

  return {
    components: query.data ?? [],
    isLoading: query.isLoading,
    addComponent,
    updateComponent,
    deleteComponent,
  };
};
