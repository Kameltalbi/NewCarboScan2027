import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, Target, Zap } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  subtitle?: string;
  icon: React.ElementType;
  colorClass: string;
  gradientClass?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  trend,
  trendValue,
  subtitle,
  icon: Icon,
  colorClass,
  gradientClass
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
  const trendColorClass = trend === 'up' ? 'text-kpi-critical' : trend === 'down' ? 'text-kpi-positive' : 'text-muted-foreground';

  return (
    <Card className={`kpi-card relative overflow-hidden ${gradientClass ? 'text-white' : ''}`}>
      {gradientClass && (
        <div className={`absolute inset-0 ${gradientClass} opacity-90`} />
      )}
      <CardContent className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Icon className={`h-8 w-8 ${gradientClass ? 'text-white/90' : colorClass}`} />
          <div className={`kpi-trend ${gradientClass ? 'text-white/80' : trendColorClass}`}>
            <TrendIcon className="h-4 w-4" />
            <span>{trendValue}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className={`kpi-number ${gradientClass ? 'text-white' : 'text-foreground'}`}>
            {value}
          </div>
          <div className={`kpi-label ${gradientClass ? 'text-white/70' : ''}`}>
            {title}
          </div>
          {subtitle && (
            <p className={`text-xs ${gradientClass ? 'text-white/60' : 'text-muted-foreground'}`}>
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface KPISectionProps {
  totalEmissions: number;
  scope3Percentage: number;
  goalAchievement: number;
}

export const KPISection: React.FC<KPISectionProps> = ({
  totalEmissions,
  scope3Percentage,
  goalAchievement
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Emissions */}
      <KPICard
        title="Émissions Totales"
        value={`${Math.round(totalEmissions / 1000).toLocaleString('fr-FR')} t`}
        trend="down"
        trendValue="-8%"
        subtitle="CO₂e depuis le dernier bilan"
        icon={Activity}
        colorClass="text-primary"
        gradientClass="scope-1-gradient"
      />

      {/* Scope 3 Impact */}
      <KPICard
        title="Impact Scope 3"
        value={`${scope3Percentage}%`}
        trend="neutral"
        trendValue="stable"
        subtitle="Des émissions totales"
        icon={Zap}
        colorClass="text-scope-3-main"
        gradientClass="scope-3-gradient"
      />

      {/* Goal Achievement */}
      <KPICard
        title="Objectif 2024"
        value={`${goalAchievement}%`}
        trend="up"
        trendValue="+12%"
        subtitle="De l'objectif atteint"
        icon={Target}
        colorClass="text-kpi-positive"
        gradientClass="scope-2-gradient"
      />
    </div>
  );
};