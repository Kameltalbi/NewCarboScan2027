import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TransitionChartPoint } from "../types";

interface Props {
  points: TransitionChartPoint[];
  showActual: boolean;
  showCompany: boolean;
  showScenario: boolean;
  showReference15: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

export const TransitionTrajectoryChart: React.FC<Props> = ({
  points,
  showActual,
  showCompany,
  showScenario,
  showReference15,
}) => {
  if (points.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
        Aucune série à afficher pour le moment.
      </div>
    );
  }

  return (
    <div className="h-80 w-full" data-testid="transition-trajectory-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            width={64}
            tickFormatter={(v) => (v >= 1000 ? `${fmt(v / 1000)}k` : fmt(v))}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${fmt(Number(value))} tCO₂e`, name]}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
            }}
          />
          <Legend />
          {showActual && (
            <Line
              type="monotone"
              dataKey="actual"
              name="Réalisé"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              connectNulls={false}
            />
          )}
          {showReference15 && (
            <Line
              type="monotone"
              dataKey="reference15"
              name="Trajectoire 1,5 °C"
              stroke="#7c3aed"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              connectNulls
            />
          )}
          {showCompany && (
            <Line
              type="monotone"
              dataKey="companyTarget"
              name="Objectif entreprise"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
            />
          )}
          {showScenario && (
            <Line
              type="monotone"
              dataKey="scenario"
              name="Scénario"
              stroke="#d97706"
              strokeWidth={2}
              strokeDasharray="2 4"
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
