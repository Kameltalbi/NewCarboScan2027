// Dashboard de consolidation multi-sites
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  MapPin, 
  Download, 
  TrendingUp,
  Zap,
  Fuel,
  Droplets,
  Trash2,
  BarChart3,
  PieChart,
  Table,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ConsolidationTable } from './ConsolidationTable';
import { ConsolidationChart } from './ConsolidationChart';
import { SiteComparisonCard } from './SiteComparisonCard';
import { useConsolidation } from '@/hooks/useConsolidation';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryData {
  category: string;
  totalValue: number;
  count: number;
  siteCount: number;
  unit?: string;
}

interface ConsolidationDashboardProps {
  sessionId: string;
  companyId: string;
}

export const ConsolidationDashboard: React.FC<ConsolidationDashboardProps> = ({
  sessionId,
  companyId,
}) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'table' | 'chart'>('table');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { 
    consolidatedData, 
    sites, 
    siteResponses,
    isLoading, 
    refetch,
    exportToExcel,
    exportToPDF 
  } = useConsolidation(sessionId, companyId);

  // Calcul des statistiques globales
  const stats = useMemo(() => {
    if (!consolidatedData || !sites) {
      return { totalSites: 0, activeSites: 0, completionRate: 0, totalDataPoints: 0 };
    }

    const activeSites = sites.filter((s: any) => s.is_active && s.is_consolidated).length;
    const totalDataPoints = consolidatedData.length;
    
    // Calculer le taux de complétion moyen
    const siteCompletions = sites.map((site: any) => {
      const siteData = siteResponses.filter((r: any) => r.site_id === site.id);
      return siteData.length;
    });
    const avgCompletion = siteCompletions.length > 0 
      ? Math.round(siteCompletions.reduce((a: number, b: number) => a + b, 0) / siteCompletions.length)
      : 0;

    return {
      totalSites: sites.length,
      activeSites,
      completionRate: avgCompletion,
      totalDataPoints,
    };
  }, [consolidatedData, sites, siteResponses]);

  // Grouper les données par catégorie
  const categoriesData = useMemo((): CategoryData[] => {
    if (!consolidatedData) return [];

    const grouped = consolidatedData.reduce((acc: Record<string, CategoryData>, item: any) => {
      const cat = item.question_category || 'Autre';
      if (!acc[cat]) {
        acc[cat] = { 
          category: cat, 
          totalValue: 0, 
          count: 0, 
          siteCount: 0,
          unit: item.unit 
        };
      }
      acc[cat].totalValue += Number(item.total_value) || 0;
      acc[cat].count++;
      acc[cat].siteCount = Math.max(acc[cat].siteCount, item.site_count || 0);
      return acc;
    }, {} as Record<string, CategoryData>);

    return Object.values(grouped);
  }, [consolidatedData]);

  // Icônes par catégorie
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ElementType> = {
      energy: Zap,
      fuel: Fuel,
      water: Droplets,
      waste: Trash2,
      transport: TrendingUp,
    };
    return icons[category.toLowerCase()] || BarChart3;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Consolidation Multi-Sites
          </h1>
          <p className="text-muted-foreground">
            Vue agrégée des données de collecte par site
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sites consolidés</p>
                <p className="text-2xl font-bold">{stats.activeSites} / {stats.totalSites}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Points de données</p>
                <p className="text-2xl font-bold">{stats.totalDataPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Catégories</p>
                <p className="text-2xl font-bold">{categoriesData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Complétion moyenne</p>
                <p className="text-2xl font-bold">{stats.completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning si pas de sites consolidés */}
      {stats.activeSites === 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Aucun site configuré pour la consolidation
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Pour consolider les données, activez l'option "Consolidé" sur vos sites dans la gestion des sites.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => navigate('/app/collecte/sources')}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Gérer les sites
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison par site */}
      {sites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Comparaison par site
            </CardTitle>
            <CardDescription>
              Visualisez la contribution de chaque site aux données consolidées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.filter(s => s.is_active).map(site => {
                const siteData = siteResponses.filter(r => r.site_id === site.id);
                const validatedCount = siteData.filter(r => r.is_validated).length;
                const progress = siteData.length > 0 
                  ? Math.round((validatedCount / siteData.length) * 100) 
                  : 0;

                return (
                  <SiteComparisonCard
                    key={site.id}
                    site={site}
                    dataCount={siteData.length}
                    validatedCount={validatedCount}
                    progress={progress}
                    isConsolidated={site.is_consolidated}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Données consolidées */}
      {stats.totalDataPoints > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Table className="h-5 w-5 text-primary" />
                  Données consolidées
                </CardTitle>
                <CardDescription>
                  Totaux agrégés par catégorie et indicateur
                </CardDescription>
              </div>
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'table' | 'chart')}>
                <TabsList>
                  <TabsTrigger value="table">
                    <Table className="h-4 w-4 mr-2" />
                    Tableau
                  </TabsTrigger>
                  <TabsTrigger value="chart">
                    <PieChart className="h-4 w-4 mr-2" />
                    Graphique
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {activeView === 'table' ? (
              <ConsolidationTable 
                data={consolidatedData}
                onCategoryFilter={setSelectedCategory}
                selectedCategory={selectedCategory}
              />
            ) : (
              <ConsolidationChart 
                data={consolidatedData}
                categories={categoriesData}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6 flex items-start gap-4">
          <Info className="h-6 w-6 text-blue-600 shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">
              Comment fonctionne la consolidation ?
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
              <li>Les données sont agrégées uniquement pour les sites marqués "Consolidé"</li>
              <li>Seules les réponses validées sont incluses dans les totaux</li>
              <li>Les valeurs sont additionnées par catégorie et indicateur</li>
              <li>Exportez les données consolidées pour vos rapports ESG/CSRD</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
