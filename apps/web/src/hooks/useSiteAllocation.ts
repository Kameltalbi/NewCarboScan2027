// Hook pour gérer la configuration d'allocation des émissions par site/scope

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { toast } from 'sonner';

export type AllocationStrategy = 'real_data' | 'allocation_key' | 'consolidated_only';
export type AllocationKeyType = 'employees' | 'revenue' | 'surface' | 'manual';

export interface ScopeAllocationConfig {
  scope: number;
  strategy: AllocationStrategy;
  allocation_key_type: AllocationKeyType | null;
}

export interface SiteAllocationPercentage {
  site_id: string;
  site_name: string;
  scope: number;
  allocation_percentage: number;
}

export interface SiteWithData {
  id: string;
  name: string;
  employees_count: number | null;
  annual_revenue: number | null;
  surface_m2: number | null;
}

export const useSiteAllocation = (organizationId: string | null | undefined) => {
  const queryClient = useQueryClient();

  // Récupérer la configuration d'allocation par scope
  const { data: scopeConfigs = [], isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['site-allocation-config', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('site_allocation_config')
        .select('scope, strategy, allocation_key_type')
        .eq('organization_id', organizationId)
        .order('scope');
      
      if (error) throw error;
      
      // Compléter avec les valeurs par défaut pour les scopes manquants
      const configMap = new Map((data || []).map(c => [c.scope, c]));
      const result: ScopeAllocationConfig[] = [];
      
      for (const scope of [1, 2, 3]) {
        if (configMap.has(scope)) {
          result.push(configMap.get(scope) as ScopeAllocationConfig);
        } else {
          result.push({ scope, strategy: 'real_data', allocation_key_type: null });
        }
      }
      
      return result;
    },
    enabled: !!organizationId,
  });

  // Récupérer les pourcentages d'allocation par site
  const { data: sitePercentages = [], isLoading: percentagesLoading, refetch: refetchPercentages } = useQuery({
    queryKey: ['site-allocation-percentages', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('site_allocation_percentages')
        .select(`
          site_id,
          scope,
          allocation_percentage,
          collect_sites!inner(name)
        `)
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        site_id: d.site_id,
        site_name: (d.collect_sites as any)?.name || '',
        scope: d.scope,
        allocation_percentage: Number(d.allocation_percentage),
      })) as SiteAllocationPercentage[];
    },
    enabled: !!organizationId,
  });

  // Sauvegarder la configuration d'un scope
  const saveConfig = useMutation({
    mutationFn: async ({ 
      scope, 
      strategy, 
      allocationKeyType 
    }: { 
      scope: number; 
      strategy: AllocationStrategy; 
      allocationKeyType?: AllocationKeyType | null;
    }) => {
      if (!organizationId) throw new Error('Organization ID required');
      
      const { data, error } = await supabase
        .from('site_allocation_config')
        .upsert({
          organization_id: organizationId,
          scope,
          strategy,
          allocation_key_type: allocationKeyType || null,
        }, { onConflict: 'organization_id,scope' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-allocation-config', organizationId] });
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la sauvegarde: ' + error.message);
    },
  });

  // Sauvegarder un pourcentage d'allocation
  const savePercentage = useMutation({
    mutationFn: async ({ 
      siteId, 
      scope, 
      percentage 
    }: { 
      siteId: string; 
      scope: number; 
      percentage: number;
    }) => {
      if (!organizationId) throw new Error('Organization ID required');
      
      const { data, error } = await supabase
        .from('site_allocation_percentages')
        .upsert({
          organization_id: organizationId,
          site_id: siteId,
          scope,
          allocation_percentage: percentage,
        }, { onConflict: 'organization_id,site_id,scope' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-allocation-percentages', organizationId] });
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la sauvegarde: ' + error.message);
    },
  });

  // Sauvegarder plusieurs pourcentages en batch
  const savePercentagesBatch = useMutation({
    mutationFn: async (percentages: { siteId: string; scope: number; percentage: number }[]) => {
      if (!organizationId) throw new Error('Organization ID required');
      
      const records = percentages.map(p => ({
        organization_id: organizationId,
        site_id: p.siteId,
        scope: p.scope,
        allocation_percentage: p.percentage,
      }));
      
      const { error } = await supabase
        .from('site_allocation_percentages')
        .upsert(records, { onConflict: 'organization_id,site_id,scope' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-allocation-percentages', organizationId] });
      toast.success('Pourcentages de répartition enregistrés');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la sauvegarde: ' + error.message);
    },
  });

  // Calculer les pourcentages automatiquement selon la clé de répartition
  const calculateAutoPercentages = (
    sites: SiteWithData[],
    keyType: AllocationKeyType
  ): Map<string, number> => {
    const result = new Map<string, number>();
    
    if (sites.length === 0) return result;
    
    let total = 0;
    const values = new Map<string, number>();
    
    for (const site of sites) {
      let value = 0;
      switch (keyType) {
        case 'employees':
          value = site.employees_count || 0;
          break;
        case 'revenue':
          value = site.annual_revenue || 0;
          break;
        case 'surface':
          value = site.surface_m2 || 0;
          break;
        case 'manual':
          // Pour manuel, on répartit équitablement par défaut
          value = 1;
          break;
      }
      values.set(site.id, value);
      total += value;
    }
    
    // Calculer les pourcentages
    if (total > 0) {
      for (const [siteId, value] of values) {
        result.set(siteId, Math.round((value / total) * 10000) / 100); // 2 décimales
      }
    } else {
      // Si pas de données, répartir équitablement
      const equalShare = Math.round((100 / sites.length) * 100) / 100;
      for (const site of sites) {
        result.set(site.id, equalShare);
      }
    }
    
    return result;
  };

  // Valider que les pourcentages totalisent 100%
  const validatePercentages = (scope: number): { valid: boolean; total: number } => {
    const scopePercentages = sitePercentages.filter(p => p.scope === scope);
    const total = scopePercentages.reduce((sum, p) => sum + p.allocation_percentage, 0);
    return {
      valid: Math.abs(total - 100) < 0.01,
      total: Math.round(total * 100) / 100,
    };
  };

  // Obtenir la config pour un scope spécifique
  const getConfigForScope = (scope: number): ScopeAllocationConfig => {
    return scopeConfigs.find(c => c.scope === scope) || {
      scope,
      strategy: 'real_data',
      allocation_key_type: null,
    };
  };

  // Obtenir les pourcentages pour un scope spécifique
  const getPercentagesForScope = (scope: number): SiteAllocationPercentage[] => {
    return sitePercentages.filter(p => p.scope === scope);
  };

  return {
    scopeConfigs,
    sitePercentages,
    isLoading: configLoading || percentagesLoading,
    saveConfig,
    savePercentage,
    savePercentagesBatch,
    calculateAutoPercentages,
    validatePercentages,
    getConfigForScope,
    getPercentagesForScope,
    refetch: () => {
      refetchConfig();
      refetchPercentages();
    },
  };
};
