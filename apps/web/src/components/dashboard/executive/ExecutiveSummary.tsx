// Executive Summary - Top section with 4 key indicators
// Adapts to show PCF KPIs when BC module is not active

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Activity, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutiveSummaryProps {
  totalEmissions: number;
  referenceYear: number;
  status: 'incomplete' | 'calculated' | 'in_progress' | 'follow_up';
  evolutionPercent?: number;
  // PCF-specific props
  hasBilanCarbone: boolean;
  hasEmpreinteProduit: boolean;
  pcfStudiesCount?: number;
  pcfCalculatedCount?: number;
  pcfAverageFootprint?: number;
}

const STATUS_CONFIG = {
  incomplete: { label: 'Incomplet', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  calculated: { label: 'Calculé', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  in_progress: { label: 'En cours', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  follow_up: { label: 'En suivi', className: 'bg-primary/10 text-primary border-primary/20' },
};

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  totalEmissions,
  referenceYear,
  status,
  evolutionPercent,
  hasBilanCarbone,
  hasEmpreinteProduit,
  pcfStudiesCount = 0,
  pcfCalculatedCount = 0,
  pcfAverageFootprint,
}) => {
  const statusConfig = STATUS_CONFIG[status];
  const hasEvolution = evolutionPercent !== undefined && evolutionPercent !== 0;
  const isReduction = evolutionPercent !== undefined && evolutionPercent < 0;

  // If only PCF module (no BC), show PCF-centric KPIs
  const showPCFMode = !hasBilanCarbone && hasEmpreinteProduit;

  return (
    <div className="bg-card border rounded p-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {showPCFMode ? (
          <>
            {/* PCF Mode: Studies count */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Études produit
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums">
                  {pcfStudiesCount}
                </span>
                <span className="text-sm text-muted-foreground">études</span>
              </div>
            </div>

            {/* PCF Mode: Calculated */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Études calculées
              </p>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums">
                  {pcfCalculatedCount}
                </span>
              </div>
            </div>

            {/* PCF Mode: Average footprint */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Empreinte moyenne
              </p>
              <div className="flex items-baseline gap-2">
                {pcfAverageFootprint !== undefined && pcfAverageFootprint > 0 ? (
                  <>
                    <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums">
                      {pcfAverageFootprint.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">kgCO₂e/UF</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Non disponible</span>
                )}
              </div>
            </div>

            {/* PCF Mode: Status */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Statut global
              </p>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <span className={cn(
                  'inline-flex px-3 py-1 text-sm font-medium rounded border',
                  statusConfig.className
                )}>
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* BC Mode: Total Emissions */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Empreinte carbone
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums">
                  {Math.round(totalEmissions / 1000).toLocaleString('fr-FR')}
                </span>
                <span className="text-sm text-muted-foreground">tCO₂e</span>
              </div>
            </div>

            {/* BC Mode: Reference Year */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Année de référence
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums">
                  {referenceYear}
                </span>
              </div>
            </div>

            {/* BC Mode: Status */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Statut global
              </p>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <span className={cn(
                  'inline-flex px-3 py-1 text-sm font-medium rounded border',
                  statusConfig.className
                )}>
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* BC Mode: Evolution */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Évolution vs N-1
              </p>
              <div className="flex items-center gap-2">
                {hasEvolution ? (
                  <>
                    {isReduction ? (
                      <TrendingDown className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-red-600" />
                    )}
                    <span className={cn(
                      'text-3xl lg:text-4xl font-bold tabular-nums',
                      isReduction ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {isReduction ? '' : '+'}{evolutionPercent?.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Non disponible</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
