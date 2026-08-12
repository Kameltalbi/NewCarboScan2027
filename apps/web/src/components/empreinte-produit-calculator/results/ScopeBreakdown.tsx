import React from "react";
import { useTranslation } from "react-i18next";
import { EmissionsResult } from "@/types/empreinteProduit";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface ScopeBreakdownProps {
  results: EmissionsResult;
}

const SCOPE_COLORS = [
  "hsl(var(--scope-1))",
  "hsl(var(--scope-2))",
  "hsl(var(--scope-3))",
];

export const ScopeBreakdown: React.FC<ScopeBreakdownProps> = ({ results }) => {
  const { t } = useTranslation();
  const total = results.totalEmissions;

  const scopes = [
    { name: t("carbonCalculator.results.scopes.scope1"), value: results.scope1, desc: "Émissions directes", color: SCOPE_COLORS[0] },
    { name: t("carbonCalculator.results.scopes.scope2"), value: results.scope2, desc: "Énergie indirecte", color: SCOPE_COLORS[1] },
    { name: t("carbonCalculator.results.scopes.scope3"), value: results.scope3, desc: "Autres indirectes", color: SCOPE_COLORS[2] },
  ];

  const chartData = scopes
    .filter((s) => s.value > 0)
    .map((s) => ({ name: s.name, value: Math.round(s.value) }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        {t("carbonCalculator.results.scopeBreakdown")}
      </h2>

      {/* Donut chart */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-full md:w-1/2 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={SCOPE_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString("fr-FR")} tCO₂e`, ""]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))",
                  fontSize: "13px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Scope detail cards */}
        <div className="w-full md:w-1/2 space-y-3">
          {scopes.map((s) => {
            const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : "0";
            return (
              <div key={s.name} className="flex items-center gap-3 rounded-xl border p-4">
                <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {Math.round(s.value).toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-muted-foreground">{pct}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
