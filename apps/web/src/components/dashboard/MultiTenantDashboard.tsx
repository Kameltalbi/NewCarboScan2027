// Dashboard Carbone Multi-tenant - OPTIMISÉ
// Affichage instantané avec skeleton, données chargées progressivement

import React, { useMemo, useCallback, useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useOrganizationYears } from '@/hooks/useOrganizationYears';
import { useDashboardCache, useInvalidateDashboardCache } from '@/hooks/useDashboardCache';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { RefreshCw } from 'lucide-react'; // Keep for loading indicator
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Skeleton pour affichage instantané
import { 
  FullDashboardSkeleton,
  DashboardHeaderSkeleton,
  KPIGridSkeleton,
} from './skeletons/DashboardSkeleton';

// Composants lazy-loaded pour les graphiques
import {
  LazyScopeDistributionChart,
  LazySiteDistributionChart,
  LazyEmissionPostsChart,
  LazyScope3BreakdownChart,
  LazyScope1BreakdownChart,
  LazyScope2BreakdownChart,
  LazyEmissionsTimelineChart,
  LazyScope3Block,
  LazyEmissionsSummaryTable,
  LazyTrajectoryDecarbonationChart,
  LazyDataQualityRadarChart,
} from './LazyCharts';

// Composants légers chargés immédiatement
import {
  DashboardContextHeader,
  ScopeKPICards,
  type ScopeStatus,
  type BilanVersion,
  type DataStatus,
} from './multi-tenant';
import { OrganizationConsolidatedStats } from './OrganizationConsolidatedStats';
import { DashboardSiteFilter, type DashboardSite } from './DashboardSiteFilter';
import { getSubcategoryLabel } from '@/lib/scope3/subcategories';

// Catégories GHG Protocol Scope 3
const SCOPE3_CATEGORIES = [
  { id: '1', name: '1. Achats de biens et services' },
  { id: '2', name: '2. Biens d\'équipement' },
  { id: '3', name: '3. Énergie (amont)' },
  { id: '4', name: '4. Transport amont' },
  { id: '5', name: '5. Déchets générés' },
  { id: '6', name: '6. Déplacements professionnels' },
  { id: '7', name: '7. Trajets domicile-travail' },
  { id: '8', name: '8. Actifs loués (amont)' },
  { id: '9', name: '9. Transport aval' },
  { id: '10', name: '10. Transformation des produits' },
  { id: '11', name: '11. Utilisation des produits' },
  { id: '12', name: '12. Fin de vie des produits' },
  { id: '13', name: '13. Actifs loués (aval)' },
  { id: '14', name: '14. Franchises' },
  { id: '15', name: '15. Investissements' },
];

// Determine scope status based on emissions value
// Logique simplifiée : si émissions > 0 → Terminé, sinon → Non entamé
const determineScopeStatus = (
  emissions: number
): ScopeStatus => {
  if (emissions === 0) return 'not_started'; // Pas de données = Non entamé
  return 'consolidated'; // Des données existent = Terminé
};

// Determine bilan version based on data completeness
const determineBilanVersion = (
  hasData: boolean,
  dataQuality: { real: number; estimated: number; default: number }
): BilanVersion => {
  if (!hasData) return 'V0';
  if (dataQuality.real > 80 && dataQuality.default < 10) return 'Final';
  if (dataQuality.real > 30 || dataQuality.estimated > 50) return 'V1';
  return 'V0';
};

// Map data status from aggregator to table format
const mapDataStatus = (
  dataQuality: { real: number; estimated: number; default: number }
): DataStatus => {
  if (dataQuality.real > 70) return 'consolidated';
  if (dataQuality.estimated > 50) return 'estimated';
  if (dataQuality.default > 50) return 'default';
  return 'provisional';
};

export const MultiTenantDashboard: React.FC = () => {
  const { user } = useAuth();
  const { organizationId, organizationLoading } = useAppData();
  const { organization, loading: orgDataLoading } = useOrganizationData();
  const { defaultYear: latestDashboardYear } = useOrganizationYears(organizationId);
  
  // État du filtre par site (null = vue consolidée)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  
  // Année de référence depuis l'organisation
  const defaultYear = useMemo(() => 
    latestDashboardYear || organization?.reference_year || new Date().getFullYear(),
    [latestDashboardYear, organization?.reference_year]
  );
  
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  // Listen for year changes from ModuleHeader
  useEffect(() => {
    const handler = (e: CustomEvent<number>) => {
      setSelectedYear(e.detail);
    };
    window.addEventListener('dashboardYearChange', handler as EventListener);
    return () => window.removeEventListener('dashboardYearChange', handler as EventListener);
  }, []);
  
  const year = selectedYear ?? defaultYear;

  // Utiliser le cache pour les données du dashboard (pas de recalcul au chargement)
  const { 
    data, 
    isLoading: dataLoading, 
    isFetching,
    isCached,
    forceRecalculate,
    lastUpdated,
  } = useDashboardCache({
    organizationId,
    year,
    siteId: selectedSiteId,
    enabled: !!organizationId && !organizationLoading && !orgDataLoading && !!organization,
  });

  // Invalider le cache du dashboard
  const { invalidateForOrg } = useInvalidateDashboardCache();
  
  // Écouter les changements de données d'activité pour rafraîchir le dashboard
  useEffect(() => {
    const handleActivityDataUpdated = () => {
      if (organizationId) {
        invalidateForOrg(organizationId);
      }
    };
    
    window.addEventListener('activityDataUpdated', handleActivityDataUpdated);
    return () => {
      window.removeEventListener('activityDataUpdated', handleActivityDataUpdated);
    };
  }, [organizationId, invalidateForOrg]);

  // Charger les sites pour le graphique multi-sites (query légère, séparée)
  // Les sites sont liés via company_id (table companies), pas organization_id
  const { data: sites = [] } = useQuery({
    queryKey: ['dashboard-sites', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      // Récupérer le company_id lié à l'organisation (via user_id)
      const { data: org } = await supabase
        .from('organizations')
        .select('user_id')
        .eq('id', organizationId)
        .single();
      
      if (!org?.user_id) return [];
      
      // Trouver la company liée à ce user
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', org.user_id)
        .maybeSingle();
      
      if (!company?.id) return [];
      
      // Charger les sites de cette company
      const { data: sitesData } = await supabase
        .from('collect_sites')
        .select('id, name')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .limit(20);
      
      return sitesData || [];
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });


  // Computed values
  const hasData = useMemo(() => {
    return data?.bilanCarbone.totalEmissions > 0;
  }, [data]);

  const scopeStatuses = useMemo((): { scope1: ScopeStatus; scope2: ScopeStatus; scope3: ScopeStatus } => {
    if (!data) return { scope1: 'not_started', scope2: 'not_started', scope3: 'not_started' };
    
    return {
      scope1: determineScopeStatus(data.bilanCarbone.scope1),
      scope2: determineScopeStatus(data.bilanCarbone.scope2),
      scope3: determineScopeStatus(data.bilanCarbone.scope3),
    };
  }, [data]);

  const bilanVersion = useMemo((): BilanVersion => {
    if (!data) return 'V0';
    return determineBilanVersion(hasData, data.dataQuality);
  }, [data, hasData]);

  // Charger les sous-catégories personnalisées pour les labels
  const { data: customSubcategories = [] } = useQuery({
    queryKey: ['dashboard-custom-subcategories', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('organization_scope3_subcategories')
        .select('value, label')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
  });

  // Map des labels personnalisés
  const customLabelsMap = useMemo(() => {
    const map = new Map<string, string>();
    customSubcategories.forEach((sub: { value: string; label: string }) => {
      map.set(sub.value.toLowerCase(), sub.label);
    });
    return map;
  }, [customSubcategories]);

  // Fonction pour formater les noms de catégories
  const formatCategoryName = useCallback((category: string): string => {
    const nameMap: Record<string, string> = {
      'essence_sans_plomb': 'Essence Sans Plomb',
      'gasoil': 'Gasoil',
      'gasoil_super': 'Gasoil Super',
      'fossil_gas': 'Gaz Naturel',
      'fossil_fuel_oil': 'Fioul',
      'electricity': 'Électricité',
      'electricite_steg': 'Électricité STEG',
      'r410a': 'Fluide Frigorigène R410A',
      'r22': 'Fluide Frigorigène R22',
      'fuel_diesel': 'Diesel',
      // Scope 1 – postes courants
      'groupes_electrogenes': 'Groupes électrogènes',
      'vehicules': 'Véhicules (flotte)',
      'vehicules_flotte': 'Véhicules (flotte)',
      'chaudieres': 'Chaudières',
      'climatisation': 'Climatisation (fuites)',
      'fluides_frigorigenes': 'Fluides frigorigènes',
      // Scope 3 standard categories
      'cat1_imported_spare_parts': 'Pièces détachées importées',
      'cat6_flight_short': 'Vols court-courrier',
      'cat6_flight_medium': 'Vols moyen-courrier',
      'cat6_flight_long': 'Vols long-courrier',
      'cat7_commuting': 'Trajets domicile-travail',
      'cat7_company_cars': 'Véhicules de fonction',
      'cat13_leased_vehicles_km': 'Véhicules loués (km)',
    };

    // Extraire la sous-catégorie si format composite (cat1_xxx:subcategory)
    const parts = category.split(':');
    const subcategory = parts.length > 1 ? parts[1] : parts[0];
    const subcategoryLower = subcategory.toLowerCase();

    // 1. Vérifier les labels personnalisés (sous-catégories org) – correspondance exacte
    if (customLabelsMap.has(subcategoryLower)) {
      return customLabelsMap.get(subcategoryLower)!;
    }

    // 1b. Clé custom_ mais pas de correspondance exacte : chercher par préfixe (ex. timestamp légèrement différent)
    if (subcategoryLower.startsWith('custom_')) {
      const found = customSubcategories.find(
        (sub: { value: string; label: string }) =>
          sub.value?.toLowerCase() === subcategoryLower ||
          subcategoryLower.startsWith(sub.value?.toLowerCase() ?? '') ||
          (sub.value?.toLowerCase() ?? '').startsWith(subcategoryLower)
      );
      if (found?.label) return found.label;
    }

    // 2. Labels standard Scope 3 (ex: cat2_tires_new → Pneus achetés)
    const standardLabel = getSubcategoryLabel(subcategory) || getSubcategoryLabel(category);
    if (standardLabel) return standardLabel;

    // 3. Map statique (Scope 1/2, noms courants)
    if (nameMap[subcategoryLower]) {
      return nameMap[subcategoryLower];
    }

    // 4. Fallback: formater la clé (sans tronquer)
    return subcategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [customLabelsMap, customSubcategories]);

  // Fonction pour déterminer le scope depuis le nom de catégorie
  const getScopeFromCategory = useCallback((category: string): 1 | 2 | 3 => {
    const cat = category.toLowerCase();
    
    // Scope 3: catégories GHG Protocol (cat1_ à cat15_) ou mots-clés
    if (cat.includes('scope3') || 
        cat.match(/^cat[0-9]+_/) ||
        cat.includes(':cat') ||
        cat.includes('custom_cat') ||
        cat.includes('transport') || 
        cat.includes('fret') || 
        cat.includes('logistique') ||
        cat.includes('flight') ||
        cat.includes('commuting') ||
        cat.includes('leased')) {
      return 3;
    }
    
    // Scope 2: électricité, chaleur, froid achetés
    if (cat.includes('electric') || cat === 'electricity' || 
        cat.includes('chaleur') || cat.includes('froid')) {
      return 2;
    }
    
    // Scope 1: combustibles, carburants, fluides frigorigènes
    return 1;
  }, []);

  // Prepare emission posts data
  const emissionPostsData = useMemo(() => {
    if (!data) return [];
    
    const total = data.bilanCarbone.totalEmissions || 1;
    
    return data.bilanCarbone.breakdown.map(item => {
      const scope = getScopeFromCategory(item.category);
      
      return {
        name: formatCategoryName(item.category),
        emissions: item.emissions,
        scope,
        percentage: (item.emissions / total) * 100,
      };
    });
  }, [data]);

  // Prepare summary table data with traceability details
  const summaryTableData = useMemo(() => {
    if (!data) return [];
    
    const total = data.bilanCarbone.totalEmissions || 1;
    const dataStatusDefault = mapDataStatus(data.dataQuality);
    
    // Si on a des données détaillées (traçabilité ligne par ligne), les utiliser
    if (data.bilanCarbone.detailedBreakdown && data.bilanCarbone.detailedBreakdown.length > 0) {
      // Agréger par subcategory pour éviter les doublons, mais garder les détails
      const aggregated = new Map<string, {
        scope: 1 | 2 | 3;
        post: string;
        emissions: number;
        quantity: number;
        unit: string;
        emissionFactor: number;
        emissionFactorUnit: string;
        emissionFactorSource: string;
        dataQuality: string;
      }>();
      
      data.bilanCarbone.detailedBreakdown.forEach(item => {
        const key = item.subcategory;
        if (aggregated.has(key)) {
          const existing = aggregated.get(key)!;
          existing.emissions += item.emissions;
          existing.quantity += item.quantity;
        } else {
          aggregated.set(key, {
            scope: item.scope,
            post: formatCategoryName(item.subcategory),
            emissions: item.emissions,
            quantity: item.quantity,
            unit: item.unit,
            emissionFactor: item.emissionFactor,
            emissionFactorUnit: item.emissionFactorUnit,
            emissionFactorSource: item.emissionFactorSource,
            dataQuality: item.dataQuality,
          });
        }
      });
      
      return Array.from(aggregated.values()).map(item => ({
        scope: item.scope,
        post: item.post,
        emissions: item.emissions,
        percentage: (item.emissions / total) * 100,
        dataStatus: item.dataQuality === 'real' ? 'consolidated' as const : 
                   item.dataQuality === 'estimated' ? 'estimated' as const : 'default' as const,
        quantity: item.quantity,
        unit: item.unit,
        emissionFactor: item.emissionFactor,
        emissionFactorUnit: item.emissionFactorUnit,
        emissionFactorSource: item.emissionFactorSource,
      }));
    }
    
    // Fallback: utiliser le breakdown agrégé (sans détails de traçabilité)
    return data.bilanCarbone.breakdown.map(item => {
      const scope = getScopeFromCategory(item.category);
      
      return {
        scope,
        post: formatCategoryName(item.category),
        emissions: item.emissions,
        percentage: (item.emissions / total) * 100,
        dataStatus: dataStatusDefault,
      };
    });
  }, [data]);

  // Prepare Scope 3 categories
  const scope3Categories = useMemo(() => {
    if (!data) return SCOPE3_CATEGORIES.map(c => ({ ...c, covered: false }));
    
    const coveredCategories = data.bilanCarbone.breakdown
      .filter(b => {
        const cat = b.category.toLowerCase();
        return !cat.includes('combustible') && !cat.includes('carburant') && 
               !cat.includes('électric') && !cat.includes('energie');
      })
      .map(b => b.category.toLowerCase());
    
    return SCOPE3_CATEGORIES.map(cat => ({
      ...cat,
      covered: coveredCategories.some(c => 
        c.includes(cat.name.toLowerCase().split('.')[1]?.trim().substring(0, 5) || '')
      ) || Math.random() > 0.6, // Demo: randomly mark some as covered
      emissions: Math.random() * 100, // Demo value
    }));
  }, [data]);

  // Prepare site emissions data (demo)
  const siteEmissionsData = useMemo(() => {
    if (sites.length < 2 || !data) return [];
    
    // Distribute emissions across sites (demo)
    const totalScope1 = data.bilanCarbone.scope1;
    const totalScope2 = data.bilanCarbone.scope2;
    
    return sites.map((site, index) => {
      const factor = 1 / sites.length + (Math.random() * 0.3 - 0.15);
      return {
        siteName: site.name,
        scope1: totalScope1 * factor,
        scope2: totalScope2 * factor,
      };
    });
  }, [sites, data]);

  // Prepare timeline data (12 derniers mois simulés)
  const timelineData = useMemo(() => {
    if (!data) return [];
    
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonth = new Date().getMonth();
    
    // Générer des données pour les 12 derniers mois avec variation
    return months.map((month, index) => {
      const variation = 0.7 + Math.random() * 0.6; // 70% - 130% du total
      const monthFactor = index <= currentMonth ? variation : 0;
      
      return {
        period: month,
        scope1: (data.bilanCarbone.scope1 / 12) * monthFactor,
        scope2: (data.bilanCarbone.scope2 / 12) * monthFactor,
        scope3: (data.bilanCarbone.scope3 / 12) * monthFactor,
        total: (data.bilanCarbone.totalEmissions / 12) * monthFactor,
      };
    }).filter(d => d.total > 0);
  }, [data]);

  // État de chargement initial - afficher skeleton immédiatement
  const isInitialLoading = organizationLoading || orgDataLoading || (!data && dataLoading);

  // Skeleton pendant le chargement initial (< 500ms perçu)
  if (isInitialLoading) {
    return <FullDashboardSkeleton />;
  }

  // Pas de données disponibles
  if (!data || data.bilanCarbone.totalEmissions === 0) {
    const selectedSiteName = selectedSiteId 
      ? sites.find(s => s.id === selectedSiteId)?.name 
      : null;
    
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">
            {selectedSiteId 
              ? `Aucune donnée pour le site "${selectedSiteName}"`
              : `Aucune donnée pour l'année ${year}`
            }
          </h3>
          <p className="text-sm text-muted-foreground">
            {selectedSiteId 
              ? "Les données d'activité ne sont pas encore associées à ce site. Lors de la saisie, sélectionnez ce site pour qu'il apparaisse ici."
              : "Commencez par saisir des données d'activité dans le module de collecte."
            }
          </p>
          {selectedSiteId && (
            <Button 
              variant="outline" 
              onClick={() => setSelectedSiteId(null)}
              className="mt-2"
            >
              Voir les données consolidées
            </Button>
          )}
        </div>
      </div>
    );
  }

  const projectName = organization?.name || 'Bilan Carbone';
  const emissionFactorsSource = 'ADEME Base Carbone v23.9';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950/50">
      <div className="space-y-5 sm:space-y-6 p-4 sm:p-6 min-w-0">
        {/* Indicateur de rafraîchissement en background */}
        {isFetching && isCached && (
          <div className="fixed top-4 right-4 z-50">
            <Button variant="outline" size="sm" disabled className="gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Actualisation...
            </Button>
          </div>
        )}

        {/* 1. Bandeau de contexte + Filtre site dans le header */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DashboardContextHeader
                projectName={projectName}
                bilanVersion={bilanVersion}
                scopeStatuses={scopeStatuses}
                emissionFactorsSource={emissionFactorsSource}
                totalEmissions={data?.bilanCarbone.totalEmissions || 0}
              />
            </div>
            <div className="shrink-0">
              <DashboardSiteFilter
                sites={sites as DashboardSite[]}
                selectedSiteId={selectedSiteId}
                onSiteChange={setSelectedSiteId}
                isLoading={isFetching}
              />
            </div>
          </div>
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              Mis à jour le {lastUpdated.toLocaleString('fr-FR')}
              {selectedSiteId && (
                <span className="ml-2 text-primary font-medium">
                  • Filtre: {sites.find(s => s.id === selectedSiteId)?.name || 'Site sélectionné'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Note: L'alerte des FE manquants est visible uniquement côté superadmin */}

        {/* 2. Statistiques consolidées de l'organisation */}
        {organizationId && (
          <OrganizationConsolidatedStats
            organizationId={organizationId}
            totalEmissions={data?.bilanCarbone.totalEmissions || 0}
            siteId={selectedSiteId}
          />
        )}

        {/* 3. KPI principaux (chargés immédiatement, légers) */}
        <ScopeKPICards
          scope1={data?.bilanCarbone.scope1 || 0}
          scope2={data?.bilanCarbone.scope2 || 0}
          scope3={data?.bilanCarbone.scope3 || 0}
          scopeStatuses={scopeStatuses}
        />

        {/* 4 & 5. Graphiques principaux (lazy-loaded, visibles à la demande) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LazyScopeDistributionChart
            scope1={data?.bilanCarbone.scope1 || 0}
            scope2={data?.bilanCarbone.scope2 || 0}
            scope3={data?.bilanCarbone.scope3 || 0}
            scopeStatuses={scopeStatuses}
          />
          <LazyScope3BreakdownChart data={emissionPostsData} />
        </div>

        {/* Graphiques Scope 1 et Scope 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LazyScope1BreakdownChart data={emissionPostsData} />
          <LazyScope2BreakdownChart data={emissionPostsData} />
        </div>

        {/* Graphique des postes et qualité des données */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LazyEmissionPostsChart data={emissionPostsData} />
          <LazyDataQualityRadarChart dataQuality={data.dataQuality} />
        </div>

        {/* Distribution par site (si plusieurs sites) */}
        {siteEmissionsData.length >= 2 && (
          <div className="grid grid-cols-1 gap-6">
            <LazySiteDistributionChart sites={siteEmissionsData} />
          </div>
        )}

        {/* Trajectoire de décarbonation – 5 scénarios */}
        <LazyTrajectoryDecarbonationChart
          currentEmissions={data?.bilanCarbone.totalEmissions || 0}
          years={5}
        />

        {/* Tableau de traçabilité déplacé vers /app/bilan-carbone/tracabilite */}
      </div>
    </div>
  );
};

export default MultiTenantDashboard;
