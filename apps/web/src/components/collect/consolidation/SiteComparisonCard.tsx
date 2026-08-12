// Carte de comparaison de site
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, MapPin, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  code?: string;
  city?: string;
  country?: string;
  site_type?: string;
  employees_count?: number;
  surface_m2?: number;
  is_active: boolean;
  is_consolidated: boolean;
}

interface SiteComparisonCardProps {
  site: Site;
  dataCount: number;
  validatedCount: number;
  progress: number;
  isConsolidated: boolean;
}

export const SiteComparisonCard: React.FC<SiteComparisonCardProps> = ({
  site,
  dataCount,
  validatedCount,
  progress,
  isConsolidated,
}) => {
  const getSiteTypeLabel = (type?: string) => {
    const types: Record<string, string> = {
      usine: 'Usine',
      bureau: 'Bureau',
      entrepot: 'Entrepôt',
      magasin: 'Magasin',
      siege: 'Siège',
      autre: 'Autre',
    };
    return types[type || ''] || type || 'Site';
  };

  return (
    <Card className={`transition-all ${isConsolidated ? 'border-primary/50 bg-primary/5' : 'opacity-75'}`}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isConsolidated ? 'bg-primary/20' : 'bg-muted'}`}>
                <Building2 className={`h-4 w-4 ${isConsolidated ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h4 className="font-semibold text-sm">{site.name}</h4>
                {site.code && (
                  <span className="text-xs text-muted-foreground">{site.code}</span>
                )}
              </div>
            </div>
            {isConsolidated ? (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Consolidé
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Non consolidé
              </Badge>
            )}
          </div>

          {/* Location */}
          {(site.city || site.country) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {[site.city, site.country].filter(Boolean).join(', ')}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">Données</p>
              <p className="font-semibold">{dataCount}</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">Validées</p>
              <p className="font-semibold text-emerald-600">{validatedCount}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Complétion</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
            />
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {getSiteTypeLabel(site.site_type)}
            </Badge>
            {site.employees_count && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {site.employees_count}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
