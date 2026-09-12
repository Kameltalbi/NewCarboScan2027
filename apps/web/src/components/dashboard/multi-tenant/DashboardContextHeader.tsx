// Bandeau de contexte (Header global – obligatoire)
// Affiche en permanence le contexte du bilan carbone + Total consolidé

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, Database, CheckCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScopeStatus = 'consolidated' | 'in_progress' | 'not_started';
export type BilanVersion = 'V0' | 'V1' | 'Final';

interface DashboardContextHeaderProps {
  projectName: string;
  bilanVersion: BilanVersion;
  scopeStatuses: {
    scope1: ScopeStatus;
    scope2: ScopeStatus;
    scope3: ScopeStatus;
  };
  emissionFactorsSource: string;
  totalEmissions?: number; // Total consolidé en kg
}

const STATUS_CONFIG: Record<ScopeStatus, { label: string; icon: React.ReactNode; className: string }> = {
  consolidated: { 
    label: 'Terminé', 
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
  },
  in_progress: { 
    label: 'En cours', 
    icon: <Clock className="h-3.5 w-3.5" />,
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
  },
  not_started: { 
    label: 'Non entamé', 
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  },
};

const VERSION_COLORS: Record<BilanVersion, string> = {
  'V0': 'bg-gray-100 text-gray-700 border-gray-300',
  'V1': 'bg-blue-100 text-blue-700 border-blue-300',
  'Final': 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

export const DashboardContextHeader: React.FC<DashboardContextHeaderProps> = ({
  projectName,
  bilanVersion,
  scopeStatuses,
  emissionFactorsSource,
  totalEmissions = 0,
}) => {
  // Conversion kg → tonnes
  const totalTonnes = Math.round(totalEmissions / 1000);

  return (
    <div className="bg-dashboard-header dark:bg-slate-800 border border-dashboard-header dark:border-slate-700 rounded-[12px] p-4 sm:p-5 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Project Name & Version + Total consolidé */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <FileText className="h-5 w-5 text-white/90" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-white truncate">{projectName}</h2>
              <Badge variant="secondary" className={cn("text-xs font-medium", VERSION_COLORS[bilanVersion])}>
                {bilanVersion}
              </Badge>
            </div>
            {/* Total consolidé affiché sous le nom */}
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xs font-medium text-white/70 uppercase tracking-wide">Total consolidé</span>
              <span className="text-xl font-bold text-white tabular-nums font-mono">
                {totalTonnes.toLocaleString('fr-FR')}
              </span>
              <span className="text-sm text-white/80">tCO₂e</span>
            </div>
          </div>
        </div>

        {/* Périmètre & FE - alignés à droite sur desktop */}
        <div className="flex flex-col gap-3 sm:items-end">
          {/* Scope Statuses */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-white/60 shrink-0">Périmètre</span>
            {(['scope1', 'scope2', 'scope3'] as const).map((scope, index) => {
              const status = scopeStatuses[scope];
              const config = STATUS_CONFIG[status];
              return (
                <div
                  key={scope}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-xs font-medium shrink-0",
                    config.className
                  )}
                  title={config.label}
                >
                  {config.icon}
                  <span>S{index + 1}</span>
                </div>
              );
            })}
          </div>

          {/* Emission Factors Source */}
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Database className="h-4 w-4 shrink-0" />
            <span className="font-medium">FE :</span>
            <span className="truncate max-w-[200px] sm:max-w-none">{emissionFactorsSource}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
