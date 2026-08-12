import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GitCompare, Target, TrendingDown, Layers, Calendar, Zap, BarChart3, DollarSign, Info } from 'lucide-react';
import { ClimateScenario, ScenarioDashboard, SCENARIO_TYPE_LABELS, SCENARIO_TYPE_COLORS } from '../types';
import { useOrganizationData } from '@/hooks/useOrganizationData';

interface Props {
  dashboard: ScenarioDashboard;
  scenarios: ClimateScenario[];
}

export const ScenarioOverview: React.FC<Props> = ({ dashboard, scenarios }) => {
  const { organization } = useOrganizationData();
  const currency = organization?.currency || 'EUR';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Vue d'ensemble — Modélisation de scénarios</h2>
        <p className="text-sm text-muted-foreground">Synthèse des trajectoires simulées et de leurs résultats.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPI icon={GitCompare} label="Scénarios" value={dashboard.scenarioCount} />
        <KPI icon={Calendar} label="Année réf." value={dashboard.baselineYear ?? '—'} />
        <KPI icon={Target} label="Horizon" value={dashboard.targetYear ?? '—'} />
        <KPI icon={BarChart3} label="Baseline" value={dashboard.baselineEmissions ? `${dashboard.baselineEmissions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} t` : '—'} />
        <KPI icon={TrendingDown} label="Meilleure réduction" value={dashboard.bestReductionPercent ? `−${dashboard.bestReductionPercent}%` : '—'} highlight />
        <KPI icon={DollarSign} label={`Intensité (tCO₂e/M${currency})`} value={dashboard.baselineIntensity ? dashboard.baselineIntensity.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}
          tooltip="ESRS E1 : Intensité carbone économique — tCO₂e rapportées au chiffre d'affaires, pour comparer la performance climatique indépendamment de la taille." />
      </div>

      {/* Scenarios list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Scénarios existants</h3>
        {scenarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun scénario créé.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scenarios.map(s => (
              <Card key={s.id} className="border-l-4" style={{ borderLeftColor: SCENARIO_TYPE_COLORS[s.scenario_type] || 'hsl(var(--border))' }}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{s.name}</span>
                    <Badge variant="outline" className="text-[10px]">{SCENARIO_TYPE_LABELS[s.scenario_type]}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div><span className="block font-semibold text-foreground">{s.baseline_year}</span>Référence</div>
                    <div><span className="block font-semibold text-foreground">{s.target_year}</span>Cible</div>
                    <div><span className="block font-semibold text-foreground">{s.target_reduction_percent ?? 0}%</span>Réduction</div>
                  </div>
                  {s.baseline_emissions_tco2e && (
                    <p className="text-xs text-muted-foreground">{s.baseline_emissions_tco2e.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e baseline</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function KPI({ icon: Icon, label, value, highlight, tooltip }: { icon: any; label: string; value: string | number; highlight?: boolean; tooltip?: string }) {
  return (
    <Card><CardContent className="py-3 px-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild><button type="button" className="inline-flex cursor-help"><Info className="h-3 w-3 text-muted-foreground" /></button></TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className={`font-bold text-lg ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </CardContent></Card>
  );
}
