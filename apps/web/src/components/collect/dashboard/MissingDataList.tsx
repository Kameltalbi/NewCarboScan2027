import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ChevronRight, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissingDataItem {
  id: string;
  category: string;
  label: string;
  urgency: 'urgent' | 'normal' | 'low';
  deadline?: string;
}

interface MissingDataListProps {
  items: MissingDataItem[];
  onResolve?: (itemId: string) => void;
  onResolveAll?: () => void;
  maxVisible?: number;
}

export const MissingDataList: React.FC<MissingDataListProps> = ({
  items,
  onResolve,
  onResolveAll,
  maxVisible = 5,
}) => {
  const visibleItems = items.slice(0, maxVisible);
  const urgentCount = items.filter(i => i.urgency === 'urgent').length;

  const getUrgencyBadge = (urgency: MissingDataItem['urgency']) => {
    switch (urgency) {
      case 'urgent':
        return (
          <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-xs">
            Urgent
          </Badge>
        );
      case 'normal':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
            Normal
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Optionnel
          </Badge>
        );
    }
  };

  return (
    <Card className={cn(
      urgentCount > 0 && "border-rose-200"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FileWarning className={cn(
              "h-5 w-5",
              urgentCount > 0 ? "text-rose-500" : "text-amber-500"
            )} />
            Données manquantes
          </span>
          {items.length > 0 && (
            <Badge variant={urgentCount > 0 ? "destructive" : "secondary"}>
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="text-sm font-medium text-emerald-600">Toutes les données requises sont collectées</p>
          </div>
        ) : (
          <>
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                  "hover:border-primary/30 hover:bg-muted/50",
                  item.urgency === 'urgent' && "border-rose-200 bg-rose-50/30"
                )}
                onClick={() => onResolve?.(item.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                    {getUrgencyBadge(item.urgency)}
                  </div>
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  {item.deadline && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Échéance: {item.deadline}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
              </div>
            ))}
            
            {items.length > maxVisible && (
              <p className="text-xs text-center text-muted-foreground py-1">
                +{items.length - maxVisible} autres éléments manquants
              </p>
            )}
            
            <Button 
              className="w-full mt-2" 
              variant={urgentCount > 0 ? "default" : "outline"}
              onClick={onResolveAll}
            >
              Résoudre maintenant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
