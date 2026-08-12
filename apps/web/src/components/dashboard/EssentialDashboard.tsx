import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  FileText, 
  Clock, 
  CheckCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { PlanFeatureGuard } from './PlanFeatureGuard';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { DashboardAggregator } from '@/lib/calculators/DashboardAggregator';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export const EssentialDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const [dashboardData, setDashboardData] = useState<{
    totalEmissions: number;
    scope1: number;
    scope2: number;
    scope3: number;
    breakdown: Array<{ category: string; emissions: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Récupérer les données depuis activity_data
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      try {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), 0, 1).toISOString();
        const periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();

        const aggregated = await DashboardAggregator.aggregate(organizationId, periodStart, periodEnd);
        setDashboardData({
          totalEmissions: aggregated.bilanCarbone.totalEmissions,
          scope1: aggregated.bilanCarbone.scope1,
          scope2: aggregated.bilanCarbone.scope2,
          scope3: aggregated.bilanCarbone.scope3,
          breakdown: aggregated.bilanCarbone.breakdown,
        });
      } catch (error) {
        console.error('Erreur récupération données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId]);

  // Extraire les postes les plus émetteurs depuis le breakdown
  const topEmitters = dashboardData
    ? dashboardData.breakdown
        .map((item) => ({
          name: item.category,
          value: item.emissions / 1000, // Conversion en tonnes
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
    : [];

  const totalEmissions = dashboardData ? (dashboardData.totalEmissions / 1000) : 0;
  const scope1 = dashboardData ? (dashboardData.scope1 / 1000) : 0;
  const scope2 = dashboardData ? (dashboardData.scope2 / 1000) : 0;

  const emissionsData = dashboardData ? [
    { name: 'Scope 1', value: scope1, color: '#3b82f6' },
    { name: 'Scope 2', value: scope2, color: '#10b981' },
  ] : [];

  if (loading || orgLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-[250px] mb-2" />
            <Skeleton className="h-8 w-[100px]" />
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-[100px] mb-2" />
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData || dashboardData.totalEmissions === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun bilan carbone trouvé</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par réaliser votre premier bilan carbone pour voir vos données.
            </p>
            <Button onClick={() => navigate('/app/collecte?mode=bilan-carbone')}>
              Démarrer la collecte de données
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan CarboStart - Information principale */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              <BarChart3 className="h-3 w-3 mr-1" />
              {t("dashboard.essential.planBadge")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-1">
                {t("dashboard.essential.scope12")}
              </h3>
              <p className="text-sm text-blue-700">
                {t("dashboard.essential.scope12Desc")}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">1, 2 & 3</div>
              <p className="text-xs text-blue-600">{t("dashboard.essential.scopesIncluded")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métriques du dernier bilan */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total émissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{totalEmissions.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">tonnes CO₂e</p>
              </div>
              <Badge variant="secondary">
                Dernier bilan
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scope 1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{scope1.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">tonnes CO₂e</p>
              </div>
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scope 2
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{scope2.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">tonnes CO₂e</p>
              </div>
              <div className="w-4 h-4 bg-green-600 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques des émissions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Répartition des émissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={emissionsData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="value"
                >
                  {emissionsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value.toFixed(1)} t CO₂e`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Postes les plus émetteurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topEmitters.length > 0 ? (
              <div className="space-y-3">
                {topEmitters.map((emitter, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-medium">{emitter.name}</span>
                    <Badge variant="secondary">
                      {(emitter.value / 1000).toFixed(1)} t CO₂e
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun poste émetteur identifié
              </p>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Action pour continuer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Continuer votre bilan carbone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Réalisez un nouveau bilan carbone ou consultez vos rapports détaillés
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/app/collect?mode=bilan-carbone')} className="flex-1">
              <ArrowRight className="h-4 w-4 mr-2" />
              Nouveau bilan
            </Button>
            <Button variant="outline" onClick={() => navigate('/carbo-start/reports')} className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Mes rapports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};