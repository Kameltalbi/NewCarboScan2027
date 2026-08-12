import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatEmissions } from "@/lib/emissionsFormatter";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export const SimpleDashboard: React.FC = () => {
  const [latestBilan, setLatestBilan] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        // Récupérer le dernier bilan
        const { data: bilans, error: bilansError } = await supabase
          .from('bilans_carbone')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (bilansError) {
          console.error('Erreur lors du chargement des bilans:', bilansError);
        }

        // Récupérer les données de l'entreprise
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (companyError) {
          console.error('Erreur lors du chargement de l\'entreprise:', companyError);
        }

        setLatestBilan(bilans?.[0] || null);
        setCompanyData(company || null);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Calculer les émissions
  const scope1 = latestBilan ? Number(latestBilan.scope1_emission) : 0;
  const scope2 = latestBilan ? Number(latestBilan.scope2_emission) : 0;
  const totalEmissions = scope1 + scope2;
  const totalEmissionsTonnes = totalEmissions / 1000;

  // Calculer les intensités carbone
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

  const numberOfEmployees = companyData?.collaborateurs || getEmployeeCount('1-10');
  const surfaceArea = 100; // m² - valeur par défaut si pas de donnée
  const annualRevenue = companyData?.ca_annuel || 100000; // CA par défaut

  const perEmployeeEmissions = totalEmissionsTonnes / numberOfEmployees;
  const perSquareMeterEmissions = (totalEmissionsTonnes / surfaceArea); // tCO2e/m²
  const perRevenueEmissions = totalEmissionsTonnes / (annualRevenue / 1000000); // tCO2e par million CA

  // Données pour le graphique camembert
  const pieData = [
    { name: 'Scope 1', value: scope1 / 1000, color: '#10B981' }, // Vert
    { name: 'Scope 2', value: scope2 / 1000, color: '#06B6D4' }  // Bleu turquoise
  ];

  const COLORS = ['#10B981', '#06B6D4'];

  // Données pour les postes les plus émetteurs
  const getTopEmitters = () => {
    
    if (!latestBilan?.questionnaire_data) {
      
      // Utiliser des données par défaut si pas de bilan
      if (scope1 === 0 && scope2 === 0) {
        return [
          { poste: 'Combustibles', emissions: 12.5 },
          { poste: 'Électricité', emissions: 18.2 },
          { poste: 'Transport', emissions: 8.4 },
          { poste: 'Chauffage', emissions: 5.3 }
        ];
      }
      return [
        { poste: 'Combustibles', emissions: (scope1 * 0.6) / 1000 },
        { poste: 'Électricité', emissions: (scope2 * 0.8) / 1000 },
        { poste: 'Transport', emissions: (scope1 * 0.3) / 1000 },
        { poste: 'Chauffage', emissions: (scope2 * 0.2) / 1000 }
      ].filter(item => item.emissions > 0);
    }
    
    const emissions = [];
    const data = latestBilan.questionnaire_data;
    
    
    if (data.combustibleGaz) emissions.push({ poste: 'Gaz naturel', emissions: data.combustibleGaz * 0.227 / 1000 });
    if (data.combustibleFioul) emissions.push({ poste: 'Fioul', emissions: data.combustibleFioul * 0.324 / 1000 });
    if (data.electricite) emissions.push({ poste: 'Électricité', emissions: data.electricite * 0.057 / 1000 });
    if (data.deplacementsVoiture) emissions.push({ poste: 'Véhicules', emissions: data.deplacementsVoiture * 0.193 / 1000 });
    
    
    return emissions.sort((a, b) => b.emissions - a.emissions).slice(0, 4);
  };

  const topEmittersData = getTopEmitters();
  
  const emittersColors = ['#3B82F6', '#06B6D4', '#6B7280', '#A855F7']; // Bleu, bleu turquoise, gris, mauve doux

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };


  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!latestBilan) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-lg text-muted-foreground mb-4">
              Aucun bilan carbone disponible
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Commencez par créer votre premier bilan carbone
            </p>
            <Button 
              onClick={() => navigate('/carbo-start/questionnaire')}
              className="bg-primary hover:bg-primary/90"
            >
              Nouveau bilan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
        <Button 
          variant="outline"
          onClick={() => navigate('/app/bilan-carbone/bilans')}
        >
          Voir l'historique
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {/* Scope 1 */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">SCOPE 1</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-primary">
                  {Math.round(scope1 / 1000)}
                </span>
                <span className="text-sm text-muted-foreground">tCO₂e</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scope 2 */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">SCOPE 2</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-primary">
                  {Math.round(scope2 / 1000)}
                </span>
                <span className="text-sm text-muted-foreground">tCO₂e</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">TOTAL</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-primary">
                  {Math.round(totalEmissions / 1000)}
                </span>
                <span className="text-sm text-muted-foreground">tCO₂e</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intensité par employé */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">PAR EMPLOYÉ</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-primary">
                  {perEmployeeEmissions.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">tCO₂e</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intensité par m² */}
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">PAR M²</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-primary">
                  {perSquareMeterEmissions.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">tCO₂e</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intensité par 1000k CA */}
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">PAR 1000K CA</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-primary">
                  {perRevenueEmissions.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">tCO₂e</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nombre d'évaluations */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">ÉVALUATIONS</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-primary">
                  1
                </span>
                <span className="text-sm text-muted-foreground">bilan</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique camembert par scope */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des émissions par scope</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value.toFixed(1)} tCO₂e`, 'Émissions']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique barres postes les plus émetteurs */}
        <Card>
          <CardHeader>
            <CardTitle>Postes les plus émetteurs</CardTitle>
          </CardHeader>
          <CardContent>
            {topEmittersData.length === 0 || topEmittersData.every(item => item.emissions === 0) ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                <p className="text-lg mb-2">Aucune donnée disponible</p>
                <p className="text-sm text-center">
                  Complétez votre questionnaire pour visualiser la répartition de vos émissions par poste.
                </p>
                <Button 
                  onClick={() => navigate('/carbo-start/questionnaire')}
                  className="mt-4"
                  variant="outline"
                >
                  Compléter le questionnaire
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topEmittersData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="poste" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${formatEmissions(value)}`, 'Émissions']}
                  />
                  <Bar 
                    dataKey="emissions" 
                    name="Émissions" 
                    radius={[4, 4, 0, 0]}
                  >
                    {topEmittersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={emittersColors[index % emittersColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emissions Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Emissions breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <span className="font-medium">Scope 1</span>
                <p className="text-sm text-muted-foreground">Émissions directes</p>
              </div>
              <span className="font-bold text-primary">{formatEmissions(scope1)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <span className="font-medium">Scope 2</span>
                <p className="text-sm text-muted-foreground">Émissions indirectes liées à l'énergie</p>
              </div>
              <span className="font-bold text-primary">{formatEmissions(scope2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};