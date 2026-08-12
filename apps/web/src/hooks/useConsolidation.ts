// Hook pour la consolidation multi-sites
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { toast } from 'sonner';

interface ConsolidatedData {
  question_key: string;
  question_category: string;
  scope: number | null;
  total_value: number;
  unit: string | null;
  site_count: number;
  sources: Record<string, number> | null;
}

interface Site {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  country: string | null;
  site_type: string | null;
  employees_count: number | null;
  surface_m2: number | null;
  is_active: boolean;
  is_consolidated: boolean;
}

interface SiteResponse {
  id: string;
  site_id: string | null;
  question_key: string;
  question_category: string;
  value: any;
  unit: string | null;
  is_validated: boolean;
  source: string | null;
}

export const useConsolidation = (sessionId: string, companyId: string) => {
  // Récupérer les sites de l'entreprise
  const { data: sites = [], isLoading: sitesLoading, refetch: refetchSites } = useQuery({
    queryKey: ['collect-sites', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('collect_sites')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as Site[];
    },
    enabled: !!companyId,
  });

  // Récupérer les réponses de la session
  const { data: siteResponses = [], isLoading: responsesLoading, refetch: refetchResponses } = useQuery({
    queryKey: ['collect-responses-with-site', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('collect_responses')
        .select('id, site_id, question_key, question_category, value, unit, is_validated, source')
        .eq('session_id', sessionId)
        .not('value', 'is', null);

      if (error) throw error;
      return data as SiteResponse[];
    },
    enabled: !!sessionId,
  });

  // Récupérer les données consolidées via RPC
  const { data: consolidatedData = [], isLoading: consolidatedLoading, refetch: refetchConsolidated } = useQuery({
    queryKey: ['consolidated-data', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .rpc('get_collect_session_consolidation', { p_session_id: sessionId });

      if (error) {
        console.error('Error fetching consolidated data:', error);
        return [];
      }
      
      return (data || []) as ConsolidatedData[];
    },
    enabled: !!sessionId,
  });

  // Calculer les données consolidées localement si la RPC ne retourne rien
  const localConsolidatedData = useMemo(() => {
    if (consolidatedData.length > 0) return consolidatedData;
    
    // Filtrer les réponses des sites consolidés
    const consolidatedSiteIds = sites
      .filter(s => s.is_consolidated && s.is_active)
      .map(s => s.id);

    if (consolidatedSiteIds.length === 0) return [];

    const validatedResponses = siteResponses.filter(
      r => r.is_validated && r.site_id && consolidatedSiteIds.includes(r.site_id)
    );

    // Grouper par question_key
    const grouped = validatedResponses.reduce((acc, response) => {
      const key = response.question_key;
      if (!acc[key]) {
        acc[key] = {
          question_key: key,
          question_category: response.question_category,
          scope: null,
          total_value: 0,
          unit: response.unit,
          site_count: 0,
          sources: {} as Record<string, number>,
          siteIds: new Set<string>(),
        };
      }
      
      // Ajouter la valeur
      const numValue = typeof response.value === 'number' 
        ? response.value 
        : parseFloat(String(response.value)) || 0;
      acc[key].total_value += numValue;
      
      // Compter les sites
      if (response.site_id) {
        acc[key].siteIds.add(response.site_id);
      }
      
      // Compter les sources
      const source = response.source || 'manual';
      acc[key].sources[source] = (acc[key].sources[source] || 0) + 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Convertir en tableau
    return Object.values(grouped).map((item: any) => ({
      question_key: item.question_key,
      question_category: item.question_category,
      scope: item.scope,
      total_value: item.total_value,
      unit: item.unit,
      site_count: item.siteIds.size,
      sources: item.sources,
    })) as ConsolidatedData[];
  }, [consolidatedData, sites, siteResponses]);

  // Exporter en Excel
  const exportToExcel = useCallback(async () => {
    try {
      // Créer un CSV simple
      const headers = ['Indicateur', 'Catégorie', 'Scope', 'Valeur Totale', 'Unité', 'Nombre de Sites'];
      const rows = localConsolidatedData.map(item => [
        item.question_key,
        item.question_category,
        item.scope || '',
        item.total_value,
        item.unit || '',
        item.site_count,
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `consolidation_${sessionId}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Export Excel téléchargé');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  }, [localConsolidatedData, sessionId]);

  // Exporter en PDF
  const exportToPDF = useCallback(async () => {
    try {
      // Afficher un message - l'export PDF complet nécessite une bibliothèque
      toast.info('Export PDF en cours de développement');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  }, []);

  // Refetch all data
  const refetch = useCallback(() => {
    refetchSites();
    refetchResponses();
    refetchConsolidated();
  }, [refetchSites, refetchResponses, refetchConsolidated]);

  const isLoading = sitesLoading || responsesLoading || consolidatedLoading;

  return {
    consolidatedData: localConsolidatedData,
    sites,
    siteResponses,
    isLoading,
    refetch,
    exportToExcel,
    exportToPDF,
  };
};
