import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from './ProgressBar';
import { Building2, MapPin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Site {
  id: string;
  name: string;
  location?: string;
  progress: number;
  itemCount: number;
}

interface SiteProgressCardProps {
  sites: Site[];
  onSiteClick?: (siteId: string) => void;
  maxVisible?: number;
}

export const SiteProgressCard: React.FC<SiteProgressCardProps> = ({
  sites,
  onSiteClick,
  maxVisible = 5,
}) => {
  const visibleSites = sites.slice(0, maxVisible);
  const remainingCount = sites.length - maxVisible;

  const getProgressVariant = (progress: number) => {
    if (progress >= 100) return 'success';
    if (progress >= 50) return 'default';
    if (progress > 0) return 'warning';
    return 'danger';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5 text-primary" />
          Progression par site
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleSites.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun site configuré</p>
          </div>
        ) : (
          <>
            {visibleSites.map((site) => (
              <div
                key={site.id}
                className={cn(
                  "group p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                  "hover:border-primary/30 hover:bg-muted/50",
                  site.progress === 100 && "border-emerald-200 bg-emerald-50/30"
                )}
                onClick={() => onSiteClick?.(site.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">{site.name}</span>
                    {site.location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {site.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-semibold",
                      site.progress === 100 ? "text-emerald-600" : "text-foreground"
                    )}>
                      {site.progress}%
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
                <ProgressBar 
                  value={site.progress} 
                  variant={getProgressVariant(site.progress)} 
                  size="sm" 
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {site.itemCount} éléments collectés
                </p>
              </div>
            ))}
            {remainingCount > 0 && (
              <Button variant="ghost" size="sm" className="w-full">
                Voir {remainingCount} site(s) de plus
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
