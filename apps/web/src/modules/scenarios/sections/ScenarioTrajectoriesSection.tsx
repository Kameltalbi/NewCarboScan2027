import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, BarChart3 } from 'lucide-react';
import { ClimateScenario, ScenarioResult, SCENARIO_TYPE_LABELS, SCENARIO_TYPE_COLORS } from '../types';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useScenarioLevers, computeTrajectory } from '../hooks/useScenarios';
import { api } from '@/integrations/api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface Props {
  scenario: ClimateScenario | null;
  scenarios: ClimateScenario[];
}

export const ScenarioTrajectoriesSection: React.FC<Props> = ({ scenario, scenarios }) => {
  const { organization } = useOrganizationData();
  const currency = organization?.currency || 'EUR';
  const { levers } = useScenarioLevers(scenario?.id || null);
  const [assumptions, setAssumptions] = useState<Map<string, any>>(new Map());

  // Fetch assumptions for all levers
  useEffect(() => {
    if (levers.length === 0) return;
    const fetchAll = async () => {
      const map = new Map();
      for (const l of levers) {
        const { items } = await api.listClimateScenarioAssumptions(l.id);
        if (items?.[0]) map.set(l.id, items[0]);
      }
      setAssumptions(map);
    };
    fetchAll();
  }, [levers]);

  const trajectory = useMemo(() => {
    if (!scenario || levers.length === 0) return [];
    return computeTrajectory(
      scenario.baseline_emissions_tco2e || 0,
      scenario.baseline_year,
      scenario.target_year,
      levers,
      assumptions
    );
  }, [scenario, levers, assumptions]);

  const chartData = useMemo(() => {
    if (!scenario) return [];
    const baseline = scenario.baseline_emissions_tco2e || 0;
    const revenue = scenario.annual_revenue_eur;
    return trajectory.map(r => ({
      year: r.year,
      projected: Math.round(r.projected_emissions_tco2e),
      baseline: Math.round(baseline),
      reduction: Math.round(r.cumulative_reduction_tco2e),
      reductionPct: r.reduction_percent_vs_baseline.toFixed(1),
      intensity: revenue && revenue > 0 ? (r.projected_emissions_tco2e / (revenue / 1_000_000)) : null,
    }));
  }, [trajectory, scenario]);

  if (!scenario) return <p className="text-sm text-muted-foreground p-6">Sélectionnez un scénario.</p>;

  const lastResult = trajectory[trajectory.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Projections et trajectoires</h2>
        <p className="text-sm text-muted-foreground">Projection année par année du scénario « {scenario.name} ».</p>
      </div>

      {/* Summary KPIs */}
      {lastResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="py-3 px-3">
            <p className="text-[10px] text-muted-foreground">Émissions {scenario.target_year}</p>
            <p className="font-bold text-lg">{lastResult.projected_emissions_tco2e.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} t</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-3">
            <p className="text-[10px] text-muted-foreground">Réduction cumulée</p>
            <p className="font-bold text-lg text-primary">{lastResult.cumulative_reduction_tco2e.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} t</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-3">
            <p className="text-[10px] text-muted-foreground">% vs baseline</p>
            <p className="font-bold text-lg">−{lastResult.reduction_percent_vs_baseline.toFixed(1)}%</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-3">
            <p className="text-[10px] text-muted-foreground">Résiduel</p>
            <p className="font-bold text-lg">{lastResult.residual_emissions_tco2e.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} t</p>
          </CardContent></Card>
        </div>
      )}

      {/* Trajectory chart */}
      <Card>
        <CardContent className="py-4">
          <h3 className="text-sm font-semibold mb-4">Trajectoire d'émissions</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toLocaleString('fr-FR')}`} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} tCO₂e`} />
                <Legend />
                <Area type="monotone" dataKey="baseline" name="Baseline (BAU)" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="projected" name="Scénario" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Ajoutez des leviers avec des hypothèses pour voir la projection.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Year-by-year table */}
      {trajectory.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h3 className="text-sm font-semibold mb-3">Détail annuel</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                 <thead>
122:                   <tr className="border-b">
                     <th className="text-left py-2 px-2 text-muted-foreground font-medium">Année</th>
                     <th className="text-right py-2 px-2 text-muted-foreground font-medium">Émissions</th>
                     <th className="text-right py-2 px-2 text-muted-foreground font-medium">Réduction annuelle</th>
                     <th className="text-right py-2 px-2 text-muted-foreground font-medium">Réduction cumulée</th>
                     <th className="text-right py-2 px-2 text-muted-foreground font-medium">% vs baseline</th>
                     {scenario?.annual_revenue_eur && <th className="text-right py-2 px-2 text-muted-foreground font-medium">Intensité (tCO₂e/M{currency})</th>}
                   </tr>
                 </thead>
                <tbody>
                   {trajectory.map(r => {
                     const intensity = scenario?.annual_revenue_eur && scenario.annual_revenue_eur > 0
                       ? (r.projected_emissions_tco2e / (scenario.annual_revenue_eur / 1_000_000))
                       : null;
                     return (
                       <tr key={r.year} className="border-b border-border/50 hover:bg-muted/30">
                         <td className="py-1.5 px-2 font-medium">{r.year}</td>
                         <td className="py-1.5 px-2 text-right">{r.projected_emissions_tco2e.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                         <td className="py-1.5 px-2 text-right">{r.annual_reduction_tco2e.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                         <td className="py-1.5 px-2 text-right">{r.cumulative_reduction_tco2e.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                         <td className="py-1.5 px-2 text-right text-primary">−{r.reduction_percent_vs_baseline.toFixed(1)}%</td>
                         {scenario?.annual_revenue_eur && <td className="py-1.5 px-2 text-right font-medium">{intensity?.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</td>}
                       </tr>
                     );
                   })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
