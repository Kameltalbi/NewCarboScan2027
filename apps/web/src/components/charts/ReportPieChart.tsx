import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, COMMON_CHART_CONFIG } from '@/lib/config/reportCharts';

interface ReportPieChartProps {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  width?: number;
  height?: number;
  title?: string;
  description?: string;
  /** true = Doughnut (trou au centre), false = Pie plein */
  isDoughnut?: boolean;
}

export const ReportPieChart: React.FC<ReportPieChartProps> = ({
  data,
  colors = CHART_COLORS.gradient,
  width = 400,
  height = 400,
  title,
  description,
  isDoughnut = false,
}) => {
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="13px"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-doughnut-wrapper" style={{ position: 'relative', width, height }}>
        <ResponsiveContainer width={width} height={height}>
          <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            innerRadius={isDoughnut ? 60 : 0}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip {...COMMON_CHART_CONFIG.tooltip} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            {...COMMON_CHART_CONFIG.legend}
          />
        </PieChart>
      </ResponsiveContainer>
        {isDoughnut && (
          <div
            className="chart-doughnut-center"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: CHART_COLORS.textPrimary,
              fontSize: '18px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              pointerEvents: 'none',
            }}
          >
            {total.toLocaleString('fr-FR')} tCO₂e
          </div>
        )}
      </div>
      {description && <p className="chart-description">{description}</p>}
    </div>
  );
};
