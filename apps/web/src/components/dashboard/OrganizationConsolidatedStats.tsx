// Composant : Statistiques consolidées de l'organisation
// Affiche les infos clés pour le rapport : sites, employés, surface, intensités carbone
// Design : palette CarboScan, cartes compactes, pas de texte redondant (unité dans le libellé)

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DASHBOARD_PALETTE } from './multi-tenant/dashboardPalette';

interface OrganizationStatsProps {
  organizationId: string;
  totalEmissions: number; // en kg
  siteId?: string | null; // Si fourni, affiche les stats du site au lieu du total org
}

interface SiteSummary {
  total_sites: number;
  active_sites: number;
  sites_in_scope: number;
  total_surface: number;
  total_employees: number;
  sites_with_scope3: number;
}

interface OrganizationData {
  annual_revenue: number | null;
  currency: string | null;
}

export const OrganizationConsolidatedStats: React.FC<OrganizationStatsProps> = ({
  organizationId,
  totalEmissions,
  siteId,
}) => {
  // Récupérer les statistiques des sites (cache long)
  const { data: siteSummary, isLoading: sitesLoading } = useQuery<SiteSummary>({
    queryKey: ['organization-sites-summary', organizationId, siteId || 'all'],
    queryFn: async () => {
      if (siteId) {
        // Mode site : récupérer les données du site sélectionné
        const { data: site, error } = await supabase
          .from('collect_sites')
          .select('employees_count, surface_m2')
          .eq('id', siteId)
          .maybeSingle();

        if (error) throw error;
        return {
          total_sites: 1,
          active_sites: 1,
          sites_in_scope: 1,
          total_surface: Number(site?.surface_m2) || 0,
          total_employees: Number(site?.employees_count) || 0,
          sites_with_scope3: 0,
        };
      }

      // Mode consolidé : total de tous les sites
      const { data, error } = await supabase
        .rpc('get_organization_sites_summary', { org_id: organizationId });

      if (error) throw error;
      return data?.[0] || {
        total_sites: 0,
        active_sites: 0,
        sites_in_scope: 0,
        total_surface: 0,
        total_employees: 0,
        sites_with_scope3: 0,
      };
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Récupérer le CA pour intensité économique (cache long)
  const { data: orgData, isLoading: orgLoading } = useQuery<OrganizationData>({
    queryKey: ['organization-financial', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('annual_revenue, currency')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      return data || { annual_revenue: null, currency: null };
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  if (sitesLoading || orgLoading) {
    return (
      <Card className="border border-[#E2E8F0] rounded-[12px] shadow-sm bg-white dark:bg-slate-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#1E293B] dark:text-slate-100">
            <Building2 className="h-4 w-4" />
            Indicateurs d'Intensité Carbone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEmployees = Number(siteSummary?.total_employees) || 0;
  const totalSurface = Number(siteSummary?.total_surface) || 0;
  const activeSites = Number(siteSummary?.active_sites) || 0;
  const totalSites = Number(siteSummary?.total_sites) || 0;
  const annualRevenue = Number(orgData?.annual_revenue) || 0;
  const currency = orgData?.currency || 'TND';

  // Debug logs supprimés pour performance

  // Calcul des intensités carbone (VERROUILLÉ EN TONNES - arrondi sans décimales)
  const emissionsTonnes = Math.round(totalEmissions / 1000); // kg → tonnes (arrondi)
  const intensityPerEmployee = totalEmployees > 0 
    ? Math.round((emissionsTonnes / totalEmployees) * 100) / 100 // tCO2e/pers (2 décimales max)
    : 0;
  const intensityPerM2 = totalSurface > 0 
    ? Math.round(totalEmissions / totalSurface) // kgCO2e/m² (entier)
    : 0;
  const intensityPerRevenue = annualRevenue > 0 
    ? Math.round((totalEmissions / (annualRevenue / 1000))) // kgCO2e/k(devise) (entier)
    : 0;
  // Intensité carbone économique : Émissions (tCO₂e) / Chiffre d'affaires (MDT)
  const revenueMDT = annualRevenue > 0 ? annualRevenue / 1_000_000 : 0;
  const intensityEconomique = revenueMDT > 0
    ? Math.round((emissionsTonnes / revenueMDT) * 100) / 100 // tCO₂e / MDT (2 décimales)
    : null;

  const cardBase = 'border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] p-3 min-w-0';

  // Fonds discrets (palette à ~10 % d'opacité) pour chaque type de carte
  const bgDiscret = {
    neutral: 'bg-[#94A3B8]/10 dark:bg-[#94A3B8]/5',
    scope1: 'bg-[#0EA5E9]/10 dark:bg-[#0EA5E9]/5',
    scope2: 'bg-[#F59E0B]/10 dark:bg-[#F59E0B]/5',
    scope3: 'bg-[#6366F1]/10 dark:bg-[#6366F1]/5',
    accent: 'bg-[#10B981]/10 dark:bg-[#10B981]/5',
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#1E293B] dark:text-slate-100">
          <Building2 className="h-4 w-4" style={{ color: DASHBOARD_PALETTE.scope1 }} />
          Indicateurs d'Intensité Carbone
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Données de référence pour le Bilan Carbone et les rapports
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* Sites actifs */}
          <div className={cn(cardBase, bgDiscret.neutral)}>
            <div className="flex items-start gap-1.5 mb-1 min-w-0">
              <div className="w-0.5 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: DASHBOARD_PALETTE.attenuated }} />
              <span className="text-[11px] font-medium text-muted-foreground leading-tight break-words">Sites actifs</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1E293B] dark:text-slate-100">
              {activeSites}<span className="text-xs font-normal text-muted-foreground"> / {totalSites}</span>
            </div>
          </div>

          {/* Employés */}
          <div className={cn(cardBase, bgDiscret.scope1)}>
            <div className="flex items-start gap-1.5 mb-1 min-w-0">
              <div className="w-0.5 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: DASHBOARD_PALETTE.scope1 }} />
              <span className="text-[11px] font-medium text-muted-foreground leading-tight break-words">Employés</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1E293B] dark:text-slate-100">
              {totalEmployees > 0 ? totalEmployees.toLocaleString('fr-FR') : '0'}
            </div>
          </div>

          {/* Surface */}
          <div className={cn(cardBase, bgDiscret.accent)}>
            <div className="flex items-start gap-1.5 mb-1 min-w-0">
              <div className="w-0.5 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: DASHBOARD_PALETTE.accent }} />
              <span className="text-[11px] font-medium text-muted-foreground leading-tight break-words">Surface (m²)</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1E293B] dark:text-slate-100">
              {totalSurface > 0 ? totalSurface.toLocaleString('fr-FR') : '0'}
            </div>
          </div>

          {/* Intensité / employé */}
          <div className={cn(cardBase, bgDiscret.scope2)}>
            <div className="flex items-start gap-1.5 mb-1 min-w-0">
              <div className="w-0.5 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: DASHBOARD_PALETTE.scope2 }} />
              <span className="text-[11px] font-medium text-muted-foreground leading-tight break-words">Empreinte par Collaborateur</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1E293B] dark:text-slate-100">
              {totalEmployees > 0 ? intensityPerEmployee.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '–'}
              {totalEmployees > 0 && <span className="text-xs font-normal text-muted-foreground ml-1">tCO₂e</span>}
            </div>
          </div>

          {/* Intensité / m² */}
          <div className={cn(cardBase, bgDiscret.scope3)}>
            <div className="flex items-start gap-1.5 mb-1 min-w-0">
              <div className="w-0.5 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: DASHBOARD_PALETTE.scope3 }} />
              <span className="text-[11px] font-medium text-muted-foreground leading-tight break-words">kgCO₂e/m²</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1E293B] dark:text-slate-100">
              {totalSurface > 0 ? intensityPerM2 : '–'}
            </div>
          </div>

          {/* Intensité / 1k CA */}
          <div className={cn(cardBase, bgDiscret.scope1)}>
            <div className="flex items-start gap-1.5 mb-1 min-w-0">
              <div className="w-0.5 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: DASHBOARD_PALETTE.scope1 }} />
              <span className="text-[11px] font-medium text-muted-foreground leading-tight break-words">kgCO₂e/1k{currency}</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1E293B] dark:text-slate-100">
              {annualRevenue > 0 ? intensityPerRevenue : '–'}
            </div>
          </div>

          {/* Intensité carbone économique : tCO₂e / CA (MDT) */}
          <div
            className={cn(cardBase, bgDiscret.accent)}
            title="Formule : Émissions totales (tCO₂e) / Chiffre d'affaires (MDT)"
          >
            <div className="flex items-start gap-1.5 mb-1 min-w-0">
              <div className="w-0.5 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: DASHBOARD_PALETTE.accent }} />
              <span className="text-[11px] font-medium text-muted-foreground leading-tight break-words">Intensité carbone économique</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1E293B] dark:text-slate-100">
              {intensityEconomique != null ? intensityEconomique.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '–'}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">tCO₂e / MDT</div>
          </div>
        </div>

        {/* Note — style palette, bordure neutre */}
        <div className="flex items-start gap-2 p-3 rounded-[12px] border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/50">
          <BarChart3 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: DASHBOARD_PALETTE.accent }} />
          <p className="text-xs text-[#1E293B] dark:text-slate-300">
            <strong>Note :</strong> Ces statistiques sont calculées depuis vos sites et alimentent vos rapports Bilan Carbone. Pour les mettre à jour : <strong>Paramètres → Organisation</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
