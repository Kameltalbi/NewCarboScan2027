import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface OrganizationDashboardProps {
  organizationName?: string;
}

export const OrganizationDashboard: React.FC<OrganizationDashboardProps> = ({
  organizationName = "PHILIPS"
}) => {
  // Données pour le graphique mensuel des émissions GHG (en kg CO₂e)
  const monthlyEmissions = [
    { month: 'Jan', scope1: 400000, scope2: 300000, scope3: 200000, total: 900000 },
    { month: 'Feb', scope1: 500000, scope2: 400000, scope3: 250000, total: 1150000 },
    { month: 'Mar', scope1: 600000, scope2: 450000, scope3: 300000, total: 1350000 },
    { month: 'Apr', scope1: 450000, scope2: 350000, scope3: 180000, total: 980000 },
    { month: 'May', scope1: 550000, scope2: 400000, scope3: 220000, total: 1170000 },
    { month: 'Jun', scope1: 500000, scope2: 380000, scope3: 190000, total: 1070000 },
    { month: 'Jul', scope1: 480000, scope2: 360000, scope3: 170000, total: 1010000 },
    { month: 'Aug', scope1: 520000, scope2: 390000, scope3: 200000, total: 1110000 },
    { month: 'Sep', scope1: 490000, scope2: 370000, scope3: 180000, total: 1040000 },
    { month: 'Oct', scope1: 510000, scope2: 380000, scope3: 190000, total: 1080000 },
    { month: 'Nov', scope1: 530000, scope2: 400000, scope3: 210000, total: 1140000 },
    { month: 'Dec', scope1: 470000, scope2: 350000, scope3: 160000, total: 980000 },
  ];

  // Données pour les mini-graphiques de tendance (en kg CO₂e)
  const trendData = [
    { month: 1, value: 520000 },
    { month: 2, value: 530000 },
    { month: 3, value: 510000 },
    { month: 4, value: 540000 },
    { month: 5, value: 560000 },
    { month: 6, value: 569000 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()} kg CO₂e
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const MiniTrendChart = ({ data, color }: { data: any[], color: string }) => (
    <div className="h-12 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>Dashboard</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2d6e4a' }}>
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="text-lg font-medium">{organizationName}</span>
            <Badge variant="outline" className="ml-2">← Back to Companies</Badge>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">📅 Jan 21 - Dec 23</Badge>
          <Badge variant="outline">All Filters (2)</Badge>
          <Badge className="text-white" style={{ backgroundColor: '#2d6e4a' }}>Apply (5)</Badge>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">Time: Jan 21 - Dec 22 ×</Badge>
        <Badge variant="secondary">Period: Monthly ×</Badge>
        <Badge variant="secondary">Standard: GHG ×</Badge>
        <Badge variant="secondary">Location: Punpin ×</Badge>
        <Badge variant="secondary">Boundary: Logistic ×</Badge>
        <Badge 
          className="text-white cursor-pointer"
          style={{ backgroundColor: '#2d6e4a' }}
        >
          Clear All
        </Badge>
      </div>

      {/* KPI Cards - Monthly GHG Scope */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Monthly GHG Scope</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Scope 1 */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">SCOPE 1</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>569,000</span>
                    <span className="text-sm text-muted-foreground">kg CO₂e</span>
                  </div>
                </div>
                <MiniTrendChart data={trendData} color="#2d6e4a" />
              </div>
            </CardContent>
          </Card>

          {/* Scope 2 */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">SCOPE 2</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>569,000</span>
                    <span className="text-sm text-muted-foreground">kg CO₂e</span>
                  </div>
                </div>
                <MiniTrendChart data={trendData} color="#3b82f6" />
              </div>
            </CardContent>
          </Card>

          {/* Scope 3 */}
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">SCOPE 3</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>100,000</span>
                    <span className="text-sm text-muted-foreground">kg CO₂e</span>
                  </div>
                </div>
                <MiniTrendChart data={trendData.map(d => ({ ...d, value: d.value * 0.2 }))} color="#06b6d4" />
              </div>
            </CardContent>
          </Card>

          {/* Total */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">TOTAL</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: '#2d6e4a' }}>509,000</span>
                    <span className="text-sm text-muted-foreground">kg CO₂e</span>
                  </div>
                </div>
                <MiniTrendChart data={trendData.map(d => ({ ...d, value: d.value * 0.9 }))} color="#10b981" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly GHG Emission Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Monthly GHG Emission (kg CO₂e)</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Breakdown by GHG scope</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2d6e4a' }}></div>
                <span className="text-sm">Scope 1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5b8a6b' }}></div>
                <span className="text-sm">Scope 2</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#c7ea46' }}></div>
                <span className="text-sm">Scope 3</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8bc34a' }}></div>
                <span className="text-sm">All scopes</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyEmissions} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                domain={[0, 3000000]}
                tickFormatter={(value) => `${(value / 1000).toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="scope1" 
                name="Scope 1" 
                fill="#2d6e4a"
                stackId="scope"
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="scope2" 
                name="Scope 2" 
                fill="#5b8a6b"
                stackId="scope"
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="scope3" 
                name="Scope 3" 
                fill="#c7ea46"
                stackId="scope"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};