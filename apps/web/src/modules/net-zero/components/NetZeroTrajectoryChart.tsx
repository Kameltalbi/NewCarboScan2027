// Écran 4: Trajectoire cible

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { NetZeroService } from '@/lib/net-zero/NetZeroService';
import { NetZeroTrajectoryCalculator } from '@/lib/net-zero/NetZeroTrajectoryCalculator';
import { NetZeroTrajectory, AnnualTrajectoryPoint } from '@/lib/net-zero/types';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const NetZeroTrajectoryChart: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganizationId();
  const [loading, setLoading] = useState(true);
  const [trajectory, setTrajectory] = useState<NetZeroTrajectory | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{ year: number; emissions: number }>>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;

      try {
        setLoading(true);
        const savedTrajectory = await NetZeroService.getTrajectory(organizationId);
        if (!savedTrajectory || !savedTrajectory.reference || savedTrajectory.base_trajectory.length === 0) {
          toast.error('Veuillez d\'abord définir vos objectifs');
          navigate('/app/decarbotech/trajectoire/objectives');
          return;
        }

        setTrajectory(savedTrajectory);

        // Charger les données historiques
        const currentYear = new Date().getFullYear();
        const historical = await NetZeroTrajectoryCalculator.getHistoricalEmissions(
          organizationId,
          savedTrajectory.reference.reference_year,
          currentYear,
          savedTrajectory.reference.scopes_included
        );
        setHistoricalData(historical);
      } catch (err: any) {
        toast.error(`Erreur: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trajectory || trajectory.base_trajectory.length === 0) {
    return null;
  }

  // Préparer les données pour le graphique
  const chartData = trajectory.base_trajectory.map((point) => {
    const actual = historicalData.find((d) => d.year === point.year)?.emissions;
    const gap = actual ? actual - point.target_emissions : null;

    return {
      year: point.year,
      target: Math.round(point.target_emissions * 10) / 10,
      actual: actual ? Math.round(actual * 10) / 10 : null,
      gap: gap ? Math.round(gap * 10) / 10 : null,
      reductionPercent: Math.round(point.reduction_percent * 10) / 10,
    };
  });

  const currentYear = new Date().getFullYear();
  const currentPoint = trajectory.base_trajectory.find((p) => p.year === currentYear);
  const currentActual = historicalData.find((d) => d.year === currentYear)?.emissions;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trajectoire cible</h1>
        <p className="text-muted-foreground mt-1">
          Visualisez votre trajectoire de réduction et comparez-la avec vos émissions réelles
        </p>
      </div>

      {/* Graphique principal */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution annuelle</CardTitle>
          <CardDescription>
            Trajectoire cible vs émissions réelles (année de référence: {trajectory.reference.reference_year})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={500}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1ABC9C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1ABC9C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'tCO₂e', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} tCO₂e`,
                  name === 'target' ? 'Trajectoire cible' : name === 'actual' ? 'Émissions réelles' : 'Écart',
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="target"
                stroke="#1ABC9C"
                strokeWidth={2}
                fill="url(#colorTarget)"
                name="Trajectoire cible"
              />
              {currentActual && (
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#0F172A"
                  strokeWidth={2}
                  fill="url(#colorActual)"
                  name="Émissions réelles"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tableau des années intermédiaires */}
      <Card>
        <CardHeader>
          <CardTitle>Années intermédiaires</CardTitle>
          <CardDescription>Détail année par année de la trajectoire</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Année</th>
                  <th className="text-right p-3">Cible (tCO₂e)</th>
                  <th className="text-right p-3">Réel (tCO₂e)</th>
                  <th className="text-right p-3">Écart</th>
                  <th className="text-right p-3">Réduction vs référence</th>
                  <th className="text-center p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {trajectory.base_trajectory.map((point) => {
                  const actual = historicalData.find((d) => d.year === point.year)?.emissions;
                  const gap = actual ? actual - point.target_emissions : null;
                  const gapPercent = gap && point.target_emissions > 0 ? (gap / point.target_emissions) * 100 : null;

                  let status: 'achieved' | 'on-track' | 'at-risk' | 'planned' = 'planned';
                  if (point.year < currentYear && actual) {
                    if (gap && gap <= 0) status = 'achieved';
                    else if (gap && gapPercent && gapPercent <= 5) status = 'on-track';
                    else status = 'at-risk';
                  }

                  return (
                    <tr key={point.year} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{point.year}</td>
                      <td className="p-3 text-right">{Math.round(point.target_emissions)}</td>
                      <td className="p-3 text-right">
                        {actual ? Math.round(actual) : '--'}
                      </td>
                      <td className={`p-3 text-right ${gap && gap > 0 ? 'text-red-600' : gap && gap <= 0 ? 'text-green-600' : ''}`}>
                        {gap !== null ? `${gap > 0 ? '+' : ''}${Math.round(gap)}` : '--'}
                      </td>
                      <td className="p-3 text-right">{Math.round(point.reduction_percent)}%</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={
                            status === 'achieved'
                              ? 'default'
                              : status === 'on-track'
                              ? 'secondary'
                              : status === 'at-risk'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {status === 'achieved'
                            ? 'Atteint'
                            : status === 'on-track'
                            ? 'Sur la bonne voie'
                            : status === 'at-risk'
                            ? 'À risque'
                            : 'Planifié'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Résumé */}
      {currentPoint && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Année actuelle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentYear}</div>
              <p className="text-xs text-muted-foreground">Cible: {Math.round(currentPoint.target_emissions)} tCO₂e</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Émissions réelles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentActual ? Math.round(currentActual) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">tCO₂e</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Écart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${currentActual && currentActual > currentPoint.target_emissions ? 'text-red-600' : 'text-green-600'}`}>
                {currentActual
                  ? `${currentActual > currentPoint.target_emissions ? '+' : ''}${Math.round(currentActual - currentPoint.target_emissions)}`
                  : '--'}
              </div>
              <p className="text-xs text-muted-foreground">tCO₂e</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-4">
        <Button onClick={() => navigate('/app/decarbotech/trajectoire/levers')} className="flex-1">
          Ajouter des leviers de réduction <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/decarbotech/trajectoire')}>
          Retour
        </Button>
      </div>
    </div>
  );
};

