import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { GitCompare, Target } from 'lucide-react';
import { ClimateScenario, SCENARIO_TYPE_LABELS, SCENARIO_TYPE_COLORS } from '../types';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useScenarioLevers, computeTrajectory } from '../hooks/useScenarios';
import { supabase } from "@/integrations/api/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

interface Props { scenarios: ClimateScenario[]; }

export const ScenarioComparisonSection: React.FC<Props> = ({ scenarios }) => {
  const { organization } = useOrganizationData();
  const currency = organization?.currency || 'EUR';
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(scenarios.slice(0, 3).map(s => s.id)));

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selected = scenarios.filter(s => selectedIds.has(s.id));

  // Comparison table data
  const comparisonData = selected.map(s => ({
    name: s.name,
    type: SCENARIO_TYPE_LABELS[s.scenario_type],
    baseline: s.baseline_emissions_tco2e || 0,
    target: s.target_emissions_tco2e || 0,
    reduction: s.target_reduction_percent || 0,
    avoided: (s.baseline_emissions_tco2e || 0) - (s.target_emissions_tco2e || 0),
    residual: s.target_emissions_tco2e || 0,
    intensity: s.annual_revenue_eur && s.annual_revenue_eur > 0 && s.baseline_emissions_tco2e
      ? (s.baseline_emissions_tco2e / (s.annual_revenue_eur / 1_000_000)) : null,
    color: SCENARIO_TYPE_COLORS[s.scenario_type],
  }));

  // Radar chart data
  const radarData = [
    { metric: 'Ambition', ...Object.fromEntries(selected.map(s => [s.name, s.target_reduction_percent || 0])) },
    { metric: 'Horizon', ...Object.fromEntries(selected.map(s => [s.name, Math.min((s.target_year - s.baseline_year) * 5, 100)])) },
    { metric: 'Net Zero', ...Object.fromEntries(selected.map(s => [s.name, s.net_zero_flag ? 100 : 20])) },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(210, 60%, 55%)', 'hsl(45, 80%, 50%)', 'hsl(150, 60%, 45%)', 'hsl(270, 50%, 55%)'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Comparaison des scénarios</h2>
        <p className="text-sm text-muted-foreground">Sélectionnez les scénarios à comparer.</p>
      </div>

      {/* Selection */}
      <div className="flex flex-wrap gap-3">
        {scenarios.map(s => (
          <label key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedIds.has(s.id) ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelection(s.id)} />
            <span className="text-sm">{s.name}</span>
            <Badge variant="outline" className="text-[10px]">{SCENARIO_TYPE_LABELS[s.scenario_type]}</Badge>
          </label>
        ))}
      </div>

      {selected.length >= 2 && (
        <>
          {/* Comparison table */}
          <Card>
            <CardContent className="py-4">
              <h3 className="text-sm font-semibold mb-3">Tableau comparatif</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Scénario</th>
                       <th className="text-right py-2 px-2 text-muted-foreground font-medium">Baseline (tCO₂e)</th>
                       <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cible (tCO₂e)</th>
                       <th className="text-right py-2 px-2 text-muted-foreground font-medium">Réduction (%)</th>
                       <th className="text-right py-2 px-2 text-muted-foreground font-medium">Évitées (tCO₂e)</th>
                       <th className="text-right py-2 px-2 text-muted-foreground font-medium">Résiduel</th>
                       <th className="text-right py-2 px-2 text-muted-foreground font-medium">Intensité (tCO₂e/M{currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((d, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 px-2 font-medium">{d.name}</td>
                        <td className="py-2 px-2 text-right">{d.baseline.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 px-2 text-right">{d.target.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 px-2 text-right text-primary font-semibold">−{d.reduction}%</td>
                         <td className="py-2 px-2 text-right">{d.avoided.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                         <td className="py-2 px-2 text-right">{d.residual.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                         <td className="py-2 px-2 text-right font-medium">{d.intensity ? d.intensity.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Radar comparison */}
          <Card>
            <CardContent className="py-4">
              <h3 className="text-sm font-semibold mb-3">Profil comparatif</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  {selected.map((s, i) => (
                    <Radar key={s.id} name={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gap to targets */}
          <Card>
            <CardContent className="py-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Écart aux cibles</h3>
              <div className="space-y-3">
                {['SBTi 1.5°C (−42%)', 'SBTi 2°C (−25%)', 'Net Zero (−90%)'].map((target, ti) => {
                  const targetPct = [42, 25, 90][ti];
                  return (
                    <div key={target}>
                      <p className="text-xs font-medium mb-1">{target}</p>
                      <div className="flex gap-2">
                        {selected.map(s => {
                          const gap = (s.target_reduction_percent || 0) - targetPct;
                          return (
                            <Badge key={s.id} variant={gap >= 0 ? 'default' : 'secondary'} className="text-[10px]">
                              {s.name}: {gap >= 0 ? `✓ +${gap}%` : `${gap}%`}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selected.length < 2 && <p className="text-sm text-muted-foreground text-center py-8">Sélectionnez au moins 2 scénarios pour comparer.</p>}
    </div>
  );
};
