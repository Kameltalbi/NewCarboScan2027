// Écran 3: Définition des objectifs

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { NetZeroService } from '@/lib/net-zero/NetZeroService';
import { NetZeroTrajectoryCalculator } from '@/lib/net-zero/NetZeroTrajectoryCalculator';
import { NetZeroObjective, ObjectiveType, ObjectiveHorizon } from '@/lib/net-zero/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NetZeroObjectives: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganizationId();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reference, setReference] = useState<{ year: number; emissions: number } | null>(null);
  const [objective, setObjective] = useState<Partial<NetZeroObjective>>({
    type: 'absolute',
    horizon: 'near-term',
    target_year: new Date().getFullYear() + 5,
    target_reduction_percent: 30,
  });

  useEffect(() => {
    const loadReference = async () => {
      if (!organizationId) return;

      try {
        setLoading(true);
        const trajectory = await NetZeroService.getTrajectory(organizationId);
        if (trajectory?.reference) {
          setReference({
            year: trajectory.reference.reference_year,
            emissions: trajectory.reference.reference_emissions,
          });
          setObjective((prev) => ({
            ...prev,
            baseline_year: trajectory.reference.reference_year,
            baseline_emissions: trajectory.reference.reference_emissions,
          }));
        }
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReference();
  }, [organizationId]);

  const handleCalculateTrajectory = () => {
    if (!reference || !objective.baseline_year || !objective.target_year || !objective.target_reduction_percent) {
      toast.error('Veuillez compléter tous les champs');
      return;
    }

    const trajectory = NetZeroTrajectoryCalculator.calculateLinearTrajectory(
      objective.baseline_year,
      objective.baseline_emissions!,
      objective.target_year,
      objective.target_reduction_percent
    );

    toast.success(`Trajectoire calculée: ${trajectory.length} points annuels`);
  };

  const handleSave = async () => {
    if (!organizationId || !objective.type || !objective.horizon || !objective.target_year || !objective.target_reduction_percent) {
      toast.error('Veuillez compléter tous les champs');
      return;
    }

    try {
      setSaving(true);
      const newObjective: NetZeroObjective = {
        id: `obj-${Date.now()}`,
        type: objective.type,
        horizon: objective.horizon,
        target_year: objective.target_year,
        target_reduction_percent: objective.target_reduction_percent,
        baseline_year: objective.baseline_year!,
        baseline_emissions: objective.baseline_emissions!,
        intensity_metric: objective.intensity_metric,
        intensity_value: objective.intensity_value,
      };

      await NetZeroService.addObjective(organizationId, newObjective);

      // Calculer et sauvegarder la trajectoire de base
      const baseTrajectory = NetZeroTrajectoryCalculator.calculateLinearTrajectory(
        newObjective.baseline_year,
        newObjective.baseline_emissions,
        newObjective.target_year,
        newObjective.target_reduction_percent
      );

      const trajectory = await NetZeroService.getTrajectory(organizationId);
      if (trajectory) {
        await NetZeroService.saveTrajectory(organizationId, {
          ...trajectory,
          base_trajectory: baseTrajectory,
        });
      }

      toast.success('Objectif enregistré et trajectoire calculée');
      navigate('/app/decarbotech/trajectoire/trajectory');
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reference) {
    return (
      <div className="p-6">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Veuillez d'abord configurer votre année de référence.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/app/decarbotech/trajectoire/reference')} className="mt-4">
          Configurer l'année de référence
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Définition des objectifs</h1>
        <p className="text-muted-foreground mt-1">
          Définissez vos objectifs de réduction alignés avec les recommandations SBTi
        </p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Ce module est conçu pour préparer des objectifs alignés avec la SBTi. La validation officielle reste du ressort de la SBTi.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Type d'objectif</CardTitle>
          <CardDescription>Choisissez le type de réduction que vous souhaitez viser</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={objective.type}
            onValueChange={(value) => setObjective({ ...objective, type: value as ObjectiveType })}
          >
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="absolute" id="absolute" />
              <Label htmlFor="absolute" className="flex-1 cursor-pointer">
                <div className="font-medium">Réduction absolue</div>
                <div className="text-sm text-muted-foreground">
                  Réduction du total des émissions (recommandé pour Net Zero)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="intensity" id="intensity" />
              <Label htmlFor="intensity" className="flex-1 cursor-pointer">
                <div className="font-medium">Réduction d'intensité</div>
                <div className="text-sm text-muted-foreground">
                  Réduction par unité de production ou de chiffre d'affaires
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {objective.type === 'intensity' && (
        <Card>
          <CardHeader>
            <CardTitle>Métrique d'intensité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intensity_metric">Métrique</Label>
              <Input
                id="intensity_metric"
                placeholder="Ex: tCO₂e/M€ de CA"
                value={objective.intensity_metric || ''}
                onChange={(e) => setObjective({ ...objective, intensity_metric: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intensity_value">Valeur de référence</Label>
              <Input
                id="intensity_value"
                type="number"
                placeholder="Ex: 0.5"
                value={objective.intensity_value || ''}
                onChange={(e) => setObjective({ ...objective, intensity_value: parseFloat(e.target.value) || undefined })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Horizon temporel</CardTitle>
          <CardDescription>Choisissez l'horizon de votre objectif</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={objective.horizon}
            onValueChange={(value) => setObjective({ ...objective, horizon: value as ObjectiveHorizon })}
          >
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="near-term" id="near-term" />
              <Label htmlFor="near-term" className="flex-1 cursor-pointer">
                <div className="font-medium">Court terme (Near-term)</div>
                <div className="text-sm text-muted-foreground">
                  Objectif à 5-10 ans (recommandé pour commencer)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="net-zero" id="net-zero" />
              <Label htmlFor="net-zero" className="flex-1 cursor-pointer">
                <div className="font-medium">Long terme (Net Zero)</div>
                <div className="text-sm text-muted-foreground">
                  Objectif Net Zero à long terme (typiquement 2030-2050)
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres de l'objectif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline_year">Année de référence</Label>
              <Input
                id="baseline_year"
                type="number"
                value={objective.baseline_year || reference.year}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">
                {reference.emissions.toFixed(0)} tCO₂e
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_year">Année cible</Label>
              <Input
                id="target_year"
                type="number"
                value={objective.target_year}
                onChange={(e) => setObjective({ ...objective, target_year: parseInt(e.target.value) })}
                min={reference.year + 1}
                max={reference.year + 50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reduction_percent">% de réduction cible</Label>
            <div className="flex items-center gap-4">
              <Input
                id="reduction_percent"
                type="number"
                value={objective.target_reduction_percent}
                onChange={(e) => setObjective({ ...objective, target_reduction_percent: parseFloat(e.target.value) })}
                min={0}
                max={100}
                className="flex-1"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            {objective.target_reduction_percent && objective.baseline_emissions && (
              <p className="text-sm text-muted-foreground">
                Émissions cibles: {Math.round(objective.baseline_emissions * (1 - objective.target_reduction_percent / 100))} tCO₂e
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1 order-1 sm:order-none">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer et calculer la trajectoire'
          )}
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/decarbotech/trajectoire')} className="order-2 sm:order-none">
          Annuler
        </Button>
      </div>
    </div>
  );
};

