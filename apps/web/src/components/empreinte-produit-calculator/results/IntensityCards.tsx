import React from "react";
import { IntensityMetrics } from "@/types/empreinteProduit";
import { Users, Building2, DollarSign } from "lucide-react";

interface IntensityCardsProps {
  metrics: IntensityMetrics;
}

const formatValue = (v: number) => (v < 1 ? v.toFixed(3) : v.toFixed(2));

export const IntensityCards: React.FC<IntensityCardsProps> = ({ metrics }) => {
  const items = [
    { icon: Users, value: metrics.perEmployee, unit: "tCO₂e / collaborateur", show: metrics.perEmployee > 0 },
    { icon: Building2, value: metrics.perM2, unit: "tCO₂e / m²", show: metrics.perM2 > 0 },
    { icon: DollarSign, value: metrics.perKDT, unit: "tCO₂e / KDT", show: metrics.perKDT > 0 },
  ].filter((i) => i.show);

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Indicateurs d'intensité</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.unit} className="rounded-xl border bg-primary/5 p-5 text-center space-y-2">
            <item.icon className="w-6 h-6 mx-auto text-primary" />
            <div className="text-2xl font-bold text-primary tabular-nums">{formatValue(item.value)}</div>
            <div className="text-xs text-muted-foreground font-medium">{item.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
