// Executive Carbon Management Dashboard
// Professional cockpit for decision-makers and consultants
// Uses centralized AppDataContext for optimized data fetching

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { DashboardAggregator, DashboardAggregatedData } from '@/lib/calculators/DashboardAggregator';
import { supabase } from "@/integrations/api/client";
import { Loader2 } from 'lucide-react';

import { AiInsightCard } from './AiInsightCard';
import {
  ExecutiveSummary,
  EmissionsCharts,
  ModuleStatusTable,
  AlertsSection,
  QuickActions,
  ProductFocusSection,
  getDefaultModules,
  generateAlerts,
  type ModuleInfo,
  type ModuleStatus,
  type PCFStudySummary,
} from './executive';


// Determine global status based on data quality and completeness
const determineGlobalStatus = (
  hasData: boolean,
  dataQuality: { real: number; estimated: number; default: number }
): 'incomplete' | 'calculated' | 'in_progress' | 'follow_up' => {
  if (!hasData) return 'incomplete';
  if (dataQuality.default > 30) return 'incomplete';
  if (dataQuality.estimated > 50) return 'in_progress';
  if (dataQuality.real > 70) return 'calculated';
  return 'in_progress';
};

// Determine module status based on data availability
const determineModuleStatus = (
  moduleSlug: string,
  data: DashboardAggregatedData | null,
  hasBilansData: boolean
): ModuleStatus => {
  if (!data) return 'not_started';
  
  switch (moduleSlug) {
    case 'collecte':
    case 'collect':
      if (data.dataQuality.real > 50) return 'completed';
      if (data.dataQuality.real > 0 || data.dataQuality.estimated > 0) return 'in_progress';
      return 'not_started';
    
    case 'bilan-carbone':
      if (data.bilanCarbone.totalEmissions > 0 || hasBilansData) return 'completed';
      if (data.coverage.modulesWithData.includes('bilan-carbone')) return 'in_progress';
      return 'not_started';
    
    case 'empreinte-produit':
      if (data.products.length > 0) return 'completed';
      return 'not_started';
    
    case 'acv':
      if (data.coverage.modulesWithData.includes('acv')) return 'completed';
      return 'not_started';
    
    case 'net-zero':
    case 'trajectoire':
      return 'not_started';
    
    default:
      return 'not_started';
  }
};

interface UnifiedDashboardProps {
  selectedYear?: number;
}

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ selectedYear: selectedYearProp }) => {
  const { user } = useAuth();
  const { organizationId, organizationLoading, hasModule, modulesLoading } = useAppData();
  const { referenceYear } = useOrganizationData();
  
  const activeYear = selectedYearProp ?? referenceYear;
  
  const [data, setData] = useState<DashboardAggregatedData | null>(null);
  const [prevYearData, setPrevYearData] = useState<DashboardAggregatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasBilansData, setHasBilansData] = useState(false);
  const [hasTrajectory, setHasTrajectory] = useState(false);
  const [pcfStudies, setPcfStudies] = useState<PCFStudySummary[]>([]);

  // Module access checks (called unconditionally)
  const hasBilanCarbone = hasModule('bilan-carbone');
  const hasEmpreinteProduit = hasModule('empreinte-produit');
  const hasNetZero = hasModule('net-zero') || hasModule('trajectoire');

  // Check for Bilan Carbone, trajectory data, and PCF studies
  useEffect(() => {
    const checkData = async () => {
      if (!user?.id || !organizationId) return;

      try {
        // Parallel fetches
        const [activityRes, trajectoryRes, pcfRes] = await Promise.all([
          supabase
            .from('activity_data')
            .select('id')
            .eq('organization_id', organizationId)
            .limit(1),
          supabase
            .from('net_zero_trajectories')
            .select('id')
            .eq('organization_id', organizationId)
            .limit(1),
          hasEmpreinteProduit
            ? supabase
                .from('pcf_studies')
                .select('id, name, status, total_emissions, functional_unit, updated_at')
                .eq('organization_id', organizationId)
                .order('updated_at', { ascending: false })
            : Promise.resolve({ data: null }),
        ]);
        
        setHasBilansData((activityRes.data?.length || 0) > 0);
        setHasTrajectory((trajectoryRes.data?.length || 0) > 0);
        setPcfStudies((pcfRes.data as PCFStudySummary[]) || []);
      } catch (err) {
        console.error('Error checking dashboard data:', err);
      }
    };

    checkData();
  }, [user?.id, organizationId, hasEmpreinteProduit]);

  // Load dashboard data for selected year + previous year for evolution
  useEffect(() => {
    const loadData = async () => {
      if (!user || !organizationId || organizationLoading) return;

      try {
        setLoading(true);
        setError(null);

        const periodStart = `${activeYear}-01-01`;
        const periodEnd = `${activeYear}-12-31`;

        const aggregated = await DashboardAggregator.aggregate(
          organizationId,
          periodStart,
          periodEnd
        );
        setData(aggregated);

        // Load previous year data for evolution comparison
        const prevYear = activeYear - 1;
        const prevStart = `${prevYear}-01-01`;
        const prevEnd = `${prevYear}-12-31`;
        try {
          const prevAggregated = await DashboardAggregator.aggregate(
            organizationId,
            prevStart,
            prevEnd
          );
          setPrevYearData(prevAggregated);
        } catch {
          setPrevYearData(null);
        }
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, organizationId, organizationLoading, activeYear]);

  // PCF computed values
  const pcfStats = useMemo(() => {
    const calculated = pcfStudies.filter(s => s.status === 'calculated' || s.status === 'locked');
    const avgFootprint = calculated.length > 0
      ? calculated.reduce((sum, s) => sum + (s.total_emissions || 0), 0) / calculated.length
      : undefined;
    return {
      total: pcfStudies.length,
      calculated: calculated.length,
      averageFootprint: avgFootprint,
    };
  }, [pcfStudies]);

  // Computed values
  const hasData = useMemo(() => {
    if (!data) return false;
    return data.bilanCarbone.totalEmissions > 0 || data.products.length > 0 || hasBilansData || pcfStudies.length > 0;
  }, [data, hasBilansData, pcfStudies]);

  const hasIncompleteData = useMemo(() => {
    if (!data) return true;
    return data.dataQuality.estimated > 50 || data.dataQuality.default > 20;
  }, [data]);

  const globalStatus = useMemo(() => {
    if (!data) {
      // PCF-only: derive status from studies
      if (!hasBilanCarbone && hasEmpreinteProduit) {
        if (pcfStats.calculated > 0) return 'calculated' as const;
        if (pcfStudies.length > 0) return 'in_progress' as const;
        return 'incomplete' as const;
      }
      return 'incomplete' as const;
    }
    return determineGlobalStatus(hasData, data.dataQuality);
  }, [data, hasData, hasBilanCarbone, hasEmpreinteProduit, pcfStats, pcfStudies]);

  // Prepare module status data
  const moduleStatusData: ModuleInfo[] = useMemo(() => {
    const defaultModules = getDefaultModules(hasModule);
    
    return defaultModules.map(module => {
      let status: ModuleStatus;
      if (module.slug === 'net-zero' || module.slug === 'trajectoire') {
        status = hasTrajectory ? 'completed' : 'not_started';
      } else if (module.slug === 'empreinte-produit') {
        // Use PCF studies data for status
        if (pcfStats.calculated > 0) status = 'completed';
        else if (pcfStudies.length > 0) status = 'in_progress';
        else status = 'not_started';
      } else {
        status = determineModuleStatus(module.slug, data, hasBilansData);
      }

      return {
        ...module,
        status,
        lastUpdate: data ? new Date() : undefined,
      };
    });
  }, [data, hasBilansData, hasTrajectory, hasModule, pcfStudies, pcfStats]);

  // Prepare alerts
  const alerts = useMemo(() => {
    if (!data && !hasEmpreinteProduit) return [];
    
    const baseAlerts = data
      ? generateAlerts(
          data.dataQuality,
          hasData,
          hasIncompleteData,
          data.bilanCarbone.breakdown.map(b => ({ category: b.category, percentage: b.percentage })),
          hasBilanCarbone,
          hasNetZero
        )
      : [];

    // Add PCF-specific alerts
    if (hasEmpreinteProduit && pcfStudies.length > 0) {
      const draftStudies = pcfStudies.filter(s => s.status === 'draft');
      if (draftStudies.length > 0) {
        baseAlerts.push({
          id: 'pcf-drafts',
          type: 'recommendation' as const,
          priority: 'medium' as const,
          message: `${draftStudies.length} étude(s) produit en brouillon — complétez la nomenclature et lancez le calcul.`,
          action: {
            label: 'Accéder aux études',
            route: '/app/empreinte-produit',
          },
        });
      }
    }

    return baseAlerts;
  }, [data, hasData, hasIncompleteData, hasBilanCarbone, hasNetZero, hasEmpreinteProduit, pcfStudies]);

  // Prepare chart data
  const scopeData = useMemo(() => {
    if (!data) return { scope1: 0, scope2: 0, scope3: 0, total: 0 };
    return {
      scope1: data.bilanCarbone.scope1,
      scope2: data.bilanCarbone.scope2,
      scope3: data.bilanCarbone.scope3,
      total: data.bilanCarbone.totalEmissions,
    };
  }, [data]);

  const categoryData = useMemo(() => {
    if (!data) return [];
    return data.bilanCarbone.breakdown.map(item => ({
      category: item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      emissions: item.emissions,
      percentage: item.percentage,
    }));
  }, [data]);

  // Loading state
  if (loading || modulesLoading || organizationLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state (minimal)
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* 1. EXECUTIVE SUMMARY - Adapts to BC or PCF mode */}
      <ExecutiveSummary
        totalEmissions={data?.bilanCarbone.totalEmissions || 0}
        referenceYear={activeYear}
        status={globalStatus}
        evolutionPercent={
          prevYearData && prevYearData.bilanCarbone.totalEmissions > 0 && data
            ? ((data.bilanCarbone.totalEmissions - prevYearData.bilanCarbone.totalEmissions) / prevYearData.bilanCarbone.totalEmissions) * 100
            : undefined
        }
        hasBilanCarbone={hasBilanCarbone}
        hasEmpreinteProduit={hasEmpreinteProduit}
        pcfStudiesCount={pcfStats.total}
        pcfCalculatedCount={pcfStats.calculated}
        pcfAverageFootprint={pcfStats.averageFootprint}
      />

      {/* AI Insight */}
      {hasData && data && data.bilanCarbone.totalEmissions > 0 && (
        <AiInsightCard
          totalEmissions={data.bilanCarbone.totalEmissions}
          referenceYear={activeYear}
          evolutionPercent={
            prevYearData && prevYearData.bilanCarbone.totalEmissions > 0
              ? ((data.bilanCarbone.totalEmissions - prevYearData.bilanCarbone.totalEmissions) / prevYearData.bilanCarbone.totalEmissions) * 100
              : undefined
          }
          topCategory={
            categoryData.length > 0
              ? { name: categoryData[0].category, percentage: categoryData[0].percentage }
              : undefined
          }
        />
      )}


      {/* 2. CORE CHARTS (only show if BC module active with data) */}
      {hasData && hasBilanCarbone && data && data.bilanCarbone.totalEmissions > 0 && (
        <EmissionsCharts
          scopeData={scopeData}
          categoryData={categoryData}
        />
      )}

      {/* 3. FOCUS PRODUITS (conditional on PCF module) */}
      <ProductFocusSection
        studies={pcfStudies}
        isModuleActive={hasEmpreinteProduit}
      />

      {/* 4. MODULE STATUS TABLE */}
      <ModuleStatusTable modules={moduleStatusData} />

      {/* 5. ALERTS & PRIORITIES */}
      <AlertsSection alerts={alerts} />

      {/* 6. QUICK ACTIONS */}
      <QuickActions
        hasBilanCarbone={hasBilanCarbone}
        hasNetZero={hasNetZero}
        hasEmpreinteProduit={hasEmpreinteProduit}
      />
    </div>
  );
};
