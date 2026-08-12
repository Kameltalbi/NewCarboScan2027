import React, { useMemo, useEffect, useState } from 'react';
import { supabase } from "@/integrations/api/client";
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowRight, Plus, FileSpreadsheet, List, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CollectCompactKPIs } from './components/CollectCompactKPIs';
import { BilanCarboneCalculator } from '@/lib/calculators/BilanCarboneCalculator';
import { CollectControlInfo } from './components/CollectControlInfo';
import { Button } from '@/components/ui/button';

interface DataBreakdown {
  energy: number;
  transport: number;
  inputs: number;
  waste: number;
  other: number;
}

interface ActivityDataRow {
  id: string;
  category: string;
  activity_type: string;
  subcategory?: string | null;
  period_start: string;
  period_end: string;
  quantity: number;
  unit: string;
  data_quality: string;
  updated_at?: string;
  site_id?: string | null;
}

interface QualityIssue {
  type: 'missing_unit' | 'abnormal_value' | 'incomplete';
  count: number;
  label: string;
}

const fetchActivityData = async (organizationId: string, year: number): Promise<ActivityDataRow[]> => {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const { data, error } = await supabase
    .from('activity_data')
    .select('id, category, activity_type, subcategory, period_start, period_end, quantity, unit, data_quality, updated_at, site_id')
    .eq('organization_id', organizationId)
    .gte('period_start', yearStart)
    .lte('period_start', yearEnd)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((item) => ({
    id: item.id,
    category: item.category,
    activity_type: item.activity_type,
    subcategory: item.subcategory,
    period_start: item.period_start,
    period_end: item.period_end,
    quantity: item.quantity,
    unit: item.unit,
    data_quality: item.data_quality,
    updated_at: item.updated_at,
    site_id: item.site_id,
  }));
};

const calculateStats = (data: ActivityDataRow[]) => {
  const breakdown: DataBreakdown = {
    energy: 0,
    transport: 0,
    inputs: 0,
    waste: 0,
    other: 0,
  };

  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let latestUpdate: Date | null = null;
  let incompleteCount = 0;

  for (const item of data) {
    switch (item.category) {
      case 'energy':
      case 'scope2':
        breakdown.energy++;
        break;
      case 'transport':
        breakdown.transport++;
        break;
      case 'purchases':
      case 'scope3_upstream':
        breakdown.inputs++;
        break;
      case 'waste':
        breakdown.waste++;
        break;
      default:
        breakdown.other++;
    }

    if (item.period_start) {
      const start = new Date(item.period_start);
      if (!minDate || start < minDate) minDate = start;
    }
    if (item.period_end) {
      const end = new Date(item.period_end);
      if (!maxDate || end > maxDate) maxDate = end;
    }
    if (item.updated_at) {
      const updated = new Date(item.updated_at);
      if (!latestUpdate || updated > latestUpdate) latestUpdate = updated;
    }
    if (!item.unit || item.quantity === null) incompleteCount++;
  }

  const qualityIssues: QualityIssue[] = [];
  if (incompleteCount > 0) {
    qualityIssues.push({ type: 'incomplete', count: incompleteCount, label: 'Données incomplètes' });
  }

  const status: 'draft' | 'in_progress' | 'validated' | 'locked' =
    data.length === 0 ? 'draft' : 'in_progress';

  return {
    breakdown,
    periodStart: minDate?.toISOString() || null,
    periodEnd: maxDate?.toISOString() || null,
    lastUpdate: latestUpdate?.toISOString() || null,
    qualityIssues,
    status,
    totalIncomplete: incompleteCount,
  };
};

const quickActions = [
  { label: 'Nouvelle saisie', path: '/app/collecte/nouvelle', icon: Plus },
  { label: 'Importer', path: '/app/collecte/importer', icon: FileSpreadsheet },
  { label: 'Voir toutes les données', path: '/app/collecte/donnees', icon: List },
  { label: 'Contrôle & cohérence', path: '/app/collecte/controle', icon: ShieldCheck },
];

export const CollectHome: React.FC = () => {
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Listen for year changes from header
  useEffect(() => {
    const handler = (e: CustomEvent<number>) => setSelectedYear(e.detail);
    window.addEventListener('collectYearChange', handler as EventListener);
    return () => window.removeEventListener('collectYearChange', handler as EventListener);
  }, []);

  useEffect(() => {
    const handleActivityDataUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['activity-data', organizationId, selectedYear] });
    };
    window.addEventListener('activityDataUpdated', handleActivityDataUpdated);
    return () => window.removeEventListener('activityDataUpdated', handleActivityDataUpdated);
  }, [queryClient, organizationId, selectedYear]);

  const { data: activityData = [], isLoading } = useQuery({
    queryKey: ['activity-data', organizationId, selectedYear],
    queryFn: () => fetchActivityData(organizationId!, selectedYear),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => calculateStats(activityData), [activityData]);
  const totalCount = activityData.length;

  // Si pas de données d'activité, vérifier s'il existe un bilan legacy (bilans_carbone)
  const { data: legacyBilan, isLoading: legacyLoading } = useQuery({
    queryKey: ['legacy-bilan', organizationId, selectedYear],
    queryFn: async () => {
      if (!organizationId) return null;
      const periodStart = `${selectedYear}-01-01`;
      const periodEnd = `${selectedYear}-12-31T23:59:59`;
      try {
        return await BilanCarboneCalculator.calculate(organizationId, periodStart, periodEnd);
      } catch (err) {
        console.error('Erreur récupération bilan legacy:', err);
        return null;
      }
    },
    enabled: !!organizationId && activityData.length === 0,
    staleTime: 5 * 60 * 1000,
  });

  const legacyEmissionsTons = legacyBilan ? Math.round((legacyBilan.totalEmissions || 0) / 1000) : null;

  const showLegacyBanner = totalCount === 0 && !!legacyEmissionsTons && legacyEmissionsTons > 0;

  if ((isLoading || orgLoading || (totalCount === 0 && legacyLoading)) && activityData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Hero + header */}
      <div className="mb-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Synthèse des données
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {showLegacyBanner ? (
                <>
                  {legacyEmissionsTons.toLocaleString('fr-FR')} t détectées dans votre dernier bilan · Aucune donnée d'activité collectée
                </>
              ) : (
                <>
                  {totalCount} entrée{totalCount !== 1 ? 's' : ''} collectée{totalCount !== 1 ? 's' : ''} · Vue d’ensemble de votre collecte d’activité
                </>
              )}
            </p>
          </div>
          {totalCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/app/collecte/donnees')}
              className="mt-4 sm:mt-0 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              Voir toutes les données
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {showLegacyBanner && (
        <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-emerald-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                Un bilan carbone existe pour {selectedYear} :{' '}
                <span className="font-bold">{legacyEmissionsTons.toLocaleString('fr-FR')} tCO₂e</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Aucune donnée d'activité n'a été collectée. Vous pouvez importer des données ou commencer une saisie pour rendre votre bilan traçable et auditable.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Button onClick={() => navigate('/app/collecte/importer')}>Importer le bilan</Button>
              <Button variant="outline" onClick={() => navigate('/app/collecte/nouvelle')}>Nouvelle saisie</Button>
            </div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <section className="mb-8" aria-label="Indicateurs">
        <CollectCompactKPIs
          totalCount={totalCount}
          breakdown={stats.breakdown}
          periodStart={stats.periodStart}
          periodEnd={stats.periodEnd}
          lastUpdate={stats.lastUpdate}
          legacyEmissionsTons={legacyEmissionsTons}
        />
      </section>

      {/* Status strip */}
      <section
        className="mb-8 rounded-xl border border-[#E5E7EB] dark:border-slate-700/80 bg-white dark:bg-slate-900/50 px-5 py-4 shadow-sm"
        aria-label="État des données"
      >
        <CollectControlInfo
          issues={stats.qualityIssues}
          totalIncomplete={stats.totalIncomplete}
          status={stats.status}
        />
      </section>

      {/* Quick actions – utilise l’espace et rend la page pro */}
      <section className="rounded-xl border border-[#E5E7EB] dark:border-slate-700/80 bg-white dark:bg-slate-900/50 p-6 shadow-sm" aria-label="Actions rapides">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                type="button"
                onClick={() => navigate(action.path)}
                className="flex items-center gap-4 rounded-lg border border-[#E5E7EB] dark:border-slate-700/80 bg-muted/30 dark:bg-slate-800/50 p-4 text-left transition-colors hover:bg-muted/60 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <span className="font-medium text-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
