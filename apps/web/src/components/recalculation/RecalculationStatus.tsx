// Composant pour afficher le statut du recalcul automatique

import React from 'react';
import { useRecalculation } from '@/hooks/useRecalculation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RecalculationStatusProps {
  organizationId: string;
  showHistory?: boolean;
  showManualTrigger?: boolean;
}

export const RecalculationStatus: React.FC<RecalculationStatusProps> = ({
  organizationId,
  showHistory = false,
  showManualTrigger = true,
}) => {
  const {
    isRecalculating,
    latestTask,
    history,
    triggerRecalculation,
    loadHistory,
  } = useRecalculation({
    organizationId,
    autoSubscribe: true,
  });

  React.useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory, loadHistory]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      pending: 'outline',
    };

    const labels: Record<string, string> = {
      completed: 'Terminé',
      failed: 'Échec',
      processing: 'En cours',
      pending: 'En attente',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recalcul automatique</CardTitle>
            <CardDescription>
              Vos données sont recalculées automatiquement à chaque modification
            </CardDescription>
          </div>
          {showManualTrigger && (
            <Button
              onClick={() => triggerRecalculation()}
              disabled={isRecalculating}
              size="sm"
              variant="outline"
            >
              {isRecalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recalcul en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recalculer maintenant
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {latestTask && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(latestTask.status)}
                <div>
                  <p className="text-sm font-medium">Dernier recalcul</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(latestTask.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
              {getStatusBadge(latestTask.status)}
            </div>

            {latestTask.status === 'completed' && latestTask.result && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                {latestTask.result.bilan_carbone && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="font-medium text-green-900">Bilan Carbone</p>
                    <p className="text-xs text-green-700 mt-1">
                      {(latestTask.result.bilan_carbone.total / 1000).toFixed(2)} t CO₂e
                    </p>
                  </div>
                )}
                {latestTask.result.dashboard_metrics && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-900">Dashboard</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {latestTask.result.dashboard_metrics.total_activities} activités
                    </p>
                  </div>
                )}
                {latestTask.result.product_footprint && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="font-medium text-purple-900">Empreinte Produit</p>
                    <p className="text-xs text-purple-700 mt-1">
                      {(latestTask.result.product_footprint.total_emissions / 1000).toFixed(2)} t CO₂e
                    </p>
                  </div>
                )}
              </div>
            )}

            {latestTask.status === 'failed' && latestTask.error_message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900">Erreur</p>
                <p className="text-xs text-red-700 mt-1">{latestTask.error_message}</p>
              </div>
            )}
          </div>
        )}

        {!latestTask && !isRecalculating && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Aucun recalcul récent</p>
            <p className="text-xs mt-1">
              Les données seront recalculées automatiquement lors de la prochaine modification
            </p>
          </div>
        )}

        {showHistory && history.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Historique des recalculs</h4>
            <div className="space-y-2">
              {history.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(task.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
