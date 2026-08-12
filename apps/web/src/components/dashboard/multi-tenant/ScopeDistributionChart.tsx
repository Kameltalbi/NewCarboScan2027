// Graphique – Répartition des émissions par scope
// Type : donut - Scopes non consolidés visuellement atténués

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ScopeStatus } from './DashboardContextHeader';

// Palette dashboard – verts et teals (image utilisateur)
import { DASHBOARD_PALETTE } from './dashboardPalette';

const SCOPE_COLORS = {
  scope1: DASHBOARD_PALETTE.scope1,   // Bleu Énergie
  scope2: DASHBOARD_PALETTE.scope2,   // Ambre Électrique
  scope3: DASHBOARD_PALETTE.scope3,   // Indigo Industriel
  attenuated: DASHBOARD_PALETTE.attenuated,
};

interface ScopeDistributionChartProps {
  scope1: number;
  scope2: number;
  scope3: number;
  scopeStatuses: {
    scope1: ScopeStatus;
    scope2: ScopeStatus;
    scope3: ScopeStatus;
  };
}

// Conversion kg → tonnes
const kgToTonnes = (kg: number) => kg / 1000;

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium text-foreground">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {Math.round(kgToTonnes(data.value)).toLocaleString('fr-FR')} tCO₂e
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {Math.round(data.percentage)}% du total
        </p>
        {data.status !== 'consolidated' && (
          <p className="text-xs text-amber-600 mt-1 font-medium">
            ⚠ Données {data.status === 'in_progress' ? 'en cours' : 'non entamées'}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  if (percent < 0.05) return null; // Don't show labels for very small slices
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  const scopeLabels = ['S1', 'S2', 'S3'];
  const label = scopeLabels[index] || '';

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold"
    >
      {`${label} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const ScopeDistributionChart: React.FC<ScopeDistributionChartProps> = ({
  scope1,
  scope2,
  scope3,
  scopeStatuses,
}) => {
  const total = scope1 + scope2 + scope3;
  
  const chartData = [
    { 
      name: 'Scope 1 - Émissions directes', 
      value: scope1, 
      color: (scopeStatuses.scope1 === 'consolidated' || scopeStatuses.scope1 === 'in_progress') ? SCOPE_COLORS.scope1 : SCOPE_COLORS.attenuated,
      status: scopeStatuses.scope1,
      percentage: total > 0 ? (scope1 / total) * 100 : 0,
    },
    { 
      name: 'Scope 2 - Énergie indirecte', 
      value: scope2, 
      color: (scopeStatuses.scope2 === 'consolidated' || scopeStatuses.scope2 === 'in_progress') ? SCOPE_COLORS.scope2 : SCOPE_COLORS.attenuated,
      status: scopeStatuses.scope2,
      percentage: total > 0 ? (scope2 / total) * 100 : 0,
    },
    { 
      name: 'Scope 3 - Autres indirectes', 
      value: scope3, 
      color: (scopeStatuses.scope3 === 'consolidated' || scopeStatuses.scope3 === 'in_progress') ? SCOPE_COLORS.scope3 : SCOPE_COLORS.attenuated,
      status: scopeStatuses.scope3,
      percentage: total > 0 ? (scope3 / total) * 100 : 0,
    },
  ].filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">Répartition par scope</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">Répartition par scope</CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-1 flex items-center justify-center">
        <div className="relative w-56 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderCustomizedLabel}
                animationBegin={0}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="white"
                    strokeWidth={3}
                    className="transition-all duration-300 hover:opacity-80"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-foreground tabular-nums">
              {Math.round(kgToTonnes(total)).toLocaleString('fr-FR')}
            </span>
            <span className="text-xs text-muted-foreground font-medium mt-1">tCO₂e total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
