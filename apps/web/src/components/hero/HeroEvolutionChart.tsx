import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const data = [
  { year: "2023", emissions: 1240 },
  { year: "2024", emissions: 1085 },
  { year: "2025", emissions: 890 },
  { year: "2026", emissions: 720 },
];

export const HeroEvolutionChart: React.FC = () => {
  const first = data[0].emissions;
  const last = data[data.length - 1].emissions;
  const reduction = Math.round(((first - last) / first) * 100);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0B2E24]/80 backdrop-blur-sm">
      {/* Header matching site */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0B2E24]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" />
          <span className="text-white text-sm font-semibold tracking-wide">
            Évolution des émissions
          </span>
        </div>
        <span className="text-[11px] font-semibold text-[#4ADE80] bg-[#10B981]/15 border border-[#10B981]/30 rounded-full px-2.5 py-1">
          −{reduction}% vs 2023
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 px-5 pt-5">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">Base 2023</div>
          <div className="text-lg font-bold text-white">{first} <span className="text-xs font-medium text-white/60">tCO₂e</span></div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">Projection 2026</div>
          <div className="text-lg font-bold text-[#4ADE80]">{last} <span className="text-xs font-medium text-white/60">tCO₂e</span></div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">Trajectoire</div>
          <div className="text-lg font-bold text-white">SBTi 1.5°C</div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="heroEmissions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#4ADE80" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fontSize: 12, fill: "rgba(255,255,255,0.7)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}t`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0B2E24",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v} tCO₂e`, "Émissions"]}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
            />
            <Area
              type="monotone"
              dataKey="emissions"
              stroke="#4ADE80"
              strokeWidth={2.5}
              fill="url(#heroEmissions)"
              dot={{ r: 4, fill: "#4ADE80", stroke: "#0B2E24", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#4ADE80", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
