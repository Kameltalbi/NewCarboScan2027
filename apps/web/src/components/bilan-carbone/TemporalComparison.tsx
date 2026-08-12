// Composant de comparaison temporelle des émissions
// Permet de comparer plusieurs périodes (Année N vs N-1, etc.)

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { GHGAggregationService, GHGHierarchicalResult } from '@/lib/bilan-carbone/GHGAggregationService';
import { Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface TemporalComparisonProps {
  organizationId: string;
}

export const TemporalComparison: React.FC<TemporalComparisonProps> = ({ organizationId }) => {
  const [loading, setLoading] = useState(true);
  const [comparisonType, setComparisonType] = useState<'year' | 'custom'>('year');
  const [baseYear, setBaseYear] = useState(new Date().getFullYear() - 1);
  const [comparisonYear, setComparisonYear] = useState(new Date().getFullYear());
  
  const [baseResult, setBaseResult] = useState<GHGHierarchicalResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<GHGHierarchicalResult | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [base, comparison] = await Promise.all([
          GHGAggregationService.aggregateByGHGHierarchy(
            organizationId,
            `${baseYear}-01-01`,
            `${baseYear}-12-31`
          ),
          GHGAggregationService.aggregateByGHGHierarchy(
            organizationId,
            `${comparisonYear}-01-01`,
            `${comparisonYear}-12-31`
          ),
        ]);

        setBaseResult(base);
        setComparisonResult(comparison);
      } catch (err) {
        console.error('Erreur chargement comparaison:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, baseYear, comparisonYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!baseResult || !comparisonResult) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Données insuffisantes pour la comparaison.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculer les variations
  const totalVariation = comparisonResult.total_emissions - baseResult.total_emissions;
  const totalVariationPercent =
    baseResult.total_emissions > 0
      ? ((totalVariation / baseResult.total_emissions) * 100)
      : 0;

  // Préparer les données pour les graphiques
  const scopeComparisonData = [1, 2, 3].map((scope) => {
    const baseScope = baseResult.scopes.find((s) => s.scope === scope);
    const comparisonScope = comparisonResult.scopes.find((s) => s.scope === scope);

    return {
      scope: `Scope ${scope}`,
      [baseYear]: baseScope?.emissions || 0,
      [comparisonYear]: comparisonScope?.emissions || 0,
    };
  });

  // Top postes avec variations
  const posteVariations: Array<{
    poste: string;
    code: string;
    base: number;
    comparison: number;
    variation: number;
    variationPercent: number;
  }> = [];

  baseResult.scopes.forEach((baseScope) => {
    const comparisonScope = comparisonResult.scopes.find((s) => s.scope === baseScope.scope);

    baseScope.postes.forEach((basePoste) => {
      const comparisonPoste = comparisonScope?.postes.find(
        (p) => p.poste.id === basePoste.poste.id
      );

      const baseEmissions = basePoste.emissions;
      const comparisonEmissions = comparisonPoste?.emissions || 0;
      const variation = comparisonEmissions - baseEmissions;
      const variationPercent =
        baseEmissions > 0 ? (variation / baseEmissions) * 100 : 0;

      posteVariations.push({
        poste: basePoste.poste.name,
        code: basePoste.poste.code,
        base: baseEmissions,
        comparison: comparisonEmissions,
        variation,
        variationPercent,
      });
    });
  });

  // Trier par variation absolue décroissante
  posteVariations.sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation));

  return (
    <div className="space-y-6">
      {/* Sélecteur de période */}
      <Card>
        <CardHeader>
          <CardTitle>Comparaison temporelle</CardTitle>
          <CardDescription>Analysez l'évolution de vos émissions dans le temps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Select
              value={baseYear.toString()}
              onValueChange={(value) => setBaseYear(parseInt(value))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <Select
              value={comparisonYear.toString()}
              onValueChange={(value) => setComparisonYear(parseInt(value))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs de variation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Émissions {baseYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{baseResult.total_emissions.toFixed(1)} tCO₂e</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Émissions {comparisonYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comparisonResult.total_emissions.toFixed(1)} tCO₂e
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Variation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {totalVariation > 0 ? (
                <TrendingUp className="h-5 w-5 text-red-600" />
              ) : totalVariation < 0 ? (
                <TrendingDown className="h-5 w-5 text-green-600" />
              ) : (
                <Minus className="h-5 w-5 text-gray-600" />
              )}
              <div
                className={`text-2xl font-bold ${
                  totalVariation > 0
                    ? 'text-red-600'
                    : totalVariation < 0
                    ? 'text-green-600'
                    : 'text-gray-600'
                }`}
              >
                {totalVariation > 0 ? '+' : ''}
                {totalVariation.toFixed(1)} tCO₂e
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {totalVariationPercent > 0 ? '+' : ''}
              {totalVariationPercent.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique comparaison par scope */}
      <Card>
        <CardHeader>
          <CardTitle>Comparaison par scope</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scopeComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scope" />
              <YAxis label={{ value: 'tCO₂e', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey={baseYear} fill="#94a3b8" name={`${baseYear}`} />
              <Bar dataKey={comparisonYear} fill="#0F172A" name={`${comparisonYear}`} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top variations par poste */}
      <Card>
        <CardHeader>
          <CardTitle>Variations par poste</CardTitle>
          <CardDescription>Postes avec les plus fortes évolutions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {posteVariations.slice(0, 10).map((poste) => (
              <div
                key={poste.code}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-semibold">
                    {poste.code} - {poste.poste}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {baseYear}: {poste.base.toFixed(1)} tCO₂e → {comparisonYear}:{' '}
                    {poste.comparison.toFixed(1)} tCO₂e
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="flex items-center gap-2">
                    {poste.variation > 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-600" />
                    ) : poste.variation < 0 ? (
                      <TrendingDown className="h-4 w-4 text-green-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-gray-600" />
                    )}
                    <span
                      className={`font-semibold ${
                        poste.variation > 0
                          ? 'text-red-600'
                          : poste.variation < 0
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {poste.variation > 0 ? '+' : ''}
                      {poste.variation.toFixed(1)} tCO₂e
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {poste.variationPercent > 0 ? '+' : ''}
                    {poste.variationPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
