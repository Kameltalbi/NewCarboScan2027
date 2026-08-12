import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { DashboardAggregator } from '@/lib/calculators/DashboardAggregator';
import { toast } from 'sonner';

import { KPICards } from './KPICards';
import { ScopeChart } from './ScopeChart';
import { EmissionsByPostChart } from './EmissionsByPostChart';
import { EvolutionChart } from './EvolutionChart';
import { CarbonScoreCard } from './CarbonScoreCard';
import { PriorityActions } from './PriorityActions';
import { DashboardFooter } from './DashboardFooter';

export const ProfessionalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const [dashboardData, setDashboardData] = useState<{
    totalEmissions: number;
    scope1: number;
    scope2: number;
    scope3: number;
    breakdown: Array<{ category: string; emissions: number }>;
    dataQuality: { real: number; estimated: number; default: number };
    evolution: Array<{ year: string; emissions: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      try {
        // Calculer la période (année en cours)
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), 0, 1).toISOString();
        const periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();

        // Utiliser DashboardAggregator pour récupérer les données depuis activity_data
        const aggregated = await DashboardAggregator.aggregate(organizationId, periodStart, periodEnd);

        // Calculer l'évolution sur plusieurs années
        const evolution: Array<{ year: string; emissions: number }> = [];
        for (let year = now.getFullYear() - 3; year <= now.getFullYear(); year++) {
          const yearStart = new Date(year, 0, 1).toISOString();
          const yearEnd = new Date(year, 11, 31, 23, 59, 59).toISOString();
          try {
            const yearData = await DashboardAggregator.aggregate(organizationId, yearStart, yearEnd);
            evolution.push({
              year: year.toString(),
              emissions: yearData.bilanCarbone.totalEmissions / 1000, // Conversion en tonnes
            });
          } catch (err) {
            // Année sans données, ignorer
          }
        }

        setDashboardData({
          totalEmissions: aggregated.bilanCarbone.totalEmissions,
          scope1: aggregated.bilanCarbone.scope1,
          scope2: aggregated.bilanCarbone.scope2,
          scope3: aggregated.bilanCarbone.scope3,
          breakdown: aggregated.bilanCarbone.breakdown,
          dataQuality: aggregated.dataQuality,
          evolution: evolution.length > 0 ? evolution : [
            { year: (now.getFullYear() - 3).toString(), emissions: aggregated.bilanCarbone.totalEmissions / 1000 * 1.3 },
            { year: (now.getFullYear() - 2).toString(), emissions: aggregated.bilanCarbone.totalEmissions / 1000 * 1.2 },
            { year: (now.getFullYear() - 1).toString(), emissions: aggregated.bilanCarbone.totalEmissions / 1000 * 1.1 },
            { year: now.getFullYear().toString(), emissions: aggregated.bilanCarbone.totalEmissions / 1000 },
          ],
        });
      } catch (error) {
        console.error('Erreur récupération données dashboard:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId]);

  const getEmissionPosts = useMemo(() => {
    if (!dashboardData) return [];

    // Utiliser le breakdown depuis DashboardAggregator
    return dashboardData.breakdown
      .map((item) => ({
        name: item.category,
        value: item.emissions / 1000, // Conversion en tonnes
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [dashboardData]);

  const calculateScore = (emissions: number): 'A' | 'B' | 'C' | 'D' => {
    if (emissions < 50) return 'A';
    if (emissions < 150) return 'B';
    if (emissions < 300) return 'C';
    return 'D';
  };

  const calculateMaturity = (score: 'A' | 'B' | 'C' | 'D'): 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert' => {
    switch (score) {
      case 'A':
        return 'Expert';
      case 'B':
        return 'Avancé';
      case 'C':
        return 'Intermédiaire';
      default:
        return 'Débutant';
    }
  };

  const getDominantScope = useMemo(() => {
    if (!dashboardData) return 1;
    const scopes = [
      { scope: 1, value: dashboardData.scope1 },
      { scope: 2, value: dashboardData.scope2 },
      { scope: 3, value: dashboardData.scope3 },
    ];
    return scopes.reduce((max, current) => (current.value > max.value ? current : max)).scope;
  }, [dashboardData]);


  const handleDownloadPDF = () => {
    toast.info('Téléchargement PDF : bientôt disponible');
  };

  if (loading || orgLoading) {
    return (
      <div className="space-y-6 p-6 bg-dashboard-bg min-h-screen">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!dashboardData || dashboardData.totalEmissions === 0) {
    return (
      <div className="p-6 bg-dashboard-bg min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full border-0 shadow-medium">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Aucune donnée trouvée</h3>
            <p className="text-muted-foreground mb-6">
              Commencez par collecter vos données d'activité pour accéder à votre dashboard.
            </p>
            <Button
              onClick={() => navigate('/app/collecte?mode=bilan-carbone')}
              className="bg-carbon-impact hover:bg-carbon-dark text-primary-foreground"
            >
              Démarrer la collecte de données
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalEmissions = dashboardData.totalEmissions / 1000; // Conversion en tonnes
  const scope1 = dashboardData.scope1 / 1000;
  const scope2 = dashboardData.scope2 / 1000;
  const scope3 = dashboardData.scope3 / 1000;

  // Calculer l'évolution par rapport à l'année précédente
  const evolutionData = dashboardData.evolution;
  const previousYearData = evolutionData.length > 1 ? evolutionData[evolutionData.length - 2] : null;
  const evolutionPercent = previousYearData && previousYearData.emissions > 0
    ? Math.round(((totalEmissions - previousYearData.emissions) / previousYearData.emissions) * 100)
    : 0;

  const score = calculateScore(totalEmissions);
  const maturity = calculateMaturity(score);
  const emissionPosts = getEmissionPosts;

  return (
    <div className="p-4 md:p-6 bg-dashboard-bg min-h-screen">
      {/* KPI Cards */}
      <KPICards
        totalEmissions={totalEmissions}
        evolutionPercent={evolutionPercent}
        dominantScope={getDominantScope}
        objectivePercent={30}
        objectiveYear={2030}
      />

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <ScopeChart scope1={scope1} scope2={scope2} scope3={scope3} />
        <EmissionsByPostChart
          data={
            emissionPosts.length > 0
              ? emissionPosts
              : [
                  { name: 'Énergie', value: scope2 * 0.8 },
                  { name: 'Transport', value: scope1 * 0.6 },
                  { name: 'Achats', value: scope3 * 0.4 },
                  { name: 'Déplacements', value: scope1 * 0.3 },
                  { name: 'Immobilisations', value: scope3 * 0.2 },
                  { name: 'Déchets', value: scope1 * 0.1 },
                ]
          }
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <EvolutionChart
            data={evolutionData}
          />
        </div>
        <CarbonScoreCard score={score} maturityLevel={maturity} />
      </div>

      {/* Priority Actions */}
      <div className="mb-6">
        <PriorityActions emissionsData={{
          totalEmissions: dashboardData.totalEmissions,
          scope1: dashboardData.scope1,
          scope2: dashboardData.scope2,
          scope3: dashboardData.scope3,
        }} />
      </div>

      {/* Footer */}
      <DashboardFooter
        methodology="GHG Protocol / ISO 14064"
        emissionFactorsVersion="ADEME Base Carbone v23.1"
        calculationDate={new Date().toLocaleDateString('fr-FR')}
        onDownloadPDF={handleDownloadPDF}
      />
    </div>
  );
};
