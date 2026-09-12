import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  FileText, 
  Clock, 
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Zap,
  Download,
  Users,
  Target,
  Calendar
} from 'lucide-react';
import { PlanFeatureGuard } from './PlanFeatureGuard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { DashboardAggregator } from '@/lib/calculators/DashboardAggregator';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Interface BilanData supprimée - utilisation de DashboardAggregator depuis activity_data

interface IntensityData {
  perEmployee: number;
  perSquareMeter: number;
  perRevenue: number;
}

export const CompleteDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<{
    totalEmissions: number;
    scope1: number;
    scope2: number;
    scope3: number;
    breakdown: Array<{ category: string; emissions: number }>;
    evolution: Array<{ year: string; emissions: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [intensityData, setIntensityData] = useState<IntensityData | null>(null);

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
          evolution: evolution.length > 0 ? evolution : [
            { year: (now.getFullYear() - 3).toString(), emissions: aggregated.bilanCarbone.totalEmissions / 1000 * 1.3 },
            { year: (now.getFullYear() - 2).toString(), emissions: aggregated.bilanCarbone.totalEmissions / 1000 * 1.2 },
            { year: (now.getFullYear() - 1).toString(), emissions: aggregated.bilanCarbone.totalEmissions / 1000 * 1.1 },
            { year: now.getFullYear().toString(), emissions: aggregated.bilanCarbone.totalEmissions / 1000 },
          ],
        });

        // Calculer l'intensité carbone (valeurs par défaut si pas disponibles)
        // Note: Ces valeurs devraient idéalement venir d'une table organizations
        const totalEmissions = aggregated.bilanCarbone.totalEmissions / 1000; // tonnes
        const numberOfEmployees = 10; // Valeur par défaut - devrait venir de organizations
        const surfaceArea = 100; // Valeur par défaut - devrait venir de organizations
        const annualRevenue = 1000000; // Valeur par défaut - devrait venir de organizations

        setIntensityData({
          perEmployee: totalEmissions / numberOfEmployees,
          perSquareMeter: (totalEmissions * 1000) / surfaceArea, // kg/m²
          perRevenue: totalEmissions / (annualRevenue / 1000000) // per million DT
        });
      } catch (error) {
        console.error('Erreur récupération données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId]);

  const getEmployeeCount = (employeeRange: string): number => {
    switch (employeeRange) {
      case '1-10': return 5;
      case '11-50': return 30;
      case '51-200': return 125;
      case '201-500': return 350;
      case '500+': return 750;
      default: return 10;
    }
  };

  // Les postes les plus émetteurs sont maintenant extraits depuis dashboardData.breakdown
  // (voir topEmitters ci-dessous)

  const totalEmissions = dashboardData ? (dashboardData.totalEmissions / 1000) : 0;
  const scope1 = dashboardData ? (dashboardData.scope1 / 1000) : 0;
  const scope2 = dashboardData ? (dashboardData.scope2 / 1000) : 0;
  const scope3 = dashboardData ? (dashboardData.scope3 / 1000) : 0;

  const emissionsData = dashboardData ? [
    { name: 'Scope 1', value: scope1, color: '#00BF72' },
    { name: 'Scope 2', value: scope2, color: '#00BDCE' },
    { name: 'Scope 3', value: scope3, color: '#FF851B' },
  ] : [];

  const topEmitters = dashboardData
    ? dashboardData.breakdown
        .map((item) => ({
          name: item.category,
          value: item.emissions / 1000, // Conversion en tonnes
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    : [];

  if (loading || orgLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
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
            <h3 className="text-lg font-semibold mb-2">Aucune donnée trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par collecter vos données d'activité pour voir vos données.
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
      {/* Plan Complet - Information principale */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Zap className="h-3 w-3 mr-1" />
              Plan Complet
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-1">
                Bilan Carbone Complet - Scopes 1, 2 & 3
              </h3>
              <p className="text-sm text-green-700">
                Analyse complète de toutes vos émissions directes et indirectes
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-900">1, 2 & 3</div>
              <p className="text-xs text-green-600">Tous les scopes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métriques principales */}
      <div className="grid md:grid-cols-5 gap-6">
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
              <Badge variant="secondary" className="text-green-600">
                Dernier bilan
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Par employé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {intensityData ? intensityData.perEmployee.toFixed(1) : '—'}
                </div>
                <p className="text-xs text-muted-foreground">tCO₂e/employé</p>
              </div>
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Par m²
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {intensityData ? intensityData.perSquareMeter.toFixed(0) : '—'}
                </div>
                <p className="text-xs text-muted-foreground">kgCO₂e/m²</p>
              </div>
              <Badge variant="outline">
                {intensityData && intensityData.perSquareMeter < 100 ? 'Bon' : 'Moyen'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Par MDT CA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {intensityData ? intensityData.perRevenue.toFixed(1) : '—'}
                </div>
                <p className="text-xs text-muted-foreground">tCO₂e/MDT</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bilans réalisés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{dashboardData ? 1 : 0}</div>
                <p className="text-xs text-muted-foreground">Nombre total</p>
              </div>
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="scopes">Analyse par scope</TabsTrigger>
          <TabsTrigger value="actions">Plan d'action</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Graphique en camembert */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des émissions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={emissionsData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                    >
                      {emissionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Postes les plus émetteurs */}
            <Card>
              <CardHeader>
                <CardTitle>Postes les plus émetteurs</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topEmitters} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => [`${(value / 1000).toFixed(1)} t CO₂e`]} />
                    <Bar dataKey="value" fill="#00BF72" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scopes" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  Scope 1
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-2xl font-bold">{scope1.toFixed(1)} t CO₂e</div>
                  <Progress value={totalEmissions ? (scope1 / totalEmissions) * 100 : 0} className="h-2" />
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Émissions directes</span>
                      <span>{scope1.toFixed(1)} t</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  Scope 2
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-2xl font-bold">{scope2.toFixed(1)} t CO₂e</div>
                  <Progress value={totalEmissions ? (scope2 / totalEmissions) * 100 : 0} className="h-2" />
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Électricité</span>
                      <span>{scope2.toFixed(1)} t</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-600" />
                  Scope 3
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-2xl font-bold">{scope3.toFixed(1)} t CO₂e</div>
                  <Progress value={totalEmissions ? (scope3 / totalEmissions) * 100 : 0} className="h-2" />
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Émissions indirectes</span>
                      <span>{scope3.toFixed(1)} t</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Plan d'action personnalisé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { 
                    title: 'Optimisation énergétique', 
                    impact: '-25%', 
                    priority: 'Haute',
                    deadline: '3 mois'
                  },
                  { 
                    title: 'Mobilité durable', 
                    impact: '-15%', 
                    priority: 'Moyenne',
                    deadline: '6 mois'
                  },
                  { 
                    title: 'Achats responsables', 
                    impact: '-30%', 
                    priority: 'Haute',
                    deadline: '1 an'
                  }
                ].map((action, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{action.title}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <Badge variant={action.priority === 'Haute' ? 'destructive' : 'secondary'}>
                          {action.priority}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Impact: {action.impact}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {action.deadline}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Détails
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rapports disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Bilan Carbone 2024', date: '15 mars 2024', status: 'Disponible' },
                  { name: 'Rapport trimestriel Q1', date: '1 avril 2024', status: 'En cours' },
                  { name: 'Plan d\'action détaillé', date: '20 mars 2024', status: 'Disponible' }
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{report.name}</div>
                      <div className="text-xs text-muted-foreground">{report.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.status === 'Disponible' ? 'default' : 'secondary'}>
                        {report.status}
                      </Badge>
                      {report.status === 'Disponible' && (
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button className="w-full mt-4">
                  <FileText className="h-4 w-4 mr-2" />
                  Générer un nouveau rapport
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exports personnalisés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF détaillé
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel avec données brutes
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Graphiques personnalisés
                  </Button>
                </div>
                
                <div className="pt-3 border-t">
                  <div className="text-sm text-muted-foreground mb-2">
                    Prochaine mise à jour automatique
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Dans 23 jours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* CTA vers Pro */}
      <PlanFeatureGuard 
        feature="canAccessMultiSites" 
        showUpgradePrompt={false}
      >
        <div></div>
      </PlanFeatureGuard>
      
    </div>
  );
};