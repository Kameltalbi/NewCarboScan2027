import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CollectStatusBannerProps {
  year: number;
  status: 'draft' | 'in_progress' | 'validated' | 'locked';
  totalDataCount: number;
}

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'En cours', variant: 'default' as const, className: 'bg-amber-100 text-amber-800 border-amber-300' },
  validated: { label: 'Validées', variant: 'default' as const, className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  locked: { label: 'Verrouillées', variant: 'default' as const, className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export const CollectStatusBanner: React.FC<CollectStatusBannerProps> = ({
  year,
  status,
  totalDataCount,
}) => {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className="bg-card border rounded-lg p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Collecte de données – Année {year}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-muted-foreground">Statut des données :</span>
            <Badge variant={statusConfig.variant} className={cn('font-medium', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{totalDataCount}</p>
          <p className="text-sm text-muted-foreground">données saisies</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-4 border-t pt-4">
        Les données collectées ici alimentent le calcul du Bilan Carbone. 
        Elles peuvent être modifiées tant qu'elles ne sont pas validées.
      </p>
    </div>
  );
};
