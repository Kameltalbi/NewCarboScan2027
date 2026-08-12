import React from 'react';
import { FileText, Clock, RefreshCw, Target } from 'lucide-react';

interface ACVCompactKPIsProps {
  totalStudies: number;
  inProgressCount: number;
  lastUpdate: string | null;
  mostCommonScope: string | null;
}

export const ACVCompactKPIs: React.FC<ACVCompactKPIsProps> = ({
  totalStudies,
  inProgressCount,
  lastUpdate,
  mostCommonScope,
}) => {
  const kpis = [
    {
      label: 'Études ACV',
      value: totalStudies.toString(),
      icon: FileText,
    },
    {
      label: 'En cours',
      value: inProgressCount.toString(),
      icon: Clock,
    },
    {
      label: 'Dernière mise à jour',
      value: lastUpdate || '–',
      icon: RefreshCw,
    },
    {
      label: 'Périmètre fréquent',
      value: mostCommonScope || '–',
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
