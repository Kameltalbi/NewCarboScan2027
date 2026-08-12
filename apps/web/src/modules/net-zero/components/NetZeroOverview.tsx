// Écran 1: Vue d'ensemble Net Zéro

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { NetZeroTrajectoryCalculator } from '@/lib/net-zero/NetZeroTrajectoryCalculator';
import { NetZeroService } from '@/lib/net-zero/NetZeroService';
import { NetZeroTrajectory, NetZeroOverview as NetZeroOverviewType } from '@/lib/net-zero/types';
import { Loader2 } from 'lucide-react';

export const NetZeroOverview: React.FC = () => {
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const [overview, setOverview] = useState<NetZeroOverviewType | null>(null);
  const [trajectory, setTrajectory] = useState<NetZeroTrajectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;

      try {
        setLoading(true);
        setError(null);

        // Vérifier l'accès
        const accessCheck = await NetZeroTrajectoryCalculator.canAccessNetZero(organizationId);
        if (!accessCheck.canAccess) {
          setError(accessCheck.reason || 'Accès non autorisé');
          setLoading(false);
          return;
        }

        // Charger la trajectoire
        const savedTrajectory = await NetZeroService.getTrajectory(organizationId);
        if (!savedTrajectory) {
          setError('Aucune trajectoire Net Zero configurée. Veuillez commencer par définir votre année de référence.');
          setLoading(false);
          return;
        }

        setTrajectory(savedTrajectory);

        // Calculer la vue d'ensemble
        const currentYear = new Date().getFullYear();
        const reference = savedTrajectory.reference;
        const currentObjective = savedTrajectory.objectives.find((o) => o.horizon === 'net-zero') || savedTrajectory.objectives[0];

        if (!currentObjective) {
          setError('Aucun objectif Net Zero défini.');
          setLoading(false);
          return;
        }

        // Récupérer les émissions actuelles
        const historicalData = await NetZeroTrajectoryCalculator.getHistoricalEmissions(
          organizationId,
          reference.reference_year,
          currentYear,
          reference.scopes_included
        );

        const currentEmissions = historicalData.find((d) => d.year === currentYear)?.emissions;
        const referenceEmissions = reference.reference_emissions;

        // Calculer le % de réduction atteint
        const reductionAchieved = currentEmissions
          ? ((referenceEmissions - currentEmissions) / referenceEmissions) * 100
          : 0;

        // Calculer l'écart vs trajectoire
        const currentTrajectoryPoint = savedTrajectory.base_trajectory.find((p) => p.year === currentYear);
        const trajectoryGap = currentEmissions && currentTrajectoryPoint
          ? currentEmissions - currentTrajectoryPoint.target_emissions
          : undefined;

        // Créer les jalons
        const milestones = savedTrajectory.base_trajectory
          .filter((p) => p.year % 5 === 0 || p.year === currentObjective.target_year)
          .map((point) => {
            const actual = historicalData.find((d) => d.year === point.year)?.emissions;
            const gap = actual ? actual - point.target_emissions : undefined;
            let status: 'achieved' | 'on-track' | 'at-risk' | 'planned' = 'planned';
            if (point.year < currentYear && actual) {
              if (gap && gap <= 0) status = 'achieved';
              else if (gap && gap <= point.target_emissions * 0.05) status = 'on-track';
              else status = 'at-risk';
            }

            return {
              year: point.year,
              target: point.target_emissions,
              actual,
              status,
            };
          });

        setOverview({
          reference_year: reference.reference_year,
          reference_emissions: referenceEmissions,
          target_year: currentObjective.target_year,
          current_year: currentYear,
          current_emissions: currentEmissions,
          reduction_achieved_percent: reductionAchieved,
          trajectory_gap: trajectoryGap,
          milestones,
        });
      } catch (err: any) {
        console.error('Erreur lors du chargement:', err);
        setError(err.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    if (!orgLoading) {
      loadData();
    }
  }, [organizationId, orgLoading]);

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Accès non autorisé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!overview || !trajectory) {
    return null;
  }

  // Préparer les données pour le graphique
  const chartData = trajectory.base_trajectory.map((point) => {
    const actual = overview.milestones.find((m) => m.year === point.year)?.actual;
    return {
      year: point.year,
      target: Math.round(point.target_emissions * 10) / 10,
      actual: actual ? Math.round(actual * 10) / 10 : null,
    };
  });

  const gapStatus = overview.trajectory_gap
    ? overview.trajectory_gap <= 0
      ? 'achieved'
      : overview.trajectory_gap <= overview.current_emissions! * 0.05
      ? 'on-track'
      : 'at-risk'
    : 'planned';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trajectoire Net Zéro</h1>
        <p className="text-muted-foreground mt-1">Alignée avec les recommandations SBTi</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Année de référence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.reference_year}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(overview.reference_emissions)} tCO₂e
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Objectif Net Zéro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.target_year}</div>
            <p className="text-xs text-muted-foreground">Année cible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Réduction atteinte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overview.current_emissions ? `${Math.round(overview.reduction_achieved_percent)}%` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">vs année de référence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Écart vs trajectoire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {gapStatus === 'achieved' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {gapStatus === 'on-track' && <Target className="h-5 w-5 text-blue-600" />}
              {gapStatus === 'at-risk' && <AlertTriangle className="h-5 w-5 text-orange-600" />}
              <div className="text-2xl font-bold">
                {overview.trajectory_gap !== undefined
                  ? `${overview.trajectory_gap > 0 ? '+' : ''}${Math.round(overview.trajectory_gap)}`
                  : '--'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">tCO₂e</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique */}
      <Card>
        <CardHeader>
          <CardTitle>Émissions réelles vs trajectoire cible</CardTitle>
          <CardDescription>
            Évolution des émissions et comparaison avec la trajectoire Net Zero
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'tCO₂e', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#1ABC9C"
                strokeWidth={2}
                name="Trajectoire cible"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#0F172A"
                strokeWidth={2}
                name="Émissions réelles"
                dot={{ r: 5 }}
                strokeDasharray={overview.current_emissions ? '0' : '5 5'}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Jalons */}
      <Card>
        <CardHeader>
          <CardTitle>Jalons clés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overview.milestones.map((milestone, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      milestone.status === 'achieved'
                        ? 'bg-green-600'
                        : milestone.status === 'on-track'
                        ? 'bg-blue-600'
                        : milestone.status === 'at-risk'
                        ? 'bg-orange-600'
                        : 'bg-gray-300'
                    }`}
                  />
                  <span className="font-medium">{milestone.year}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Cible: {Math.round(milestone.target)} tCO₂e
                    </div>
                    {milestone.actual !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        Réel: {Math.round(milestone.actual)} tCO₂e
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={
                      milestone.status === 'achieved'
                        ? 'default'
                        : milestone.status === 'on-track'
                        ? 'secondary'
                        : milestone.status === 'at-risk'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {milestone.status === 'achieved'
                      ? 'Atteint'
                      : milestone.status === 'on-track'
                      ? 'Sur la bonne voie'
                      : milestone.status === 'at-risk'
                      ? 'À risque'
                      : 'Planifié'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mention légale */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            <strong>Note importante:</strong> Cette trajectoire est alignée avec les recommandations de la Science
            Based Targets initiative (SBTi). La validation officielle des objectifs reste du ressort de la SBTi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

