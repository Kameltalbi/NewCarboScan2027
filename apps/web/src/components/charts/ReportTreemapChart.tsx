import React, { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS, COMMON_CHART_CONFIG } from '@/lib/config/reportCharts';

interface ReportTreemapChartProps {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  width?: number;
  height?: number;
  title?: string;
  description?: string;
}

/** Couleur par index pour les tuiles */
const getColor = (colors: string[], index: number) =>
  colors[index % colors.length];

// Custom content renderer as a proper component
const TreemapContent: React.FC<any> = ({ x, y, width: w, height: h, name, value, fill }) => {
  if (w < 30 || h < 30) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
        fillOpacity={0.85}
      />
      {w > 50 && h > 40 && (
        <>
          <text
            x={x + w / 2}
            y={y + h / 2 - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight={600}
          >
            {name?.length > 18 ? `${name.slice(0, 16)}…` : name}
          </text>
          <text
            x={x + w / 2}
            y={y + h / 2 + 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.9)"
            fontSize={11}
          >
            {value} tCO₂e
          </text>
        </>
      )}
    </g>
  );
};

export const ReportTreemapChart: React.FC<ReportTreemapChartProps> = ({
  data,
  colors = CHART_COLORS.gradient,
  width = 600,
  height = 450,
  title,
  description,
}) => {
  const treeData = useMemo(() => {
    if (!data?.length) return [];
    return data.map((item, index) => ({
      ...item,
      fill: getColor(colors, index),
    }));
  }, [data, colors]);

  if (!treeData.length) return null;

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width={width} height={height}>
        <Treemap
          data={treeData}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke={CHART_COLORS.grid}
          content={<TreemapContent />}
        >
          <Tooltip
            {...COMMON_CHART_CONFIG.tooltip}
            formatter={(value: number) => [`${value} tCO₂e`, 'Émissions']}
            labelFormatter={(label) => label}
          />
        </Treemap>
      </ResponsiveContainer>
      {description && <p className="chart-description">{description}</p>}
    </div>
  );
};
