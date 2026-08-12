import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, TrendingDown, TrendingUp, Factory, Target } from 'lucide-react';

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subLabel?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  bgColor: string;
  iconColor: string;
  isDominant?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  icon: Icon,
  label,
  value,
  subLabel,
  trend,
  trendValue,
  bgColor,
  iconColor,
  isDominant = false
}) => {
  return (
    <Card className={`border-0 shadow-soft hover:shadow-medium transition-shadow duration-300 ${
      isDominant 
        ? 'bg-gradient-to-br from-green-50/80 to-emerald-50/60 ring-2 ring-green-200/50' 
        : 'bg-card'
    }`}>
      <CardContent className={`p-5 ${isDominant ? 'p-6' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 ${isDominant ? 'p-3' : ''} rounded-xl ${bgColor} ${isDominant ? 'ring-2 ring-green-300/30' : ''}`}>
            <Icon className={`${isDominant ? 'h-6 w-6' : 'h-5 w-5'} ${iconColor}`} />
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend === 'down' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-600'
            }`}>
              {trend === 'down' ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className={`text-xs font-medium text-muted-foreground uppercase tracking-wide ${isDominant ? 'font-semibold' : ''}`}>{label}</p>
          <p className={`${isDominant ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl'} font-bold text-dashboard-text`}>{value}</p>
          {subLabel && (
            <p className={`text-xs ${isDominant ? 'font-medium' : ''} text-muted-foreground`}>{subLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface KPICardsProps {
  totalEmissions: number;
  evolutionPercent: number;
  dominantScope: number;
  objectivePercent: number;
  objectiveYear: number;
}

export const KPICards: React.FC<KPICardsProps> = ({
  totalEmissions,
  evolutionPercent,
  dominantScope,
  objectivePercent,
  objectiveYear
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        icon={Globe}
        label="Émissions totales"
        value={`${totalEmissions.toFixed(1)} tCO₂e`}
        subLabel="Total année en cours"
        bgColor="bg-carbon-dark/10"
        iconColor="text-carbon-dark"
        isDominant={true}
      />
      <KPICard
        icon={TrendingDown}
        label="Évolution"
        value={`${evolutionPercent > 0 ? '+' : ''}${evolutionPercent}%`}
        subLabel="vs année précédente"
        trend={evolutionPercent < 0 ? 'down' : 'up'}
        trendValue={`${Math.abs(evolutionPercent)}%`}
        bgColor="bg-carbon-turquoise/10"
        iconColor="text-carbon-turquoise"
      />
      <KPICard
        icon={Factory}
        label="Scope dominant"
        value={`Scope ${dominantScope}`}
        subLabel="Principal émetteur"
        bgColor="bg-carbon-blue/10"
        iconColor="text-carbon-blue"
      />
      <KPICard
        icon={Target}
        label="Objectif"
        value={`-${objectivePercent}%`}
        subLabel={`d'ici ${objectiveYear}`}
        bgColor="bg-carbon-impact/10"
        iconColor="text-carbon-impact"
      />
    </div>
  );
};
