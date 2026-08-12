import React from "react";
import { useTranslation } from "react-i18next";
import { EmissionCategory } from "@/types/empreinteProduit";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface CategoryBreakdownProps {
  categories: EmissionCategory[];
  totalEmissions: number;
}

const COLORS = [
  "hsl(var(--scope-1))",
  "hsl(var(--scope-2))",
  "hsl(var(--scope-3))",
  "hsl(var(--carbon-impact))",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ categories, totalEmissions }) => {
  const { t } = useTranslation();
  const sorted = [...categories].sort((a, b) => b.value - a.value);

  const chartData = sorted.map((cat) => ({
    name: cat.name,
    value: Math.round(cat.value),
    scope: cat.scope,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        {t("carbonCalculator.results.topEmitters")}
      </h2>

      {/* Horizontal bar chart */}
      <div className="w-full" style={{ height: Math.max(sorted.length * 48, 200) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => v.toLocaleString("fr-FR")}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString("fr-FR")} tCO₂e`, ""]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--background))",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail list */}
      <div className="space-y-2">
        {sorted.map((cat, i) => {
          const pct = totalEmissions > 0 ? ((cat.value / totalEmissions) * 100).toFixed(1) : "0";
          return (
            <div key={cat.name} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">Scope {cat.scope}</span>
              </div>
              <div className="text-right shrink-0 ml-4">
                <span className="font-bold text-sm text-foreground tabular-nums">
                  {Math.round(cat.value).toLocaleString("fr-FR")} tCO₂e
                </span>
                <span className="text-xs text-muted-foreground ml-2">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
