// Écran 6: Simulation de scénarios

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { NetZeroService } from '@/lib/net-zero/NetZeroService';
import { NetZeroTrajectoryCalculator } from '@/lib/net-zero/NetZeroTrajectoryCalculator';
import { NetZeroTrajectory, NetZeroScenario } from '@/lib/net-zero/types';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const NetZeroScenarios: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganizationId();
  const [loading, setLoading] = useState(true);
  const [trajectory, setTrajectory] = useState<NetZeroTrajectory | null>(null);
  const [selectedLevers, setSelectedLevers] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<NetZeroScenario[]>([]);

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
        setScenarios(savedTrajectory.scenarios || []);
        setSelectedLevers(savedTrajectory.levers.filter((l) => l.enabled).map((l) => l.id));
      } catch (err: any) {
        toast.error(`Erreur: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, navigate]);

  const handleToggleLever = (leverId: string) => {
    setSelectedLevers((prev) =>
      prev.includes(leverId) ? prev.filter((id) => id !== leverId) : [...prev, leverId]
    );
  };

  const handleCreateScenario = async (type: 'conservative' | 'ambitious' | 'accelerated') => {
    if (!organizationId || !trajectory || selectedLevers.length === 0) {
      toast.error('Veuillez sélectionner au moins un levier');
      return;
    }

    try {
      const scenario = NetZeroTrajectoryCalculator.createScenario(
        type === 'conservative' ? 'Scénario conservateur' : type === 'ambitious' ? 'Scénario ambitieux' : 'Scénario accéléré',
        type,
        trajectory.base_trajectory,
        trajectory.levers,
        selectedLevers
      );

      await NetZeroService.updateScenario(organizationId, scenario);
      setScenarios([...scenarios, scenario]);
      toast.success('Scénario créé');
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trajectory || trajectory.levers.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Veuillez d'abord ajouter des leviers de réduction
            </p>
            <Button onClick={() => navigate('/app/decarbotech/trajectoire/levers')}>
              Ajouter des leviers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Préparer les données pour le graphique comparatif
  const chartData = trajectory.base_trajectory.map((point) => {
    const data: any = {
      year: point.year,
      base: Math.round(point.target_emissions * 10) / 10,
    };

    scenarios.forEach((scenario) => {
      const scenarioPoint = scenario.trajectory.find((p) => p.year === point.year);
      if (scenarioPoint) {
        data[scenario.name] = Math.round(scenarioPoint.target_emissions * 10) / 10;
      }
    });

    return data;
  });

  const colors: Record<string, string> = {
    'Scénario conservateur': '#3B82F6',
    'Scénario ambitieux': '#10B981',
    'Scénario accéléré': '#F59E0B',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Simulation de scénarios</h1>
        <p className="text-muted-foreground mt-1">
          Comparez différents scénarios en activant ou désactivant des leviers de réduction
        </p>
      </div>

      {/* Sélection des leviers */}
      <Card>
        <CardHeader>
          <CardTitle>Leviers à activer</CardTitle>
          <CardDescription>Sélectionnez les leviers à inclure dans votre scénario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trajectory.levers.map((lever) => (
              <div key={lever.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                <Checkbox
                  id={lever.id}
                  checked={selectedLevers.includes(lever.id)}
                  onCheckedChange={() => handleToggleLever(lever.id)}
                />
                <Label htmlFor={lever.id} className="flex-1 cursor-pointer">
                  <div className="font-medium">{lever.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Impact: -{Math.round(lever.estimated_impact)} tCO₂e/an
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Création de scénarios */}
      <Card>
        <CardHeader>
          <CardTitle>Créer un scénario</CardTitle>
          <CardDescription>
            Générer un scénario avec les leviers sélectionnés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => handleCreateScenario('conservative')}
              disabled={selectedLevers.length === 0}
              className="h-auto p-4 flex-col"
            >
              <div className="font-semibold mb-2">Conservateur</div>
              <div className="text-xs text-muted-foreground">
                Réduction progressive et réaliste
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateScenario('ambitious')}
              disabled={selectedLevers.length === 0}
              className="h-auto p-4 flex-col"
            >
              <div className="font-semibold mb-2">Ambitieux</div>
              <div className="text-xs text-muted-foreground">
                Objectifs plus élevés
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateScenario('accelerated')}
              disabled={selectedLevers.length === 0}
              className="h-auto p-4 flex-col"
            >
              <div className="font-semibold mb-2">Accéléré</div>
              <div className="text-xs text-muted-foreground">
                Réduction maximale rapide
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Graphique comparatif */}
      {scenarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparaison des scénarios</CardTitle>
            <CardDescription>Visualisez les trajectoires de chaque scénario</CardDescription>
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
                  dataKey="base"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  name="Trajectoire de base"
                  strokeDasharray="5 5"
                />
                {scenarios.map((scenario) => (
                  <Line
                    key={scenario.id}
                    type="monotone"
                    dataKey={scenario.name}
                    stroke={colors[scenario.name] || '#1ABC9C'}
                    strokeWidth={2}
                    name={scenario.name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Liste des scénarios */}
      {scenarios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <Card key={scenario.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{scenario.name}</CardTitle>
                  <Badge
                    variant={
                      scenario.type === 'conservative'
                        ? 'secondary'
                        : scenario.type === 'ambitious'
                        ? 'default'
                        : 'outline'
                    }
                  >
                    {scenario.type === 'conservative'
                      ? 'Conservateur'
                      : scenario.type === 'ambitious'
                      ? 'Ambitieux'
                      : 'Accéléré'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Réduction totale</div>
                  <div className="text-xl font-bold text-green-600">
                    -{Math.round(scenario.total_reduction)} tCO₂e
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Score de faisabilité</div>
                  <div className="text-lg font-semibold">{scenario.feasibility_score}/100</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Leviers activés</div>
                  <div className="text-sm">{scenario.levers_enabled.length} leviers</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        <Button onClick={() => navigate('/app/decarbotech/trajectoire/tracking')} className="flex-1">
          Suivre l'évolution <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/decarbotech/trajectoire')}>
          Retour
        </Button>
      </div>
    </div>
  );
};

