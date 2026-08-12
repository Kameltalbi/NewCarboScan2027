import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  FileSearch, 
  Users, 
  FileSpreadsheet, 
  AlertTriangle,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriorityAction {
  id: string;
  type: 'ocr_review' | 'supplier_pending' | 'excel_incomplete' | 'ai_anomaly';
  label: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
}

interface PriorityActionsProps {
  actions: PriorityAction[];
  onActionClick?: (actionId: string) => void;
}

export const PriorityActions: React.FC<PriorityActionsProps> = ({
  actions,
  onActionClick,
}) => {
  const getActionIcon = (type: PriorityAction['type']) => {
    switch (type) {
      case 'ocr_review':
        return <FileSearch className="h-4 w-4" />;
      case 'supplier_pending':
        return <Users className="h-4 w-4" />;
      case 'excel_incomplete':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'ai_anomaly':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityStyles = (severity: PriorityAction['severity']) => {
    switch (severity) {
      case 'high':
        return {
          container: 'border-rose-200 bg-rose-50/50',
          icon: 'bg-rose-100 text-rose-600',
          badge: 'bg-rose-100 text-rose-700 border-rose-200',
        };
      case 'medium':
        return {
          container: 'border-amber-200 bg-amber-50/50',
          icon: 'bg-amber-100 text-amber-600',
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
        };
      default:
        return {
          container: 'border-muted',
          icon: 'bg-muted text-muted-foreground',
          badge: 'bg-muted text-muted-foreground',
        };
    }
  };

  const totalCount = actions.reduce((acc, a) => acc + a.count, 0);
  const highPriorityCount = actions.filter(a => a.severity === 'high').reduce((acc, a) => acc + a.count, 0);

  return (
    <Card className={cn(
      highPriorityCount > 0 && "border-rose-200"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Zap className={cn(
              "h-5 w-5",
              highPriorityCount > 0 ? "text-rose-500" : "text-primary"
            )} />
            Actions prioritaires
          </span>
          {totalCount > 0 && (
            <Badge variant={highPriorityCount > 0 ? "destructive" : "secondary"}>
              {totalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.length === 0 || totalCount === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="text-sm font-medium text-emerald-600">Aucune action en attente</p>
          </div>
        ) : (
          <>
            {actions.filter(a => a.count > 0).map((action) => {
              const styles = getSeverityStyles(action.severity);
              return (
                <div
                  key={action.id}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                    "hover:border-primary/30",
                    styles.container
                  )}
                  onClick={() => onActionClick?.(action.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", styles.icon)}>
                      {getActionIcon(action.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.count} élément(s)</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    Traiter
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
};
