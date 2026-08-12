import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS, COMMON_CHART_CONFIG } from '@/lib/config/reportCharts';

interface ReportParetoChartProps {
  data: Array<{ name: string; emissions: number; cumulative: number }>;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
}

export const ReportParetoChart: React.FC<ReportParetoChartProps> = ({
  data,
  width = 700,
  height = 450,
  title,
  description,
}) => {
  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width={width} height={height}>
        <ComposedChart data={data} margin={COMMON_CHART_CONFIG.margin}>
          <CartesianGrid {...COMMON_CHART_CONFIG.cartesianGrid} />
          <XAxis dataKey="name" {...COMMON_CHART_CONFIG.axis} />
          <YAxis
            yAxisId="left"
            {...COMMON_CHART_CONFIG.axis}
            label={{
              value: 'tCO₂e',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '12px' },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={CHART_COLORS.secondary}
            label={{
              value: '% cumulé',
              angle: 90,
              position: 'insideRight',
              style: { fontSize: '12px' },
            }}
          />
          <Tooltip {...COMMON_CHART_CONFIG.tooltip} />
          <Legend {...COMMON_CHART_CONFIG.legend} />
          <Bar
            yAxisId="left"
            dataKey="emissions"
            fill={CHART_COLORS.primary}
            name="Émissions"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            stroke={CHART_COLORS.secondary}
            strokeWidth={2}
            name="% cumulé"
          />
        </ComposedChart>
      </ResponsiveContainer>
      {description && <p className="chart-description">{description}</p>}
    </div>
  );
};
