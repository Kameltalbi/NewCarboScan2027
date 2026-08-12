// Hook React pour gérer les recalculs automatiques

import { useState, useEffect, useCallback } from 'react';
import { RecalculationService, RecalculationTask, RecalculationResult } from '@/lib/recalculation/RecalculationService';
import { useToast } from '@/hooks/use-toast';

export interface UseRecalculationOptions {
  organizationId: string;
  autoSubscribe?: boolean;
  onRecalculationComplete?: (result: RecalculationResult) => void;
}

export const useRecalculation = (options: UseRecalculationOptions) => {
  const { organizationId, autoSubscribe = true, onRecalculationComplete } = options;
  const { toast } = useToast();

  const [isRecalculating, setIsRecalculating] = useState(false);
  const [latestTask, setLatestTask] = useState<RecalculationTask | null>(null);
  const [history, setHistory] = useState<RecalculationTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Charger le statut initial
  useEffect(() => {
    const loadInitialStatus = async () => {
      try {
        const latest = await RecalculationService.getLatestRecalculationStatus(organizationId);
        setLatestTask(latest);

        const inProgress = await RecalculationService.isRecalculationInProgress(organizationId);
        setIsRecalculating(inProgress);
      } catch (err: any) {
        console.error('Error loading recalculation status:', err);
        setError(err.message);
      }
    };

    if (organizationId) {
      loadInitialStatus();
    }
  }, [organizationId]);

  // S'abonner aux changements
  useEffect(() => {
    if (!autoSubscribe || !organizationId) {
      return;
    }

    const subscription = RecalculationService.subscribeToRecalculations(
      organizationId,
      (task) => {
        setLatestTask(task);
        setIsRecalculating(task.status === 'pending' || task.status === 'processing');

        // Notifier l'utilisateur
        if (task.status === 'completed') {
          toast({
            title: 'Recalcul terminé',
            description: 'Vos données carbone ont été mises à jour.',
          });

          if (onRecalculationComplete && task.result) {
            onRecalculationComplete(task.result);
          }
        } else if (task.status === 'failed') {
          toast({
            title: 'Erreur de recalcul',
            description: task.error_message || 'Une erreur est survenue.',
            variant: 'destructive',
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [organizationId, autoSubscribe, onRecalculationComplete, toast]);

  // Déclencher un recalcul manuel
  const triggerRecalculation = useCallback(
    async (options?: {
      productId?: string;
      periodStart?: string;
      periodEnd?: string;
    }) => {
      try {
        setIsRecalculating(true);
        setError(null);

        const result = await RecalculationService.triggerManualRecalculation(
          organizationId,
          options
        );

        toast({
          title: 'Recalcul lancé',
          description: 'Vos données sont en cours de recalcul.',
        });

        return result;
      } catch (err: any) {
        console.error('Error triggering recalculation:', err);
        setError(err.message);
        toast({
          title: 'Erreur',
          description: err.message || 'Impossible de lancer le recalcul.',
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsRecalculating(false);
      }
    },
    [organizationId, toast]
  );

  // Charger l'historique
  const loadHistory = useCallback(
    async (limit: number = 20) => {
      try {
        const tasks = await RecalculationService.getRecalculationHistory(
          organizationId,
          limit
        );
        setHistory(tasks);
      } catch (err: any) {
        console.error('Error loading history:', err);
        setError(err.message);
      }
    },
    [organizationId]
  );

  // Calculer le Bilan Carbone
  const calculateBilanCarbone = useCallback(
    async (periodStart?: string, periodEnd?: string) => {
      try {
        setIsRecalculating(true);
        const result = await RecalculationService.calculateBilanCarbone(
          organizationId,
          periodStart,
          periodEnd
        );
        return result;
      } catch (err: any) {
        console.error('Error calculating bilan carbone:', err);
        setError(err.message);
        throw err;
      } finally {
        setIsRecalculating(false);
      }
    },
    [organizationId]
  );

  // Calculer l'empreinte produit
  const calculateProductFootprint = useCallback(
    async (productId: string) => {
      try {
        setIsRecalculating(true);
        const result = await RecalculationService.calculateProductFootprint(
          organizationId,
          productId
        );
        return result;
      } catch (err: any) {
        console.error('Error calculating product footprint:', err);
        setError(err.message);
        throw err;
      } finally {
        setIsRecalculating(false);
      }
    },
    [organizationId]
  );

  // Calculer les métriques du dashboard
  const calculateDashboardMetrics = useCallback(async () => {
    try {
      setIsRecalculating(true);
      const result = await RecalculationService.calculateDashboardMetrics(
        organizationId
      );
      return result;
    } catch (err: any) {
      console.error('Error calculating dashboard metrics:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsRecalculating(false);
    }
  }, [organizationId]);

  // Vérifier si le cache est valide
  const checkCacheValidity = useCallback(
    async (cacheType: 'bilan_carbone' | 'product_footprint') => {
      try {
        return await RecalculationService.isCacheValid(organizationId, cacheType);
      } catch (err: any) {
        console.error('Error checking cache validity:', err);
        return false;
      }
    },
    [organizationId]
  );

  // Invalider le cache
  const invalidateCache = useCallback(
    async (cacheType: 'bilan_carbone' | 'product_footprint') => {
      try {
        await RecalculationService.invalidateCache(organizationId, cacheType);
        toast({
          title: 'Cache invalidé',
          description: 'Les données seront recalculées à la prochaine consultation.',
        });
      } catch (err: any) {
        console.error('Error invalidating cache:', err);
        toast({
          title: 'Erreur',
          description: err.message || 'Impossible d\'invalider le cache.',
          variant: 'destructive',
        });
      }
    },
    [organizationId, toast]
  );

  return {
    isRecalculating,
    latestTask,
    history,
    error,
    triggerRecalculation,
    loadHistory,
    calculateBilanCarbone,
    calculateProductFootprint,
    calculateDashboardMetrics,
    checkCacheValidity,
    invalidateCache,
  };
};
