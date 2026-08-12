// Hook pour les commentaires du module Collect
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
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
      let q = (supabase as any)
        .from('collect_comments')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (targetKey) {
        q = q.eq('target_key', targetKey);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as CollectComment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async (input: { content: string; targetKey?: string; targetType?: string; parentId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await (supabase as any)
        .from('collect_comments')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          target_type: input.targetType || 'question',
          target_key: input.targetKey || targetKey,
          content: input.content,
          parent_comment_id: input.parentId || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Commentaire ajouté');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await (supabase as any)
        .from('collect_comments')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Commentaire résolu');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await (supabase as any)
        .from('collect_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
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
