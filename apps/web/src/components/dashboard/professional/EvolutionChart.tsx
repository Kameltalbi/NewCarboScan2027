import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface YearlyData {
  year: string;
  emissions: number;
}

interface EvolutionChartProps {
  data: YearlyData[];
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const previousValue = data.findIndex(d => d.year === label) > 0 
        ? data[data.findIndex(d => d.year === label) - 1]?.emissions 
        : null;
      const evolution = previousValue ? ((value - previousValue) / previousValue * 100).toFixed(1) : null;
      
      return (
        <div className="bg-card border shadow-xl rounded-lg p-4 backdrop-blur-sm">
          <p className="font-semibold text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-xl font-bold text-foreground mb-1">{value.toFixed(1)} tCO₂e</p>
          {evolution && (
            <p className={`text-xs font-medium ${
              parseFloat(evolution) < 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {parseFloat(evolution) > 0 ? '+' : ''}{evolution}% vs année précédente
            </p>
          )}
        </div>
      );
    }
    return null;
  };
  
  // Custom dot component to highlight the last point
  const CustomDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    const isLastPoint = index === data.length - 1;
    
    if (isLastPoint) {
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={10}
            fill="#2563EB"
            stroke="#fff"
            strokeWidth={3}
            className="drop-shadow-lg"
          />
        </g>
      );
    }
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#2563EB"
        stroke="#fff"
        strokeWidth={2}
      />
    );
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-dashboard-text">
          Évolution dans le temps
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="emissionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.08}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 12, fill: '#6B7280' }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6B7280' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}t`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="emissions" 
              stroke="#2563EB" 
              strokeWidth={3}
              fill="url(#emissionsGradient)"
              dot={<CustomDot />}
              activeDot={{ r: 8, fill: '#2563EB', stroke: '#fff', strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
