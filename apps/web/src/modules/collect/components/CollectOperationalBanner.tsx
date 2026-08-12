import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type DataStatus = 'draft' | 'in_progress' | 'partial' | 'validated' | 'locked';

interface CollectOperationalBannerProps {
  year: number;
  status: DataStatus;
}

const STATUS_CONFIG: Record<DataStatus, { label: string; className: string }> = {
  draft: { 
    label: 'Brouillon', 
    className: 'bg-muted text-muted-foreground border-muted-foreground/20' 
  },
  in_progress: { 
    label: 'En cours', 
    className: 'bg-amber-50 text-amber-700 border-amber-200' 
  },
  partial: { 
    label: 'Partiellement validées', 
    className: 'bg-blue-50 text-blue-700 border-blue-200' 
  },
  validated: { 
    label: 'Validées', 
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
  },
  locked: { 
    label: 'Verrouillées', 
    className: 'bg-slate-100 text-slate-700 border-slate-300' 
  },
};

export const CollectOperationalBanner: React.FC<CollectOperationalBannerProps> = ({
  year,
  status,
}) => {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className="border-b pb-4 mb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Collecte de données – Année {year}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">Statut des données :</span>
            <Badge 
              variant="outline" 
              className={cn('text-xs font-medium', statusConfig.className)}
            >
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3">
        Les données collectées ici sont utilisées pour le calcul du Bilan Carbone.
      </p>
    </div>
  );
};
