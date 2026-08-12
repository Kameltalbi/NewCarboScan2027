import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ACVOperationalBannerProps {
  totalStudies: number;
  inProgressCount: number;
  completedCount: number;
}

export const ACVOperationalBanner: React.FC<ACVOperationalBannerProps> = ({
  totalStudies,
  inProgressCount,
  completedCount,
}) => {
  return (
    <div className="border-b pb-4 mb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            ACV – Analyse du Cycle de Vie
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des études ACV produits et projets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs bg-secondary/50 text-secondary-foreground border-border">
            Études : {totalStudies}
          </Badge>
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            En cours : {inProgressCount}
          </Badge>
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
            Finalisées : {completedCount}
          </Badge>
        </div>
      </div>
    </div>
  );
};
