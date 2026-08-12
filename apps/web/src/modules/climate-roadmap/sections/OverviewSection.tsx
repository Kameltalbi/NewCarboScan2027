// Section 1 — Vue d'ensemble (Executive Dashboard)

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, TrendingDown, Zap, AlertTriangle, Clock, CheckCircle2, 
  DollarSign, BarChart3, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { RoadmapDashboard, ACTION_STATUS_LABELS } from '../types';

interface OverviewSectionProps {
  dashboard: RoadmapDashboard;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#8b5cf6'];

export const OverviewSection: React.FC<OverviewSectionProps> = ({ dashboard }) => {
  const d = dashboard;

  const statusData = [
    { name: 'À lancer', value: d.actions_to_launch, color: '#94a3b8' },
    { name: 'En cours', value: d.actions_in_progress, color: '#f59e0b' },
    { name: 'Terminées', value: d.actions_completed, color: '#10b981' },
    { name: 'En retard', value: d.actions_delayed, color: '#ef4444' },
  ].filter(s => s.value > 0);

  const reductionData = [
    { name: 'Potentielle', value: Math.round(d.total_expected_reduction) },
    { name: 'Engagée', value: Math.round(d.total_engaged_reduction) },
    { name: 'Réalisée', value: Math.round(d.total_realized_reduction) },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPICard icon={<BarChart3 className="h-4 w-4" />} label="Émissions référence" value={`${Math.round(d.roadmap.baseline_emissions_tco2e || 0)}`} unit="tCO₂e" />
        <KPICard icon={<Target className="h-4 w-4" />} label="Objectif réduction" value={`${d.roadmap.reduction_target_percent || 0}%`} accent />
        <KPICard icon={<Zap className="h-4 w-4" />} label="Leviers" value={`${d.levers_count}`} />
        <KPICard icon={<CheckCircle2 className="h-4 w-4" />} label="Actions" value={`${d.actions_completed}/${d.actions_total}`} sub="terminées" />
        <KPICard icon={<TrendingDown className="h-4 w-4" />} label="Réduction réalisée" value={`${Math.round(d.total_realized_reduction)}`} unit="tCO₂e" accent />
        <KPICard icon={<DollarSign className="h-4 w-4" />} label="Budget consommé" value={`${Math.round((d.total_budget_actual / Math.max(d.total_budget_estimated, 1)) * 100)}%`} sub={`${formatBudget(d.total_budget_actual)} / ${formatBudget(d.total_budget_estimated)}`} />
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Avancement global du plan</span>
            <span className="text-sm font-bold text-primary">{d.progress_percent}%</span>
          </div>
          <Progress value={d.progress_percent} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{d.roadmap.baseline_year}</span>
            <span>{d.roadmap.target_year}</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reduction comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Réduction carbone (tCO₂e)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reductionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Aucune action créée</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts + Top actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertes ({d.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune alerte</p>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {d.alerts.slice(0, 8).map((alert, i) => (
                  <div key={i} className={`p-2 rounded text-xs border-l-2 ${
                    alert.severity === 'critical' ? 'border-l-red-500 bg-red-50' :
                    alert.severity === 'warning' ? 'border-l-amber-500 bg-amber-50' :
                    'border-l-blue-500 bg-blue-50'
                  }`}>
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-muted-foreground">{alert.description}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top 5 actions les plus impactantes</CardTitle>
          </CardHeader>
          <CardContent>
            {d.top_actions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune action</p>
            ) : (
              <div className="space-y-2">
                {d.top_actions.map((action, i) => (
                  <div key={action.id} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                      <span className="text-xs truncate">{action.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      {Math.round(action.expected_reduction_tco2e)} tCO₂e
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function KPICard({ icon, label, value, unit, sub, accent }: { icon: React.ReactNode; label: string; value: string; unit?: string; sub?: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          {icon}
          <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className={`text-xl font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>
          {value}
          {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function formatBudget(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k€`;
  return `${Math.round(n)}€`;
}
