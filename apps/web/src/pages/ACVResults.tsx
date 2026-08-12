import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { AlertTriangle, FileDown, ArrowLeft, Calculator, TrendingUp, Droplets, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useACVProjects } from '@/hooks/useACVProjects';
import { useToast } from '@/hooks/use-toast';
import { 
  calculateProjectImpacts, 
  saveProjectResults, 
  generateAutomaticComments,
  ImpactSummary,
  CategoryBreakdown,
  CalculatedImpact
} from '@/lib/acvCalculations';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export default function ACVResults() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { projects } = useACVProjects();
  const project = projects.find(p => p.id === projectId);

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [calculatedImpacts, setCalculatedImpacts] = useState<CalculatedImpact[]>([]);
  const [missingFactors, setMissingFactors] = useState<string[]>([]);
  const [comments, setComments] = useState<string[]>([]);

  const calculateResults = async () => {
    if (!projectId) return;

    setCalculating(true);
    try {
      const results = await calculateProjectImpacts(projectId);
      
      setSummary(results.summary);
      setBreakdown(results.breakdown);
      setCalculatedImpacts(results.calculatedImpacts);
      setMissingFactors(results.missingFactors);
      setComments(generateAutomaticComments(results.breakdown));

      // Sauvegarder les résultats
      await saveProjectResults(projectId, results.summary);

      toast({
        title: "Calculs terminés",
        description: "Les résultats d'impact ont été calculés avec succès",
      });

    } catch (error) {
      console.error('Error calculating results:', error);
      toast({
        title: "Erreur",
        description: "Impossible de calculer les résultats",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      calculateResults();
    }
    setLoading(false);
  }, [projectId]);

  const preparePieChartData = (category: 'climate' | 'acidification' | 'water') => {
    return breakdown
      .filter(item => {
        const value = item[category];
        return value > 0;
      })
      .map(item => ({
        name: item.item,
        value: item[category],
        percentage: category === 'climate' ? item.percentage_climate :
                   category === 'acidification' ? item.percentage_acidification :
                   item.percentage_water
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 pour la lisibilité
  };

  const prepareBarChartData = () => {
    if (!summary) return [];

    return [
      {
        category: 'Changement climatique',
        value: summary.climate.value,
        unit: summary.climate.unit,
        icon: '🌡️'
      },
      {
        category: 'Acidification',
        value: summary.acidification.value,
        unit: summary.acidification.unit,
        icon: '🌧️'
      },
      {
        category: 'Consommation d\'eau',
        value: summary.water.value,
        unit: summary.water.unit,
        icon: '💧'
      }
    ];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-medium">{`${label}`}</p>
          <p className="text-blue-600">
            {`${payload[0].value.toLocaleString()} ${data.unit}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-blue-600">
            {`${data.percentage.toFixed(1)}%`}
          </p>
          <p className="text-gray-600">
            {`${data.value.toLocaleString()}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Projet non trouvé</h2>
        <Button onClick={() => navigate('/acv')}>
          Retour au dashboard
        </Button>
      </div>
    );
  }

  if (loading || calculating) {
    return (
      <div className="text-center py-12">
        <Calculator className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {calculating ? 'Calcul des impacts en cours...' : 'Chargement...'}
        </h2>
        <p className="text-gray-600">
          Analyse des données d'inventaire et calcul des impacts environnementaux
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts pour les facteurs manquants */}
      {missingFactors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Facteurs d'impact manquants :</strong>
            <ul className="mt-2 ml-4 list-disc">
              {missingFactors.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">
              Ces éléments ne sont pas inclus dans les calculs. 
              Contactez l'administrateur pour ajouter les facteurs manquants.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={calculateResults}
            disabled={calculating}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Recalculer
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/acv/projet/${projectId}/inventaire`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'inventaire
          </Button>
          <Button disabled>
            <FileDown className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
        </div>
      </div>

      {summary && (
        <>
          {/* Tableau récapitulatif */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Résultats d'impact environnemental
              </CardTitle>
              <CardDescription>
                Impacts totaux du projet selon les catégories d'impact ISO 14040
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie d'impact</TableHead>
                    <TableHead>Valeur totale</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Indicateur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        🌡️ Changement climatique
                      </div>
                    </TableCell>
                    <TableCell className="text-lg font-semibold">
                      {summary.climate.value.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{summary.climate.unit}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      Potentiel de réchauffement global (GWP)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        🌧️ Acidification
                      </div>
                    </TableCell>
                    <TableCell className="text-lg font-semibold">
                      {summary.acidification.value.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{summary.acidification.unit}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      Potentiel d'acidification atmosphérique (AP)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        💧 Consommation d'eau
                      </div>
                    </TableCell>
                    <TableCell className="text-lg font-semibold">
                      {summary.water.value.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{summary.water.unit}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      Consommation d'eau douce (WDP)
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique en barres */}
            <Card>
              <CardHeader>
                <CardTitle>Comparaison des impacts</CardTitle>
                <CardDescription>
                  Vue d'ensemble des trois catégories d'impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareBarChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="category" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Commentaires automatiques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Analyse automatique
                </CardTitle>
                <CardDescription>
                  Points clés des résultats d'impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comments.map((comment, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphiques en camembert par catégorie */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des impacts par source</CardTitle>
              <CardDescription>
                Contribution de chaque élément aux différentes catégories d'impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="climate" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="climate">🌡️ Changement climatique</TabsTrigger>
                  <TabsTrigger value="acidification">🌧️ Acidification</TabsTrigger>
                  <TabsTrigger value="water">💧 Eau</TabsTrigger>
                </TabsList>

                <TabsContent value="climate">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={preparePieChartData('climate')}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {preparePieChartData('climate').map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="acidification">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={preparePieChartData('acidification')}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                        outerRadius={120}
                        fill="#82ca9d"
                        dataKey="value"
                      >
                        {preparePieChartData('acidification').map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="water">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={preparePieChartData('water')}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                        outerRadius={120}
                        fill="#ffc658"
                        dataKey="value"
                      >
                        {preparePieChartData('water').map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Détails des calculs */}
          <Card>
            <CardHeader>
              <CardTitle>Détail des calculs</CardTitle>
              <CardDescription>
                Impact détaillé de chaque élément de l'inventaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Élément</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Climat (tCO2e)</TableHead>
                      <TableHead>Acidification (kg SO2e)</TableHead>
                      <TableHead>Eau (m³)</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculatedImpacts.map((impact) => (
                      <TableRow key={impact.inventoryItemId}>
                        <TableCell className="font-medium">{impact.item}</TableCell>
                        <TableCell>{impact.category}</TableCell>
                        <TableCell>
                          {impact.quantity.toLocaleString()} {impact.unit}
                        </TableCell>
                        <TableCell>{impact.climate.toFixed(3)}</TableCell>
                        <TableCell>{impact.acidification.toFixed(3)}</TableCell>
                        <TableCell>{impact.water.toFixed(3)}</TableCell>
                        <TableCell>
                          {impact.warning ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Facteur manquant
                            </Badge>
                          ) : (
                            <Badge variant="default">Calculé</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}