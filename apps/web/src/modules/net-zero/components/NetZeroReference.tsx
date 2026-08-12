// Écran 2: Périmètre & année de référence

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { NetZeroTrajectoryCalculator } from '@/lib/net-zero/NetZeroTrajectoryCalculator';
import { NetZeroService } from '@/lib/net-zero/NetZeroService';
import { NetZeroReference as NetZeroReferenceType, ScopeInclusion } from '@/lib/net-zero/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NetZeroReference: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganizationId();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [reference, setReference] = useState<Partial<NetZeroReferenceType>>({
    reference_year: new Date().getFullYear() - 1,
    scopes_included: '1,2,3',
    calculation_method: 'GHG Protocol',
    locked: false,
  });
  const [referenceEmissions, setReferenceEmissions] = useState<number | null>(null);

  useEffect(() => {
    const loadAvailableYears = async () => {
      if (!organizationId) return;

      try {
        setLoading(true);
        const accessCheck = await NetZeroTrajectoryCalculator.canAccessNetZero(organizationId);
        if (accessCheck.canAccess) {
          setAvailableYears(accessCheck.availableYears);
        }

        // Charger la trajectoire existante si elle existe
        const trajectory = await NetZeroService.getTrajectory(organizationId);
        if (trajectory?.reference) {
          setReference(trajectory.reference);
          setReferenceEmissions(trajectory.reference.reference_emissions);
        }
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAvailableYears();
  }, [organizationId]);

  const handleCalculateEmissions = async () => {
    if (!organizationId || !reference.reference_year || !reference.scopes_included) return;

    try {
      setLoading(true);
      const historicalData = await NetZeroTrajectoryCalculator.getHistoricalEmissions(
        organizationId,
        reference.reference_year,
        reference.reference_year,
        reference.scopes_included as ScopeInclusion
      );

      if (historicalData.length > 0) {
        setReferenceEmissions(historicalData[0].emissions);
      } else {
        toast.error('Aucune donnée trouvée pour cette année');
      }
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId || !reference.reference_year || !referenceEmissions) {
      toast.error('Veuillez compléter tous les champs et calculer les émissions');
      return;
    }

    try {
      setSaving(true);
      const referenceData: NetZeroReferenceType = {
        reference_year: reference.reference_year,
        reference_emissions: referenceEmissions,
        scopes_included: reference.scopes_included as ScopeInclusion,
        calculation_method: reference.calculation_method || 'GHG Protocol',
        locked: false,
      };

      await NetZeroService.lockReference(organizationId, referenceData);
      toast.success('Année de référence enregistrée');
      navigate('/app/decarbotech/trajectoire/objectifs');
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !referenceEmissions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Périmètre & année de référence</h1>
        <p className="text-muted-foreground mt-1">
          Définissez l'année de référence et les scopes inclus dans votre trajectoire Net Zero
        </p>
      </div>

      {reference.locked && (
        <Alert className="bg-blue-50 border-blue-200">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Cette configuration est verrouillée et ne peut plus être modifiée.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuration de référence</CardTitle>
          <CardDescription>
            Une fois validée, cette configuration sera verrouillée pour garantir la cohérence de votre trajectoire.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reference_year">Année de référence</Label>
            <Select
              value={reference.reference_year?.toString()}
              onValueChange={(value) =>
                setReference({ ...reference, reference_year: parseInt(value) })
              }
              disabled={reference.locked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une année" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Année pour laquelle vous disposez d'un bilan carbone complet
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scopes">Scopes inclus</Label>
            <Select
              value={String(reference.scopes_included)}
              onValueChange={(value) =>
                setReference({ ...reference, scopes_included: value as ScopeInclusion })
              }
              disabled={reference.locked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Scope 1 uniquement</SelectItem>
                <SelectItem value="2">Scope 2 uniquement</SelectItem>
                <SelectItem value="3">Scope 3 uniquement</SelectItem>
                <SelectItem value="1,2">Scopes 1 et 2</SelectItem>
                <SelectItem value="1,2,3">Scopes 1, 2 et 3 (recommandé)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Méthode de calcul</Label>
            <Select
              value={reference.calculation_method}
              onValueChange={(value) =>
                setReference({ ...reference, calculation_method: value })
              }
              disabled={reference.locked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GHG Protocol">GHG Protocol</SelectItem>
                <SelectItem value="ISO 14064">ISO 14064</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Émissions de référence</Label>
            {referenceEmissions !== null ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-2xl font-bold text-green-800">
                  {Math.round(referenceEmissions)} tCO₂e
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Année {reference.reference_year} - Scopes {reference.scopes_included}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Cliquez sur "Calculer les émissions" pour récupérer les données de votre bilan carbone
                </p>
              </div>
            )}
            {!reference.locked && (
              <Button
                onClick={handleCalculateEmissions}
                disabled={loading || !reference.reference_year}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calcul en cours...
                  </>
                ) : (
                  'Calculer les émissions'
                )}
              </Button>
            )}
          </div>

          {!reference.locked && (
            <div className="flex gap-4 pt-4">
              <Button onClick={handleSave} disabled={!referenceEmissions || saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Valider et verrouiller'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/app/decarbotech/trajectoire')}
              >
                Annuler
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Une fois validée, cette configuration ne pourra plus être modifiée
          pour garantir la cohérence de votre trajectoire Net Zero.
        </AlertDescription>
      </Alert>
    </div>
  );
};

