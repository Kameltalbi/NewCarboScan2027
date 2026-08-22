// Hook pour l'historique des versions PCF
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from "@/integrations/api/client";
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
      const { items } = await api.listPcfVersions(studyId!);
      return (items || []) as unknown as PCFVersionSnapshot[];
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
      const { item } = await api.createPcfVersion({ studyId, snapshot, comment });
      return item as unknown as PCFVersionSnapshot;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pcf-versions', vars.studyId] });
      qc.invalidateQueries({ queryKey: ['pcf-study', vars.studyId] });
      toast.success('Version sauvegardée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
