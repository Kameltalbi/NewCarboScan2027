// Section 7 — Suivi de performance

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { ClimateAction, ClimateLever, ClimateRoadmap } from '../types';
import { AlertTriangle, CheckCircle2, TrendingDown, DollarSign } from 'lucide-react';

interface PerformanceSectionProps {
  roadmap: ClimateRoadmap;
  actions: ClimateAction[];
  levers: ClimateLever[];
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({ roadmap, actions, levers }) => {
  const totalExpected = actions.reduce((s, a) => s + (a.expected_reduction_tco2e || 0), 0);
  const totalEngaged = actions.filter(a => ['in_progress', 'completed'].includes(a.status)).reduce((s, a) => s + (a.expected_reduction_tco2e || 0), 0);
  const totalRealized = actions.reduce((s, a) => s + (a.realized_reduction_tco2e || 0), 0);
  const totalBudgetEst = actions.reduce((s, a) => s + (a.budget_estimated || 0), 0);
  const totalBudgetAct = actions.reduce((s, a) => s + (a.budget_actual || 0), 0);
  const completed = actions.filter(a => a.status === 'completed').length;
  const delayed = actions.filter(a => a.target_date && new Date(a.target_date) < new Date() && !['completed', 'abandoned'].includes(a.status)).length;
  const progress = actions.length > 0 ? Math.round((completed / actions.length) * 100) : 0;
  const costPerTonne = totalRealized > 0 ? totalBudgetAct / totalRealized : 0;

  // Reduction by lever
  const leverData = levers.map(l => {
    const leverActions = actions.filter(a => a.lever_id === l.id);
    return {
      name: l.name.length > 25 ? l.name.substring(0, 25) + '…' : l.name,
      expected: Math.round(leverActions.reduce((s, a) => s + (a.expected_reduction_tco2e || 0), 0)),
      realized: Math.round(leverActions.reduce((s, a) => s + (a.realized_reduction_tco2e || 0), 0)),
    };
  }).filter(d => d.expected > 0 || d.realized > 0).sort((a, b) => b.expected - a.expected);

  // Status color indicators
  const getStatusIndicator = (actual: number, target: number) => {
    if (target === 0) return 'neutral';
    const ratio = actual / target;
    if (ratio >= 0.9) return 'green';
    if (ratio >= 0.7) return 'orange';
    return 'red';
  };

  const reductionStatus = getStatusIndicator(totalRealized, totalExpected);
  const budgetStatus = totalBudgetEst > 0 && totalBudgetAct > totalBudgetEst * 1.1 ? 'red' : totalBudgetAct > totalBudgetEst * 0.9 ? 'orange' : 'green';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Suivi de performance</h2>
        <p className="text-sm text-muted-foreground">Indicateurs clés de la feuille de route</p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <IndicatorCard
          label="Réduction potentielle"
          value={`${Math.round(totalExpected)}`}
          unit="tCO₂e"
          status="neutral"
        />
        <IndicatorCard
          label="Réduction engagée"
          value={`${Math.round(totalEngaged)}`}
          unit="tCO₂e"
          sub={`${totalExpected > 0 ? Math.round((totalEngaged / totalExpected) * 100) : 0}% du potentiel`}
          status="neutral"
        />
        <IndicatorCard
          label="Réduction réalisée"
          value={`${Math.round(totalRealized)}`}
          unit="tCO₂e"
          sub={`${totalExpected > 0 ? Math.round((totalRealized / totalExpected) * 100) : 0}% du potentiel`}
          status={reductionStatus}
        />
        <IndicatorCard
          label="Coût / tCO₂e évitée"
          value={costPerTonne > 0 ? `${Math.round(costPerTonne)}` : '—'}
          unit="€/tCO₂e"
          status="neutral"
        />
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Actions terminées</span>
              <span className="text-xs font-bold">{completed}/{actions.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Budget consommé</span>
              <span className="text-xs font-bold">{totalBudgetEst > 0 ? `${Math.round((totalBudgetAct / totalBudgetEst) * 100)}%` : '—'}</span>
            </div>
            <Progress value={totalBudgetEst > 0 ? (totalBudgetAct / totalBudgetEst) * 100 : 0} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Actions en retard</span>
              <div className="flex items-center gap-1">
                {delayed > 0 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                <span className={`text-xs font-bold ${delayed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{delayed}</span>
              </div>
            </div>
            <Progress value={actions.length > 0 ? ((actions.length - delayed) / actions.length) * 100 : 100} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Reduction by lever chart */}
      {leverData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Réduction par levier — Prévu vs Réalisé</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leverData} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: number) => `${v} tCO₂e`} />
                <Legend />
                <Bar dataKey="expected" name="Prévu" fill="hsl(var(--primary))" opacity={0.3} radius={[0, 4, 4, 0]} barSize={14} />
                <Bar dataKey="realized" name="Réalisé" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alertes et points d'attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {delayed > 0 && (
              <AlertRow severity="red" text={`${delayed} action(s) en retard sur l'échéance prévue`} />
            )}
            {totalBudgetAct > totalBudgetEst * 1.1 && totalBudgetEst > 0 && (
              <AlertRow severity="red" text={`Budget dépassé de ${Math.round(((totalBudgetAct - totalBudgetEst) / totalBudgetEst) * 100)}%`} />
            )}
            {totalRealized < totalExpected * 0.5 && totalExpected > 0 && (
              <AlertRow severity="orange" text={`Réduction réalisée inférieure à 50% du potentiel identifié`} />
            )}
            {levers.filter(l => l.status !== 'completed' && l.status !== 'abandoned').some(l => !actions.some(a => a.lever_id === l.id && a.status === 'in_progress')) && (
              <AlertRow severity="orange" text="Certains leviers n'ont aucune action active" />
            )}
            {delayed === 0 && totalBudgetAct <= totalBudgetEst && (
              <div className="flex items-center gap-2 p-2 rounded bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs">Toutes les actions sont dans les temps</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function IndicatorCard({ label, value, unit, sub, status }: { label: string; value: string; unit?: string; sub?: string; status: string }) {
  const borderColor = status === 'green' ? 'border-l-emerald-500' : status === 'orange' ? 'border-l-amber-500' : status === 'red' ? 'border-l-red-500' : 'border-l-transparent';
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="pt-4 pb-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
        <div className="text-xl font-bold text-foreground">
          {value}
          {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AlertRow({ severity, text }: { severity: 'red' | 'orange'; text: string }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded text-xs ${severity === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
