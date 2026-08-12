// Écran 7: Suivi annuel

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, CheckCircle2, Target, TrendingDown } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { NetZeroService } from '@/lib/net-zero/NetZeroService';
import { NetZeroTrajectoryCalculator } from '@/lib/net-zero/NetZeroTrajectoryCalculator';
import { NetZeroTrajectory } from '@/lib/net-zero/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NetZeroTracking: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganizationId();
  const [loading, setLoading] = useState(true);
  const [trajectory, setTrajectory] = useState<NetZeroTrajectory | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{ year: number; emissions: number }>>([]);
  const [alerts, setAlerts] = useState<Array<{ year: number; message: string; severity: 'warning' | 'error' }>>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;

      try {
        setLoading(true);
        const savedTrajectory = await NetZeroService.getTrajectory(organizationId);
        if (!savedTrajectory || savedTrajectory.base_trajectory.length === 0) {
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

        // Générer les alertes
        const newAlerts: Array<{ year: number; message: string; severity: 'warning' | 'error' }> = [];
        historical.forEach((data) => {
          const targetPoint = savedTrajectory.base_trajectory.find((p) => p.year === data.year);
          if (targetPoint) {
            const gap = data.emissions - targetPoint.target_emissions;
            const gapPercent = (gap / targetPoint.target_emissions) * 100;

            if (gapPercent > 10) {
              newAlerts.push({
                year: data.year,
                message: `Écart important en ${data.year}: +${Math.round(gap)} tCO₂e (+${Math.round(gapPercent)}%)`,
                severity: 'error',
              });
            } else if (gapPercent > 5) {
              newAlerts.push({
                year: data.year,
                message: `Écart modéré en ${data.year}: +${Math.round(gap)} tCO₂e (+${Math.round(gapPercent)}%)`,
                severity: 'warning',
              });
            }
          }
        });
        setAlerts(newAlerts);
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

  if (!trajectory) {
    return null;
  }

  // Préparer les données pour le graphique
  const trackingData = trajectory.base_trajectory
    .filter((point) => point.year <= new Date().getFullYear() + 5)
    .map((point) => {
      const actual = historicalData.find((d) => d.year === point.year)?.emissions;
      const gap = actual ? actual - point.target_emissions : null;
      const gapPercent = gap && point.target_emissions > 0 ? (gap / point.target_emissions) * 100 : null;

      let status: 'achieved' | 'on-track' | 'at-risk' | 'planned' = 'planned';
      if (point.year <= new Date().getFullYear() && actual) {
        if (gap && gap <= 0) status = 'achieved';
        else if (gap && gapPercent && gapPercent <= 5) status = 'on-track';
        else status = 'at-risk';
      }

      return {
        year: point.year,
        target: Math.round(point.target_emissions * 10) / 10,
        actual: actual ? Math.round(actual * 10) / 10 : null,
        gap: gap ? Math.round(gap * 10) / 10 : null,
        status,
      };
    });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Suivi annuel</h1>
        <p className="text-muted-foreground mt-1">
          Comparez vos émissions réelles avec votre trajectoire cible année par année
        </p>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              className={alert.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}
            >
              <AlertTriangle className={`h-4 w-4 ${alert.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}`} />
              <AlertDescription className={alert.severity === 'error' ? 'text-red-800' : 'text-yellow-800'}>
                {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Graphique de suivi */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution vs trajectoire</CardTitle>
          <CardDescription>Comparaison année par année</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={trackingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'tCO₂e', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="target" fill="#1ABC9C" name="Trajectoire cible" />
              <Bar dataKey="actual" fill="#0F172A" name="Émissions réelles" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tableau de suivi */}
      <Card>
        <CardHeader>
          <CardTitle>Historique multi-années</CardTitle>
          <CardDescription>Détail du suivi année par année</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Année</th>
                  <th className="text-right p-3">Cible (tCO₂e)</th>
                  <th className="text-right p-3">Réel (tCO₂e)</th>
                  <th className="text-right p-3">Écart (tCO₂e)</th>
                  <th className="text-center p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {trackingData.map((data) => (
                  <tr key={data.year} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{data.year}</td>
                    <td className="p-3 text-right">{data.target}</td>
                    <td className="p-3 text-right">{data.actual !== null ? data.actual : '--'}</td>
                    <td
                      className={`p-3 text-right ${
                        data.gap !== null ? (data.gap > 0 ? 'text-red-600' : 'text-green-600') : ''
                      }`}
                    >
                      {data.gap !== null ? `${data.gap > 0 ? '+' : ''}${data.gap}` : '--'}
                    </td>
                    <td className="p-3 text-center">
                      {data.status === 'achieved' && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Atteint
                        </Badge>
                      )}
                      {data.status === 'on-track' && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Target className="mr-1 h-3 w-3" />
                          Sur la bonne voie
                        </Badge>
                      )}
                      {data.status === 'at-risk' && (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          À risque
                        </Badge>
                      )}
                      {data.status === 'planned' && (
                        <Badge variant="outline">Planifié</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Années suivies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trackingData.filter((d) => d.actual !== null).length}
            </div>
            <p className="text-xs text-muted-foreground">sur {trackingData.length} années</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Objectifs atteints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {trackingData.filter((d) => d.status === 'achieved').length}
            </div>
            <p className="text-xs text-muted-foreground">années</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertes actives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">dérives détectées</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => navigate('/app/decarbotech/trajectoire/reporting')} className="flex-1">
          Générer le rapport
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/decarbotech/trajectoire')}>
          Retour
        </Button>
      </div>
    </div>
  );
};

