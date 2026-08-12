import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import type { ACVScenario } from '../types';

export const useACVScenarios = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['acv-scenarios', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('acv_scenarios')
        .select('*')
        .eq('project_id', projectId)
        .order('is_baseline', { ascending: false })
        .order('created_at');

      if (error) throw error;
      return data as ACVScenario[];
    },
    enabled: !!projectId,
  });

  const createScenario = useMutation({
    mutationFn: async (scenario: Partial<ACVScenario> & { project_id: string; name: string }) => {
      const { data, error } = await supabase
        .from('acv_scenarios')
        .insert(scenario)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-scenarios', projectId] });
      toast({ title: 'Scénario créé' });
    },
  });

  const updateScenario = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ACVScenario> & { id: string }) => {
      const { data, error } = await supabase
        .from('acv_scenarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-scenarios', projectId] });
    },
  });

  const deleteScenario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('acv_scenarios')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-scenarios', projectId] });
      toast({ title: 'Scénario supprimé' });
    },
  });

  return {
    scenarios: query.data ?? [],
    isLoading: query.isLoading,
    createScenario,
    updateScenario,
    deleteScenario,
  };
};
