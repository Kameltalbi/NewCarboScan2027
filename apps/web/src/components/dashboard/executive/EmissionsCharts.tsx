// Professional emissions charts: Donut, Line, Horizontal Bar
// Sober, executive-level visualizations

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
} from 'recharts';

// CarboScan color palette - sober and professional
const CHART_COLORS = {
  primary: 'hsl(168, 76%, 42%)', // CarboScan green
  scope1: 'hsl(168, 76%, 42%)',  // Green
  scope2: 'hsl(215, 16%, 47%)',  // Gray
  scope3: 'hsl(222, 47%, 20%)',  // Dark navy
  neutral: 'hsl(220, 13%, 91%)', // Light gray
  muted: 'hsl(215, 16%, 67%)',   // Medium gray
};

interface ScopeData {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}

interface EmissionsByYear {
  year: number;
  emissions: number;
}

interface CategoryEmission {
  category: string;
  emissions: number;
  percentage: number;
}

interface EmissionsChartsProps {
  scopeData: ScopeData;
  yearlyData?: EmissionsByYear[];
  categoryData: CategoryEmission[];
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label, suffix = 'tCO₂e' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-foreground">
          {label || payload[0].name}: {payload[0].value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} {suffix}
        </p>
      </div>
    );
  }
  return null;
};

// Donut Chart for Scope breakdown
const ScopeDonutChart: React.FC<{ data: ScopeData }> = ({ data }) => {
  const chartData = [
    { name: 'Scope 1', value: data.scope1, color: CHART_COLORS.scope1 },
    { name: 'Scope 2', value: data.scope2, color: CHART_COLORS.scope2 },
    { name: 'Scope 3', value: data.scope3, color: CHART_COLORS.scope3 },
  ].filter(item => item.value > 0);

  return (
    <Card className="border rounded">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Répartition par scope
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground tabular-nums">
                {data.total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-muted-foreground">tCO₂e</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="space-y-3">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-sm shrink-0" 
                  style={{ backgroundColor: item.color }} 
                />
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {item.value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Line Chart for emissions evolution
const EmissionsLineChart: React.FC<{ data: EmissionsByYear[] }> = ({ data }) => {
  if (!data || data.length < 2) {
    return (
      <Card className="border rounded">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Évolution des émissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Données historiques non disponibles
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border rounded">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Évolution des émissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <XAxis 
                dataKey="year" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 12 }}
                tickFormatter={(value) => `${value.toLocaleString('fr-FR')}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="emissions"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.primary, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: CHART_COLORS.primary }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Horizontal Bar Chart for top categories
const CategoryBarChart: React.FC<{ data: CategoryEmission[] }> = ({ data }) => {
  const sortedData = [...data]
    .sort((a, b) => b.emissions - a.emissions)
    .slice(0, 6)
    .map(item => ({
      ...item,
      category: item.category.length > 25 ? item.category.substring(0, 25) + '...' : item.category,
    }));

  if (sortedData.length === 0) {
    return (
      <Card className="border rounded">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Principaux postes d'émission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border rounded">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Principaux postes d'émission
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={sortedData} 
              layout="vertical"
              margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 11 }}
              />
              <YAxis 
                type="category" 
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 11 }}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="emissions" 
                fill={CHART_COLORS.primary}
                radius={[0, 4, 4, 0]}
                barSize={20}
              >
                <LabelList 
                  dataKey="emissions" 
                  position="right"
                  formatter={(value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} t`}
                  style={{ fill: 'hsl(215, 16%, 47%)', fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const EmissionsCharts: React.FC<EmissionsChartsProps> = ({
  scopeData,
  yearlyData,
  categoryData,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Vue d'ensemble des émissions</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScopeDonutChart data={scopeData} />
        <EmissionsLineChart data={yearlyData || []} />
      </div>
      
      <CategoryBarChart data={categoryData} />
    </div>
  );
};
