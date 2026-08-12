import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";
import { useAuth } from './useAuth';

interface QuestionnaireProgress {
  id?: string;
  user_id: string;
  questionnaire_type: string;
  current_step: number;
  responses: Record<string, any>;
  plan_type: string;
  created_at?: string;
  updated_at?: string;
}

export const useQuestionnaireProgress = (questionnaireType: string, planType: string) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<QuestionnaireProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger la progression sauvegardée
  const loadProgress = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('questionnaire_type', questionnaireType)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      if (data) {
        const progressData: QuestionnaireProgress = {
          id: data.id,
          user_id: data.user_id,
          questionnaire_type: data.questionnaire_type,
          current_step: (data.responses as any)?.current_step || 0,
          responses: (data.responses as any)?.answers || {},
          plan_type: (data.responses as any)?.plan_type || planType,
          created_at: data.submitted_at,
          updated_at: data.updated_at
        };
        setProgress(progressData);
      }
    } catch (err) {
      console.error('Error loading questionnaire progress:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder la progression
  const saveProgress = async (currentStep: number, responses: Record<string, any>) => {
    if (!user) return false;

    try {
      const progressData = {
        current_step: currentStep,
        answers: responses,
        plan_type: planType,
        last_saved: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('questionnaire_responses')
        .upsert({
          user_id: user.id,
          questionnaire_type: questionnaireType,
          responses: progressData,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setProgress({
        id: data.id,
        user_id: data.user_id,
        questionnaire_type: data.questionnaire_type,
        current_step: currentStep,
        responses: responses,
        plan_type: planType,
        updated_at: data.updated_at
      });

      return true;
    } catch (err) {
      console.error('Error saving questionnaire progress:', err);
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
      return false;
    }
  };

  // Finaliser le questionnaire
  const completeQuestionnaire = async (responses: Record<string, any>) => {
    if (!user) return false;

    try {
      const progressData = {
        answers: responses,
        plan_type: planType,
        completed: true,
        completed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('questionnaire_responses')
        .upsert({
          user_id: user.id,
          questionnaire_type: questionnaireType,
          responses: progressData,
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error completing questionnaire:', err);
      setError(err instanceof Error ? err.message : 'Erreur de finalisation');
      return false;
    }
  };

  // Supprimer la progression
  const clearProgress = async () => {
    if (!user || !progress?.id) return false;

    try {
      const { error } = await supabase
        .from('questionnaire_responses')
        .delete()
        .eq('id', progress.id);

      if (error) throw error;

      setProgress(null);
      return true;
    } catch (err) {
      console.error('Error clearing questionnaire progress:', err);
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
      return false;
    }
  };

  useEffect(() => {
    loadProgress();
  }, [user, questionnaireType]);

  return {
    progress,
    loading,
    error,
    saveProgress,
    completeQuestionnaire,
    clearProgress,
    reloadProgress: loadProgress
  };
};