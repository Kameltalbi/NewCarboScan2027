// Hook de cache pour les données du dashboard
// Sépare clairement lecture des résultats stockés vs calcul

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardAggregator, DashboardAggregatedData } from '@/lib/calculators/DashboardAggregator';
import { invalidateEmissionFactorCache } from '@/lib/calculators/BilanCarboneCalculator';
import { logger } from '@/utils/logger';

interface UseDashboardCacheOptions {
  organizationId: string | null;
  year: number;
  siteId?: string | null; // null = vue consolidée (tous les sites)
  enabled?: boolean;
}

// Bump this when calculation logic / key inputs change (forces refetch even if staleTime hasn't expired)
const DASHBOARD_CACHE_VERSION = 'v2';

/** Clé de base pour invalider tout le cache dashboard (à utiliser après toute modification données ou FE) */
export const DASHBOARD_CACHE_QUERY_KEY = ['dashboard-data'] as const;

// Clé de cache basée sur org + année + site
const getDashboardCacheKey = (organizationId: string, year: number, siteId?: string | null) => 
  [...DASHBOARD_CACHE_QUERY_KEY, DASHBOARD_CACHE_VERSION, organizationId, year, siteId ?? 'all'] as const;

// Temps de cache : 10 minutes (données ne changent pas souvent)
const CACHE_STALE_TIME = 10 * 60 * 1000;
const CACHE_GC_TIME = 30 * 60 * 1000;

export const useDashboardCache = ({ 
  organizationId, 
  year, 
  siteId = null,
  enabled = true 
}: UseDashboardCacheOptions) => {
  const queryClient = useQueryClient();

  const periodStart = `${year}-01-01`;
  const periodEnd = `${year}-12-31`;

  // Écouter les événements de mise à jour des FE : invalider le cache ET forcer un refetch immédiat
  useEffect(() => {
    const handleEmissionFactorsUpdated = () => {
      if (!organizationId) return;
      
      logger.info('🔄 Dashboard: Facteurs d\'émission modifiés, recalcul en cours');
      invalidateEmissionFactorCache();
      queryClient.invalidateQueries({ 
        queryKey: [DASHBOARD_CACHE_QUERY_KEY[0], DASHBOARD_CACHE_VERSION, organizationId] 
      });
      // Forcer un refetch immédiat pour que le dashboard affiche les nouveaux totaux sans changer de page
      queryClient.refetchQueries({ 
        queryKey: [DASHBOARD_CACHE_QUERY_KEY[0], DASHBOARD_CACHE_VERSION, organizationId] 
      });
    };

    window.addEventListener('emissionFactorsUpdated', handleEmissionFactorsUpdated);
    return () => {
      window.removeEventListener('emissionFactorsUpdated', handleEmissionFactorsUpdated);
    };
  }, [organizationId, queryClient]);

  // Query principale avec cache long
  const { 
    data, 
    isLoading, 
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery<DashboardAggregatedData | null>({
    queryKey: getDashboardCacheKey(organizationId!, year, siteId),
    queryFn: async () => {
      if (!organizationId) return null;
      
      logger.debug(`📊 Dashboard Cache: Fetching data for ${year}${siteId ? ` (site: ${siteId})` : ' (all sites)'}`);
      const startTime = performance.now();
      
      const result = await DashboardAggregator.aggregate(
        organizationId,
        periodStart,
        periodEnd,
        { siteId }
      );
      
      const duration = Math.round(performance.now() - startTime);
      logger.info(`✅ Dashboard: Données chargées en ${duration}ms`);
      
      return result;
    },
    enabled: enabled && !!organizationId,
    staleTime: CACHE_STALE_TIME,
    gcTime: CACHE_GC_TIME,
    // Rafraîchir automatiquement quand l'utilisateur revient sur l'onglet Dashboard
    refetchOnWindowFocus: true,
    // Au montage, si le cache a été invalidé (après saisie/suppression/modif), on refetch
    refetchOnMount: true,
  });

  // Fonction pour forcer le recalcul (action explicite utilisateur)
  const forceRecalculate = async () => {
    if (!organizationId) return;
    
    logger.info('🔄 Dashboard: Recalcul forcé par l\'utilisateur');
    await queryClient.invalidateQueries({ 
      queryKey: getDashboardCacheKey(organizationId, year, siteId) 
    });
    return refetch();
  };

  // Précharger les données d'une autre année
  const prefetchYear = async (targetYear: number) => {
    if (!organizationId) return;
    
    const targetKey = getDashboardCacheKey(organizationId, targetYear);
    const cached = queryClient.getQueryData(targetKey);
    
    if (cached) {
      logger.debug(`📦 Dashboard: Année ${targetYear} déjà en cache`);
      return;
    }
    
    logger.debug(`⏳ Dashboard: Préchargement année ${targetYear}`);
    await queryClient.prefetchQuery({
      queryKey: targetKey,
      queryFn: () => DashboardAggregator.aggregate(
        organizationId,
        `${targetYear}-01-01`,
        `${targetYear}-12-31`
      ),
      staleTime: CACHE_STALE_TIME,
    });
  };

  return {
    data,
    // Loading initial (pas de données en cache)
    isLoading,
    // Fetching en background (données en cache mais refresh)
    isFetching,
    // Données disponibles immédiatement depuis le cache
    isCached: !isLoading && !!data,
    error,
    // Actions
    forceRecalculate,
    prefetchYear,
    // Cache info
    lastUpdated: data ? new Date(dataUpdatedAt) : null,
  };
};

// Hook pour invalider le cache quand les données changent
export const useInvalidateDashboardCache = () => {
  const queryClient = useQueryClient();
  
  const invalidateForOrg = (organizationId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: ['dashboard-data', DASHBOARD_CACHE_VERSION, organizationId] 
    });
  };
  
  const invalidateAll = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['dashboard-data', DASHBOARD_CACHE_VERSION] 
    });
  };
  
  return { invalidateForOrg, invalidateAll };
};
