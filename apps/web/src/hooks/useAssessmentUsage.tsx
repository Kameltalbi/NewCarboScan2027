import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";
import { logger } from '@/utils/logger';
import { analytics } from '@/lib/analytics';

interface AssessmentUsage {
  assessments_used: number;
  assessments_limit: number;
  assessments_remaining: number;
  can_create_new: boolean;
}

interface UseAssessmentUsageReturn {
  usage: AssessmentUsage | null;
  loading: boolean;
  error: string | null;
  canCreateAssessment: boolean;
  incrementUsage: () => Promise<boolean>;
  refreshUsage: () => Promise<void>;
}

export const useAssessmentUsage = (): UseAssessmentUsageReturn => {
  const [usage, setUsage] = useState<AssessmentUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Utilisateur non connecté');
        setLoading(false);
        return;
      }

      const { data, error } = await (supabase.rpc as any)('get_assessment_usage', {
        _user_id: user.id
      });

      if (error) {
        console.error('Error fetching assessment usage:', error);
        setError(error.message);
        setUsage(null);
      } else if (data && Array.isArray(data) && data.length > 0) {
        setUsage(data[0]);
      } else {
        setUsage({
          assessments_used: 0,
          assessments_limit: 0,
          assessments_remaining: 0,
          can_create_new: false
        });
      }
    } catch (err) {
      console.error('Error in fetchUsage:', err);
      setError('Erreur lors de la récupération des données d\'usage');
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Utilisateur non connecté');
        return false;
      }

      const { data: canCreate, error: checkError } = await (supabase.rpc as any)('can_create_assessment', {
        _user_id: user.id
      });

      if (checkError) {
        console.error('Error checking assessment permission:', checkError);
        setError(checkError.message);
        return false;
      }

      if (!canCreate) {
        setError('Limite d\'évaluations atteinte ou abonnement inactif');
        return false;
      }

      const { error: incrementError } = await (supabase.rpc as any)('increment_assessment_usage', {
        _user_id: user.id
      });

      if (incrementError) {
        console.error('Error incrementing usage:', incrementError);
        setError(incrementError.message);
        return false;
      }

      analytics.createAssessment('carbon');
      await fetchUsage();
      return true;
    } catch (err) {
      console.error('Error in incrementUsage:', err);
      setError('Erreur lors de l\'incrémentation de l\'usage');
      return false;
    }
  };

  const refreshUsage = async () => {
    await fetchUsage();
  };

  useEffect(() => {
    fetchUsage();

    const subscriptionChannel = supabase
      .channel('subscription_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_subscriptions' },
        () => { setTimeout(() => fetchUsage(), 1000); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bilans_carbone' },
        () => { setTimeout(() => fetchUsage(), 1000); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscriptionChannel);
    };
  }, []);

  return {
    usage,
    loading,
    error,
    canCreateAssessment: usage?.can_create_new || false,
    incrementUsage,
    refreshUsage
  };
};
