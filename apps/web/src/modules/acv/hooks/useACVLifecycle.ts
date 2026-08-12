import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import { LIFECYCLE_MODULES } from '../types';
import type { ACVLifecycleModule } from '../types';

export const useACVLifecycle = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['acv-lifecycle', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('acv_lifecycle_modules')
        .select('*')
        .eq('project_id', projectId)
        .order('module_code');

      if (error) throw error;
      return data as ACVLifecycleModule[];
    },
    enabled: !!projectId,
  });

  const initializeModules = useMutation({
    mutationFn: async (projectId: string) => {
      const modules = LIFECYCLE_MODULES.map(m => ({
        project_id: projectId,
        module_code: m.code,
        module_name: m.name,
        module_group: m.group,
        is_included: m.priority, // A1-A3 inclus par défaut
      }));

      const { data, error } = await supabase
        .from('acv_lifecycle_modules')
        .upsert(modules, { onConflict: 'project_id,module_code' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-lifecycle', projectId] });
    },
  });

  const updateModule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ACVLifecycleModule> & { id: string }) => {
      const { data, error } = await supabase
        .from('acv_lifecycle_modules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acv-lifecycle', projectId] });
    },
  });

  return {
    modules: query.data ?? [],
    isLoading: query.isLoading,
    initializeModules,
    updateModule,
  };
};
