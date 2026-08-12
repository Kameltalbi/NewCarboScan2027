/**
 * Hook pour les flux intermédiaires (Process Flows)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import type { ACVProcessFlow } from '../types';

export const useACVProcessFlows = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['acv-process-flows', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('acv_process_flows')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order')
        .order('created_at');

      if (error) throw error;
      return data as ACVProcessFlow[];
    },
    enabled: !!projectId,
  });

  const addFlow = useMutation({
    mutationFn: async (flow: Partial<ACVProcessFlow> & { project_id: string; flow_name: string }) => {
      const { data, error } = await supabase
        .from('acv_process_flows')
        .insert(flow)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-process-flows', projectId] });
      toast({ title: 'Flux ajouté' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'ajouter le flux", variant: 'destructive' });
    },
  });

  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('acv_process_flows')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-process-flows', projectId] });
      toast({ title: 'Flux supprimé' });
    },
  });

  return {
    flows: query.data ?? [],
    isLoading: query.isLoading,
    addFlow,
    deleteFlow,
  };
};
