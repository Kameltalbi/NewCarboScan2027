// Composant : Widget de progression de collecte

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AUDIT_STATUS_CONFIG } from '@/lib/types/collection-checklist';
import type { CollectionProgress as CollectionProgressType } from '@/lib/types/collection-checklist';

interface CollectionProgressProps {
  progress: CollectionProgressType;
  compact?: boolean;
}

export const CollectionProgress = ({ progress, compact = false }: CollectionProgressProps) => {
  const statusConfig = AUDIT_STATUS_CONFIG[progress.audit_status];

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Progression de collecte</span>
          <Badge variant={statusConfig.color}>
            {statusConfig.icon} {progress.completion_percentage}%
          </Badge>
        </div>
        <Progress value={progress.completion_percentage} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {progress.completed_mandatory}/{progress.mandatory_postes} postes obligatoires collectés
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">📊 Progression globale</h3>
            <Badge variant={statusConfig.color} className="text-base px-3 py-1">
              {statusConfig.icon} {statusConfig.label}
            </Badge>
          </div>

          <Progress 
            value={progress.completion_percentage} 
            className="h-3"
          />

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-2xl">{progress.completion_percentage}%</span>
            <span className="text-muted-foreground">collecté</span>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              {statusConfig.description}
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Postes obligatoires</p>
                <p className="text-lg font-semibold">
                  {progress.completed_mandatory}/{progress.mandatory_postes}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tous postes</p>
                <p className="text-lg font-semibold">
                  {progress.completed_postes}/{progress.total_postes}
                </p>
              </div>
            </div>
          </div>

          {progress.audit_status === 'insufficient' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>⚠️ Bilan non auditable</strong>
                <br />
                Collectez au minimum les {progress.mandatory_postes} postes obligatoires 
                pour obtenir un bilan carbone certifiable.
              </p>
            </div>
          )}

          {progress.audit_status === 'partial' && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>⚠️ Presque audit-ready !</strong>
                <br />
                Il ne manque que {progress.mandatory_postes - progress.completed_mandatory} poste(s) 
                obligatoire(s) pour un bilan certifiable.
              </p>
            </div>
          )}

          {progress.audit_status === 'audit_ready' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>✅ Bilan audit-ready !</strong>
                <br />
                Toutes les données obligatoires sont collectées. 
                Votre bilan carbone est certifiable par un organisme tiers.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
