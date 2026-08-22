// Hook pour les commentaires du module Collect
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getStoredUser } from "@/integrations/api/client";
import { toast } from 'sonner';

export interface CollectComment {
  id: string;
  session_id: string;
  user_id: string;
  target_type: string;
  target_key: string | null;
  content: string;
  parent_comment_id: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCollectComments(sessionId: string | undefined, targetKey?: string) {
  const qc = useQueryClient();
  const queryKey = ['collect-comments', sessionId, targetKey];

  const query = useQuery({
    queryKey,
    enabled: !!sessionId,
    queryFn: async () => {
      const { items } = await api.listCollectComments({
        sessionId,
        targetKey,
      });
      return (items || []) as unknown as CollectComment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async (input: { content: string; targetKey?: string; targetType?: string; parentId?: string }) => {
      const user = getStoredUser();
      if (!user) throw new Error('Non authentifié');
      const { item } = await api.createCollectComment({
        sessionId,
        targetType: input.targetType || 'question',
        targetKey: input.targetKey || targetKey,
        content: input.content,
        parentId: input.parentId || null,
      });
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Commentaire ajouté');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveComment = useMutation({
    mutationFn: async (commentId: string) => {
      await api.patchCollectComment(commentId, { isResolved: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Commentaire résolu');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      await api.deleteCollectComment(commentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    comments: query.data || [],
    isLoading: query.isLoading,
    addComment,
    resolveComment,
    deleteComment,
  };
}
