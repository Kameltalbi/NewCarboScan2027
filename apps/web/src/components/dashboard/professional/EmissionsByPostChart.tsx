import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface EmissionPost {
  name: string;
  value: number;
}

interface EmissionsByPostChartProps {
  data: EmissionPost[];
}

export const EmissionsByPostChart: React.FC<EmissionsByPostChartProps> = ({ data }) => {
  // Gradient colors from green to blue
  const getBarColor = (index: number, total: number) => {
    const startColor = { r: 14, g: 124, b: 102 }; // #0E7C66
    const endColor = { r: 37, g: 99, b: 235 }; // #2563EB
    const ratio = total > 1 ? index / (total - 1) : 0;
    
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const sortedData = [...data].sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-card border shadow-lg rounded-lg p-3">
          <p className="font-medium text-sm">{item.payload.name}</p>
          <p className="text-lg font-bold">{item.value.toFixed(1)} tCO₂e</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-dashboard-text">
          Émissions par poste
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart 
            data={sortedData} 
            layout="vertical" 
            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
          >
            <XAxis 
              type="number" 
              tick={{ fontSize: 12, fill: '#6B7280' }} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(value) => `${value}t`}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#374151' }} 
              axisLine={false}
              tickLine={false}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar 
              dataKey="value" 
              radius={[0, 6, 6, 0]}
              barSize={28}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(index, sortedData.length)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
