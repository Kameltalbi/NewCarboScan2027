import React from 'react';
import { Factory, TrendingDown, Calendar, Target } from 'lucide-react';

interface NetZeroCompactKPIsProps {
  baselineEmissions: number | null;
  reductionTarget: number | null;
  targetYear: number | null;
  currentProgress: number | null;
}

export const NetZeroCompactKPIs: React.FC<NetZeroCompactKPIsProps> = ({
  baselineEmissions,
  reductionTarget,
  targetYear,
  currentProgress,
}) => {
  const formatEmissions = (value: number | null) => {
    if (value === null) return '–';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k tCO₂e`;
    return `${value.toFixed(0)} tCO₂e`;
  };

  const kpis = [
    {
      label: 'Émissions de référence',
      value: formatEmissions(baselineEmissions),
      icon: Factory,
    },
    {
      label: 'Objectif de réduction',
      value: reductionTarget !== null ? `${reductionTarget}%` : '–',
      icon: TrendingDown,
    },
    {
      label: 'Horizon cible',
      value: targetYear !== null ? targetYear.toString() : '–',
      icon: Calendar,
    },
    {
      label: 'Avancement actuel',
      value: currentProgress !== null ? `${currentProgress}%` : '–',
      icon: Target,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-sm font-medium text-foreground">{kpi.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
