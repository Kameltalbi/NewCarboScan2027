// Graphique – Répartition Scope 1 par poste émetteur
// Type : camembert (donut)

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Scope1BreakdownChartProps {
  data: Array<{
    name: string;
    emissions: number;
    scope: 1 | 2 | 3;
    percentage: number;
  }>;
}

// Palette bleutée pour Scope 1 (émissions directes)
const SCOPE1_COLORS = [
  '#0EA5E9', '#0284C7', '#0369A1', '#075985', '#0C4A6E',
  '#38BDF8', '#7DD3FC', '#BAE6FD', '#1D4ED8', '#3B82F6',
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
          {data.percentage.toFixed(1)}% du Scope 1
        </p>
      </div>
    );
  }
  return null;
};

export const Scope1BreakdownChart: React.FC<Scope1BreakdownChartProps> = ({ data }) => {
  const scope1Data = data
    .filter(item => item.scope === 1 && item.emissions > 0)
    .sort((a, b) => b.emissions - a.emissions)
    .map((item, index) => ({
      ...item,
      emissionsTonnes: kgToTonnes(item.emissions),
      color: SCOPE1_COLORS[index % SCOPE1_COLORS.length],
    }));

  const totalScope1 = scope1Data.reduce((sum, item) => sum + item.emissions, 0);

  const scope1DataWithPercentage = scope1Data.map(item => ({
    ...item,
    percentage: totalScope1 > 0 ? (item.emissions / totalScope1) * 100 : 0,
  }));

  const renderLabel = ({ cx, cy, midAngle, outerRadius, percentage, name }: any) => {
    if (percentage < 5) return null;
    const RADIAN = Math.PI / 180;
    // Position à l'extérieur du donut pour afficher le nom du poste
    const radius = outerRadius + 12;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const anchor = x > cx ? 'start' : 'end';
    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--foreground))"
        textAnchor={anchor}
        dominantBaseline="central"
        fontSize={10}
        fontWeight={500}
      >
        {`${name} (${percentage.toFixed(0)}%)`}
      </text>
    );
  };

  if (scope1Data.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-base font-semibold text-foreground">
            Scope 1 par poste
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Aucune donnée Scope 1 disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            Scope 1 par poste
          </CardTitle>
          <span className="text-sm font-bold text-muted-foreground tabular-nums">
            {Math.round(kgToTonnes(totalScope1)).toLocaleString('fr-FR')} tCO₂e
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-hidden">
        <div className="flex items-center gap-4 h-full">
          <div className="relative flex-shrink-0 w-[180px] h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scope1DataWithPercentage}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="emissionsTonnes"
                  nameKey="name"
                  label={renderLabel}
                  labelLine={false}
                  animationBegin={200}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {scope1DataWithPercentage.map((entry, index) => (
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
              <span className="text-lg font-bold text-foreground">{scope1Data.length}</span>
              <span className="text-xs text-muted-foreground ml-1">postes</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1 text-xs max-h-[240px] overflow-y-auto pr-1">
            {scope1DataWithPercentage
              .filter(item => item.emissions > 0)
              .map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="flex-1 text-foreground truncate" title={item.name}>
                  {item.name}
                </span>
                <span className="font-medium text-muted-foreground tabular-nums whitespace-nowrap">
                  {Math.round(kgToTonnes(item.emissions)).toLocaleString('fr-FR')} t · {item.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
