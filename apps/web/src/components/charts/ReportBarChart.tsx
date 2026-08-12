import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS, COMMON_CHART_CONFIG } from '@/lib/config/reportCharts';

interface ReportBarChartProps {
  data: Array<{ name: string; value: number }>;
  color?: string;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
  yAxisLabel?: string;
}

export const ReportBarChart: React.FC<ReportBarChartProps> = ({
  data,
  color = CHART_COLORS.primary,
  width = 500,
  height = 400,
  title,
  description,
  yAxisLabel = 'tCO₂e',
}) => {
  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width={width} height={height}>
        <BarChart data={data} margin={COMMON_CHART_CONFIG.margin}>
          <CartesianGrid {...COMMON_CHART_CONFIG.cartesianGrid} />
          <XAxis dataKey="name" {...COMMON_CHART_CONFIG.axis} />
          <YAxis
            {...COMMON_CHART_CONFIG.axis}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '12px' },
            }}
          />
          <Tooltip {...COMMON_CHART_CONFIG.tooltip} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {description && <p className="chart-description">{description}</p>}
    </div>
  );
};
