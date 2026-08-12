import React from 'react';
import { Badge } from '@/components/ui/badge';

interface NetZeroOperationalBannerProps {
  hasActivePlan: boolean;
  referenceYear: number | null;
  targetYear: number | null;
}

export const NetZeroOperationalBanner: React.FC<NetZeroOperationalBannerProps> = ({
  hasActivePlan,
  referenceYear,
  targetYear,
}) => {
  return (
    <div className="border-b pb-4 mb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Feuille de route climat
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilotage de la trajectoire de réduction des émissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className={`text-xs ${hasActivePlan 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-muted text-muted-foreground'}`}
          >
            Plan actif : {hasActivePlan ? 'Oui' : 'Non'}
          </Badge>
          {referenceYear && (
            <Badge variant="outline" className="text-xs bg-secondary/50 text-secondary-foreground border-border">
              Référence : {referenceYear}
            </Badge>
          )}
          {targetYear && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Objectif : {targetYear}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
