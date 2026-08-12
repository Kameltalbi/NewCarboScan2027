// Graphique – Répartition Scope 2 par poste émetteur
// Type : camembert (donut)

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Scope2BreakdownChartProps {
  data: Array<{
    name: string;
    emissions: number;
    scope: 1 | 2 | 3;
    percentage: number;
  }>;
}

// Palette ambrée/orangée pour Scope 2 (énergie indirecte)
const SCOPE2_COLORS = [
  '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F',
  '#FBBF24', '#FCD34D', '#FDE68A', '#EA580C', '#F97316',
];

// Conversion kg → tonnes
const kgToTonnes = (kg: number) => kg / 1000;

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium text-foreground text-sm">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {Math.round(kgToTonnes(data.emissions)).toLocaleString('fr-FR')} tCO₂e
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {data.percentage.toFixed(1)}% du Scope 2
        </p>
      </div>
    );
  }
  return null;
};

export const Scope2BreakdownChart: React.FC<Scope2BreakdownChartProps> = ({ data }) => {
  const scope2Data = data
    .filter(item => item.scope === 2 && item.emissions > 0)
    .sort((a, b) => b.emissions - a.emissions)
    .map((item, index) => ({
      ...item,
      emissionsTonnes: kgToTonnes(item.emissions),
      color: SCOPE2_COLORS[index % SCOPE2_COLORS.length],
    }));

  const totalScope2 = scope2Data.reduce((sum, item) => sum + item.emissions, 0);

  const scope2DataWithPercentage = scope2Data.map(item => ({
    ...item,
    percentage: totalScope2 > 0 ? (item.emissions / totalScope2) * 100 : 0,
  }));

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  if (scope2Data.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-base font-semibold text-foreground">
            Scope 2 par poste
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Aucune donnée Scope 2 disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            Scope 2 par poste
          </CardTitle>
          <span className="text-sm font-bold text-muted-foreground tabular-nums">
            {Math.round(kgToTonnes(totalScope2)).toLocaleString('fr-FR')} tCO₂e
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-hidden">
        <div className="flex items-center gap-4 h-full">
          <div className="relative flex-shrink-0 w-[180px] h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scope2DataWithPercentage}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="emissionsTonnes"
                  nameKey="name"
                  label={renderLabel}
                  labelLine={false}
                  animationBegin={300}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {scope2DataWithPercentage.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="white"
                      strokeWidth={2}
                      className="transition-opacity duration-300 hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-foreground">{scope2Data.length}</span>
              <span className="text-xs text-muted-foreground ml-1">postes</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs max-h-[220px] overflow-y-auto pr-1">
            {scope2DataWithPercentage
              .filter(item => Math.round(item.percentage) > 0)
              .map((item, index) => (
              <div key={index} className="flex items-center gap-2 truncate">
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-muted-foreground" title={item.name}>
                  {item.name}
                </span>
                <span className="ml-auto font-medium text-foreground tabular-nums">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
