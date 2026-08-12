import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CHART_COLORS, COMMON_CHART_CONFIG } from '@/lib/config/reportCharts';

interface ReportLineAreaChartProps {
  /** Données : [{ year: string, value: number, objectif?: number }] */
  data: Array<{ year: string; value: number; objectif?: number }>;
  colors?: string[];
  width?: number;
  height?: number;
  title?: string;
  description?: string;
}

export const ReportLineAreaChart: React.FC<ReportLineAreaChartProps> = ({
  data,
  colors = [CHART_COLORS.primary, CHART_COLORS.scope3],
  width = 650,
  height = 400,
  title,
  description,
}) => {
  if (!data?.length) return null;

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width={width} height={height}>
        <AreaChart
          data={data}
          margin={COMMON_CHART_CONFIG.margin}
        >
          <CartesianGrid {...COMMON_CHART_CONFIG.cartesianGrid} />
          <XAxis
            dataKey="year"
            {...COMMON_CHART_CONFIG.axis}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            {...COMMON_CHART_CONFIG.axis}
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v}`}
            unit=" tCO₂e"
          />
          <Tooltip
            {...COMMON_CHART_CONFIG.tooltip}
            formatter={(value: number) => [`${value} tCO₂e`, '']}
            labelFormatter={(label) => `Année ${label}`}
          />
          <Legend {...COMMON_CHART_CONFIG.legend} />
          <Area
            type="monotone"
            dataKey="value"
            name="Émissions"
            stroke={colors[0]}
            fill={colors[0]}
            fillOpacity={0.4}
            strokeWidth={2}
          />
          {data.some((d) => typeof d.objectif === 'number') && (
            <Area
              type="monotone"
              dataKey="objectif"
              name="Objectif 2030"
              stroke={colors[1]}
              fill={colors[1]}
              fillOpacity={0.2}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      {description && <p className="chart-description">{description}</p>}
    </div>
  );
};
