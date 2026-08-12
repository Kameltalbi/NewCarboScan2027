import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/api/client";
import { toast } from 'sonner';

export interface Estimation {
  id: string;
  question_key: string;
  question_category: string;
  estimated_value: number;
  estimated_unit: string | null;
  confidence_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  estimation_method: string;
  trend_direction: string | null;
  reasoning: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  user_value: number | null;
}

export function useEstimations(sessionId: string, companyId?: string) {
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadEstimations = useCallback(async (status?: string) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_session_estimations', {
        p_session_id: sessionId,
        p_status: status || null,
      });

      if (error) throw error;
      setEstimations((data as Estimation[]) || []);
    } catch (err) {
      console.error('Error loading estimations:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const generateEstimations = async (questionKeys?: string[]): Promise<boolean> => {
    if (!sessionId || !companyId) {
      toast.error('Session ou entreprise non définie');
      return false;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-estimations', {
        body: {
          session_id: sessionId,
          company_id: companyId,
          question_keys: questionKeys,
          current_month: new Date().getMonth() + 1,
        },
      });

      if (error) throw error;

      if (data.estimations_created > 0) {
        toast.success('Estimations générées', {
          description: `${data.estimations_created} estimations créées avec l'IA`,
        });
        await loadEstimations();
      } else {
        toast.info('Aucune estimation possible', {
          description: 'Pas assez de données historiques disponibles',
        });
      }

      return true;
    } catch (err) {
      console.error('Error generating estimations:', err);
      toast.error('Erreur lors de la génération des estimations');
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const acceptEstimation = async (
    estimationId: string,
    userValue?: number,
    userUnit?: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('accept_estimation', {
        p_estimation_id: estimationId,
        p_user_value: userValue ?? null,
        p_user_unit: userUnit ?? null,
      });

      if (error) throw error;

      if (data) {
        toast.success(userValue ? 'Estimation modifiée et acceptée' : 'Estimation acceptée');
        await loadEstimations();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error accepting estimation:', err);
      toast.error('Erreur lors de l\'acceptation');
      return false;
    }
  };

  const rejectEstimation = async (estimationId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('reject_estimation', {
        p_estimation_id: estimationId,
      });

      if (error) throw error;

      if (data) {
        toast.success('Estimation rejetée');
        await loadEstimations();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error rejecting estimation:', err);
      toast.error('Erreur lors du rejet');
      return false;
    }
  };

  const acceptAllPending = async (): Promise<number> => {
    const pending = estimations.filter((e) => e.status === 'pending');
    let accepted = 0;

    for (const est of pending) {
      const success = await acceptEstimation(est.id);
      if (success) accepted++;
    }

    return accepted;
  };

  useEffect(() => {
    loadEstimations();
  }, [loadEstimations]);

  return {
    estimations,
    loading,
    generating,
    generateEstimations,
    acceptEstimation,
    rejectEstimation,
    acceptAllPending,
    loadEstimations,
    pendingCount: estimations.filter((e) => e.status === 'pending').length,
    acceptedCount: estimations.filter((e) => e.status === 'accepted' || e.status === 'modified').length,
  };
}
