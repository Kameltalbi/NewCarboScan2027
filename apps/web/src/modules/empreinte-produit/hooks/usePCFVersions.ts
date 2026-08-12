// Hook pour l'historique des versions PCF
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { toast } from 'sonner';

export interface PCFVersionSnapshot {
  id: string;
  study_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  comment: string | null;
  created_by: string | null;
  created_at: string;
}

export function usePCFVersions(studyId?: string) {
  return useQuery({
    queryKey: ['pcf-versions', studyId],
    enabled: !!studyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pcf_versions')
        .select('*')
        .eq('study_id', studyId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data as PCFVersionSnapshot[];
    },
  });
}

export function useCreatePCFVersion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studyId,
      snapshot,
      comment,
    }: {
      studyId: string;
      snapshot: Record<string, unknown>;
      comment?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get next version number
      const { data: existing } = await (supabase as any)
        .from('pcf_versions')
        .select('version_number')
        .eq('study_id', studyId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (existing?.[0]?.version_number || 0) + 1;

      const { data, error } = await (supabase as any)
        .from('pcf_versions')
        .insert({
          study_id: studyId,
          version_number: nextVersion,
          snapshot,
          comment: comment || `Calcul v${nextVersion}`,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update study version
      await (supabase as any)
        .from('pcf_studies')
        .update({ version: nextVersion })
        .eq('id', studyId);

      return data as PCFVersionSnapshot;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pcf-versions', vars.studyId] });
      qc.invalidateQueries({ queryKey: ['pcf-study', vars.studyId] });
      toast.success('Version sauvegardée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
