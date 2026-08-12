import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { BilanCarboneCalculator } from '@/lib/calculators/BilanCarboneCalculator';
import { getSubcategoryLabel } from '@/lib/scope3/subcategories';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  AlertTriangle,
  Database,
  Leaf,
  BarChart3,
  Settings,
  List,
  ShieldCheck,
} from 'lucide-react';

export default function CollectConsolidationPage() {
  const navigate = useNavigate();
  const organizationId = useOrganizationId().organizationId;
  const { referenceYear } = useOrganizationData();
  const periodStart = `${referenceYear}-01-01`;
  const periodEnd = `${referenceYear}-12-31`;

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['activity-data', organizationId, periodStart, periodEnd],
    queryFn: () =>
      ActivityDataService.list({
        organization_id: organizationId!,
        period_start: periodStart,
        period_end: periodEnd,
      }),
    enabled: !!organizationId,
  });

  const { data: qualityStats, isLoading: loadingQuality } = useQuery({
    queryKey: ['data-quality-stats', organizationId, periodStart, periodEnd],
    queryFn: () =>
      ActivityDataService.getDataQualityStats(
        organizationId!,
        periodStart,
        periodEnd
      ),
    enabled: !!organizationId,
  });

  const { data: orgFactors = [], isLoading: loadingFactors } = useQuery({
    queryKey: ['organization-emission-factors-keys', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_emission_factors')
        .select('subcategory_key')
        .eq('organization_id', organizationId!);
      if (error) return [];
      return (data || []).map((r: { subcategory_key: string | null }) => (r.subcategory_key || '').toLowerCase()).filter(Boolean);
    },
    enabled: !!organizationId,
  });

  const controlData = useMemo(() => {
    const incomplete = activities.filter(
      (a) => !a.unit?.trim() || a.quantity == null
    );
    const scopeCounts = { 1: 0, 2: 0, 3: 0 };
    const subcategorySet = new Set<string>();

    function getScope(a: (typeof activities)[0]): 1 | 2 | 3 {
      const hint = a.scope_hint != null ? Number(a.scope_hint) : NaN;
      if (hint === 1 || hint === 2 || hint === 3) return hint as 1 | 2 | 3;
      const cat = (a.category || '').toLowerCase();
      if (cat === 'scope1') return 1;
      if (cat === 'scope2') return 2;
      if (cat === 'scope3_upstream' || cat === 'scope3_downstream' || cat.startsWith('scope3')) return 3;
      if (cat.startsWith('lifecycle')) return 3;
      return 3;
    }

    activities.forEach((a) => {
      const scope = getScope(a);
      scopeCounts[scope]++;

      const sub = a.subcategory?.trim();
      const isScope3 = scope === 3;
      if (sub && isScope3) {
        const key = sub.includes(':') ? sub.split(':').slice(-1)[0] : sub;
        subcategorySet.add(key.toLowerCase());
      }
    });

    const missingFECandidates: string[] = [];
    subcategorySet.forEach((key) => {
      const normalized = key.toLowerCase();
      const hasMatch = orgFactors.some(
        (fk: string) =>
          fk === normalized ||
          normalized.startsWith(fk) ||
          fk.startsWith(normalized)
      );
      if (!hasMatch) missingFECandidates.push(key);
    });
    const missingFECandidatesDedup = Array.from(new Set(missingFECandidates));

    return {
      total: activities.length,
      incomplete: incomplete.length,
      incompleteList: incomplete.slice(0, 5),
      scopeCounts,
      missingFECandidates: missingFECandidatesDedup,
      qualityStats,
    };
  }, [activities, orgFactors, qualityStats]);

  const missingFEQueryKey = useMemo(
    () =>
      controlData.missingFECandidates.length > 0 && organizationId
        ? ['missing-fe-resolved', organizationId, controlData.missingFECandidates.slice().sort().join('\n')]
        : null,
    [organizationId, controlData.missingFECandidates]
  );

  const { data: resolvedMissingFE } = useQuery({
    queryKey: missingFEQueryKey ?? ['missing-fe-resolved-skip'],
    queryFn: async (): Promise<string[]> => {
      if (!missingFEQueryKey || !organizationId) return [];
      const keys = (missingFEQueryKey[2] as string).split('\n').filter(Boolean);
      const result: string[] = [];
      for (const key of keys) {
        const hasFactor = await BilanCarboneCalculator.hasFactorForSubcategory(organizationId, key);
        if (!hasFactor) result.push(key);
      }
      return result;
    },
    enabled: !!missingFEQueryKey && !!organizationId,
  });

  const missingFE = resolvedMissingFE ?? controlData.missingFECandidates;

  const isLoading = loadingActivities || loadingQuality;

  if (!organizationId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Organisation non disponible.
      </div>
    );
  }

  if (isLoading && activities.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Contrôle qualité & cohérence
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d’ensemble de la qualité des données et des facteurs d’émission pour l’année {referenceYear} (définie dans Paramètres → Organisation).
        </p>
      </div>

      {/* Indicateurs qualité */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#E5E7EB] dark:border-slate-700/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
              Données (période)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{controlData.total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              entrées sur {periodStart} → {periodEnd}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-slate-700/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Répartition par scope
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              S1: {controlData.scopeCounts[1]} · S2: {controlData.scopeCounts[2]} · S3: {controlData.scopeCounts[3]}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              nombre d’entrées par scope
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-slate-700/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {controlData.incomplete > 0 ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              )}
              Données incomplètes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{controlData.incomplete}</p>
            <p className="text-xs text-muted-foreground mt-1">
              sans unité ou quantité
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] dark:border-slate-700/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              FE manquants (Scope 3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{missingFE.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              sous-catégories sans facteur d’émission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Qualité détaillée */}
      {controlData.qualityStats && (
        <Card className="border-[#E5E7EB] dark:border-slate-700/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Qualité des données</CardTitle>
            <CardDescription>
              Répartition Réel / Estimé / Par défaut pour la période.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300">
                Réelles: {controlData.qualityStats.real_count} ({controlData.qualityStats.real_percentage?.toFixed(0) ?? 0}%)
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300">
                Estimées: {controlData.qualityStats.estimated_count} ({controlData.qualityStats.estimated_percentage?.toFixed(0) ?? 0}%)
              </Badge>
              <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-300 dark:text-slate-400">
                Par défaut: {controlData.qualityStats.default_count} ({controlData.qualityStats.default_percentage?.toFixed(0) ?? 0}%)
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FE manquants */}
      {missingFE.length > 0 && (
        <Card className="border-[#E5E7EB] dark:border-slate-700/80 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Facteurs d’émission à définir
            </CardTitle>
            <CardDescription>
              Ces sous-catégories ont des données mais aucun facteur d’émission. Les émissions ne seront pas calculées tant qu’un FE n’est pas renseigné.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {missingFE.slice(0, 15).map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs">{key}</span>
                  <span className="text-foreground">
                    ({getSubcategoryLabel(key) || '—'})
                  </span>
                </li>
              ))}
              {missingFE.length > 15 && (
                <li className="text-muted-foreground text-xs">
                  + {missingFE.length - 15} autre(s)
                </li>
              )}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={() => navigate('/app/parametres')}
            >
              <Settings className="h-4 w-4" />
              Paramètres → Facteurs d’émission
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="border-[#E5E7EB] dark:border-slate-700/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
          <CardDescription>
            Accès rapide aux données et paramètres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/app/collecte/donnees')}
            >
              <List className="h-4 w-4" />
              Voir toutes les données
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/app/parametres')}
            >
              <Settings className="h-4 w-4" />
              Paramètres (FE, organisation)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/app/dashboard')}
            >
              <ShieldCheck className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
