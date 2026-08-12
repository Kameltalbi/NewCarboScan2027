import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface ScopeChartProps {
  scope1: number;
  scope2: number;
  scope3: number;
}

const SCOPE_COLORS = {
  scope1: '#0E7C66',
  scope2: '#4FD1C5',
  scope3: '#2563EB'
};

export const ScopeChart: React.FC<ScopeChartProps> = ({ scope1, scope2, scope3 }) => {
  const data = [
    { name: 'Scope 1', value: scope1, color: SCOPE_COLORS.scope1 },
    { name: 'Scope 2', value: scope2, color: SCOPE_COLORS.scope2 },
    { name: 'Scope 3', value: scope3, color: SCOPE_COLORS.scope3 },
  ];

  const total = scope1 + scope2 + scope3;
  
  // Calculate percentages
  const dataWithPercentages = data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-card border shadow-lg rounded-lg p-3">
          <p className="font-medium text-sm">{item.payload.name}</p>
          <p className="text-lg font-bold">{item.value.toFixed(1)} tCO₂e</p>
          <p className="text-xs text-muted-foreground">{percentage}% du total</p>
        </div>
      );
    }
    return null;
  };

  // Custom label component to show percentage
  const CustomLabel = ({ x, y, width, value, payload }: any) => {
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    return (
      <text
        x={x + width + 8}
        y={y + 15}
        fill="#374151"
        fontSize={14}
        fontWeight={600}
        className="font-semibold"
      >
        {percentage}%
      </text>
    );
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-dashboard-text">
          Répartition par Scope
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dataWithPercentages} layout="vertical" margin={{ top: 10, right: 80, left: 10, bottom: 10 }}>
            <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 13, fill: '#374151', fontWeight: 500 }} 
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar 
              dataKey="value" 
              radius={[0, 8, 8, 0]}
              barSize={50}
            >
              {dataWithPercentages.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  style={{ 
                    opacity: entry.name === 'Scope 3' ? 1 : 0.9,
                    filter: entry.name === 'Scope 3' ? 'brightness(1.1)' : 'none'
                  }}
                />
              ))}
              <LabelList content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-dashboard-separator">
          {dataWithPercentages.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${item.name === 'Scope 3' ? 'ring-2 ring-blue-300' : ''}`}
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">{item.name}</span>
              <span className="text-sm font-semibold">{item.value.toFixed(1)}t</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
