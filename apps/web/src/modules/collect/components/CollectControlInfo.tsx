import React from 'react';
import { AlertTriangle, CheckCircle, Lock } from 'lucide-react';

interface QualityIssue {
  type: 'missing_unit' | 'abnormal_value' | 'incomplete';
  count: number;
  label: string;
}

interface CollectControlInfoProps {
  issues: QualityIssue[];
  totalIncomplete: number;
  status: 'draft' | 'in_progress' | 'validated' | 'locked';
}

export const CollectControlInfo: React.FC<CollectControlInfoProps> = ({
  issues,
  totalIncomplete,
  status,
}) => {
  const hasIssues = totalIncomplete > 0;
  const isLocked = status === 'locked' || status === 'validated';

  return (
    <div className="flex flex-wrap items-center gap-6 text-sm">
      {/* Quality status */}
      <div className="flex items-center gap-3">
        {hasIssues ? (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-foreground">
              <span className="font-semibold text-amber-700 dark:text-amber-400">{totalIncomplete}</span> donnée{totalIncomplete > 1 ? 's' : ''} incomplète{totalIncomplete > 1 ? 's' : ''}
            </span>
          </>
        ) : (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-medium text-foreground">Toutes les données sont cohérentes</span>
          </>
        )}
      </div>

      <div className="hidden sm:block h-8 w-px bg-border" />

      {/* Validation status */}
      {!isLocked ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-500/10">
            <Lock className="h-5 w-5 text-slate-500" />
          </div>
          <span>Données non verrouillées</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-foreground">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium">Données verrouillées</span>
        </div>
      )}
    </div>
  );
};
