// Page dédiée à la visualisation et l'analyse de la MACC
// Affiche la priorisation détaillée des actions avec statistiques

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingDown, DollarSign, Target, Zap } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { NetZeroService } from '@/lib/net-zero/NetZeroService';
import { MACCCalculator } from '@/lib/net-zero/MACCCalculator';
import { MACCChart } from '@/components/net-zero/MACCChart';
import { MACCPoint } from '@/lib/net-zero/macc-types';
import { Loader2 } from 'lucide-react';

export const NetZeroMACCPage: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganizationId();
  const [loading, setLoading] = useState(true);
  const [maccPoints, setMaccPoints] = useState<MACCPoint[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;

      try {
        const trajectory = await NetZeroService.getTrajectory(organizationId);
        if (trajectory) {
          const calculated = MACCCalculator.calculateMACC(trajectory.levers);
          setMaccPoints(calculated);
        }
      } catch (err) {
        console.error('Erreur chargement MACC:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId]);

  const stats = useMemo(() => {
    if (maccPoints.length === 0) {
      return null;
    }
    return MACCCalculator.calculateMACCStats(maccPoints);
  }, [maccPoints]);

  const quickWins = useMemo(() => {
    return MACCCalculator.getQuickWins(maccPoints);
  }, [maccPoints]);

  const noRegretActions = useMemo(() => {
    return MACCCalculator.getNoRegretActions(maccPoints);
  }, [maccPoints]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (maccPoints.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">MACC - Priorisation des actions</h1>
            <p className="text-muted-foreground mt-1">
              Analysez le coût marginal de chaque action de décarbonation
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/app/decarbotech/trajectoire/levers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux leviers
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucune action avec coût défini. Ajoutez des leviers de réduction avec un coût estimé pour visualiser la MACC.
            </p>
            <Button onClick={() => navigate('/app/decarbotech/trajectoire/levers')} className="mt-4">
              Ajouter des leviers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MACC - Priorisation des actions</h1>
          <p className="text-muted-foreground mt-1">
            Courbe de coût marginal d'abattement (Marginal Abatement Cost Curve)
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/decarbotech/trajectoire/levers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux leviers
        </Button>
      </div>

      {/* KPIs globaux */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-600" />
                Quick Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.quick_wins_count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.quick_wins_reduction.toFixed(1)} tCO₂e • Économies: {Math.round(stats.quick_wins_savings)} €
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                Actions No Regret
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.no_regret_count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.no_regret_reduction.toFixed(1)} tCO₂e
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Potentiel total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_reduction.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">tCO₂e</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Coût moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.average_cost_per_tonne)}</div>
              <p className="text-xs text-muted-foreground mt-1">€/tCO₂e</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graphique MACC */}
      <MACCChart maccPoints={maccPoints} height={600} />

      {/* Quick Wins détaillés */}
      {quickWins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Quick Wins - À implémenter en priorité
            </CardTitle>
            <CardDescription>
              Actions qui génèrent des économies (coût négatif)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickWins.map((point) => (
                <div
                  key={point.lever_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{point.lever_name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {point.start_year} - {point.end_year} ({point.duration_years} ans)
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-lg font-bold text-green-600">
                      {Math.round(point.cost_per_tonne)} €/tCO₂e
                    </div>
                    <div className="text-sm text-muted-foreground">
                      -{point.reduction_potential.toFixed(1)} tCO₂e • Économies: {Math.round(Math.abs(point.cost_total))} €
                    </div>
                  </div>
                  <Badge className="ml-4 bg-green-100 text-green-800">Rang #{point.macc_rank}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions No Regret détaillées */}
      {noRegretActions.length > 0 && noRegretActions.length > quickWins.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Actions No Regret
            </CardTitle>
            <CardDescription>
              Coût inférieur à 100 €/tCO₂e (prix de marché du carbone)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {noRegretActions
                .filter((p) => !p.is_quick_win)
                .map((point) => (
                  <div
                    key={point.lever_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{point.lever_name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {point.start_year} - {point.end_year} ({point.duration_years} ans)
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-orange-600">
                        {Math.round(point.cost_per_tonne)} €/tCO₂e
                      </div>
                      <div className="text-sm text-muted-foreground">
                        -{point.reduction_potential.toFixed(1)} tCO₂e • Coût: {Math.round(point.cost_total)} €
                      </div>
                    </div>
                    <Badge className="ml-4 bg-orange-100 text-orange-800">Rang #{point.macc_rank}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions coûteuses */}
      {maccPoints.some((p) => !p.is_no_regret) && (
        <Card>
          <CardHeader>
            <CardTitle>Actions à coût élevé</CardTitle>
            <CardDescription>
              Coût supérieur à 100 €/tCO₂e - À envisager après les Quick Wins et No Regret
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {maccPoints
                .filter((p) => !p.is_no_regret)
                .map((point) => (
                  <div
                    key={point.lever_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{point.lever_name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {point.start_year} - {point.end_year} ({point.duration_years} ans)
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-red-600">
                        {Math.round(point.cost_per_tonne)} €/tCO₂e
                      </div>
                      <div className="text-sm text-muted-foreground">
                        -{point.reduction_potential.toFixed(1)} tCO₂e • Coût: {Math.round(point.cost_total)} €
                      </div>
                    </div>
                    <Badge className="ml-4 bg-red-100 text-red-800">Rang #{point.macc_rank}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
