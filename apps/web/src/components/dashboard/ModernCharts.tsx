import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar 
} from 'recharts';

interface ModernChartsProps {
  scopeData: Array<{
    name: string;
    value: number;
    color: string;
    label: string;
    absolute: number;
  }>;
  emissionTrends: Array<{
    month: string;
    emissions: number;
    target: number;
  }>;
  sectorComparison: Array<{
    category: string;
    votreSociete: number;
    moyenneSecteur: number;
    meilleuresSocietes: number;
  }>;
  scopeProjection: Array<{
    month: string;
    scope1: number;
    scope2: number;
    scope3: number;
  }>;
}

export const ModernCharts: React.FC<ModernChartsProps> = ({
  scopeData,
  emissionTrends,
  sectorComparison,
  scopeProjection
}) => {
  const COLORS = {
    scope1: 'hsl(var(--scope-1-main))',
    scope2: 'hsl(var(--scope-2-main))',
    scope3: 'hsl(var(--scope-3-main))',
    primary: 'hsl(var(--primary))',
    muted: 'hsl(var(--muted-foreground))'
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              {entry.name.includes('Émissions') || entry.name.includes('Scope') ? ' t CO₂e' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-section">
      <h2 className="section-title flex items-center gap-2 mb-6">
        <span>📊</span> Analyse détaillée de vos émissions
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Modern Pie Chart - Emissions by Scope */}
        <Card className="chart-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              🥧 Répartition par Scope
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribution de vos émissions de GES
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scopeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="absolute"
                >
                  {scopeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry: any) => (
                    <span style={{ color: entry.color, fontWeight: 'medium' }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sector Comparison */}
        <Card className="chart-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              📈 Comparaison Sectorielle
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Où vous situez-vous dans votre secteur ?
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectorComparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="votreSociete" 
                  name="Votre Société" 
                  fill={COLORS.primary}
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="moyenneSecteur" 
                  name="Moyenne Secteur" 
                  fill={COLORS.muted}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Emission Reduction Projection */}
        <Card className="chart-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>🎯</span> Projection de Réduction
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Évolution vers vos objectifs
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emissionTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="emissions" 
                  name="Émissions Actuelles"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  name="Objectif"
                  stroke="hsl(var(--kpi-positive))"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--kqi-positive))', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Projection by Scope */}
        <Card className="chart-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>📊</span> Projection par Scope
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Évolution détaillée par catégorie
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={scopeProjection} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="scope1"
                  name="Scope 1"
                  stackId="1"
                  stroke={COLORS.scope1}
                  fill={COLORS.scope1}
                  fillOpacity={0.7}
                />
                <Area
                  type="monotone"
                  dataKey="scope2"
                  name="Scope 2"
                  stackId="1"
                  stroke={COLORS.scope2}
                  fill={COLORS.scope2}
                  fillOpacity={0.7}
                />
                <Area
                  type="monotone"
                  dataKey="scope3"
                  name="Scope 3"
                  stackId="1"
                  stroke={COLORS.scope3}
                  fill={COLORS.scope3}
                  fillOpacity={0.7}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};