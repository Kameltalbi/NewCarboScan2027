// Composant de visualisation de la MACC (Marginal Abatement Cost Curve)
// Affiche les leviers de réduction priorisés par coût/tonne

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MACCPoint } from '@/lib/net-zero/macc-types';

interface MACCChartProps {
  maccPoints: MACCPoint[];
  title?: string;
  description?: string;
  height?: number;
}

export const MACCChart: React.FC<MACCChartProps> = ({
  maccPoints,
  title = 'MACC - Courbe de coût marginal d\'abattement',
  description = 'Priorisation des actions par coût/tonne de CO₂e évitée',
  height = 500,
}) => {
  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    return maccPoints.map((point, index) => ({
      name: point.lever_name,
      costPerTonne: Math.round(point.cost_per_tonne * 10) / 10,
      reductionPotential: point.reduction_potential,
      cumulativeReduction: point.cumulative_reduction,
      rank: point.macc_rank,
      isQuickWin: point.is_quick_win,
      isNoRegret: point.is_no_regret,
      category: point.lever_category,
    }));
  }, [maccPoints]);

  // Fonction pour déterminer la couleur de chaque barre
  const getBarColor = (isQuickWin: boolean, isNoRegret: boolean, costPerTonne: number) => {
    if (isQuickWin) {
      return '#10B981'; // Vert (économies)
    }
    if (isNoRegret) {
      return '#F59E0B'; // Orange (No Regret)
    }
    return '#EF4444'; // Rouge (coûteux)
  };

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600 mt-1">Rang MACC: #{data.rank}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Coût/tonne:</span>{' '}
              <span className={data.costPerTonne < 0 ? 'text-green-600' : 'text-red-600'}>
                {data.costPerTonne.toFixed(1)} €/tCO₂e
              </span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Potentiel:</span> {data.reductionPotential.toFixed(1)} tCO₂e
            </p>
            <p className="text-sm">
              <span className="font-medium">Cumul:</span> {data.cumulativeReduction.toFixed(1)} tCO₂e
            </p>
          </div>
          <div className="mt-2">
            {data.isQuickWin && (
              <Badge className="bg-green-100 text-green-800">⚡ Quick Win</Badge>
            )}
            {data.isNoRegret && !data.isQuickWin && (
              <Badge className="bg-orange-100 text-orange-800">✅ No Regret</Badge>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculer les statistiques
  const stats = useMemo(() => {
    const quickWins = maccPoints.filter((p) => p.is_quick_win);
    const noRegret = maccPoints.filter((p) => p.is_no_regret);
    const totalReduction = maccPoints.reduce((sum, p) => sum + p.reduction_potential, 0);
    const avgCost =
      totalReduction > 0
        ? maccPoints.reduce((sum, p) => sum + p.cost_total, 0) / totalReduction
        : 0;

    return {
      quickWinsCount: quickWins.length,
      quickWinsReduction: quickWins.reduce((sum, p) => sum + p.reduction_potential, 0),
      noRegretCount: noRegret.length,
      noRegretReduction: noRegret.reduce((sum, p) => sum + p.reduction_potential, 0),
      totalReduction,
      avgCost,
    };
  }, [maccPoints]);

  if (maccPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucune action avec coût défini. Ajoutez des leviers de réduction avec un coût estimé pour visualiser la MACC.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.quickWinsCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.quickWinsReduction.toFixed(1)} tCO₂e
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actions No Regret
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.noRegretCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.noRegretReduction.toFixed(1)} tCO₂e
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Réduction totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReduction.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">tCO₂e</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coût moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCost.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">€/tCO₂e</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique MACC */}
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <div className="flex gap-2 mt-2">
            <Badge className="bg-green-100 text-green-800">⚡ Quick Win (coût {'<'} 0 €/tCO₂e)</Badge>
            <Badge className="bg-orange-100 text-orange-800">✅ No Regret (coût {'<'} 100 €/tCO₂e)</Badge>
            <Badge className="bg-red-100 text-red-800">Coûteux (coût {'>='} 100 €/tCO₂e)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="cumulativeReduction"
                label={{
                  value: 'Réduction cumulée (tCO₂e)',
                  position: 'insideBottom',
                  offset: -10,
                }}
              />
              <YAxis
                label={{
                  value: 'Coût marginal (€/tCO₂e)',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
              <ReferenceLine y={100} stroke="#F59E0B" strokeDasharray="3 3" />
              <Bar dataKey="costPerTonne" name="Coût/tonne">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.isQuickWin, entry.isNoRegret, entry.costPerTonne)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Légende et explications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comment lire la MACC ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Axe horizontal (X) :</span> Réduction cumulée des émissions.
            Plus vous allez à droite, plus vous réduisez vos émissions.
          </p>
          <p>
            <span className="font-medium">Axe vertical (Y) :</span> Coût marginal par tonne de CO₂e évitée.
          </p>
          <p>
            <span className="font-medium">Largeur des barres :</span> Potentiel de réduction de chaque action.
          </p>
          <p className="pt-2 border-t">
            <span className="font-medium text-green-600">Quick Wins (barres vertes) :</span> Actions qui
            génèrent des économies. À mettre en œuvre en priorité !
          </p>
          <p>
            <span className="font-medium text-orange-600">Actions No Regret (barres oranges) :</span> Coût
            inférieur au prix de la tonne de carbone (~100 €/tCO₂e). Rentables à moyen terme.
          </p>
          <p>
            <span className="font-medium text-red-600">Actions coûteuses (barres rouges) :</span> Coût élevé,
            à envisager une fois les Quick Wins et No Regret épuisés.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
