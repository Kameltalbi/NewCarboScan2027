import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/api/client";
import { toast } from 'sonner';

export type Periodicity = 'monthly' | 'quarterly' | 'yearly';

interface PeriodicSession {
  session_id: string;
  parent_session_id: string | null;
  session_name: string;
  periodicity: Periodicity;
  next_due_date: string | null;
  days_until_due: number;
  status: string;
}

interface PeriodicHistory {
  id: string;
  parent_session_id: string;
  session_id: string;
  period_start_date: string;
  period_end_date: string;
  status: string;
  completed_at: string | null;
}

export function usePeriodicSessions(sessionId?: string) {
  const [upcomingSessions, setUpcomingSessions] = useState<PeriodicSession[]>([]);
  const [overdueSessions, setOverdueSessions] = useState<PeriodicSession[]>([]);
  const [periodicHistory, setPeriodicHistory] = useState<PeriodicHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUpcomingSessions = useCallback(async (daysAhead = 30) => {
    try {
      const { data, error } = await supabase.rpc('get_upcoming_periodic_sessions', {
        p_days_ahead: daysAhead,
      });

      if (error) throw error;
      setUpcomingSessions((data as PeriodicSession[]) || []);
    } catch (err) {
      console.error('Error loading upcoming sessions:', err);
    }
  }, []);

  const loadOverdueSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_overdue_periodic_sessions');

      if (error) throw error;
      // Map the data to match PeriodicSession interface
      const mapped = (data || []).map((s: any) => ({
        ...s,
        periodicity: 'monthly' as Periodicity,
        days_until_due: s.days_overdue ? -s.days_overdue : 0,
        status: 'overdue',
      }));
      setOverdueSessions(mapped);
    } catch (err) {
      console.error('Error loading overdue sessions:', err);
    }
  }, []);

  const loadPeriodicHistory = useCallback(async (parentSessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('collect_periodic_history')
        .select('*')
        .eq('parent_session_id', parentSessionId)
        .order('period_start_date', { ascending: false });

      if (error) throw error;
      setPeriodicHistory(data || []);
    } catch (err) {
      console.error('Error loading periodic history:', err);
    }
  }, []);

  const enablePeriodicCollection = async (
    sessionId: string,
    periodicity: Periodicity
  ): Promise<boolean> => {
    setLoading(true);
    try {
      // Appeler l'edge function pour créer les sessions périodiques
      const { data, error } = await supabase.functions.invoke('create-periodic-sessions', {
        body: { session_id: sessionId, periodicity },
      });

      if (error) throw error;

      toast.success(`Collecte ${getPeriodLabel(periodicity)} activée`, {
        description: `${data.sessions_created} sessions créées`,
      });

      await loadUpcomingSessions();
      return true;
    } catch (err) {
      console.error('Error enabling periodic collection:', err);
      toast.error('Erreur lors de l\'activation de la collecte périodique');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disablePeriodicCollection = async (sessionId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('collect_sessions')
        .update({
          is_periodic: false,
          periodicity: null,
          next_due_date: null,
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Collecte périodique désactivée');
      await loadUpcomingSessions();
      return true;
    } catch (err) {
      console.error('Error disabling periodic collection:', err);
      toast.error('Erreur lors de la désactivation');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const completePeriodicSession = async (
    sessionId: string,
    parentSessionId: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      // Mettre à jour le statut de la session
      const { error: sessionError } = await supabase
        .from('collect_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // Mettre à jour l'historique
      const { error: historyError } = await supabase
        .from('collect_periodic_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId);

      if (historyError) throw historyError;

      // Calculer la prochaine date d'échéance
      const { data: parentSession } = await supabase
        .from('collect_sessions')
        .select('periodicity, next_due_date')
        .eq('id', parentSessionId)
        .single();

      if (parentSession?.periodicity && parentSession?.next_due_date) {
        const nextDue = calculateNextDueDate(
          new Date(parentSession.next_due_date),
          parentSession.periodicity as Periodicity
        );

        await supabase
          .from('collect_sessions')
          .update({ next_due_date: nextDue.toISOString() })
          .eq('id', parentSessionId);
      }

      toast.success('Session périodique complétée');
      await Promise.all([loadUpcomingSessions(), loadOverdueSessions()]);
      return true;
    } catch (err) {
      console.error('Error completing periodic session:', err);
      toast.error('Erreur lors de la complétion');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpcomingSessions();
    loadOverdueSessions();
  }, [loadUpcomingSessions, loadOverdueSessions]);

  useEffect(() => {
    if (sessionId) {
      loadPeriodicHistory(sessionId);
    }
  }, [sessionId, loadPeriodicHistory]);

  return {
    upcomingSessions,
    overdueSessions,
    periodicHistory,
    loading,
    enablePeriodicCollection,
    disablePeriodicCollection,
    completePeriodicSession,
    loadUpcomingSessions,
    loadOverdueSessions,
    loadPeriodicHistory,
  };
}

// Helpers
function getPeriodLabel(periodicity: Periodicity): string {
  switch (periodicity) {
    case 'monthly':
      return 'mensuelle';
    case 'quarterly':
      return 'trimestrielle';
    case 'yearly':
      return 'annuelle';
  }
}

function calculateNextDueDate(currentDue: Date, periodicity: Periodicity): Date {
  const next = new Date(currentDue);
  switch (periodicity) {
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export { getPeriodLabel, calculateNextDueDate };
