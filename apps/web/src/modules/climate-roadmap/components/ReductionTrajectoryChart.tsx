import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrajectoryPoint } from "@/lib/net-zero/reductionTrajectory";

export function ReductionTrajectoryChart({ points }: { points: TrajectoryPoint[] }) {
  if (points.length === 0) return null;
  return (
    <div className="h-72 w-full" data-testid="reduction-trajectory-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={56} />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} tCO₂e`,
              name,
            ]}
          />
          <Line
            type="monotone"
            dataKey="targetT"
            name="Trajectoire cible"
            stroke="#07563F"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actualT"
            name="Émissions des bilans"
            stroke="#4C7D7F"
            strokeWidth={2}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
