// KPI Cards - Affichage des émissions par scope
// Règle: Ne pas afficher de total incluant des scopes non consolidés

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory, Zap, Truck, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScopeStatus } from './DashboardContextHeader';

interface ScopeKPICardsProps {
  scope1: number;
  scope2: number;
  scope3: number;
  scopeStatuses: {
    scope1: ScopeStatus;
    scope2: ScopeStatus;
    scope3: ScopeStatus;
  };
}

// Palette dashboard CarboScan – Scope 1 Bleu, Scope 2 Ambre, Scope 3 Indigo
import { DASHBOARD_PALETTE } from './dashboardPalette';

const CARD_BORDER = 'border-[#E2E8F0] dark:border-slate-700';

const SCOPE_STYLES = {
  scope1: { accent: DASHBOARD_PALETTE.scope1, text: DASHBOARD_PALETTE.scope1 },
  scope2: { accent: DASHBOARD_PALETTE.scope2, text: DASHBOARD_PALETTE.scope2 },
  scope3: { accent: DASHBOARD_PALETTE.scope3, text: DASHBOARD_PALETTE.scope3 },
} as const;

// Conversion kg → tonnes et formatage (arrondi sans décimales - règle Bilan Carbone®)
const formatEmissionsToTonnes = (kgValue: number): string => {
  const tonnes = Math.round(kgValue / 1000);
  return tonnes.toLocaleString('fr-FR');
};

export const ScopeKPICards: React.FC<ScopeKPICardsProps> = ({
  scope1,
  scope2,
  scope3,
  scopeStatuses,
}) => {

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* Scope 1 – Bleu Énergie */}
      <Card className={cn(
        "p-4 sm:p-5 rounded-xl border shadow-sm bg-white dark:bg-slate-900/50 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500",
        scopeStatuses.scope1 === 'not_started' ? 'opacity-60' : '',
        CARD_BORDER
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-3 min-w-0">
            <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: SCOPE_STYLES.scope1.accent }} />
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Scope 1
                </p>
                {scopeStatuses.scope1 === 'in_progress' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                    En cours
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono" style={{ color: SCOPE_STYLES.scope1.text }}>
                  {formatEmissionsToTonnes(scope1)}
                </span>
                <span className="text-xs text-muted-foreground">tCO₂e</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Émissions directes</p>
            </div>
          </div>
          <Factory className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" style={{ color: SCOPE_STYLES.scope1.text }} />
        </div>
      </Card>

      {/* Scope 2 – Ambre Électrique */}
      <Card className={cn(
        "p-4 sm:p-5 rounded-xl border shadow-sm bg-white dark:bg-slate-900/50 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75",
        scopeStatuses.scope2 === 'not_started' ? 'opacity-60' : '',
        CARD_BORDER
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-3 min-w-0">
            <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: SCOPE_STYLES.scope2.accent }} />
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Scope 2
                </p>
                {scopeStatuses.scope2 === 'in_progress' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                    En cours
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono" style={{ color: SCOPE_STYLES.scope2.text }}>
                  {formatEmissionsToTonnes(scope2)}
                </span>
                <span className="text-xs text-muted-foreground">tCO₂e</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Énergie indirecte</p>
            </div>
          </div>
          <Zap className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" style={{ color: SCOPE_STYLES.scope2.text }} />
        </div>
      </Card>

      {/* Scope 3 – Indigo Industriel */}
      <Card className={cn(
        "p-4 sm:p-5 rounded-xl border shadow-sm bg-white dark:bg-slate-900/50 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150",
        scopeStatuses.scope3 === 'not_started' ? 'opacity-60' : '',
        CARD_BORDER
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-3 min-w-0">
            <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: SCOPE_STYLES.scope3.accent }} />
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Scope 3
                </p>
                {scopeStatuses.scope3 === 'in_progress' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                    En cours
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono" style={{ color: SCOPE_STYLES.scope3.text }}>
                  {formatEmissionsToTonnes(scope3)}
                </span>
                <span className="text-xs text-muted-foreground">tCO₂e</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Autres indirectes</p>
            </div>
          </div>
          <Truck className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" style={{ color: SCOPE_STYLES.scope3.text }} />
        </div>
      </Card>
    </div>
  );
};
