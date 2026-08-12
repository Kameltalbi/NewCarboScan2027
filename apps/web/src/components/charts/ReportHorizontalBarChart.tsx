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

interface ReportHorizontalBarChartProps {
  data: Array<{ name: string; value: number }>;
  color?: string;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
}

export const ReportHorizontalBarChart: React.FC<ReportHorizontalBarChartProps> = ({
  data,
  color = CHART_COLORS.secondary,
  width = 600,
  height = 400,
  title,
  description,
}) => {
  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width={width} height={height}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={COMMON_CHART_CONFIG.margin}
        >
          <CartesianGrid {...COMMON_CHART_CONFIG.cartesianGrid} />
          <XAxis
            type="number"
            {...COMMON_CHART_CONFIG.axis}
            label={{
              value: 'tCO₂e',
              position: 'insideBottom',
              offset: -5,
              style: { fontSize: '12px' },
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            {...COMMON_CHART_CONFIG.axis}
            width={150}
          />
          <Tooltip {...COMMON_CHART_CONFIG.tooltip} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {description && <p className="chart-description">{description}</p>}
    </div>
  );
};
